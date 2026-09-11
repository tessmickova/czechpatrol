/*
  Porovnání s průměrem.

  Samotné číslo „14 za 90 dní“ nikomu nic neřekne: může to být klid i to
  nejhorší čtvrtletí za celou dobu. Proto se k němu píše, jak je na tom
  proti průměru — a hlavně proti jakému.

  Průměr se počítá z posledních dvou let, ne z celé historie. Archiv sahá
  do roku 2014, ale pravidelný sběr běží krátce; kdyby se průměroval celý
  archiv, vyšlo by skoro každé čtvrtletí jako „velmi významně vyšší“
  a slovo by přestalo něco znamenat.
*/

export type SmerPorovnani = "vyssi" | "nizsi" | "stejne";

/** Číslo s desetinnou čárkou. Tečka je v češtině cizí prvek. */
export function cislem(n: number): string {
  return String(n).replace(".", ",");
}

export interface Porovnani {
  /** Slovní vyjádření: „mírně vyšší“, „na úrovni průměru“, … */
  slovo: string;
  smer: SmerPorovnani;
  /** Průměr, proti kterému se porovnává, zaokrouhlený na desetinu. */
  prumer: number;
  /** Kolikrát je hodnota vyšší než průměr. */
  pomer: number;
  /** Kolik let historie do průměru vstoupilo. Bez toho je průměr netvrzení. */
  zaLet: number;
}

/*
  Pásma. Záměrně široké okolí průměru: u počtů v řádu jednotek se dva
  případy sem nebo tam nedají vydávat za trend.
*/
const PASMA_POMERU: { od: number; slovo: string; smer: SmerPorovnani }[] = [
  { od: 2.0, slovo: "velmi významně vyšší", smer: "vyssi" },
  { od: 1.5, slovo: "středně vyšší", smer: "vyssi" },
  { od: 1.15, slovo: "mírně vyšší", smer: "vyssi" },
  { od: 0.85, slovo: "na úrovni průměru", smer: "stejne" },
  { od: 0.65, slovo: "mírně nižší", smer: "nizsi" },
  { od: 0.4, slovo: "středně nižší", smer: "nizsi" },
  { od: 0, slovo: "velmi významně nižší", smer: "nizsi" },
];

/**
 * Průměrný počet na okno délky `dni` za posledních `let` let.
 *
 * Vrací null, když do okna nespadá dost historie — průměr ze dvou čtvrtletí
 * není průměr a tvářit se, že ano, by bylo horší než ho neuvádět.
 */
export function prumerNaOkno(
  casy: string[],
  dni: number,
  ted: number,
  roky = 2,
): number | null {
  const zacatek = ted - roky * 365 * 86_400_000;
  const vOkne = casy.filter((c) => {
    const t = new Date(c).getTime();
    return t >= zacatek && t <= ted;
  }).length;
  const pocetOken = (roky * 365) / dni;
  if (pocetOken < 4) return null;
  // Musíme mít i dost dat, jinak je „průměr“ jen náhoda.
  if (vOkne < pocetOken) return null;
  return vOkne / pocetOken;
}

export function porovnejSPrumerem(
  hodnota: number,
  prumer: number | null,
  roky = 2,
): Porovnani | null {
  if (prumer === null || prumer <= 0) return null;
  const pomer = hodnota / prumer;
  const p = PASMA_POMERU.find((x) => pomer >= x.od)!;
  return {
    slovo: p.slovo,
    smer: p.smer,
    prumer: Math.round(prumer * 10) / 10,
    pomer: Math.round(pomer * 100) / 100,
    zaLet: roky,
  };
}
