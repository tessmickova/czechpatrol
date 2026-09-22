import { platnyEmail } from "./emaily";
import { omez } from "./limit";
import { ChybaHttp, json, ted, telo } from "./pomocne";
import { desifruj, sifrovaniNastaveno, zasifruj } from "./sifrovani";
import type { Env, Prihlaseny } from "./typy";

/*
  Žebříček připravenosti — pro přihlášené anonymní účty.

  Záznam patří účtu (jeden na účet), takže žebříček stojí na něčem, co
  nejde vyrobit obnovením stránky: nové vyplnění přepíše skóre a datum,
  přezdívka zůstává. Přezdívka je vygenerovaná („Bdělý ježek 47“), ne
  zadaná — nikdo do ní nenapíše jméno. Veřejně: přezdívka, skóre, datum,
  kraj. Nic víc.

  Kontakt (e-mail, telefon) je nepovinný, ukládá se šifrovaně, čte ho jen
  správce (každé čtení v auditu) a slouží k pozvání do komunity. Web to
  říká u formuláře; bez šifrovacího klíče se pole ani nenabídnou.

  Skóre počítá web z auditu (src/lib/odolnost.ts, skore()); API mu věří
  jen v rozsahu 0–100 — je to hra pro srovnání, ne doklad.
*/

export const VERZE_SOUHLASU_ZEBRICKU = "2026-09-22";
const VEREJNE_MAX = 50;

const PRIDAVNA = ["Bdělý", "Klidný", "Pozorný", "Tichý", "Pevný", "Rozvážný", "Připravený", "Vytrvalý", "Obezřetný", "Stálý", "Trpělivý", "Svědomitý", "Ostražitý", "Zkušený", "Bystrý", "Rázný"];
const ZVIRATA = ["ježek", "jezevec", "rys", "sýkora", "kuna", "jelen", "výr", "vydra", "čáp", "zajíc", "krkavec", "los", "bobr", "sokol", "srnec", "datel"];

export function novaPrezdivka(nahoda: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  return `${PRIDAVNA[nahoda(PRIDAVNA.length)]} ${ZVIRATA[nahoda(ZVIRATA.length)]} ${10 + nahoda(90)}`;
}

/** Střízlivá kontrola telefonu: 9 číslic (české) nebo mezinárodní tvar. */
export function platnyTelefon(t: string): boolean {
  const c = t.replace(/[\s()-]/g, "");
  return /^\+\d{9,15}$/.test(c) || /^\d{9}$/.test(c);
}
export const normalizujTelefon = (t: string) => { const c = t.replace(/[\s()-]/g, ""); return /^\d{9}$/.test(c) ? `+420${c}` : c; };

export async function verejny(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT prezdivka, skore, aktualizovano, kraj FROM zebricek ORDER BY skore DESC, aktualizovano ASC LIMIT ?").bind(VEREJNE_MAX)
    .all<{ prezdivka: string; skore: number; aktualizovano: string; kraj: string | null }>();
  const pocet = (await env.DB.prepare("SELECT COUNT(*) AS n, AVG(skore) AS prumer FROM zebricek").first<{ n: number; prumer: number | null }>()) ?? { n: 0, prumer: null };
  return json({
    bezi: true,
    kontakt: sifrovaniNastaveno(env),
    pocet: pocet.n,
    prumer: pocet.prumer === null ? null : Math.round(pocet.prumer),
    zaznamy: results.map((r) => ({ prezdivka: r.prezdivka, skore: r.skore, datum: r.aktualizovano.slice(0, 10), kraj: r.kraj })),
  });
}

/** Můj záznam: přezdívka, skóre, pořadí, jestli je uložený kontakt. */
export async function muj(env: Env, ucet: Prihlaseny): Promise<Response> {
  const r = await env.DB.prepare("SELECT prezdivka, skore, aktualizovano, kraj, email_sifrovany, telefon_sifrovany FROM zebricek WHERE ucet_id = ?").bind(ucet.id)
    .first<{ prezdivka: string; skore: number; aktualizovano: string; kraj: string | null; email_sifrovany: string | null; telefon_sifrovany: string | null }>();
  if (!r) return json({ zaznam: null });
  const lepsich = (await env.DB.prepare("SELECT COUNT(*) AS n FROM zebricek WHERE skore > ?").bind(r.skore).first<{ n: number }>())?.n ?? 0;
  return json({ zaznam: { prezdivka: r.prezdivka, skore: r.skore, datum: r.aktualizovano.slice(0, 10), kraj: r.kraj, poradi: lepsich + 1, kontakt: Boolean(r.email_sifrovany || r.telefon_sifrovany) } });
}

export async function uloz(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  await omez(env, req, "zebricek", 10, 60);
  const t = await telo<{ skore?: number; kraj?: string; osob?: number; souhrn?: unknown; email?: string; telefon?: string; souhlas?: boolean }>(req);
  const skore = Number(t.skore);
  if (!Number.isInteger(skore) || skore < 0 || skore > 100) throw new ChybaHttp(400, "Skóre musí být celé číslo 0–100.");
  const kraj = typeof t.kraj === "string" ? t.kraj.toLowerCase().replace(/[^a-z-]/g, "").slice(0, 30) || null : null;
  const osob = Number.isInteger(t.osob) && t.osob! >= 0 && t.osob! < 100 ? t.osob! : null;
  const souhrn = t.souhrn && typeof t.souhrn === "object" ? JSON.stringify(t.souhrn).slice(0, 2000) : null;

  // Kontakt jen s klíčem, jen platný a jen se souhlasem. Prázdný = nic se nemění.
  const email = (t.email ?? "").trim().toLowerCase();
  const telefon = (t.telefon ?? "").trim();
  let emailS: string | null = null;
  let telefonS: string | null = null;
  if (email || telefon) {
    if (!sifrovaniNastaveno(env)) throw new ChybaHttp(503, "Kontakt zatím nejde uložit; do žebříčku se zařadíte i bez něj.");
    if (email && !platnyEmail(email)) throw new ChybaHttp(400, "Zadejte prosím platný e-mail, nebo pole nechte prázdné.");
    if (telefon && !platnyTelefon(telefon)) throw new ChybaHttp(400, "Zadejte prosím telefon, např. +420 777 123 456, nebo pole nechte prázdné.");
    if (t.souhlas !== true) throw new ChybaHttp(400, "Bez souhlasu kontakt neuložíme. Do žebříčku se zařadíte i bez něj.");
    emailS = email ? await zasifruj(env, email) : null;
    telefonS = telefon ? await zasifruj(env, normalizujTelefon(telefon)) : null;
  }
  const kdy = ted();
  const stavajici = await env.DB.prepare("SELECT id, prezdivka FROM zebricek WHERE ucet_id = ?").bind(ucet.id).first<{ id: string; prezdivka: string }>();
  if (stavajici) {
    await env.DB.prepare(
      "UPDATE zebricek SET aktualizovano = ?, skore = ?, kraj = ?, osob = ?, souhrn = ?, email_sifrovany = COALESCE(?, email_sifrovany), telefon_sifrovany = COALESCE(?, telefon_sifrovany), souhlas_kdy = CASE WHEN ? THEN ? ELSE souhlas_kdy END, souhlas_verze = CASE WHEN ? THEN ? ELSE souhlas_verze END WHERE id = ?",
    ).bind(kdy, skore, kraj, osob, souhrn, emailS, telefonS, emailS || telefonS ? 1 : 0, kdy, emailS || telefonS ? 1 : 0, VERZE_SOUHLASU_ZEBRICKU, stavajici.id).run();
    return json({ ok: true, prezdivka: stavajici.prezdivka, opakovane: true });
  }
  const prezdivka = novaPrezdivka();
  await env.DB.prepare(
    "INSERT INTO zebricek (id, ucet_id, vytvoreno, aktualizovano, prezdivka, skore, kraj, osob, souhrn, email_sifrovany, telefon_sifrovany, souhlas_kdy, souhlas_verze, stav) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'novy')",
  ).bind(crypto.randomUUID(), ucet.id, kdy, kdy, prezdivka, skore, kraj, osob, souhrn, emailS, telefonS, emailS || telefonS ? kdy : null, emailS || telefonS ? VERZE_SOUHLASU_ZEBRICKU : null).run();
  return json({ ok: true, prezdivka }, 201);
}

/** Odejít ze žebříčku: záznam i kontakt zmizí hned. */
export async function smaz(env: Env, ucet: Prihlaseny): Promise<Response> {
  await env.DB.prepare("DELETE FROM zebricek WHERE ucet_id = ?").bind(ucet.id).run();
  return json({ ok: true });
}

/* ---------- správa: kontakt vidí jen správce ---------- */

export async function prehled(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { results } = await env.DB.prepare("SELECT id, ucet_id, vytvoreno, aktualizovano, prezdivka, skore, kraj, osob, email_sifrovany, telefon_sifrovany, souhlas_kdy, souhlas_verze, stav, poznamka FROM zebricek ORDER BY aktualizovano DESC LIMIT 1000")
    .all<{ id: string; ucet_id: string; vytvoreno: string; aktualizovano: string; prezdivka: string; skore: number; kraj: string | null; osob: number | null; email_sifrovany: string | null; telefon_sifrovany: string | null; souhlas_kdy: string | null; souhlas_verze: string | null; stav: string; poznamka: string | null }>();
  const zaznamy = [];
  let kontaktu = 0;
  for (const r of results) {
    const email = r.email_sifrovany && sifrovaniNastaveno(env) ? await desifruj(env, r.email_sifrovany) : null;
    const telefon = r.telefon_sifrovany && sifrovaniNastaveno(env) ? await desifruj(env, r.telefon_sifrovany) : null;
    if (email || telefon) kontaktu++;
    zaznamy.push({ id: r.id, ucetId: r.ucet_id, vytvoreno: r.vytvoreno, aktualizovano: r.aktualizovano, prezdivka: r.prezdivka, skore: r.skore, kraj: r.kraj, osob: r.osob, email, telefon, souhlasKdy: r.souhlas_kdy, souhlasVerze: r.souhlas_verze, stav: r.stav, poznamka: r.poznamka });
  }
  if (kontaktu) await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, 'ZEBRICEK_KONTAKTY_CTENY', ?)").bind(ted(), ucet.id, String(kontaktu)).run();
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
