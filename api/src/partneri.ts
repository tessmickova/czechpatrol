import { omez } from "./limit";
import { ChybaHttp, json, ted, telo } from "./pomocne";
import { vyzadujOsobniUdaje } from "./osobni-udaje";
import { platnyEmail } from "./zajem";
import type { Env, Prihlaseny } from "./typy";

/*
  Poptávka partnera o banner (26. 9. 2026).

  Krátký formulář bez účtu: firma, web, kontakt, obor, umístění, období
  a pár vět. Nic se nezveřejňuje samo — každou poptávku posoudí správce
  podle zásad na /partneri/ (jen relevantní služby, žádné poplašné
  sdělení, označeno jako partner). Platby zatím nejsou; stav „schvaleno“
  a sloupce cena_kc / platba_id jsou připravené pro napojení brány.
*/

export const KATEGORIE = ["pripravenost", "bezpecnost", "zdravi", "energie", "komunikace", "vzdelavani", "jine"] as const;
export const UMISTENI = ["paticka", "uvod", "oboje"] as const;
export const OBDOBI = ["mesic", "ctvrtleti", "rok", "jednorazove"] as const;
export const STAVY = ["nova", "v-jednani", "schvaleno", "zamitnuto", "vyrizeno"] as const;
/** Verze textu souhlasu na /partneri/. Změna textu = nová verze tady i tam. */
export const VERZE_SOUHLASU_PARTNERI = "2026-09-26";

export interface Poptavka {
  firma: string;
  web: string;
  email: string;
  kategorie: (typeof KATEGORIE)[number];
  umisteni: (typeof UMISTENI)[number];
  obdobi: (typeof OBDOBI)[number];
  zprava: string | null;
}

const jeZ = <T extends readonly string[]>(xs: T, v: unknown): v is T[number] => typeof v === "string" && (xs as readonly string[]).includes(v);

/** Kontrola vstupu. Vrací čistou poptávku, nebo hází srozumitelnou chybu. */
export function zkontrolujPoptavku(t: Record<string, unknown>): Poptavka {
  const firma = String(t.firma ?? "").trim().slice(0, 120);
  if (firma.length < 2) throw new ChybaHttp(400, "Uveďte prosím název firmy nebo projektu.");
  let web = String(t.web ?? "").trim().slice(0, 200);
  if (web && !/^https?:\/\//i.test(web)) web = `https://${web}`;
  try {
    const u = new URL(web);
    if (!/\./.test(u.hostname)) throw new Error();
  } catch {
    throw new ChybaHttp(400, "Uveďte prosím adresu webu, kam má banner vést.");
  }
  const email = String(t.email ?? "").trim().toLowerCase();
  if (!platnyEmail(email)) throw new ChybaHttp(400, "Zadejte prosím platný kontaktní e-mail.");
  if (!jeZ(KATEGORIE, t.kategorie)) throw new ChybaHttp(400, "Vyberte prosím obor.");
  if (!jeZ(UMISTENI, t.umisteni)) throw new ChybaHttp(400, "Vyberte prosím umístění.");
  if (!jeZ(OBDOBI, t.obdobi)) throw new ChybaHttp(400, "Vyberte prosím období.");
  const zprava = String(t.zprava ?? "").trim().slice(0, 800) || null;
  return { firma, web, email, kategorie: t.kategorie, umisteni: t.umisteni, obdobi: t.obdobi, zprava };
}

export async function prijmi(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "partneri", 3, 60);
  const t = await telo<Record<string, unknown>>(req);
  // Skryté pole „past" vyplňují jen roboti.
  if (t.past) return json({ ok: true });
  vyzadujOsobniUdaje(env);
  if (t.souhlas !== true) throw new ChybaHttp(400, "Bez souhlasu poptávku neuložíme.");
  const p = zkontrolujPoptavku(t);
  await env.DB.prepare(
    "INSERT INTO poptavky_partneru (id, vytvoreno, firma, web, email, kategorie, umisteni, obdobi, zprava, souhlas_kdy, souhlas_verze, stav) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nova')",
  ).bind(crypto.randomUUID(), ted(), p.firma, p.web, p.email, p.kategorie, p.umisteni, p.obdobi, p.zprava, ted(), VERZE_SOUHLASU_PARTNERI).run();
  return json({ ok: true }, 201);
}

/** Pro správce: poptávky od nejnovější. */
export async function prehled(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { results } = await env.DB
    .prepare("SELECT id, vytvoreno, firma, web, email, kategorie, umisteni, obdobi, zprava, stav, cena_kc, poznamka, zmeneno FROM poptavky_partneru ORDER BY vytvoreno DESC LIMIT 500")
    .all();
  return json({ poptavky: results });
}

/** Pro správce: změna stavu a poznámka. Platba se sem napojí později. */
export async function zmenStav(env: Env, ucet: Prihlaseny, req: Request, id: string): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const t = await telo<{ stav?: unknown; poznamka?: unknown }>(req);
  if (!jeZ(STAVY, t.stav)) throw new ChybaHttp(400, "Neznámý stav.");
  const poznamka = typeof t.poznamka === "string" ? t.poznamka.trim().slice(0, 500) || null : null;
  const r = await env.DB.prepare("UPDATE poptavky_partneru SET stav = ?, poznamka = COALESCE(?, poznamka), zmeneno = ? WHERE id = ?").bind(t.stav, poznamka, ted(), id).run();
  if (!r.meta.changes) throw new ChybaHttp(404, "Poptávka neexistuje.");
  return json({ ok: true });
}
