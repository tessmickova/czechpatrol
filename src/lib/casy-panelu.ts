import { kdyZjisteno, type Zaznam } from "./agregace";
import type { Kampan } from "./typy";

/**
 * Časy případů a kampaní pro grafy — ne celé záznamy (26. 9. 2026): panel
 * z nich počítá jen počty po dnech, a 155 záznamů s fakty a zdroji dělalo
 * z každé stránky s panelem 500 kB HTML.
 */
export function casyProPanel(vse: Zaznam[], kampane: Kampan[]): { casy: string[]; casyCz: string[] } {
  return {
    casy: [...vse.filter((z) => (z.druh ?? "pripad") === "pripad").map((z) => kdyZjisteno(z)), ...kampane.map((k) => k.odhaleno)],
    casyCz: [...vse.filter((z) => (z.druh ?? "pripad") === "pripad" && z.kodZeme === "CZ").map((z) => kdyZjisteno(z)), ...kampane.filter((k) => k.kodyZemi.includes("CZ")).map((k) => k.odhaleno)],
  };
}
