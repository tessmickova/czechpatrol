import data from "../../data/krizove-vysilani.json";

/*
  Co naladit v krizi (5. 11. 2026, provozovatelka): hlavní vysílání, ne
  vedlejší stanice. DAB+ a televize na poloze nezávisí; kmitočet FM
  Radiožurnálu se liší po vysílačích, proto si čtenář vybere kraj —
  polohu web nezjišťuje a výběr zůstává jen v jeho prohlížeči.

  Kmitočty jsou v data/krizove-vysilani.json a plní je jen nástroj
  nastroje/kmitocty-cro.mjs z oficiálních dat Českého rozhlasu (stránka
  „Vysílače a frekvence“). Prázdné pole web přizná.
*/
export interface VysilacFm { vysilac: string; mhz: number; vykonKw?: number; zdroj?: { nazev: string; url: string } }
/** `dab` = bloky DAB+ (12C, 12D), ve kterých v kraji vysílá multiplex Českého rozhlasu. */
export interface KrajVysilani { klic: string; nazev: string; fm: VysilacFm[]; dab?: string[] }
export interface CestaVysilani { cesta: string; co: string; jak: string }
export interface KrizoveVysilani {
  stanice: string;
  zdroj: { nazev: string; url: string };
  krizoveVysilani: { text: string; zdroj: { nazev: string; url: string } };
  celostatni: CestaVysilani[];
  /** Odkud a kdy jsou kmitočty (nastroje/kmitocty-cro.mjs). */
  kmitocty?: { stazeno: string; zdroj: { nazev: string; url: string }; rozhrani: string };
  kraje: KrajVysilani[];
}

export const KRIZOVE_VYSILANI = data as KrizoveVysilani;

export const krajVysilani = (klic: string | null): KrajVysilani | null => KRIZOVE_VYSILANI.kraje.find((k) => k.klic === klic) ?? null;

/** Kmitočet česky: 94,6 MHz. */
export const mhz = (n: number) => `${n.toFixed(1).replace(".", ",")} MHz`;

const KLIC_ULOZISTE = "czechpatrol.kraj";

/** Vybraný kraj z prohlížeče; bez úložiště (soukromé okno) prostě nic. */
export function nactiKraj(): string | null {
  try {
    const k = localStorage.getItem(KLIC_ULOZISTE);
    return k && KRIZOVE_VYSILANI.kraje.some((x) => x.klic === k) ? k : null;
  } catch {
    return null;
  }
}

export function ulozKraj(klic: string | null): void {
  try {
    if (klic) localStorage.setItem(KLIC_ULOZISTE, klic); else localStorage.removeItem(KLIC_ULOZISTE);
  } catch { /* soukromé okno nebo zakázané úložiště: výběr platí jen do obnovení stránky */ }
}
