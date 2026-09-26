import soubor from "../../data/pizza-index.json";
import { kdyKratce } from "./cas";

/*
  Pizza index pro zobrazení: jedno slovo + číslo na stupnici PizzINT.
  Stupnice je jejich (DOUGHCON 1–5, 5 nejnižší); slovo je jen český
  přepis pořadí, žádné naše hodnocení. Údaj starší než MAX_STARI_H nebo
  žádný = „nezjištěno“ — ne „klid“.
*/
export const MAX_STARI_H = 3;
const SLOVA: Record<number, string> = { 5: "klid", 4: "pozornost", 3: "zvýšená", 2: "vysoká", 1: "maximum" };

export interface PizzaStav { slovo: string; uroven: number | null; popis: string | null; kdy: string | null; aktualni: boolean }

export function stavPizzy(d: { uroven: number | null; popis: string | null; nacteno: string | null } = soubor as never, ted = Date.now()): PizzaStav {
  const aktualni = Boolean(d.nacteno && d.uroven && ted - Date.parse(d.nacteno) <= MAX_STARI_H * 3_600_000);
  return { slovo: aktualni ? SLOVA[d.uroven!] ?? "nezjištěno" : "nezjištěno", uroven: aktualni ? d.uroven : null, popis: d.popis, kdy: d.nacteno, aktualni };
}

export function popisCasu(s: PizzaStav, ted: number): string {
  return s.kdy ? `Přečteno ${kdyKratce(s.kdy, ted)}.` : "Zatím se nepřečetlo.";
}
