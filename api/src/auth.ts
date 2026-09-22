import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransport,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { omez } from "./limit";
import { b64u, ChybaHttp, json, nahodnyToken, normalizujKod, novyObnovovaciKod, povolenyPuvod, rpIdProPuvod, sha256, stejne, ted, telo, zaDni, zaMinut, zB64u } from "./pomocne";
import { VYCHOZI_NASTAVENI, type Env, type Nastaveni, type Prihlaseny, type RadekUctu, type Role } from "./typy";

/*
  Přihlášení bez identity.

  Účet = náhodný identifikátor + veřejná část passkey. Server ověřuje podpis,
  ne člověka. Obnovovací kód je jediná záloha; ukládá se jen jeho otisk.
*/

const PLATNOST_RELACE_DNI = 30;

/**
 * Odkud člověk přichází — podle hlavičky Origin, ale jen z povolených adres.
 * Bez hlavičky, nebo z nepovolené adresy, platí hlavní adresa webu; chování
 * je pak stejné jako před přechodem na vlastní doménu.
 */
const puvodPozadavku = (env: Env, req: Request): string => povolenyPuvod(env, req.headers.get("Origin")) ?? env.PUVOD_WEBU;

export function nastaveniZ(radek: Pick<RadekUctu, "nastaveni">): Nastaveni {
  try {
    return { ...VYCHOZI_NASTAVENI, ...(JSON.parse(radek.nastaveni) as Partial<Nastaveni>) };
  } catch {
    return { ...VYCHOZI_NASTAVENI };
  }
}

/* ---------- relace ---------- */

export async function vytvorRelaci(env: Env, ucetId: string): Promise<string> {
  const token = nahodnyToken(32);
  await env.DB.prepare("INSERT INTO relace (hash, ucet_id, vytvoreno, expirace, posledni) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256(token), ucetId, ted(), zaDni(PLATNOST_RELACE_DNI), ted())
    .run();
  await env.DB.prepare("UPDATE ucty SET posledni_prihlaseni = ? WHERE id = ?").bind(ted(), ucetId).run();
  return token;
}

export async function prihlaseny(env: Env, req: Request): Promise<Prihlaseny | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const hash = await sha256(auth.slice(7).trim());
  const r = await env.DB.prepare(
    `SELECT u.id, u.role, u.nastaveni, u.nazev, s.expirace FROM relace s JOIN ucty u ON u.id = s.ucet_id WHERE s.hash = ? AND u.smazano IS NULL`,
  ).bind(hash).first<{ id: string; role: Role; nastaveni: string; nazev: string | null; expirace: string }>();
  if (!r || new Date(r.expirace) < new Date()) return null;
  // Klouzavá platnost: kdo web používá, nemusí se přihlašovat znovu.
  await env.DB.prepare("UPDATE relace SET posledni = ?, expirace = ? WHERE hash = ?").bind(ted(), zaDni(PLATNOST_RELACE_DNI), hash).run();
  return { id: r.id, role: r.role, nastaveni: nastaveniZ(r), nazev: r.nazev };
}

export async function vyzadujPrihlaseni(env: Env, req: Request): Promise<Prihlaseny> {
  const p = await prihlaseny(env, req);
  if (!p) throw new ChybaHttp(401, "Nejste přihlášeni.");
  return p;
}

export async function odhlasit(env: Env, req: Request): Promise<Response> {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    await env.DB.prepare("DELETE FROM relace WHERE hash = ?").bind(await sha256(auth.slice(7).trim())).run();
  }
  return json({ ok: true });
}

/* ---------- výzvy ---------- */

async function ulozVyzvu(env: Env, druh: string, vyzva: string, ucetId: string | null): Promise<string> {
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO vyzvy (id, druh, vyzva, ucet_id, expirace) VALUES (?, ?, ?, ?, ?)")
    .bind(id, druh, vyzva, ucetId, zaMinut(5))
    .run();
  return id;
}

async function vyzvedniVyzvu(env: Env, id: string, druh: string): Promise<{ vyzva: string; ucetId: string | null }> {
  const r = await env.DB.prepare("SELECT vyzva, ucet_id, expirace FROM vyzvy WHERE id = ? AND druh = ?")
    .bind(id, druh)
    .first<{ vyzva: string; ucet_id: string | null; expirace: string }>();
  await env.DB.prepare("DELETE FROM vyzvy WHERE id = ?").bind(id).run();
  if (!r || new Date(r.expirace) < new Date()) throw new ChybaHttp(400, "Výzva vypršela. Zkuste to znovu.");
  return { vyzva: r.vyzva, ucetId: r.ucet_id };
}

/* ---------- registrace ---------- */

export async function registraceZacit(env: Env, req: Request, proUcet: string | null = null): Promise<Response> {
  await omez(env, req, "registrace", 15);
  const vylouceni = proUcet
    ? (await env.DB.prepare("SELECT id, transporty FROM passkeys WHERE ucet_id = ?").bind(proUcet).all<{ id: string; transporty: string | null }>()).results
    : [];
  const userID = new Uint8Array(16);
  crypto.getRandomValues(userID);
  const moznosti = await generateRegistrationOptions({
    rpName: env.NAZEV_WEBU,
    rpID: rpIdProPuvod(env, puvodPozadavku(env, req)),
    userID,
    userName: `czechpatrol-${b64u(userID).slice(0, 6).toLowerCase()}`,
    userDisplayName: "CzechPatrol — anonymní účet",
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    excludeCredentials: vylouceni.map((v) => ({ id: v.id, transports: v.transporty ? (JSON.parse(v.transporty) as AuthenticatorTransport[]) : undefined })),
  });
  const id = await ulozVyzvu(env, proUcet ? "passkey" : "registrace", moznosti.challenge, proUcet);
  return json({ id, moznosti });
}

async function overRegistraci(env: Env, req: Request, druh: "registrace" | "passkey") {
  const { id, odpoved } = await telo<{ id: string; odpoved: RegistrationResponseJSON }>(req);
  if (!id || !odpoved) throw new ChybaHttp(400, "Chybí odpověď zařízení.");
  const { vyzva, ucetId } = await vyzvedniVyzvu(env, id, druh);
  const puvod = puvodPozadavku(env, req);
  let v;
  try {
    v = await verifyRegistrationResponse({
      response: odpoved,
      expectedChallenge: vyzva,
      expectedOrigin: puvod,
      expectedRPID: rpIdProPuvod(env, puvod),
      requireUserVerification: false,
    });
  } catch (e) {
    throw new ChybaHttp(400, `Passkey se nepodařilo ověřit: ${e instanceof Error ? e.message : "neznámá chyba"}`);
  }
  if (!v.verified) throw new ChybaHttp(400, "Passkey se nepodařilo ověřit.");
  return { ucetId, cred: v.registrationInfo.credential };
}

export async function registraceDokoncit(env: Env, req: Request): Promise<Response> {
  const { cred } = await overRegistraci(env, req, "registrace");
  const ucetId = crypto.randomUUID();
  const kod = novyObnovovaciKod();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO ucty (id, role, vytvoreno, obnova_hash, nastaveni) VALUES (?, 'obcan', ?, ?, ?)")
      .bind(ucetId, ted(), await sha256(`${ucetId}|${normalizujKod(kod)}`), JSON.stringify(VYCHOZI_NASTAVENI)),
    env.DB.prepare("INSERT INTO passkeys (id, ucet_id, verejny_klic, pocitadlo, transporty, vytvoreno) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(cred.id, ucetId, b64u(cred.publicKey), cred.counter, JSON.stringify(cred.transports ?? []), ted()),
  ]);
  const token = await vytvorRelaci(env, ucetId);
  return json({ token, ucet: await verejnyUcet(env, ucetId), obnovovaciKod: kod });
}

/** Další passkey k existujícímu účtu (nové zařízení). */
export async function passkeyDokoncit(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  const { ucetId, cred } = await overRegistraci(env, req, "passkey");
  if (ucetId !== ucet.id) throw new ChybaHttp(400, "Výzva patří jinému účtu.");
  await env.DB.prepare("INSERT INTO passkeys (id, ucet_id, verejny_klic, pocitadlo, transporty, vytvoreno) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(cred.id, ucet.id, b64u(cred.publicKey), cred.counter, JSON.stringify(cred.transports ?? []), ted())
    .run();
  return json({ ok: true });
}

/* ---------- přihlášení ---------- */

export async function prihlaseniZacit(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "prihlaseni", 20);
  const moznosti = await generateAuthenticationOptions({ rpID: rpIdProPuvod(env, puvodPozadavku(env, req)), userVerification: "preferred", allowCredentials: [] });
  const id = await ulozVyzvu(env, "prihlaseni", moznosti.challenge, null);
  return json({ id, moznosti });
}

export async function prihlaseniDokoncit(env: Env, req: Request): Promise<Response> {
  const { id, odpoved } = await telo<{ id: string; odpoved: AuthenticationResponseJSON }>(req);
  if (!id || !odpoved?.id) throw new ChybaHttp(400, "Chybí odpověď zařízení.");
  const { vyzva } = await vyzvedniVyzvu(env, id, "prihlaseni");
  const pk = await env.DB.prepare("SELECT id, ucet_id, verejny_klic, pocitadlo, transporty FROM passkeys WHERE id = ?")
    .bind(odpoved.id)
    .first<{ id: string; ucet_id: string; verejny_klic: string; pocitadlo: number; transporty: string | null }>();
  if (!pk) throw new ChybaHttp(400, "Tenhle passkey neznáme. Zkuste obnovovací kód.");
  const puvod = puvodPozadavku(env, req);
  let v;
  try {
    v = await verifyAuthenticationResponse({
      response: odpoved,
      expectedChallenge: vyzva,
      expectedOrigin: puvod,
      expectedRPID: rpIdProPuvod(env, puvod),
      requireUserVerification: false,
      credential: {
        id: pk.id,
        publicKey: zB64u(pk.verejny_klic),
        counter: pk.pocitadlo,
        transports: pk.transporty ? (JSON.parse(pk.transporty) as AuthenticatorTransport[]) : undefined,
      },
    });
  } catch (e) {
    throw new ChybaHttp(400, `Přihlášení se nepodařilo ověřit: ${e instanceof Error ? e.message : "neznámá chyba"}`);
  }
  if (!v.verified) throw new ChybaHttp(400, "Přihlášení se nepodařilo ověřit.");
  await env.DB.prepare("UPDATE passkeys SET pocitadlo = ? WHERE id = ?").bind(v.authenticationInfo.newCounter, pk.id).run();
  const token = await vytvorRelaci(env, pk.ucet_id);
  return json({ token, ucet: await verejnyUcet(env, pk.ucet_id) });
}

/* ---------- obnova ---------- */

export async function obnova(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "obnova", 5, 30);
  const { kod } = await telo<{ kod: string }>(req);
  const n = normalizujKod(kod ?? "");
  if (n.length !== 16) throw new ChybaHttp(400, "Kód má 16 znaků.");
  // Otisk je solený identifikátorem účtu, takže se musí projít účty s kódem.
  // Účtů je málo a obnova vzácná; pomalost je tu na místě.
  const { results } = await env.DB.prepare("SELECT id, obnova_hash FROM ucty WHERE obnova_hash IS NOT NULL").all<{ id: string; obnova_hash: string }>();
  for (const u of results) {
    if (stejne(await sha256(`${u.id}|${n}`), u.obnova_hash)) {
      const token = await vytvorRelaci(env, u.id);
      return json({ token, ucet: await verejnyUcet(env, u.id) });
    }
  }
  throw new ChybaHttp(400, "Kód nesedí.");
}

/** Nový obnovovací kód pro přihlášeného; starý přestává platit. */
export async function novyKod(env: Env, ucet: Prihlaseny): Promise<Response> {
  const kod = novyObnovovaciKod();
  await env.DB.prepare("UPDATE ucty SET obnova_hash = ? WHERE id = ?").bind(await sha256(`${ucet.id}|${normalizujKod(kod)}`), ucet.id).run();
  return json({ obnovovaciKod: kod });
}

/* ---------- veřejná podoba účtu ---------- */

export async function verejnyUcet(env: Env, id: string) {
  const u = await env.DB.prepare("SELECT id, role, vytvoreno, nastaveni, nazev, email_sifrovany, email_souhlas_kdy FROM ucty WHERE id = ?").bind(id).first<RadekUctu & { email_sifrovany: string | null; email_souhlas_kdy: string | null }>();
  if (!u) throw new ChybaHttp(404, "Účet neexistuje.");
  const kanaly = (await env.DB.prepare("SELECT druh FROM kanaly WHERE ucet_id = ?").bind(id).all<{ druh: string }>()).results.map((k) => k.druh);
  const pk = await env.DB.prepare("SELECT COUNT(*) AS n FROM passkeys WHERE ucet_id = ?").bind(id).first<{ n: number }>();
  return {
    id: u.id,
    role: u.role,
    vytvoreno: u.vytvoreno,
    nazev: u.nazev,
    telegram: kanaly.includes("telegram"),
    whatsapp: kanaly.includes("whatsapp"),
    upozorneni: nastaveniZ(u),
    passkeys: pk?.n ?? 0,
    /* Jen „má / nemá“ a kdy souhlasil; adresa se v přehledu účtu nevrací. */
    email: Boolean(u.email_sifrovany),
    emailSouhlasKdy: u.email_souhlas_kdy,
  };
}

export function dostupneKanaly(env: Env) {
  return {
    telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_JMENO),
    whatsapp: Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID),
  };
}
