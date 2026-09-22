/*
  Směr změny úředního stavu: zlepšení, zhoršení, nebo ani jedno.

  Web dřív počítal jen zhoršení („3 zhoršení za 7 dní“) a každé opatření
  bral jako zhoršení. To je jednostranné: když stát něco udělá a stav se
  vrátí k běžnému provozu, je to zlepšení a čtenář to má vidět stejně
  zřetelně jako zhoršení. Směr se neodhaduje ze slov jako „lepší“;
  určuje ho pořadí stupňů na známých stupnicích. Co na stupnici není
  (bez ověřeného zdroje, neznámý stav), je bez směru.

  Totéž pravidlo je zkopírované v nastroje/rozhlas.mjs (smerZmeny), protože
  skript Telegramu neumí načíst TypeScript. Změna tady = změna tam.
*/

export type SmerZmeny = "zlepseni" | "zhorseni" | "neutral";

/* Nižší číslo = klidnější stav. Stupnice se nemíchají — porovnává se jen uvnitř jedné. */
const STUPNICE: Record<string, number>[] = [
  { "běžný provoz": 0, sledujeme: 1, narušeno: 2 },
  { NE: 0, ANO: 1 },
  { neaktivní: 0, aktivováno: 1 },
  { "Nízká": 0, "Mírně zvýšená": 1, "Střední": 2, "Zvýšená": 3, "Vysoká": 4, "Vážná": 5 },
];

const SIPKA = /^(.*?): (.+?) → (.+)$/u;

/** „Mobilizace: NE → ANO“ je zhoršení; „Palivo: sledujeme → běžný provoz“ zlepšení. */
export function smerZmeny(text: string): SmerZmeny {
  const m = text.trim().match(SIPKA);
  if (!m) return "neutral";
  const od = m[2].trim();
  const do_ = m[3].trim();
  for (const s of STUPNICE) {
    if (od in s && do_ in s) {
      if (s[do_] > s[od]) return "zhorseni";
      if (s[do_] < s[od]) return "zlepseni";
      return "neutral";
    }
  }
  return "neutral";
}

/** Cena: pohyb nad práh nahoru je zhoršení, dolů zlepšení. */
export function smerCeny(rozdil: number, prah: number): SmerZmeny {
  if (Math.abs(rozdil) < prah) return "neutral";
  return rozdil > 0 ? "zhorseni" : "zlepseni";
}

export const SLOVA_SMERU: Record<SmerZmeny, string> = { zlepseni: "zlepšení", zhorseni: "zhoršení", neutral: "změna" };
