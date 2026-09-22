import { ChybaHttp, json, ted, telo } from "./pomocne";
import { jeProdukt, PRODUKTY, type Env, type Prihlaseny, type Produkt } from "./typy";

/*
  Oprávnění (entitlement). Ne příznak u účtu, ale řádek s původem:
  z jaké platby, od kterého správce, od kdy, do kdy. Přidat předplatné
  nebo rodinný plán znamená nový `druh` a `platne_do`, ne přepis.

  Jediná otázka, kterou zbytek API klade: má účet aktivní oprávnění na
  produkt teď? Odpovídá maOpravneni().
*/

export type DruhOpravneni = "jednorazove" | "predplatne" | "rodina" | "dar";
export type ZdrojOpravneni = "platba" | "admin";

export interface NoveOpravneni {
  ucetId: string;
  produkt: Produkt;
  druh: DruhOpravneni;
  zdrojDruh: ZdrojOpravneni;
  zdrojId: string;
  platneDo?: string | null;
}

/** Čistá kontrola platnosti — testovatelná bez databáze. */
export function platneK(r: { stav: string; platne_od: string; platne_do: string | null }, kdy: Date): boolean {
  if (r.stav !== "ACTIVE") return false;
  if (new Date(r.platne_od) > kdy) return false;
  if (r.platne_do && new Date(r.platne_do) <= kdy) return false;
  return true;
}

export async function maOpravneni(env: Env, ucetId: string, produkt: Produkt, kdy = new Date()): Promise<boolean> {
  const { results } = await env.DB.prepare("SELECT stav, platne_od, platne_do FROM opravneni WHERE ucet_id = ? AND produkt = ? AND stav = 'ACTIVE'")
    .bind(ucetId, produkt)
    .all<{ stav: string; platne_od: string; platne_do: string | null }>();
  return results.some((r) => platneK(r, kdy));
}

/** Příkaz k udělení; vrací id a připravený INSERT, aby šel do jedné dávky s platbou. */
export function pripravUdeleni(env: Env, o: NoveOpravneni): { id: string; prikaz: D1PreparedStatement } {
  const id = crypto.randomUUID();
  const kdy = ted();
  const prikaz = env.DB.prepare(
    "INSERT INTO opravneni (id, ucet_id, produkt, druh, zdroj_druh, zdroj_id, platne_od, platne_do, stav, vytvoreno) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
  ).bind(id, o.ucetId, o.produkt, o.druh, o.zdrojDruh, o.zdrojId, kdy, o.platneDo ?? null, kdy);
  return { id, prikaz };
}

/** Co má přihlášený účet odemčené a kam smí do komunity. */
export async function moje(env: Env, ucet: Prihlaseny): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT id, produkt, druh, zdroj_druh, platne_od, platne_do, stav FROM opravneni WHERE ucet_id = ? ORDER BY vytvoreno DESC")
    .bind(ucet.id)
    .all<{ id: string; produkt: string; druh: string; zdroj_druh: string; platne_od: string; platne_do: string | null; stav: string }>();
  const nyni = new Date();
  const premium = results.some((r) => r.produkt === "premium-odolnost" && platneK(r, nyni));
  /*
    Pozvánky do komunity a chatu jsou součást Premium. Odkazy jsou
    tajemství Workeru — ve veřejném kódu webu by je našel každý. Prázdné
    tajemství = web řekne „připravujeme“, ne rozbitý odkaz.
  */
  const komunita = premium
    ? { telegram: env.KOMUNITA_TELEGRAM_ODKAZ || null, whatsapp: env.KOMUNITA_WHATSAPP_ODKAZ || null }
    : null;
  return json({
    opravneni: results.map((r) => ({ id: r.id, produkt: r.produkt, druh: r.druh, zdroj: r.zdroj_druh, platneOd: r.platne_od, platneDo: r.platne_do, stav: r.stav, platne: platneK(r, nyni) })),
    premium,
    komunita,
  });
}

/* ---------- správa ---------- */

export async function seznam(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { results } = await env.DB.prepare("SELECT id, ucet_id, produkt, druh, zdroj_druh, zdroj_id, platne_od, platne_do, stav, vytvoreno, zruseno, duvod_zruseni FROM opravneni ORDER BY vytvoreno DESC LIMIT 500").all();
  return json({ opravneni: results });
}

/** Ruční udělení správcem — např. dar nebo náhrada za technický problém. Vždy s důvodem a v auditu. */
export async function udel(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const t = await telo<{ ucetId?: string; produkt?: string; duvod?: string; platneDo?: string }>(req);
  if (!t.ucetId || !jeProdukt(t.produkt)) throw new ChybaHttp(400, "Chybí účet nebo produkt.");
  const duvod = (t.duvod ?? "").trim().slice(0, 300);
  if (!duvod) throw new ChybaHttp(400, "Důvod je povinný.");
  const cil = await env.DB.prepare("SELECT id FROM ucty WHERE id = ? AND smazano IS NULL").bind(t.ucetId).first();
  if (!cil) throw new ChybaHttp(404, "Účet neexistuje.");
  if (await maOpravneni(env, t.ucetId, t.produkt)) throw new ChybaHttp(409, "Účet už má aktivní oprávnění.");
  const platneDo = t.platneDo && !Number.isNaN(Date.parse(t.platneDo)) ? new Date(t.platneDo).toISOString() : null;
  const { id, prikaz } = pripravUdeleni(env, { ucetId: t.ucetId, produkt: t.produkt, druh: "dar", zdrojDruh: "admin", zdrojId: crypto.randomUUID(), platneDo });
  await env.DB.batch([
    prikaz,
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(ted(), ucet.id, `ENTITLEMENT_GRANTED ${t.produkt} (${duvod})`, t.ucetId),
  ]);
  return json({ ok: true, id, nazev: PRODUKTY[t.produkt].nazev }, 201);
}

export async function zrus(env: Env, req: Request, ucet: Prihlaseny, id: string): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { duvod } = await telo<{ duvod?: string }>(req);
  const d = (duvod ?? "").trim().slice(0, 300);
  if (!d) throw new ChybaHttp(400, "Důvod je povinný.");
  const r = await env.DB.prepare("SELECT ucet_id, produkt, stav FROM opravneni WHERE id = ?").bind(id).first<{ ucet_id: string; produkt: string; stav: string }>();
  if (!r) throw new ChybaHttp(404, "Oprávnění neexistuje.");
  if (r.stav !== "ACTIVE") throw new ChybaHttp(409, "Oprávnění už není aktivní.");
  await env.DB.batch([
    env.DB.prepare("UPDATE opravneni SET stav = 'REVOKED', zruseno = ?, duvod_zruseni = ? WHERE id = ? AND stav = 'ACTIVE'").bind(ted(), d, id),
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(ted(), ucet.id, `ENTITLEMENT_REVOKED ${r.produkt} (${d})`, r.ucet_id),
  ]);
  return json({ ok: true });
}
