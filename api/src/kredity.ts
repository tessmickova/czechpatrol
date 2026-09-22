import { pripravEmail, emailUctu } from "./emaily";
import { omez } from "./limit";
import { ChybaHttp, json, sha256, stejne, ted, telo } from "./pomocne";
import { vyzadujPravo } from "./prava";
import { desifruj, zasifruj } from "./sifrovani";
import type { Env, Prihlaseny } from "./typy";

/*
  Kredit 150 Kč za odemknutí Premium.

  Kód: CP-XXXX-XXXX, 8 znaků z abecedy bez záměnných písmen (0/O, 1/I/L),
  z crypto.getRandomValues. V databázi je jen otisk SHA-256 (k vyhledání),
  poslední 4 znaky (k maskování v logu a ve správě) a plný kód šifrovaně
  (aby ho člověk viděl v účtu a šel poslat znovu). V logu nikdy celý.

  Stavy: ACTIVE → REDEEMED | REVOKED | REPLACED | EXPIRED. Náhrada je
  jedna dávka: starý REPLACED + nový ACTIVE, propojené oběma směry — oba
  aktivní nikdy. Uplatnění je podmíněný UPDATE na stav ACTIVE; když změní
  0 řádků, uplatnění se odmítne. Kredit bez expirace (viz návrh; expirace
  by musela být na tlačítku před platbou — LEGAL REVIEW).
*/

export const ABECEDA_KODU = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const DUVODY_NAHRADY = ["EMAIL_ISSUE", "EXPOSED_CODE", "TECHNICAL_ISSUE", "SUPPORT_RESOLUTION", "OTHER"] as const;
export type DuvodNahrady = (typeof DUVODY_NAHRADY)[number];
export const STAVY_KREDITU = ["ACTIVE", "REDEEMED", "EXPIRED", "REVOKED", "REPLACED"] as const;

export function novyKodKreditu(): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  // 31 znaků abecedy; zbytek po dělení 256 je mírně nerovnoměrný (256 % 31 = 8),
  // pro kód s brzdou pokusů to nevadí, ale říkáme to nahlas.
  const z = Array.from(a, (b) => ABECEDA_KODU[b % ABECEDA_KODU.length]);
  return `CP-${z.slice(0, 4).join("")}-${z.slice(4).join("")}`;
}

/** Z čehokoli, co člověk opíše (malá písmena, mezery, chybějící „CP-“), udělá 8 znaků. */
export function normalizujKodKreditu(vstup: string): string {
  let s = vstup.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("CP") && s.length === 10) s = s.slice(2);
  return s;
}

export function platnyTvarKodu(normalizovany: string): boolean {
  return normalizovany.length === 8 && [...normalizovany].every((z) => ABECEDA_KODU.includes(z));
}

export const otiskKodu = (normalizovany: string) => sha256(`kredit|${normalizovany}`);
export const maskuj = (posledni4: string) => `CP-****-${posledni4}`;
export const haleruNaKc = (h: number) => `${Math.round(h / 100)} Kč`;

export interface NovyKredit {
  ucetId: string;
  platbaId: string | null;
  hodnotaHaleru: number;
  mena?: string;
  vydal: string;
  duvod?: string | null;
  nahradaZaId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Připraví vydání: vrací id, kód v čitelné podobě (jen pro odpověď) a INSERT do dávky. */
export async function pripravVydani(env: Env, k: NovyKredit): Promise<{ id: string; kod: string; posledni4: string; prikaz: D1PreparedStatement }> {
  const id = crypto.randomUUID();
  const kod = novyKodKreditu();
  const norm = normalizujKodKreditu(kod);
  const prikaz = env.DB.prepare(
    `INSERT INTO kredity (id, kod_otisk, kod_posledni4, kod_sifrovany, ucet_id, platba_id, hodnota_haleru, mena, stav, vytvoreno, vydal, nahrada_za_id, duvod, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)`,
  ).bind(id, await otiskKodu(norm), norm.slice(-4), await zasifruj(env, kod), k.ucetId, k.platbaId, k.hodnotaHaleru, k.mena ?? "CZK", ted(), k.vydal, k.nahradaZaId ?? null, k.duvod ?? null, k.metadata ? JSON.stringify(k.metadata) : null);
  return { id, kod, posledni4: norm.slice(-4), prikaz };
}

interface RadekKreditu {
  id: string; kod_posledni4: string; kod_sifrovany: string; ucet_id: string; platba_id: string | null; hodnota_haleru: number; mena: string; stav: string;
  vytvoreno: string; expirace: string | null; uplatneno: string | null; uplatneno_objednavka: string | null; vydal: string; nahrada_za_id: string | null; nahrazen_id: string | null; duvod: string | null;
}

/* ---------- účet ---------- */

/** Kredity přihlášeného: s plným kódem (jsou jeho) a se stavem posledního e-mailu. */
export async function moje(env: Env, ucet: Prihlaseny): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM kredity WHERE ucet_id = ? ORDER BY vytvoreno DESC").bind(ucet.id).all<RadekKreditu>();
  const { results: emaily } = await env.DB.prepare("SELECT kredit_id, stav, pokusy, odeslano FROM emaily WHERE ucet_id = ? ORDER BY vytvoreno DESC").bind(ucet.id).all<{ kredit_id: string | null; stav: string; pokusy: number; odeslano: string | null }>();
  const kredity = [];
  for (const r of results) {
    const e = emaily.find((x) => x.kredit_id === r.id) ?? null;
    kredity.push({
      id: r.id,
      kod: await desifruj(env, r.kod_sifrovany),
      maska: maskuj(r.kod_posledni4),
      hodnotaHaleru: r.hodnota_haleru,
      mena: r.mena,
      stav: r.stav,
      vytvoreno: r.vytvoreno,
      expirace: r.expirace,
      uplatneno: r.uplatneno,
      nahradaZa: r.nahrada_za_id,
      nahrazen: r.nahrazen_id,
      email: e ? { stav: e.stav, pokusy: e.pokusy, odeslano: e.odeslano } : null,
    });
  }
  return json({ kredity, eshopBezi: Boolean(env.ESHOP_TOKEN) });
}

/** „Poslat znovu“ — jen přihlášený, jen vlastní kredit, jen když má e-mail. */
export async function poslatZnovu(env: Env, req: Request, ucet: Prihlaseny, id: string): Promise<Response> {
  await omez(env, req, "kredit-email", 5, 60);
  const r = await env.DB.prepare("SELECT id, stav FROM kredity WHERE id = ? AND ucet_id = ?").bind(id, ucet.id).first<{ id: string; stav: string }>();
  if (!r) throw new ChybaHttp(404, "Kredit nenalezen.");
  const email = await emailUctu(env, ucet.id);
  if (!email) throw new ChybaHttp(400, "K účtu není e-mail. Doplňte ho v účtu, nebo si kód opište odsud.");
  const e = await pripravEmail(env, { ucetId: ucet.id, druh: "kredit-znovu", kreditId: r.id, adresa: email });
  await env.DB.batch([e.prikaz, env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, 'EMAIL_RESENT', ?)").bind(ted(), ucet.id, r.id)]);
  return json({ ok: true, emailId: e.id }, 201);
}

/* ---------- e-shop: ověření a uplatnění ---------- */

function vyzadujEshop(env: Env, req: Request) {
  if (!env.ESHOP_TOKEN) throw new ChybaHttp(503, "Uplatnění kreditů zatím není zapnuté.");
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !stejne(auth.slice(7).trim(), env.ESHOP_TOKEN)) throw new ChybaHttp(401, "Neplatný token e-shopu.");
}

async function najdiPodleKodu(env: Env, kod: string): Promise<RadekKreditu | null> {
  const norm = normalizujKodKreditu(kod ?? "");
  if (!platnyTvarKodu(norm)) return null;
  return env.DB.prepare("SELECT * FROM kredity WHERE kod_otisk = ?").bind(await otiskKodu(norm)).first<RadekKreditu>();
}

/** Ověření bez uplatnění — e-shop ukáže v košíku, co kód znamená. */
export async function overit(env: Env, req: Request): Promise<Response> {
  vyzadujEshop(env, req);
  await omez(env, req, "kredit-overit", 30, 10);
  const { kod } = await telo<{ kod?: string }>(req);
  const r = await najdiPodleKodu(env, kod ?? "");
  if (!r) return json({ platny: false, duvod: "neznámý kód" });
  return json({ platny: r.stav === "ACTIVE", stav: r.stav, hodnotaHaleru: r.hodnota_haleru, mena: r.mena, maska: maskuj(r.kod_posledni4) });
}

/**
 * Uplatnění. Jedna dávka: podmíněný UPDATE (jen z ACTIVE) + INSERT
 * uplatnění s UNIQUE idempotency_key. Souběžný druhý pokus: UPDATE změní
 * 0 řádků a my to poznáme z meta.changes; stejný idempotency_key podruhé
 * = vrátíme původní výsledek, nic nového se nezapíše.
 */
export async function uplatnit(env: Env, req: Request): Promise<Response> {
  vyzadujEshop(env, req);
  await omez(env, req, "kredit-uplatnit", 30, 10);
  const t = await telo<{ kod?: string; objednavkaId?: string; castkaHaleru?: number; idempotencyKey?: string }>(req);
  if (!t.objednavkaId || !t.idempotencyKey) throw new ChybaHttp(400, "Chybí objednávka nebo idempotency key.");
  const drive = await env.DB.prepare("SELECT kredit_id, castka_haleru FROM kredit_uplatneni WHERE idempotency_key = ?").bind(t.idempotencyKey).first<{ kredit_id: string; castka_haleru: number }>();
  if (drive) return json({ ok: true, kreditId: drive.kredit_id, castkaHaleru: drive.castka_haleru, opakovane: true });

  const r = await najdiPodleKodu(env, t.kod ?? "");
  if (!r) throw new ChybaHttp(404, "Neznámý kód.");
  if (r.stav !== "ACTIVE") throw new ChybaHttp(409, `Kredit není aktivní (${r.stav}).`);
  const castka = Number.isInteger(t.castkaHaleru) && t.castkaHaleru! > 0 ? Math.min(t.castkaHaleru!, r.hodnota_haleru) : r.hodnota_haleru;
  const kdy = ted();
  const vysledky = await env.DB.batch([
    env.DB.prepare("UPDATE kredity SET stav = 'REDEEMED', uplatneno = ?, uplatneno_objednavka = ? WHERE id = ? AND stav = 'ACTIVE'").bind(kdy, t.objednavkaId, r.id),
    env.DB.prepare("INSERT INTO kredit_uplatneni (id, kredit_id, objednavka_id, castka_haleru, kdy, idempotency_key) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), r.id, t.objednavkaId, castka, kdy, t.idempotencyKey),
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, 'eshop', ?, ?)").bind(kdy, `CREDIT_REDEEMED ${maskuj(r.kod_posledni4)} ${castka} h`, r.id),
  ]);
  if ((vysledky[0]?.meta?.changes ?? 0) !== 1) throw new ChybaHttp(409, "Kredit byl mezitím uplatněn.");
  return json({ ok: true, kreditId: r.id, castkaHaleru: castka, mena: r.mena });
}

/* ---------- správa ---------- */

export async function seznam(env: Env, ucet: Prihlaseny): Promise<Response> {
  await vyzadujPravo(env, ucet, "platby.cist");
  const { results } = await env.DB.prepare(
    "SELECT id, kod_posledni4, ucet_id, platba_id, hodnota_haleru, mena, stav, vytvoreno, expirace, uplatneno, uplatneno_objednavka, vydal, nahrada_za_id, nahrazen_id, duvod FROM kredity ORDER BY vytvoreno DESC LIMIT 500",
  ).all<RadekKreditu>();
  // Správce vidí masku, ne kód. Kód je pro člověka, kterému patří.
  return json({ kredity: results.map((r) => ({ ...r, maska: maskuj(r.kod_posledni4), kod_posledni4: undefined })) });
}

/** Náhradní kód: starý REPLACED, nový ACTIVE, propojené, důvod povinný, e-mail jako úloha. */
export async function nahradit(env: Env, req: Request, ucet: Prihlaseny, id: string): Promise<Response> {
  await vyzadujPravo(env, ucet, "kredity.nahradit");
  const { duvod, poznamka } = await telo<{ duvod?: string; poznamka?: string }>(req);
  if (!DUVODY_NAHRADY.includes(duvod as DuvodNahrady)) throw new ChybaHttp(400, "Důvod musí být jeden z: " + DUVODY_NAHRADY.join(", "));
  const r = await env.DB.prepare("SELECT * FROM kredity WHERE id = ?").bind(id).first<RadekKreditu>();
  if (!r) throw new ChybaHttp(404, "Kredit nenalezen.");
  if (r.stav !== "ACTIVE") throw new ChybaHttp(409, `Nahradit lze jen aktivní kredit; tento je ${r.stav}.`);
  const novy = await pripravVydani(env, {
    ucetId: r.ucet_id, platbaId: r.platba_id, hodnotaHaleru: r.hodnota_haleru, mena: r.mena, vydal: ucet.id,
    duvod: `${duvod}${poznamka ? `: ${poznamka.slice(0, 300)}` : ""}`, nahradaZaId: r.id,
  });
  const email = await emailUctu(env, r.ucet_id);
  const prikazy: D1PreparedStatement[] = [
    env.DB.prepare("UPDATE kredity SET stav = 'REPLACED', nahrazen_id = ? WHERE id = ? AND stav = 'ACTIVE'").bind(novy.id, r.id),
    novy.prikaz,
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(ted(), ucet.id, `CREDIT_REPLACED ${maskuj(r.kod_posledni4)} → ${maskuj(novy.posledni4)} (${duvod})`, r.ucet_id),
  ];
  if (email) prikazy.push((await pripravEmail(env, { ucetId: r.ucet_id, druh: "kredit-nahrada", kreditId: novy.id, adresa: email })).prikaz);
  const v = await env.DB.batch(prikazy);
  if ((v[0]?.meta?.changes ?? 0) !== 1) throw new ChybaHttp(409, "Kredit se mezitím změnil.");
  return json({ ok: true, novyId: novy.id, maska: maskuj(novy.posledni4) }, 201);
}

/** Ruční kredit bez platby — jen se zvláštním právem, s důvodem, v auditu. */
export async function rucni(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  await vyzadujPravo(env, ucet, "kredity.vydat_rucne");
  const t = await telo<{ ucetId?: string; hodnotaHaleru?: number; duvod?: string; poznamka?: string }>(req);
  const duvod = (t.duvod ?? "").trim().slice(0, 300);
  if (!t.ucetId || !duvod) throw new ChybaHttp(400, "Chybí účet nebo důvod.");
  if (!Number.isInteger(t.hodnotaHaleru) || t.hodnotaHaleru! <= 0 || t.hodnotaHaleru! > 1_000_000) throw new ChybaHttp(400, "Hodnota musí být celé haléře, do 10 000 Kč.");
  const cil = await env.DB.prepare("SELECT id FROM ucty WHERE id = ? AND smazano IS NULL").bind(t.ucetId).first();
  if (!cil) throw new ChybaHttp(404, "Účet neexistuje.");
  const k = await pripravVydani(env, { ucetId: t.ucetId, platbaId: null, hodnotaHaleru: t.hodnotaHaleru!, vydal: ucet.id, duvod, metadata: t.poznamka ? { poznamka: t.poznamka.slice(0, 500) } : null });
  const email = await emailUctu(env, t.ucetId);
  const prikazy: D1PreparedStatement[] = [
    k.prikaz,
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(ted(), ucet.id, `ADMIN_MANUAL_CREDIT ${maskuj(k.posledni4)} ${t.hodnotaHaleru} h (${duvod})`, t.ucetId),
  ];
  if (email) prikazy.push((await pripravEmail(env, { ucetId: t.ucetId, druh: "kredit-vydan", kreditId: k.id, adresa: email })).prikaz);
  await env.DB.batch(prikazy);
  return json({ ok: true, id: k.id, maska: maskuj(k.posledni4) }, 201);
}

/** Zneplatnění (např. při refundu nebo úniku kódu). Jen z ACTIVE. */
export async function zneplatnit(env: Env, req: Request, ucet: Prihlaseny, id: string): Promise<Response> {
  await vyzadujPravo(env, ucet, "kredity.nahradit");
  const { duvod } = await telo<{ duvod?: string }>(req);
  const d = (duvod ?? "").trim().slice(0, 300);
  if (!d) throw new ChybaHttp(400, "Důvod je povinný.");
  const r = await env.DB.prepare("SELECT ucet_id, stav, kod_posledni4 FROM kredity WHERE id = ?").bind(id).first<{ ucet_id: string; stav: string; kod_posledni4: string }>();
  if (!r) throw new ChybaHttp(404, "Kredit nenalezen.");
  if (r.stav !== "ACTIVE") throw new ChybaHttp(409, `Kredit není aktivní (${r.stav}).`);
  const v = await env.DB.batch([
    env.DB.prepare("UPDATE kredity SET stav = 'REVOKED', duvod = ? WHERE id = ? AND stav = 'ACTIVE'").bind(d, id),
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(ted(), ucet.id, `CREDIT_REVOKED ${maskuj(r.kod_posledni4)} (${d})`, r.ucet_id),
  ]);
  if ((v[0]?.meta?.changes ?? 0) !== 1) throw new ChybaHttp(409, "Kredit se mezitím změnil.");
  return json({ ok: true });
}
