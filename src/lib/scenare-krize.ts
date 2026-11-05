import data from "../../data/scenare-krize.json";
import type { RadekInternetu } from "./kyber";

/*
  Scénáře k boxu „Co naladit a co dělat“ (5. 11. 2026, provozovatelka:
  „tato sekce by měla mít přípravu na více scénářů, nejen zapnutí rádia“).

  Obsah je v data/scenare-krize.json a opakuje jen to, co web dokládá
  jinde (typy útoků, seznamy zásob, průvodce). Modul je lehký, smí ho číst
  i klientské komponenty: box v panelu i oddíl v menu.
*/
export interface ScenarKrize {
  klic: string;
  nazev: string;
  /** Do řádku seznamu, jedna věta. */
  kratce: string;
  /** Typ útoku s doloženými případy (data/typy-utoku.json). */
  typ?: string;
  /** Regulární výraz na řádky boxu Internet v Česku („útok na chlazení v obchodech“). */
  signaly?: string;
  predem: string[];
  kdyzNastane: string[];
  odkazy: { nazev: string; url: string }[];
}

export const SCENARE_KRIZE = (data as (ScenarKrize & { _poznamka?: string })[]).map(({ _poznamka: _, ...s }) => s);

export interface ScenarTed extends ScenarKrize {
  /** Co k němu box Internet v Česku právě hlásí (z médií, za 72 h). */
  ted: RadekInternetu[];
}

/** Scénáře s tím, co se k nim právě hlásí; hlášené jdou první, jinak pořadí ze souboru. */
export function scenareTed(radky: readonly RadekInternetu[] = []): ScenarTed[] {
  const s = SCENARE_KRIZE.map((x) => ({ ...x, ted: x.signaly ? radky.filter((r) => new RegExp(x.signaly as string, "i").test(r.co)) : [] }));
  return [...s.filter((x) => x.ted.length), ...s.filter((x) => !x.ted.length)];
}
