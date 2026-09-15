/*
  Porovnání s průměrem.

  Samotné číslo „14 za 90 dní“ nikomu nic neřekne: může to být klid i to
  nejhorší čtvrtletí za celou dobu. Proto se k němu píše, jak je na tom
  proti průměru — a hlavně proti jakému.

  Průměr se počítá z posledních dvou let, ne z celé historie. Archiv sahá
  do roku 2014, ale pravidelný sběr běží krátce; kdyby se průměroval celý
  archiv, vyšlo by skoro každé čtvrtletí jako „velmi významně vyšší“
  a slovo by přestalo něco znamenat.

  A hlavně: dokud srovnávané období není celé pokryté stejně hustým sběrem,
  NENÍ z rozdílu závěr o růstu hrozby. Zpětně doplněný archiv zachytil jen to
  nejviditelnější, kdežto dnešní sběr bere i drobnosti — vyšší číslo pak měří
  náš sběr, ne skutečnost. V takovém případě se tu žádné hodnocení nevrací,
  jen holý počet a přiznání, že období nejsou srovnatelná. Slovo „významně“
  je statistický závěr; bez metody, která ho unese, tu nemá co dělat.
*/

/** Měsíc, od kterého běží pravidelný sběr. Starší záznamy jsou doplněné zpětně. */
export const PLNE_POKRYTI_OD = "2026-07";

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
  { od: 2.0, slovo: "víc než dvojnásobek průměru", smer: "vyssi" },
  { od: 1.5, slovo: "nad průměrem", smer: "vyssi" },
  { od: 1.15, slovo: "mírně nad průměrem", smer: "vyssi" },
  { od: 0.85, slovo: "na úrovni průměru", smer: "stejne" },
  { od: 0.65, slovo: "mírně pod průměrem", smer: "nizsi" },
  { od: 0.4, slovo: "pod průměrem", smer: "nizsi" },
  { od: 0, slovo: "výrazně pod průměrem", smer: "nizsi" },
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

/**
 * Je celé srovnávané okno pokryté stejně hustým sběrem?
 *
 * Když ne, porovnání s průměrem neříká nic o skutečnosti — měří, jak se
 * v čase měnil náš vlastní sběr.
 */
export function srovnatelneObdobi(ted: number, roky = 2, pokrytiOd = PLNE_POKRYTI_OD): boolean {
  const zacatekOkna = new Date(ted - roky * 365 * 86_400_000);
  const [r, m] = pokrytiOd.split("-").map(Number);
  return zacatekOkna.getTime() >= Date.UTC(r, m - 1, 1);
}

export function porovnejSPrumerem(
  hodnota: number,
  prumer: number | null,
  roky = 2,
  ted = Date.now(),
): Porovnani | null {
  // Nesrovnatelná období: žádné hodnocení. Číslo ano, závěr ne.
  if (!srovnatelneObdobi(ted, roky)) return null;
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
