import { omez } from "./limit";
import { ChybaHttp, json, nahodnyToken, sha256, ted, telo } from "./pomocne";
import { desifruj, sifrovaniNastaveno, zasifruj } from "./sifrovani";
import type { Env, Prihlaseny } from "./typy";
import { platnyEmail } from "./emaily";

/*
  Žebříček připravenosti.

  Veřejně: přezdívka (vygenerovaná, ne zadaná — nikdo do ní nenapíše jméno),
  skóre 0–100 a datum. Nic dalšího. Kontakt (e-mail a telefon) se ukládá
  šifrovaně, čte ho jen správce a slouží ke dvěma věcem, které web říká
  nahlas u formuláře: pozvání do komunity a upozornění na kritickou
  událost, o kterém rozhoduje člověk. Stejný e-mail = jeden záznam, nové
  vyplnění ho přepíše (skóre i datum), takže se nedá „dostat výš“ opakováním.

  Skóre počítá web z auditu domácnosti (src/lib/odolnost.ts, skore()).
  API mu věří jen v rozsahu 0–100 — je to hra pro srovnání, ne doklad.
*/

export const VERZE_SOUHLASU_ZEBRICKU = "2026-09-22";
const VEREJNE_MAX = 50;

/*
  Přezdívka ze dvou seznamů + číslo: „Bdělý ježek 47“. Slova jsou
  neutrální a bez vazby na osobu; číslo brání shodám.
*/
const PRIDAVNA = ["Bdělý", "Klidný", "Pozorný", "Tichý", "Pevný", "Rozvážný", "Připravený", "Vytrvalý", "Obezřetný", "Stálý", "Trpělivý", "Svědomitý", "Ostražitý", "Zkušený", "Bystrý", "Rázný"];
const ZVIRATA = ["ježek", "jezevec", "rys", "sýkora", "kuna", "jelen", "výr", "vydra", "čáp", "zajíc", "krkavec", "los", "bobr", "sokol", "srnec", "datel"];

export function novaPrezdivka(nahoda: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  return `${PRIDAVNA[nahoda(PRIDAVNA.length)]} ${ZVIRATA[nahoda(ZVIRATA.length)]} ${10 + nahoda(90)}`;
}

/** Střízlivá kontrola telefonu: +420 a 9 číslic, nebo mezinárodní tvar. */
export function platnyTelefon(t: string): boolean {
  const c = t.replace(/[\s()-]/g, "");
  return /^\+\d{9,15}$/.test(c) || /^\d{9}$/.test(c);
}
export const normalizujTelefon = (t: string) => { const c = t.replace(/[\s()-]/g, ""); return /^\d{9}$/.test(c) ? `+420${c}` : c; };

export function bezi(env: Env): boolean {
  return sifrovaniNastaveno(env);
}

export async function verejny(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT prezdivka, skore, vytvoreno, kraj FROM zebricek ORDER BY skore DESC, vytvoreno ASC LIMIT ?").bind(VEREJNE_MAX).all<{ prezdivka: string; skore: number; vytvoreno: string; kraj: string | null }>();
  const pocet = (await env.DB.prepare("SELECT COUNT(*) AS n, AVG(skore) AS prumer FROM zebricek").first<{ n: number; prumer: number | null }>()) ?? { n: 0, prumer: null };
  return json({
    bezi: bezi(env),
    pocet: pocet.n,
    prumer: pocet.prumer === null ? null : Math.round(pocet.prumer),
    zaznamy: results.map((r) => ({ prezdivka: r.prezdivka, skore: r.skore, datum: r.vytvoreno.slice(0, 10), kraj: r.kraj })),
  });
}

export async function prijmi(env: Env, req: Request): Promise<Response> {
  if (!bezi(env)) throw new ChybaHttp(503, "Žebříček připravujeme.");
  await omez(env, req, "zebricek", 5, 60);
  const t = await telo<{ skore?: number; kraj?: string; osob?: number; souhrn?: unknown; email?: string; telefon?: string; souhlas?: boolean; past?: string }>(req);
  if (t.past) return json({ ok: true, prezdivka: novaPrezdivka() });
  const skore = Number(t.skore);
  if (!Number.isInteger(skore) || skore < 0 || skore > 100) throw new ChybaHttp(400, "Skóre musí být celé číslo 0–100.");
  const email = (t.email ?? "").trim().toLowerCase();
  if (!platnyEmail(email)) throw new ChybaHttp(400, "Zadejte prosím platný e-mail.");
  if (!platnyTelefon(t.telefon ?? "")) throw new ChybaHttp(400, "Zadejte prosím telefon, např. +420 777 123 456.");
  if (t.souhlas !== true) throw new ChybaHttp(400, "Bez souhlasu záznam neuložíme.");
  const kraj = typeof t.kraj === "string" ? t.kraj.toLowerCase().replace(/[^a-z-]/g, "").slice(0, 30) || null : null;
  const osob = Number.isInteger(t.osob) && t.osob! >= 0 && t.osob! < 100 ? t.osob! : null;
  const souhrn = t.souhrn && typeof t.souhrn === "object" ? JSON.stringify(t.souhrn).slice(0, 2000) : null;
  const otisk = await sha256(`zebricek|${email}`);
  const kdy = ted();
  const stavajici = await env.DB.prepare("SELECT id, prezdivka FROM zebricek WHERE email_otisk = ?").bind(otisk).first<{ id: string; prezdivka: string }>();
  if (stavajici) {
    await env.DB.prepare("UPDATE zebricek SET vytvoreno = ?, skore = ?, kraj = ?, osob = ?, souhrn = ?, telefon_sifrovany = ?, souhlas_kdy = ?, souhlas_verze = ? WHERE id = ?")
      .bind(kdy, skore, kraj, osob, souhrn, await zasifruj(env, normalizujTelefon(t.telefon!)), kdy, VERZE_SOUHLASU_ZEBRICKU, stavajici.id).run();
    return json({ ok: true, prezdivka: stavajici.prezdivka, opakovane: true });
  }
  const prezdivka = novaPrezdivka();
  await env.DB.prepare(
    "INSERT INTO zebricek (id, vytvoreno, prezdivka, skore, kraj, osob, souhrn, email_otisk, email_sifrovany, telefon_sifrovany, souhlas_kdy, souhlas_verze, stav, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'novy', ?)",
  ).bind(crypto.randomUUID(), kdy, prezdivka, skore, kraj, osob, souhrn, otisk, await zasifruj(env, email), await zasifruj(env, normalizujTelefon(t.telefon!)), kdy, VERZE_SOUHLASU_ZEBRICKU, nahodnyToken(16)).run();
  return json({ ok: true, prezdivka }, 201);
}

/** Smazání záznamu tokenem (odkaz, který člověk dostane e-mailem, až e-maily poběží) — nebo správcem. */
export async function smaz(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "zebricek-smazat", 10, 60);
  const { token } = await telo<{ token?: string }>(req);
  if (!token) throw new ChybaHttp(400, "Chybí odkaz.");
  await env.DB.prepare("DELETE FROM zebricek WHERE token = ?").bind(token).run();
  return json({ ok: true });
}

/* ---------- správa: kontakt vidí jen správce ---------- */

export async function prehled(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { results } = await env.DB.prepare("SELECT id, vytvoreno, prezdivka, skore, kraj, osob, email_sifrovany, telefon_sifrovany, souhlas_kdy, souhlas_verze, stav, poznamka FROM zebricek ORDER BY vytvoreno DESC LIMIT 1000")
    .all<{ id: string; vytvoreno: string; prezdivka: string; skore: number; kraj: string | null; osob: number | null; email_sifrovany: string; telefon_sifrovany: string; souhlas_kdy: string; souhlas_verze: string; stav: string; poznamka: string | null }>();
  const zaznamy = [];
  for (const r of results) {
    zaznamy.push({ id: r.id, vytvoreno: r.vytvoreno, prezdivka: r.prezdivka, skore: r.skore, kraj: r.kraj, osob: r.osob, email: await desifruj(env, r.email_sifrovany), telefon: await desifruj(env, r.telefon_sifrovany), souhlasKdy: r.souhlas_kdy, souhlasVerze: r.souhlas_verze, stav: r.stav, poznamka: r.poznamka });
  }
  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, 'ZEBRICEK_KONTAKTY_CTENY', ?)").bind(ted(), ucet.id, String(zaznamy.length)).run();
  return json({ zaznamy });
}

export async function vyrid(env: Env, req: Request, ucet: Prihlaseny, id: string): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { stav, poznamka, smazat } = await telo<{ stav?: string; poznamka?: string; smazat?: boolean }>(req);
  if (smazat) {
    await env.DB.prepare("DELETE FROM zebricek WHERE id = ?").bind(id).run();
    await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, 'ZEBRICEK_ZAZNAM_SMAZAN', ?)").bind(ted(), ucet.id, id).run();
    return json({ ok: true });
  }
  const s = ["novy", "pozvan", "clen", "nezajem"].includes(stav ?? "") ? stav! : "novy";
  await env.DB.prepare("UPDATE zebricek SET stav = ?, poznamka = ? WHERE id = ?").bind(s, (poznamka ?? "").slice(0, 300) || null, id).run();
  return json({ ok: true });
}
