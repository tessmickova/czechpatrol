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
    zpusobuje: "Aktivace čl. 4, mimořádná ochrana infrastruktury, změna readiness.",
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
 * Celý přehled stojí na světlém papíru, takže obě sady (světlá i noční)
 * ukazují na stejné, dostatečně tmavé odstíny — barva musí projít i na bílé.
 * Sada „Noc“ zůstává kvůli komponentám, které ji dostávají explicitně.
 */
export const PASMA: Record<Pasmo, {
  nazev: string;
  tecka: string;
  text: string;
  ramecek: string;
  pozadi: string;
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
    tecka: "bg-[#2e7d53]", text: "text-[#256b45]", ramecek: "border-[#2e7d53]/30",
    pozadi: "bg-[#2e7d53]/10", pruh: "bg-[#2e7d53]", plna: "#2e7d53",
    teckaNoc: "bg-[#2e7d53]", textNoc: "text-[#256b45]", ramecekNoc: "border-[#2e7d53]/30",
    pozadiNoc: "bg-[#2e7d53]/10", plnaNoc: "#2e7d53",
  },
  zluta: {
    nazev: "Střední",
    tecka: "bg-[#b8860b]", text: "text-[#8a6d0b]", ramecek: "border-[#b8860b]/30",
    pozadi: "bg-[#b8860b]/10", pruh: "bg-[#b8860b]", plna: "#b8860b",
    teckaNoc: "bg-[#b8860b]", textNoc: "text-[#8a6d0b]", ramecekNoc: "border-[#b8860b]/30",
    pozadiNoc: "bg-[#b8860b]/10", plnaNoc: "#b8860b",
  },
  prechod: {
    nazev: "Zvýšená",
    tecka: "bg-[#c96a1e]", text: "text-[#a3541a]", ramecek: "border-[#c96a1e]/30",
    pozadi: "bg-[#c96a1e]/10", pruh: "bg-[#c96a1e]", plna: "#c96a1e",
    teckaNoc: "bg-[#c96a1e]", textNoc: "text-[#a3541a]", ramecekNoc: "border-[#c96a1e]/30",
    pozadiNoc: "bg-[#c96a1e]/10", plnaNoc: "#c96a1e",
  },
  oranzova: {
    nazev: "Vysoká",
    tecka: "bg-[#d1521f]", text: "text-[#a8401a]", ramecek: "border-[#d1521f]/30",
    pozadi: "bg-[#d1521f]/10", pruh: "bg-[#d1521f]", plna: "#d1521f",
    teckaNoc: "bg-[#d1521f]", textNoc: "text-[#a8401a]", ramecekNoc: "border-[#d1521f]/30",
    pozadiNoc: "bg-[#d1521f]/10", plnaNoc: "#d1521f",
  },
  cervena: {
    nazev: "Vážná",
    tecka: "bg-[#c1272d]", text: "text-[#a01c22]", ramecek: "border-[#c1272d]/35",
    pozadi: "bg-[#c1272d]/10", pruh: "bg-[#c1272d]", plna: "#c1272d",
    teckaNoc: "bg-[#c1272d]", textNoc: "text-[#a01c22]", ramecekNoc: "border-[#c1272d]/35",
    pozadiNoc: "bg-[#c1272d]/10", plnaNoc: "#c1272d",
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
