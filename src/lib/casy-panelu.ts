import { kdyZjisteno, pocitaSe, type Zaznam } from "./agregace";
import type { Kampan } from "./typy";

/**
 * Časy případů a kampaní pro grafy — ne celé záznamy (26. 9. 2026): panel
 * z nich počítá jen počty po dnech, a 155 záznamů s fakty a zdroji dělalo
 * z každé stránky s panelem 500 kB HTML.
 */
/*
  Jen případy, které se počítají (31. 10. 2026). Panel bral i záznamy
  „neověřeno úředně“, takže hlavička ukazovala „2 případy za 14 dní“,
  zatímco hodnocení vedle psalo, že ověřený není žádný — a Česko „2 za
  90 dní“ proti „1 operaci“ v nápovědě. Pravidlo č. 0, bod 4: neověřené
  do počtů nevstupuje.
*/
export function casyProPanel(vse: Zaznam[], kampane: Kampan[]): { casy: string[]; casyCz: string[] } {
  const pripady = vse.filter((z) => (z.druh ?? "pripad") === "pripad" && pocitaSe(z));
  return {
    casy: [...pripady.map((z) => kdyZjisteno(z)), ...kampane.map((k) => k.odhaleno)],
    casyCz: [...pripady.filter((z) => z.kodZeme === "CZ").map((z) => kdyZjisteno(z)), ...kampane.filter((k) => k.kodyZemi.includes("CZ")).map((k) => k.odhaleno)],
  };
}
