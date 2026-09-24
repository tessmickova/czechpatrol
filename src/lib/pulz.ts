import fs from "node:fs";
import path from "node:path";
import { incidenty, kandidati } from "./data";

/*
  Pulz sběru — co hlídka právě udělala (24. 9. 2026).

  Web vypadal, že se nic neděje: sběr každou hodinu přečte desítky
  zdrojů a zachytí desítky zpráv, ale na stránce z toho bylo jen drobné
  „Aktualizováno“. Tohle sečte poslední průchod (data/fronta/posledni-beh.json)
  a pohyb za 24 hodin. Čte se při sestavení webu, tedy po každém sběru.
*/
export interface Pulz {
  /** Kdy naposledy proběhl sběr. */
  kdy: string | null;
  zdrojuOk: number;
  zdrojuCelkem: number;
  zdroje: { klic: string; ok: boolean; stav: number | null }[];
  /** Zachycené zprávy za 24 h (vše, i cizojazyčné). */
  zachyceno24: number;
  /** Záznamy zveřejněné nebo aktualizované za 24 h. */
  overeno24: number;
}

export function pulz(ted = Date.now()): Pulz {
  const od = ted - 86_400_000;
  let beh: { kdy?: string; zdroje?: { klic: string; ok: boolean; stav?: number | null }[] } = {};
  try {
    beh = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "fronta", "posledni-beh.json"), "utf-8"));
  } catch { /* bez záznamu o běhu se ukáže jen to, co víme z dat */ }
  const zdroje = (beh.zdroje ?? []).map((z) => ({ klic: z.klic, ok: Boolean(z.ok), stav: z.stav ?? null }));
  return {
    kdy: beh.kdy ?? null,
    zdrojuOk: zdroje.filter((z) => z.ok).length,
    zdrojuCelkem: zdroje.length,
    zdroje,
    zachyceno24: kandidati().filter((k) => new Date(k.publikovano ?? k.zachyceno).getTime() >= od).length,
    overeno24: incidenty().filter((i) => new Date(i.aktualizovano ?? i.datumZjisteni ?? i.datumUdalosti).getTime() >= od).length,
  };
}
