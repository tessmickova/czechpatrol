import { pripravEmail, emailUctu } from "./emaily";
import { pripravVydani } from "./kredity";
import { omez } from "./limit";
import { maOpravneni, pripravUdeleni } from "./opravneni";
import { ChybaHttp, json, sha256, stejne, ted, telo } from "./pomocne";
import { osobniUdajePovoleny } from "./osobni-udaje";
import { vyzadujPravo } from "./prava";
import { sifrovaniNastaveno } from "./sifrovani";
import { jeProdukt, PRODUKTY, type Env, type Prihlaseny, type Produkt } from "./typy";

/*
  Platby — server je autorita, brána je Comgate (jeden účet s e-shopem).

  Tok: POST /platby/zacit založí řádek CREATED s vlastním idempotency
  klíčem, zavolá bránu (create) → PENDING + adresa platební stránky.
  Návrat z brány na web nic neodemyká; web jen čte stav z API.
  Brána pošle push na /platby/webhook/comgate: ověří se tajemství
  (porovnání bez úniku času) a pak se stav POTVRDÍ vlastním dotazem
  /status — push sám o sobě není pravda. Přechod na PAID je jedna dávka:
  platba PAID + oprávnění + kredit + e-mailová úloha + audit. Idempotence:
  UNIQUE (provider, provider_payment_id) a UNIQUE (zdroj_druh, zdroj_id)
  u oprávnění — dva souběžné webhooky nemohou odemknout dvakrát, druhá
  dávka selže celá a vrátí se 200 bez zápisu.

  Bez tajemství brány a šifrovacího klíče se nic nespustí a web říká
  „připravujeme“. Testovací režim brány je výchozí, dokud COMGATE_TEST
  není výslovně "false".
*/

const COMGATE = "https://payments.comgate.cz/v1.0";
const PROVIDER = "comgate";
/** Kolik minut po založení se PENDING platba dotáže na stav sama (ztracený webhook). */
const DOTAZ_PO_MIN = 10;
const DOTAZ_DO_DNI = 7;

export function bezi(env: Env): boolean {
  // Platby mají vlastní vypínač PLATBY = "ano" (24. 9. 2026: provozovatel je
  // uvedený, ale platby se spustí až po jeho další změně). Nestačí klíč brány
  // ani povolené osobní údaje — chybí podmínky a poučení o odstoupení (P0-15).
  return env.PLATBY === "ano" && Boolean(env.COMGATE_MERCHANT && env.COMGATE_SECRET) && sifrovaniNastaveno(env) && osobniUdajePovoleny(env);
}
const testovaci = (env: Env) => env.COMGATE_TEST !== "false";

/** Veřejně: co Premium stojí, co vrací a jestli jde zaplatit. Web z toho čte, nic neopisuje. */
export async function verejne(env: Env): Promise<Response> {
  const p = PRODUKTY["premium-odolnost"];
  return json({ bezi: bezi(env), test: bezi(env) ? testovaci(env) : null, produkt: "premium-odolnost", nazev: p.nazev, cenaHaleru: p.cenaHaleru, kreditHaleru: p.kreditHaleru, mena: p.mena, eshopBezi: Boolean(env.ESHOP_TOKEN) });
}

async function volejComgate(env: Env, cesta: string, param: Record<string, string>): Promise<URLSearchParams> {
  const r = await fetch(`${COMGATE}${cesta}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ merchant: env.COMGATE_MERCHANT!, secret: env.COMGATE_SECRET!, ...param }).toString(),
  });
  return new URLSearchParams(await r.text());
}

/* ---------- založení ---------- */

export async function zacit(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  if (!bezi(env)) throw new ChybaHttp(503, "Platby připravujeme. Zatím nejde odemknout.");
  await omez(env, req, "platba-zacit", 5, 30);
  const { produkt } = await telo<{ produkt?: string }>(req);
  const p: Produkt = jeProdukt(produkt) ? produkt : "premium-odolnost";
  if (await maOpravneni(env, ucet.id, p)) throw new ChybaHttp(409, "Tohle už máte odemčené.");

  // Rozpracovaná platba mladší než hodinu: vrátíme stejnou adresu, nezakládáme další.
  const rozpracovana = await env.DB.prepare("SELECT id, presmerovani FROM platby WHERE ucet_id = ? AND produkt = ? AND stav = 'PENDING' AND vytvoreno > ? ORDER BY vytvoreno DESC LIMIT 1")
    .bind(ucet.id, p, new Date(Date.now() - 3_600_000).toISOString())
    .first<{ id: string; presmerovani: string | null }>();
  if (rozpracovana?.presmerovani) return json({ id: rozpracovana.id, presmerovani: rozpracovana.presmerovani, opakovane: true });

  const cena = PRODUKTY[p];
  const id = crypto.randomUUID();
  const kdy = ted();
  await env.DB.prepare(
    "INSERT INTO platby (id, ucet_id, produkt, castka_haleru, mena, provider, idempotency_key, stav, vytvoreno, aktualizovano) VALUES (?, ?, ?, ?, ?, ?, ?, 'CREATED', ?, ?)",
  ).bind(id, ucet.id, p, cena.cenaHaleru, cena.mena, PROVIDER, crypto.randomUUID(), kdy, kdy).run();

  const navrat = `${env.PUVOD_WEBU}/odolnost/platba/?id=${id}`;
  let odpoved: URLSearchParams;
  try {
    odpoved = await volejComgate(env, "/create", {
      test: testovaci(env) ? "true" : "false",
      price: String(cena.cenaHaleru),
      curr: cena.mena,
      label: "CP-PREMIUM",
      refId: id,
      method: "ALL",
      email: (await emailUctu(env, ucet.id)) ?? "neuvedeno@czechpatrol.cz",
      prepareOnly: "true",
      lang: "cs",
      url_paid: navrat,
      url_cancelled: navrat,
      url_pending: navrat,
    });
  } catch (e) {
    await env.DB.prepare("UPDATE platby SET stav = 'FAILED', posledni_chyba = ?, aktualizovano = ? WHERE id = ?").bind(`brána nedostupná: ${e instanceof Error ? e.message : "?"}`.slice(0, 300), ted(), id).run();
    throw new ChybaHttp(502, "Platební brána teď neodpovídá. Zkuste to za chvíli; nic vám nebylo účtováno.");
  }
  const transId = odpoved.get("transId");
  const presmerovani = odpoved.get("redirect");
  if (odpoved.get("code") !== "0" || !transId || !presmerovani) {
    await env.DB.prepare("UPDATE platby SET stav = 'FAILED', posledni_chyba = ?, aktualizovano = ? WHERE id = ?").bind(`create: code=${odpoved.get("code")} ${odpoved.get("message") ?? ""}`.slice(0, 300), ted(), id).run();
    throw new ChybaHttp(502, "Platbu se nepodařilo založit u brány. Nic vám nebylo účtováno.");
  }
  await env.DB.prepare("UPDATE platby SET stav = 'PENDING', provider_payment_id = ?, presmerovani = ?, aktualizovano = ? WHERE id = ? AND stav = 'CREATED'").bind(transId, presmerovani, ted(), id).run();
  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, 'PAYMENT_CREATED', ?)").bind(ted(), ucet.id, id).run();
  return json({ id, presmerovani }, 201);
}

/* ---------- stav (pro návratovou stránku) ---------- */

export async function stav(env: Env, ucet: Prihlaseny, id: string): Promise<Response> {
  const r = await env.DB.prepare("SELECT id, produkt, castka_haleru, mena, stav, vytvoreno, zaplaceno FROM platby WHERE id = ? AND ucet_id = ?").bind(id, ucet.id).first();
  if (!r) throw new ChybaHttp(404, "Platba nenalezena.");
  return json({ platba: r, premium: await maOpravneni(env, ucet.id, "premium-odolnost") });
}

/* ---------- zpracování potvrzeného stavu ---------- */

export type StavBrany = "PENDING" | "PAID" | "CANCELLED" | "AUTHORIZED" | string;

/** Čistý přechod stavů — testovatelný. null = žádná změna. */
export function prechod(dnes: string, uBrany: StavBrany): "PAID" | "CANCELLED" | null {
  if (dnes === "PAID" || dnes === "REFUNDED" || dnes === "PARTIALLY_REFUNDED") return null;
  if (uBrany === "PAID") return dnes === "CREATED" || dnes === "PENDING" ? "PAID" : null;
  if (uBrany === "CANCELLED") return dnes === "CREATED" || dnes === "PENDING" ? "CANCELLED" : null;
  return null;
}

interface RadekPlatby { id: string; ucet_id: string; produkt: Produkt; castka_haleru: number; mena: string; stav: string; provider_payment_id: string | null }

/**
 * Použije potvrzený stav od brány na platbu. Na PAID: jedna dávka
 * (platba, oprávnění, kredit, e-mail, audit). Vrací, co se stalo.
 */
export async function pouzijStav(env: Env, platba: RadekPlatby, uBrany: StavBrany, cenaUBrany: number | null, menaUBrany: string | null): Promise<"PAID" | "CANCELLED" | "beze-zmeny" | "nesedi-castka"> {
  const dalsi = prechod(platba.stav, uBrany);
  if (!dalsi) return "beze-zmeny";
  const kdy = ted();
  if (dalsi === "CANCELLED") {
    await env.DB.batch([
      env.DB.prepare("UPDATE platby SET stav = 'CANCELLED', aktualizovano = ? WHERE id = ? AND stav IN ('CREATED','PENDING')").bind(kdy, platba.id),
      env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, 'system', 'PAYMENT_CANCELLED', ?)").bind(kdy, platba.id),
    ]);
    return "CANCELLED";
  }
  // Částka a měna musí sedět s tím, co jsme založili; jinak se nic neodemyká a správce to vidí.
  if (cenaUBrany !== null && (cenaUBrany !== platba.castka_haleru || (menaUBrany ?? platba.mena) !== platba.mena)) {
    await env.DB.prepare("UPDATE platby SET vyzaduje_rozhodnuti = 1, posledni_chyba = ?, aktualizovano = ? WHERE id = ?")
      .bind(`brána hlásí ${cenaUBrany} ${menaUBrany ?? "?"}, založeno ${platba.castka_haleru} ${platba.mena}`, kdy, platba.id).run();
    return "nesedi-castka";
  }
  const produkt = PRODUKTY[platba.produkt];
  const opr = pripravUdeleni(env, { ucetId: platba.ucet_id, produkt: platba.produkt, druh: "jednorazove", zdrojDruh: "platba", zdrojId: platba.id });
  const kredit = await pripravVydani(env, { ucetId: platba.ucet_id, platbaId: platba.id, hodnotaHaleru: produkt.kreditHaleru, mena: produkt.mena, vydal: "system" });
  const email = await emailUctu(env, platba.ucet_id);
  const prikazy: D1PreparedStatement[] = [
    env.DB.prepare("UPDATE platby SET stav = 'PAID', zaplaceno = ?, aktualizovano = ? WHERE id = ? AND stav IN ('CREATED','PENDING')").bind(kdy, kdy, platba.id),
    opr.prikaz,
    kredit.prikaz,
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, 'system', 'PAYMENT_RECEIVED', ?)").bind(kdy, platba.id),
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, 'system', ?, ?)").bind(kdy, `ENTITLEMENT_GRANTED ${platba.produkt}`, platba.ucet_id),
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, 'system', ?, ?)").bind(kdy, `CREDIT_CREATED CP-****-${kredit.posledni4}`, platba.ucet_id),
  ];
  if (email) prikazy.push((await pripravEmail(env, { ucetId: platba.ucet_id, druh: "kredit-vydan", kreditId: kredit.id, adresa: email })).prikaz);
  try {
    await env.DB.batch(prikazy);
  } catch (e) {
    // Souběžný webhook už odemkl (UNIQUE na zdroji oprávnění): to není chyba, jen opakování.
    if (/UNIQUE/i.test(e instanceof Error ? e.message : String(e))) return "beze-zmeny";
    throw e;
  }
  return "PAID";
}

async function stavUBrany(env: Env, transId: string): Promise<{ stav: StavBrany; cena: number | null; mena: string | null; refId: string | null } | null> {
  const s = await volejComgate(env, "/status", { transId });
  if (s.get("code") !== "0") return null;
  const cena = Number(s.get("price"));
  return { stav: s.get("status") ?? "", cena: Number.isSafeInteger(cena) ? cena : null, mena: s.get("curr"), refId: s.get("refId") };
}

/* ---------- webhook ---------- */

export async function webhookComgate(env: Env, req: Request): Promise<Response> {
  if (!bezi(env)) return json({ chyba: "Platby nejsou zapnuté." }, 503);
  const surove = await req.text();
  const push = new URLSearchParams(surove);
  const transId = push.get("transId");
  const tajemstvi = push.get("secret") ?? "";
  // Surový push se zapíše vždy (forenzika), i když neprojde ověřením.
  const platba = transId ? await env.DB.prepare("SELECT id, ucet_id, produkt, castka_haleru, mena, stav, provider_payment_id FROM platby WHERE provider = ? AND provider_payment_id = ?").bind(PROVIDER, transId).first<RadekPlatby>() : null;
  const udalost = await env.DB.prepare("INSERT INTO platby_udalosti (platba_id, prijato, provider, telo_otisk, stav_u_brany) VALUES (?, ?, ?, ?, ?)")
    .bind(platba?.id ?? null, ted(), PROVIDER, await sha256(surove), push.get("status")).run();
  void udalost;
  if (!transId || !stejne(tajemstvi, env.COMGATE_SECRET!)) return json({ chyba: "Neověřeno." }, 403);
  if (!platba) return json({ chyba: "Neznámá platba." }, 404);
  const s = await stavUBrany(env, transId);
  if (!s) return json({ chyba: "Stav u brány nejde ověřit." }, 502);
  const v = await pouzijStav(env, platba, s.stav, s.cena, s.mena);
  await env.DB.prepare("UPDATE platby_udalosti SET zpracovano = 1 WHERE platba_id = ? AND zpracovano = 0").bind(platba.id).run();
  return json({ ok: true, vysledek: v });
}

/* ---------- cron: ztracený webhook ---------- */

export async function zkontrolujCekajici(env: Env): Promise<{ zkontrolovano: number; zmeneno: number }> {
  if (!bezi(env)) return { zkontrolovano: 0, zmeneno: 0 };
  const { results } = await env.DB.prepare("SELECT id, ucet_id, produkt, castka_haleru, mena, stav, provider_payment_id FROM platby WHERE stav = 'PENDING' AND vytvoreno < ? AND vytvoreno > ? LIMIT 20")
    .bind(new Date(Date.now() - DOTAZ_PO_MIN * 60_000).toISOString(), new Date(Date.now() - DOTAZ_DO_DNI * 86_400_000).toISOString())
    .all<RadekPlatby>();
  let zmeneno = 0;
  for (const p of results) {
    if (!p.provider_payment_id) continue;
    try {
      const s = await stavUBrany(env, p.provider_payment_id);
      if (!s) continue;
      const v = await pouzijStav(env, p, s.stav, s.cena, s.mena);
      if (v === "PAID" || v === "CANCELLED") zmeneno++;
    } catch (e) {
      console.error("[platby] kontrola", p.id, e);
    }
  }
  return { zkontrolovano: results.length, zmeneno };
}

/* ---------- správa ---------- */

export async function seznam(env: Env, ucet: Prihlaseny): Promise<Response> {
  await vyzadujPravo(env, ucet, "platby.cist");
  const { results } = await env.DB.prepare("SELECT id, ucet_id, produkt, castka_haleru, mena, provider, provider_payment_id, stav, vraceno_haleru, vyzaduje_rozhodnuti, posledni_chyba, vytvoreno, zaplaceno, aktualizovano FROM platby ORDER BY vytvoreno DESC LIMIT 500").all();
  return json({ platby: results, bezi: bezi(env), test: bezi(env) ? testovaci(env) : null });
}

/**
 * Refund správcem. Pravidlo z návrhu: kredit ACTIVE → REVOKED a oprávnění
 * → REVOKED automaticky; kredit už REDEEMED → nic automaticky, platba
 * dostane příznak „vyžaduje rozhodnutí“ (BUSINESS + LEGAL DECISION).
 */
export async function refund(env: Env, req: Request, ucet: Prihlaseny, id: string): Promise<Response> {
  await vyzadujPravo(env, ucet, "kredity.nahradit");
  if (!bezi(env)) throw new ChybaHttp(503, "Platby nejsou zapnuté.");
  const { duvod } = await telo<{ duvod?: string }>(req);
  const d = (duvod ?? "").trim().slice(0, 300);
  if (!d) throw new ChybaHttp(400, "Důvod je povinný.");
  const p = await env.DB.prepare("SELECT id, ucet_id, produkt, castka_haleru, mena, stav, provider_payment_id FROM platby WHERE id = ?").bind(id).first<RadekPlatby>();
  if (!p) throw new ChybaHttp(404, "Platba nenalezena.");
  if (p.stav !== "PAID" || !p.provider_payment_id) throw new ChybaHttp(409, `Vrátit lze jen zaplacenou platbu; tato je ${p.stav}.`);
  const o = await volejComgate(env, "/refund", { transId: p.provider_payment_id, amount: String(p.castka_haleru), curr: p.mena, test: testovaci(env) ? "true" : "false" });
  if (o.get("code") !== "0") throw new ChybaHttp(502, `Brána refund odmítla: ${o.get("message") ?? o.get("code")}`);
  const kredit = await env.DB.prepare("SELECT id, stav, kod_posledni4 FROM kredity WHERE platba_id = ? AND stav IN ('ACTIVE','REDEEMED') ORDER BY vytvoreno DESC LIMIT 1").bind(p.id).first<{ id: string; stav: string; kod_posledni4: string }>();
  const kdy = ted();
  const prikazy: D1PreparedStatement[] = [
    env.DB.prepare("UPDATE platby SET stav = 'REFUNDED', vraceno_haleru = castka_haleru, vyzaduje_rozhodnuti = ?, aktualizovano = ? WHERE id = ?").bind(kredit?.stav === "REDEEMED" ? 1 : 0, kdy, p.id),
    env.DB.prepare("UPDATE opravneni SET stav = 'REVOKED', zruseno = ?, duvod_zruseni = ? WHERE zdroj_druh = 'platba' AND zdroj_id = ? AND stav = 'ACTIVE'").bind(kdy, `refund: ${d}`, p.id),
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(kdy, ucet.id, `REFUND ${p.castka_haleru} h (${d})`, p.id),
  ];
  if (kredit?.stav === "ACTIVE") {
    prikazy.push(env.DB.prepare("UPDATE kredity SET stav = 'REVOKED', duvod = ? WHERE id = ? AND stav = 'ACTIVE'").bind(`refund: ${d}`, kredit.id));
    prikazy.push(env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(kdy, ucet.id, `CREDIT_REVOKED CP-****-${kredit.kod_posledni4} (refund)`, p.ucet_id));
  }
  await env.DB.batch(prikazy);
  return json({ ok: true, kredit: kredit ? kredit.stav === "ACTIVE" ? "zneplatněn" : "byl uplatněn — vyžaduje rozhodnutí" : "žádný" });
}
