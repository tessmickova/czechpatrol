import { omez } from "./limit";
import { ChybaHttp, json, ted, telo } from "./pomocne";
import type { Env, Prihlaseny } from "./typy";

/*
  Hlášení od čtenářů. Bez účtu, s brzdou. Nic z toho se nezveřejňuje
  automaticky — správce si to přečte a rozhodne, jestli z toho bude záznam.
*/

const MAX = { popis: 2000, odkaz: 500, jmeno: 120, email: 200, telefon: 40 };

export async function prijmi(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "tip", 5, 60);
  const t = await telo<{ popis?: string; odkaz?: string; jmeno?: string; email?: string; telefon?: string; past?: string }>(req);
  // Skryté pole „past“ vyplňují jen roboti.
  if (t.past) return json({ ok: true });
  const popis = (t.popis ?? "").trim();
  if (popis.length < 20) throw new ChybaHttp(400, "Popište prosím, co chybí — aspoň pár vět.");
  const ořež = (s: string | undefined, n: number) => (s ?? "").trim().slice(0, n) || null;
  const odkaz = ořež(t.odkaz, MAX.odkaz);
  if (odkaz && !/^https?:\/\//.test(odkaz)) throw new ChybaHttp(400, "Odkaz musí začínat http:// nebo https://.");
  await env.DB.prepare("INSERT INTO tipy (id, vytvoreno, popis, odkaz, jmeno, email, telefon) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), ted(), popis.slice(0, MAX.popis), odkaz, ořež(t.jmeno, MAX.jmeno), ořež(t.email, MAX.email), ořež(t.telefon, MAX.telefon))
    .run();
  return json({ ok: true }, 201);
}

export async function seznam(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { results } = await env.DB.prepare("SELECT * FROM tipy ORDER BY vytvoreno DESC LIMIT 200").all();
  return json({ tipy: results });
}

export async function vyrid(env: Env, req: Request, ucet: Prihlaseny, id: string): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { stav, poznamka } = await telo<{ stav: string; poznamka?: string }>(req);
  if (!["novy", "prijato", "zamitnuto"].includes(stav)) throw new ChybaHttp(400, "Neznámý stav.");
  await env.DB.prepare("UPDATE tipy SET stav = ?, poznamka = ? WHERE id = ?").bind(stav, (poznamka ?? "").slice(0, 300) || null, id).run();
  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(ted(), ucet.id, `tip ${stav}`, id).run();
  return json({ ok: true });
}
