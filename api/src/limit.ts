import { ChybaHttp, otiskIp } from "./pomocne";
import type { Env } from "./typy";

/**
 * Brzda: kolik pokusů smí přijít z jednoho místa za okno.
 * Klíč je solený otisk IP, takže v databázi žádná IP není.
 */
export async function omez(env: Env, req: Request, akce: string, max: number, oknoMin = 10): Promise<void> {
  const klic = `${await otiskIp(req, env.KLIC_SIFROVANI ?? "")}:${akce}`;
  const nyni = new Date();
  /*
    Jeden atomický dotaz (29. 9. 2026). Dřív to bylo „přečti, pak zapiš“:
    souběžné požadavky přečetly stejný počet a prošly všechny, takže dávkou
    naráz šlo limit obejít. Teď databáze počet zvýší a vrátí v jednom kroku;
    po uplynutí okna začne znovu od jedné.
  */
  const iso = nyni.toISOString();
  const noveOkno = new Date(nyni.getTime() + oknoMin * 60_000).toISOString();
  const radek = await env.DB.prepare(
    `INSERT INTO limity (klic, pocet, okno_do) VALUES (?1, 1, ?2)
     ON CONFLICT(klic) DO UPDATE SET
       pocet   = CASE WHEN limity.okno_do < ?3 THEN 1 ELSE limity.pocet + 1 END,
       okno_do = CASE WHEN limity.okno_do < ?3 THEN ?2 ELSE limity.okno_do END
     RETURNING pocet`,
  ).bind(klic, noveOkno, iso).first<{ pocet: number }>();
  if ((radek?.pocet ?? 1) > max) throw new ChybaHttp(429, "Příliš mnoho pokusů. Zkuste to za chvíli.");
}

/**
 * Celkový strop bez ohledu na IP (30. 9. 2026). Brzda podle IP se dá obejít
 * střídáním adres; tahle ne. Nehází chybu — vrací, jestli se ještě smí.
 * Stejný atomický dotaz jako `omez`, jen s pevným klíčem.
 */
export async function vLimituCelkem(env: Env, akce: string, max: number, oknoMin: number): Promise<boolean> {
  const nyni = new Date();
  const radek = await env.DB.prepare(
    `INSERT INTO limity (klic, pocet, okno_do) VALUES (?1, 1, ?2)
     ON CONFLICT(klic) DO UPDATE SET
       pocet   = CASE WHEN limity.okno_do < ?3 THEN 1 ELSE limity.pocet + 1 END,
       okno_do = CASE WHEN limity.okno_do < ?3 THEN ?2 ELSE limity.okno_do END
     RETURNING pocet`,
  ).bind(`celkem:${akce}`, new Date(nyni.getTime() + oknoMin * 60_000).toISOString(), nyni.toISOString()).first<{ pocet: number }>();
  return (radek?.pocet ?? 1) <= max;
}
