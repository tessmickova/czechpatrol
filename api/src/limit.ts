import { ChybaHttp, otiskIp } from "./pomocne";
import type { Env } from "./typy";

/**
 * Brzda: kolik pokusů smí přijít z jednoho místa za okno.
 * Klíč je solený otisk IP, takže v databázi žádná IP není.
 */
export async function omez(env: Env, req: Request, akce: string, max: number, oknoMin = 10): Promise<void> {
  const klic = `${await otiskIp(req)}:${akce}`;
  const nyni = new Date();
  const radek = await env.DB.prepare("SELECT pocet, okno_do FROM limity WHERE klic = ?").bind(klic).first<{ pocet: number; okno_do: string }>();
  if (!radek || new Date(radek.okno_do) < nyni) {
    await env.DB.prepare("INSERT OR REPLACE INTO limity (klic, pocet, okno_do) VALUES (?, 1, ?)")
      .bind(klic, new Date(nyni.getTime() + oknoMin * 60_000).toISOString())
      .run();
    return;
  }
  if (radek.pocet >= max) throw new ChybaHttp(429, "Příliš mnoho pokusů. Zkuste to za chvíli.");
  await env.DB.prepare("UPDATE limity SET pocet = pocet + 1 WHERE klic = ?").bind(klic).run();
}
