import { nastaveniZ } from "./auth";
import { ted } from "./pomocne";
import { naplanuj } from "./upozorneni";
import type { Env, NovaZprava } from "./typy";

/**
 * Uloží zprávu a naplánuje ji každému čtenáři s kanálem podle jeho nastavení.
 * Vrací, kolika lidem se zpráva vůbec týká.
 */
export async function rozesli(env: Env, z: NovaZprava, id = crypto.randomUUID()): Promise<number> {
  const nyni = new Date();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO zpravy (id, druh, zavaznost, oblast, kategorie, titulek, text, odkaz, vytvoreno) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(id, z.druh, z.zavaznost, z.oblast, z.kategorie ? JSON.stringify(z.kategorie) : null, z.titulek, z.text, z.odkaz, ted()).run();

  const { results } = await env.DB.prepare(
    "SELECT u.id, u.nastaveni, k.druh FROM ucty u JOIN kanaly k ON k.ucet_id = u.id",
  ).all<{ id: string; nastaveni: string; druh: string }>();

  const davka: D1PreparedStatement[] = [];
  const zasazeni = new Set<string>();
  for (const r of results) {
    const kdy = naplanuj(z, nastaveniZ(r), nyni);
    if (!kdy) continue;
    zasazeni.add(r.id);
    davka.push(
      env.DB.prepare("INSERT INTO fronta (zprava_id, ucet_id, druh, naplanovano) VALUES (?, ?, ?, ?)").bind(id, r.id, r.druh, kdy.toISOString()),
    );
  }
  for (let i = 0; i < davka.length; i += 50) await env.DB.batch(davka.slice(i, i + 50));
  return zasazeni.size;
}
