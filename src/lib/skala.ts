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
    kod: "G3", pasmo: "zelena", nazev: "Zvýšená pozornost", poradi: 3,
    znamena: "Stále klidný stav, ale objevují se signály, které sledujeme podrobněji.",
    zpusobuje: "Jednotlivé incidenty proti infrastruktuře bez známého původce.",
    neznamena: "Neznamená mimořádnou situaci ani žádné omezení běžného života.",
    posunVys: "Incidenty ve více zemích během krátké doby.",
  },
  Y1: {
    kod: "Y1", pasmo: "zluta", nazev: "Střední", poradi: 4,
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
    kod: "Y3", pasmo: "zluta", nazev: "Vyšší", poradi: 6,
    znamena: "Hybridní tlak je zřetelný a dlouhodobý.",
    zpusobuje: "Vzorec incidentů napříč Evropou, opakované vyšetřovací závěry.",
    neznamena: "Neznamená mobilizaci, omezení vycestování ani vojenský konflikt.",
    posunVys: "Oficiální atribuce státního řízení série útoků.",
  },
  YO: {
    kod: "YO", pasmo: "prechod", nazev: "Téměř oranžová", poradi: 7,
    znamena: "Na horní hranici žluté. Další podobná událost pásmo posune.",
    zpusobuje: "Kumulace hybridních incidentů spolu s institucionální reakcí států.",
    neznamena: "Neznamená bezprostřední vojenské riziko ani mimořádná opatření v ČR.",
    posunVys: "Oficiální atribuce, škoda na kritické infrastruktuře, svolání čl. 4.",
  },
  O1: {
    kod: "O1", pasmo: "oranzova", nazev: "Oranžová", poradi: 8,
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
    kod: "O3", pasmo: "oranzova", nazev: "Téměř červená", poradi: 10,
    znamena: "Na hranici mezi hybridním tlakem a přímým střetem.",
    zpusobuje: "Ozbrojený incident, evakuace personálu, mimořádné právní kroky států.",
    neznamena: "Neznamená, že k eskalaci nutně dojde — stabilizace je stále možná.",
    posunVys: "Ozbrojený střet mezi silami NATO a Ruska.",
  },
  R1: {
    kod: "R1", pasmo: "cervena", nazev: "Kritická", poradi: 11,
    znamena: "Probíhá ozbrojený incident s přímou účastí NATO nebo ČR.",
    zpusobuje: "Přímý vojenský střet, aktivace čl. 5, útok na území členského státu.",
    neznamena: "—",
    posunVys: "Rozšíření střetu na více států.",
  },
  R2: {
    kod: "R2", pasmo: "cervena", nazev: "Kritická", poradi: 12,
    znamena: "Rozsáhlý ozbrojený konflikt s účastí NATO.",
    zpusobuje: "Vojenské operace většího rozsahu.",
    neznamena: "—",
    posunVys: "—",
  },
  R3: {
    kod: "R3", pasmo: "cervena", nazev: "Kritická", poradi: 13,
    znamena: "Nejzávažnější možný stav.",
    zpusobuje: "Konflikt zasahující území ČR.",
    neznamena: "—",
    posunVys: "—",
  },
};

/**
 * Vizuální tokeny pásem.
 *
 * Celá konzole stojí na tmavé ploše, takže obě sady (světlá i noční) ukazují
 * na stejné, svítivé odstíny. Sada „Noc“ zůstává kvůli komponentám, které ji
 * dostávají explicitně — a kvůli tomu, aby světlý tisk mohl dostat vlastní.
 */
export const PASMA: Record<Pasmo, {
  nazev: string;
  tecka: string;
  text: string;
  ramecek: string;
  pozadi: string;
  pruh: string;
  plna: string;
  /* na tmavém podkladu */
  teckaNoc: string;
  textNoc: string;
  ramecekNoc: string;
  pozadiNoc: string;
  plnaNoc: string;
}> = {
  zelena: {
    nazev: "Nízká",
    tecka: "bg-[#4fdd9a]", text: "text-[#8ff0c0]", ramecek: "border-[#4fdd9a]/35",
    pozadi: "bg-[#4fdd9a]/10", pruh: "bg-[#4fdd9a]", plna: "#4fdd9a",
    teckaNoc: "bg-[#4fdd9a]", textNoc: "text-[#8ff0c0]", ramecekNoc: "border-[#4fdd9a]/35",
    pozadiNoc: "bg-[#4fdd9a]/10", plnaNoc: "#4fdd9a",
  },
  zluta: {
    nazev: "Střední",
    tecka: "bg-[#ffd166]", text: "text-[#ffe08a]", ramecek: "border-[#ffd166]/35",
    pozadi: "bg-[#ffd166]/10", pruh: "bg-[#ffd166]", plna: "#ffd166",
    teckaNoc: "bg-[#ffd166]", textNoc: "text-[#ffe08a]", ramecekNoc: "border-[#ffd166]/35",
    pozadiNoc: "bg-[#ffd166]/10", plnaNoc: "#ffd166",
  },
  prechod: {
    nazev: "Téměř oranžová",
    tecka: "bg-[#ffab4d]", text: "text-[#ffc07a]", ramecek: "border-[#ffab4d]/35",
    pozadi: "bg-[#ffab4d]/10", pruh: "bg-[#ffab4d]", plna: "#ffab4d",
    teckaNoc: "bg-[#ffab4d]", textNoc: "text-[#ffc07a]", ramecekNoc: "border-[#ffab4d]/35",
    pozadiNoc: "bg-[#ffab4d]/10", plnaNoc: "#ffab4d",
  },
  oranzova: {
    nazev: "Vysoká",
    tecka: "bg-[#ff8a4c]", text: "text-[#ffa877]", ramecek: "border-[#ff8a4c]/35",
    pozadi: "bg-[#ff8a4c]/10", pruh: "bg-[#ff8a4c]", plna: "#ff8a4c",
    teckaNoc: "bg-[#ff8a4c]", textNoc: "text-[#ffa877]", ramecekNoc: "border-[#ff8a4c]/35",
    pozadiNoc: "bg-[#ff8a4c]/10", plnaNoc: "#ff8a4c",
  },
  cervena: {
    nazev: "Kritická",
    tecka: "bg-[#ff5c6c]", text: "text-[#ff8c98]", ramecek: "border-[#ff5c6c]/35",
    pozadi: "bg-[#ff5c6c]/10", pruh: "bg-[#ff5c6c]", plna: "#ff5c6c",
    teckaNoc: "bg-[#ff5c6c]", textNoc: "text-[#ff8c98]", ramecekNoc: "border-[#ff5c6c]/35",
    pozadiNoc: "bg-[#ff5c6c]/10", plnaNoc: "#ff5c6c",
  },
};

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
