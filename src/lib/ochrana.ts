import data from "../../data/ochrana-zemi.json";
import mapa from "../../data/mapa-evropy.json";

/*
  Ochranné vazby zemí (30. 9. 2026, přání provozovatelky).

  Kolik doložených členství a smluv chrání kterou evropskou zemi — NATO,
  EU, vlastní jaderné zbraně, JEF, předsunuté síly NATO — a která má
  pozemní hranici s Ruskem nebo Běloruskem. Počítají se jen fakta se
  zdrojem; nic z toho není hodnocení vojenské síly ani předpověď, a nikde
  se neříká, že by některá země byla „cílem“.
*/

export interface ZdrojOchrany { nazev: string; url: string }
export interface Faktor { klic: string; nazev: string; popis: string; zeme: string[]; zdroje: ZdrojOchrany[] }
export interface OchranaZeme { kod: string; nazev: string; faktory: string[]; pocet: number; hranice: boolean }

export const faktory = (): Faktor[] => data.faktory;
export const hranice = () => data.hranice;
export const poznamkaOchrany = () => data.poznamka;
export const aktualizovanoOchrany = () => data.aktualizovano;
export const mapaEvropy = () => mapa as { zdroj: string; sirka: number; vyska: number; staty: { kod: string | null; nazev: string; d: string }[] };
export const JE_MIMO = (kod: string) => data.mimo.includes(kod);
export const nazevZeme = (kod: string) => (data.nazvy as Record<string, string>)[kod] ?? kod;

/** Všechny hodnocené země (bez Ruska a Běloruska) s počtem faktorů. */
export function ochranaZemi(): OchranaZeme[] {
  return Object.keys(data.nazvy)
    .filter((kod) => !JE_MIMO(kod))
    .map((kod) => {
      const f = data.faktory.filter((x) => x.zeme.includes(kod)).map((x) => x.klic);
      return { kod, nazev: nazevZeme(kod), faktory: f, pocet: f.length, hranice: data.hranice.zeme.includes(kod) };
    });
}

/** Pořadí „nejméně chráněné nahoře“: nejdřív země s hranicí, pak podle počtu vazeb vzestupně. */
export function nejmeneChranene(): OchranaZeme[] {
  return ochranaZemi().sort((a, b) => Number(b.hranice) - Number(a.hranice) || a.pocet - b.pocet || a.nazev.localeCompare(b.nazev, "cs"));
}
