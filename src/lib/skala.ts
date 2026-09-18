import type { Jistota, Pasmo, Uroven } from "./typy";

export interface DefiniceUrovne {
  kod: Uroven;
  pasmo: Pasmo;
  /** Lidský název — tohle vidí návštěvník. */
  nazev: string;
  /** Pořadí 1–13 pro grafy a porovnání týdnů. */
  poradi: number;
  /** Co úroveň znamená. */
  znamena: string;
  /** Co ji typicky způsobuje. */
  zpusobuje: string;
  /** Co naopak NEznamená. Tahle věta je pro klid návštěvníka nejdůležitější. */
  neznamena: string;
  /** Co by znamenalo posun výš. */
  posunVys: string;
}

/*
  Názvosloví je jedna řada: Nízká → Mírně zvýšená → Střední → Zvýšená
  → Vysoká → Vážná (metodika v2, jen názvy; hodnocení se nemění). Barva se z názvu odvozuje, nikdy naopak — „oranžová“
  není úroveň, jen její barva.
*/
export const UROVNE: Record<Uroven, DefiniceUrovne> = {
  G1: {
    kod: "G1", pasmo: "zelena", nazev: "Nízká", poradi: 1,
    znamena: "Situace odpovídá dlouhodobému běžnému stavu.",
    zpusobuje: "Žádné mimořádné incidenty nad rámec obvyklého pozadí.",
    neznamena: "Neznamená, že se nic neděje — běžné pozadí incidentů existuje vždy.",
    posunVys: "Opakované incidenty ve více zemích ve stejném období.",
  },
  G2: {
    kod: "G2", pasmo: "zelena", nazev: "Nízká", poradi: 2,
    znamena: "Klidný stav, ale některé jevy stojí za sledování.",
    zpusobuje: "Ojedinělé incidenty bez vzoru a bez následků.",
    neznamena: "Neznamená zhoršení bezpečnostní situace.",
    posunVys: "Nárůst četnosti nebo první oficiální atribuce.",
  },
  G3: {
    kod: "G3", pasmo: "zelena", nazev: "Nízká", poradi: 3,
    znamena: "Stále klidný stav, ale objevují se signály, které sledujeme podrobněji.",
    zpusobuje: "Jednotlivé incidenty proti infrastruktuře bez známého původce.",
    neznamena: "Neznamená mimořádnou situaci ani žádné omezení běžného života.",
    posunVys: "Incidenty ve více zemích během krátké doby.",
  },
  Y1: {
    kod: "Y1", pasmo: "zluta", nazev: "Mírně zvýšená", poradi: 4,
    znamena: "Zvýšená pozornost. Incidenty tvoří rozpoznatelný vzor.",
    zpusobuje: "Několik incidentů proti infrastruktuře v různých zemích.",
    neznamena: "Neznamená ohrožení běžného života v ČR ani vojenské riziko.",
    posunVys: "Škody na kritické infrastruktuře nebo oficiální státní atribuce.",
  },
  Y2: {
    kod: "Y2", pasmo: "zluta", nazev: "Střední", poradi: 5,
    znamena: "Významnější signály, které se kumulují.",
    zpusobuje: "Opakované sabotáže, zatčení operativců, vyšetřovací posuny.",
    neznamena: "Neznamená přípravu vojenského útoku na NATO.",
    posunVys: "Oficiální atribuce státu nebo zásah do kritické infrastruktury.",
  },
  Y3: {
    kod: "Y3", pasmo: "zluta", nazev: "Zvýšená", poradi: 6,
    znamena: "Hybridní tlak je zřetelný a dlouhodobý.",
    zpusobuje: "Vzorec incidentů napříč Evropou, opakované vyšetřovací závěry.",
    neznamena: "Neznamená mobilizaci, omezení vycestování ani vojenský konflikt.",
    posunVys: "Oficiální atribuce státního řízení série útoků.",
  },
  YO: {
    kod: "YO", pasmo: "prechod", nazev: "Zvýšená", poradi: 7,
    znamena: "Na horní hranici střední úrovně. Další podobná událost by byla důvodem k přehodnocení — ne automatickým posunem.",
    zpusobuje: "Kumulace hybridních incidentů spolu s institucionální reakcí států.",
    neznamena: "Neznamená bezprostřední vojenské riziko ani mimořádná opatření v ČR.",
    posunVys: "Oficiální atribuce, škoda na kritické infrastruktuře, svolání čl. 4.",
  },
  O1: {
    kod: "O1", pasmo: "oranzova", nazev: "Vysoká", poradi: 8,
    znamena: "Vážný hybridní tlak s doloženým státním podílem nebo velkou škodou.",
    zpusobuje: "Oficiální atribuce, výpadek infrastruktury, zásadní vyšetřovací průlom.",
    neznamena: "Ani oranžová sama o sobě neznamená válku ani mobilizaci.",
    posunVys: "Aktivace čl. 4 NATO nebo mimořádná bezpečnostní opatření států.",
  },
  O2: {
    kod: "O2", pasmo: "oranzova", nazev: "Vysoká", poradi: 9,
    znamena: "Státy přijímají mimořádná bezpečnostní opatření.",
    zpusobuje: "Aktivace čl. 4, mimořádná ochrana infrastruktury, změna pohotovosti Aliance.",
    neznamena: "Neznamená vyhlášení válečného stavu ani obecné omezení vycestování.",
    posunVys: "Vojenský incident mezi NATO a Ruskem s oběťmi nebo škodou.",
  },
  O3: {
    kod: "O3", pasmo: "oranzova", nazev: "Vysoká", poradi: 10,
    znamena: "Na hranici mezi hybridním tlakem a přímým střetem.",
    zpusobuje: "Ozbrojený incident, evakuace personálu, mimořádné právní kroky států.",
    neznamena: "Neznamená, že k eskalaci nutně dojde — stabilizace je stále možná.",
    posunVys: "Ozbrojený střet mezi silami NATO a Ruska.",
  },
  R1: {
    kod: "R1", pasmo: "cervena", nazev: "Vážná", poradi: 11,
    znamena: "Probíhá ozbrojený incident s přímou účastí NATO nebo ČR.",
    zpusobuje: "Přímý vojenský střet, aktivace čl. 5, útok na území členského státu.",
    neznamena: "—",
    posunVys: "Rozšíření střetu na více států.",
  },
  R2: {
    kod: "R2", pasmo: "cervena", nazev: "Vážná", poradi: 12,
    znamena: "Rozsáhlý ozbrojený konflikt s účastí NATO.",
    zpusobuje: "Vojenské operace většího rozsahu.",
    neznamena: "—",
    posunVys: "—",
  },
  R3: {
    kod: "R3", pasmo: "cervena", nazev: "Vážná", poradi: 13,
    znamena: "Nejzávažnější možný stav.",
    zpusobuje: "Konflikt zasahující území ČR.",
    neznamena: "—",
    posunVys: "—",
  },
};

/**
 * Vizuální tokeny pásem.
 *
 * Celý přehled stojí na tmavém inkoustu, takže obě sady (světlá i noční)
 * ukazují na stejné, dostatečně svítivé odstíny — barva musí projít na tmavém.
 * Sada „Noc“ zůstává kvůli komponentám, které ji dostávají explicitně.
 */
/*
  Barvy pásem.

  Pravidlo, které tady drží celý web pohromadě: **barva je značka, ne plocha.**

  Dřív nesla úroveň závažnosti pět věcí naráz — barevný rámeček, tónované
  pozadí, barevné písmo, barevnou tečku a barevný pruh. Na jedné obrazovce
  se tak sešlo šest odstínů v desítkách prvků a výsledek vypadal jako dětské
  hřiště, ne jako bezpečnostní přehled. A hlavně: když je barevné všechno,
  neznamená barva nic. Vážná věc se nemá jak odlišit od běžné.

  Proto:
  - `tecka`, `pruh`, `plna` barvu NESOU — je to malá značka (tečka do 8 px,
    tenký pruh, bod v grafu). Tam je barva čitelná a nekřičí.
  - `text`, `ramecek`, `pozadi` jsou NEUTRÁLNÍ. Písmo je inkoust, rámeček
    vlasová linka, plocha tmavá jako zbytek webu.

  Význam se tím neztrácí: úroveň je na webu vždycky napsaná i slovem, barva
  byla jen zdvojení. Rozlišení zůstává — jen se přesunulo do tečky vedle
  slova místo do slova samotného.

  Červený akcent značky je vyhrazený značce, hlavní akci a mimořádné
  výstraze. Závažnost jednotlivého záznamu ho nepoužívá; ta má tečku.
*/
export const PASMA: Record<Pasmo, {
  nazev: string;
  /** Barevná tečka. Jediné místo, kde barva pásma stojí sama. */
  tecka: string;
  /** Neutrální písmo. Úroveň nese slovo, barvu vedle něj nese tečka. */
  text: string;
  ramecek: string;
  pozadi: string;
  /** Tenký pruh v grafu — barva na 6 px je údaj, ne výzdoba. */
  pruh: string;
  plna: string;
  /* na tmavém podkladu — dnes totéž, ponecháno kvůli rozhraní */
  teckaNoc: string;
  textNoc: string;
  ramecekNoc: string;
  pozadiNoc: string;
  plnaNoc: string;
}> = {
  zelena: {
    nazev: "Nízká",
    tecka: "bg-klid", text: "text-inkoust", ramecek: "border-linka2",
    pozadi: "bg-plocha", pruh: "bg-klid", plna: "#5cbf8a",
    teckaNoc: "bg-klid", textNoc: "text-inkoust", ramecekNoc: "border-linka2",
    pozadiNoc: "bg-plocha", plnaNoc: "#5cbf8a",
  },
  zluta: {
    nazev: "Střední",
    tecka: "bg-pozor", text: "text-inkoust", ramecek: "border-linka2",
    pozadi: "bg-plocha", pruh: "bg-pozor", plna: "#d9b24c",
    teckaNoc: "bg-pozor", textNoc: "text-inkoust", ramecekNoc: "border-linka2",
    pozadiNoc: "bg-plocha", plnaNoc: "#d9b24c",
  },
  prechod: {
    nazev: "Zvýšená",
    tecka: "bg-stari", text: "text-inkoust", ramecek: "border-linka2",
    pozadi: "bg-plocha", pruh: "bg-stari", plna: "#e08a3c",
    teckaNoc: "bg-stari", textNoc: "text-inkoust", ramecekNoc: "border-linka2",
    pozadiNoc: "bg-plocha", plnaNoc: "#e08a3c",
  },
  oranzova: {
    nazev: "Vysoká",
    tecka: "bg-oranz", text: "text-inkoust", ramecek: "border-linka2",
    pozadi: "bg-plocha", pruh: "bg-oranz", plna: "#e8763f",
    teckaNoc: "bg-oranz", textNoc: "text-inkoust", ramecekNoc: "border-linka2",
    pozadiNoc: "bg-plocha", plnaNoc: "#e8763f",
  },
  cervena: {
    nazev: "Vážná",
    tecka: "bg-akcent", text: "text-inkoust", ramecek: "border-linka2",
    pozadi: "bg-plocha", pruh: "bg-akcent", plna: "#e8484f",
    teckaNoc: "bg-akcent", textNoc: "text-inkoust", ramecekNoc: "border-linka2",
    pozadiNoc: "bg-plocha", plnaNoc: "#e8484f",
  },
};

/**
 * Úroveň vyjádřená číslem 1–10.
 *
 * Je to táž úroveň, jen jinak zapsaná — pro krátká sdělení, kde není místo na
 * vysvětlení (kanály, odznaky). Ne pravděpodobnost a ne procento: nic
 * nepředpovídá, jen říká, kde na stupnici věc stojí. Třináct stupňů se do
 * deseti čísel vejde tak, že sousední stupně se stejným názvem sdílí číslo.
 */
const Z_DESETI: Record<Uroven, number> = {
  G1: 1, G2: 2, G3: 3, Y1: 4, Y2: 5, Y3: 6, YO: 6, O1: 7, O2: 8, O3: 8, R1: 9, R2: 9, R3: 10,
};

export function zDeseti(u: Uroven): number {
  return Z_DESETI[u];
}

export function definice(u: Uroven): DefiniceUrovne {
  return UROVNE[u];
}

export function pasmo(u: Uroven): Pasmo {
  return UROVNE[u].pasmo;
}

export function tokeny(u: Uroven) {
  return PASMA[UROVNE[u].pasmo];
}

/** Porovnání dvou úrovní: >0 znamená zhoršení. */
export function rozdil(a: Uroven, b: Uroven): number {
  return UROVNE[a].poradi - UROVNE[b].poradi;
}

export const JISTOTY: Record<Jistota, { nazev: string; body: number; popis: string }> = {
  nizka: { nazev: "Nízká", body: 1, popis: "Informace existuje, ale chybí potvrzení z nezávislého nebo primárního zdroje." },
  stredni: { nazev: "Střední", body: 2, popis: "Informaci uvádí důvěryhodné médium, primární potvrzení zatím chybí." },
  vysoka: { nazev: "Vysoká", body: 3, popis: "Potvrzeno primárním zdrojem nebo více nezávislými zdroji." },
  potvrzeno: { nazev: "Potvrzeno", body: 4, popis: "Potvrzeno oficiálním orgánem, který věc sám oznámil." },
};
