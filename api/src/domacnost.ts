import { maOpravneni } from "./opravneni";
import { ChybaHttp, json, ted, telo } from "./pomocne";
import { desifruj, sifrovaniNastaveno, zasifruj } from "./sifrovani";
import type { Env, Prihlaseny } from "./typy";

/*
  Uložené hodnocení domácnosti — jen Premium. Profil i výsledek jsou
  jeden šifrovaný blok na hodnocení (D1 sloupce nešifruje; data o
  připravenosti jsou citlivá). Nedá se v nich hledat, a nechceme.
  Drží se posledních pět hodnocení; smazání účtu je smaže (ON DELETE CASCADE).
*/

const MAX_DELKA = 60_000;
const DRZET = 5;

async function domacnost(env: Env, ucetId: string): Promise<string> {
  const r = await env.DB.prepare("SELECT id FROM domacnosti WHERE ucet_id = ? ORDER BY vytvoreno LIMIT 1").bind(ucetId).first<{ id: string }>();
  if (r) return r.id;
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO domacnosti (id, ucet_id, vytvoreno, aktualizovano) VALUES (?, ?, ?, ?)").bind(id, ucetId, ted(), ted()).run();
  return id;
}

export async function uloz(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  if (!sifrovaniNastaveno(env)) throw new ChybaHttp(503, "Ukládání na server zatím není zapnuté.");
  if (!(await maOpravneni(env, ucet.id, "premium-odolnost"))) throw new ChybaHttp(403, "Uložení na server je součást Premium.");
  const { verzeKatalogu, profil, vysledek } = await telo<{ verzeKatalogu?: string; profil?: unknown; vysledek?: unknown }>(req);
  if (!verzeKatalogu || typeof profil !== "object" || !profil) throw new ChybaHttp(400, "Chybí profil.");
  const p = JSON.stringify(profil);
  const v = JSON.stringify(vysledek ?? null);
  if (p.length > MAX_DELKA || v.length > MAX_DELKA) throw new ChybaHttp(413, "Hodnocení je příliš velké.");
  const d = await domacnost(env, ucet.id);
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO hodnoceni (id, domacnost_id, verze_katalogu, profil_sifrovany, vysledek_sifrovany, vytvoreno) VALUES (?, ?, ?, ?, ?, ?)").bind(id, d, String(verzeKatalogu).slice(0, 40), await zasifruj(env, p), await zasifruj(env, v), ted()),
    env.DB.prepare("UPDATE domacnosti SET aktualizovano = ? WHERE id = ?").bind(ted(), d),
    env.DB.prepare(`DELETE FROM hodnoceni WHERE domacnost_id = ? AND id NOT IN (SELECT id FROM hodnoceni WHERE domacnost_id = ? ORDER BY vytvoreno DESC LIMIT ${DRZET})`).bind(d, d),
  ]);
  return json({ ok: true, id }, 201);
}

export async function posledni(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (!(await maOpravneni(env, ucet.id, "premium-odolnost"))) throw new ChybaHttp(403, "Uložení na server je součást Premium.");
  const r = await env.DB.prepare("SELECT h.id, h.verze_katalogu, h.profil_sifrovany, h.vytvoreno FROM hodnoceni h JOIN domacnosti d ON d.id = h.domacnost_id WHERE d.ucet_id = ? ORDER BY h.vytvoreno DESC LIMIT 1")
    .bind(ucet.id).first<{ id: string; verze_katalogu: string; profil_sifrovany: string; vytvoreno: string }>();
  if (!r) return json({ hodnoceni: null });
  return json({ hodnoceni: { id: r.id, verzeKatalogu: r.verze_katalogu, vytvoreno: r.vytvoreno, profil: JSON.parse(await desifruj(env, r.profil_sifrovany)) } });
}

export async function smaz(env: Env, ucet: Prihlaseny): Promise<Response> {
  await env.DB.prepare("DELETE FROM domacnosti WHERE ucet_id = ?").bind(ucet.id).run();
  return json({ ok: true });
}
