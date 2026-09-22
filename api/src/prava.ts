import { ChybaHttp, json, ted, telo } from "./pomocne";
import type { Env, Prihlaseny } from "./typy";

/*
  Práva správců nad penězi.

  Role „admin“ dnes znamená všechno. U plateb a kreditů to nestačí: kdo
  smí vydat kredit z ničeho (bez platby), musí být vyjmenovaný zvlášť a
  v auditu. Proto: běžná práva má správce z role; právo `kredity.vydat_rucne`
  jen ten, komu ho jiný správce udělil. Udělení i odebrání je v auditu.
*/

export const PRAVA = ["platby.cist", "kredity.nahradit", "kredity.vydat_rucne", "emaily.znovu", "audit.cist"] as const;
export type Pravo = (typeof PRAVA)[number];

/** Práva, která správce má už z role. Ruční kredit tam schválně není. */
const Z_ROLE: Pravo[] = ["platby.cist", "kredity.nahradit", "emaily.znovu", "audit.cist"];

export function jePravo(p: unknown): p is Pravo {
  return typeof p === "string" && (PRAVA as readonly string[]).includes(p);
}

/** Čistá část rozhodnutí — testovatelná bez databáze. */
export function maPravoPodle(role: string, pravo: Pravo, udelena: readonly string[]): boolean {
  if (role !== "admin") return false;
  if (Z_ROLE.includes(pravo)) return true;
  return udelena.includes(pravo);
}

export async function udelenaPrava(env: Env, ucetId: string): Promise<string[]> {
  const { results } = await env.DB.prepare("SELECT pravo FROM opravneni_spravcu WHERE ucet_id = ?").bind(ucetId).all<{ pravo: string }>();
  return results.map((r) => r.pravo);
}

export async function vyzadujPravo(env: Env, ucet: Prihlaseny, pravo: Pravo): Promise<void> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  if (!maPravoPodle(ucet.role, pravo, await udelenaPrava(env, ucet.id))) throw new ChybaHttp(403, `Chybí právo ${pravo}.`);
}

export async function seznam(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { results } = await env.DB.prepare("SELECT ucet_id, pravo, udelil, kdy FROM opravneni_spravcu ORDER BY kdy DESC").all();
  return json({ prava: results, zRole: Z_ROLE, vsechna: PRAVA });
}

export async function nastav(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { ucetId, pravo, udelit } = await telo<{ ucetId?: string; pravo?: string; udelit?: boolean }>(req);
  if (!ucetId || !jePravo(pravo)) throw new ChybaHttp(400, "Chybí účet nebo právo.");
  const cil = await env.DB.prepare("SELECT role FROM ucty WHERE id = ?").bind(ucetId).first<{ role: string }>();
  if (!cil) throw new ChybaHttp(404, "Účet neexistuje.");
  if (cil.role !== "admin") throw new ChybaHttp(400, "Právo lze udělit jen správci.");
  // Nikdo si sám nepřidá právo vydávat kredity; to je celý smysl oddělení.
  if (ucetId === ucet.id && pravo === "kredity.vydat_rucne" && udelit) throw new ChybaHttp(400, "Tohle právo musí udělit jiný správce.");
  if (udelit) {
    await env.DB.prepare("INSERT OR IGNORE INTO opravneni_spravcu (ucet_id, pravo, udelil, kdy) VALUES (?, ?, ?, ?)").bind(ucetId, pravo, ucet.id, ted()).run();
  } else {
    await env.DB.prepare("DELETE FROM opravneni_spravcu WHERE ucet_id = ? AND pravo = ?").bind(ucetId, pravo).run();
  }
  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(ted(), ucet.id, `${udelit ? "ADMIN_RIGHT_GRANTED" : "ADMIN_RIGHT_REVOKED"} ${pravo}`, ucetId).run();
  return json({ ok: true });
}
