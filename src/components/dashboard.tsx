"use client";

import Link from "next/link";
import { druh, kdyZjisteno, pachatelPotvrzen, podlePuvodce, podleZemi, pripady, uredniZdroj, vyber, type Zaznam } from "@/lib/agregace";
import { cerstvost, datumCasPraha, datumPraha, stariSlovy } from "@/lib/cas";
import type { CelkovyStav, HybridniTlak, Kampan, Kandidat, NatoPolozka, Nepotvrzene, Overovana, PravniPolozka, ProvozniPolozka, Snimek, TydenniHodnoceni, Uroven, Watchlist } from "@/lib/typy";
import { CenaPaliva } from "./palivo";
import { stavPaliva, vetaOCene } from "@/lib/palivo";
import { stavPravni, stavProvozu } from "@/lib/pokryti";
import { StavDetail } from "./stav-detail";
import { PASMA, UROVNE } from "@/lib/skala";
import { cislem, porovnejSPrumerem, prumerNaOkno } from "@/lib/porovnani";
import type { HlavniVeta } from "@/lib/veta";
import { Ikona, type NazevIkony } from "./ikony";
import { HeroDashboard } from "./hero-dashboard";
import { DlazdiceKampane } from "./kampane";
import { NadpisSekce } from "./nadpisy";
import { PruhOverujeme } from "./overujeme";
import { Aktuality } from "./aktuality";
import { UrgentniUpozorneni } from "./urgentni";
import { Odznak, RadekSeznamu, TeckaZavaznosti, Tlacitko } from "./ui";
import { PavucinaHrozeb } from "./pavucina";
import { TabulkaZemi } from "./tabulka-zemi";
import { useZiveHodiny } from "@/lib/cas-klient";
import { SignalySiti } from "./signaly-siti";
import { TipyKPriprave } from "./tipy";
import { PasZemi } from "./pas-zemi";
import { CoSeZmenilo } from "./co-se-zmenilo";
import { Partneri, Sledovat } from "./sledovat";
import { VyzvaTelegram } from "./vyzva-telegram";
import { Nahlaseni } from "./nahlaseni";
import { Napoveda } from "./zaklad";
import { sklon, Vlajka } from "./zeme";
import { useT } from "@/lib/i18n";

/*
  Dashboard. Jedna obrazovka, žádné odstavce.

  Pořadí podle toho, co člověk v krizi hledá nejdřív:
  1. tři velké stavy: Česko, NATO, hodnocení,
  2. mřížka oficiálních stavů — každý jedna dlaždice, barva = stav,
  3. poslední události, čísla za 90 dnů, kde a kdo, křivka letos.
  Vysvětlení jsou v nápovědách a na podstránkách, ne tady.
*/

type Ton = "klid" | "pozor" | "plati" | "nedolozeno" | "nevime";

/*
  Stav nesmí být poznat jen podle barvy. Ke každému tónu proto patří i tvar
  (ikona) a slovo — jinak by dlaždice nic neříkala tomu, kdo barvy nerozliší,
  ani tomu, kdo si web vytiskne černobíle.
*/
/*
  Plocha dlaždice je u všech tónů stejná; tón se pozná po tečce, ikoně a slově.

  Tónovaná pozadí a barevné rámečky dělaly z mřížky dvanácti stavů barevnou
  mozaiku, ve které se „platí" nedalo odlišit od „sledujeme" rychleji než
  přečtením. Barva pomáhá, dokud jí není moc.

  Výjimka je jediná: „platí", tedy vyhlášené mimořádné opatření. Tam je
  tenká akcentní linka opodstatněná — je to ta jedna dlaždice, kterou má
  člověk najít bez čtení.
*/
const TON: Record<Ton, { dlazdice: string; tecka: string; slovo: string; ikona: NazevIkony }> = {
  klid: { dlazdice: "border-linka2 bg-plocha", tecka: "bg-klid", slovo: "text-inkoust", ikona: "fajfka" },
  pozor: { dlazdice: "border-linka2 bg-plocha", tecka: "bg-pozor", slovo: "text-inkoust", ikona: "vykricnik" },
  plati: { dlazdice: "border-akcent/45 bg-plocha", tecka: "bg-akcent", slovo: "text-inkoust", ikona: "sirena" },
  /*
    „Nedoloženo" je vlastní tón, ne zelená. Znamená: v kontrolovaných zdrojích
    jsme nic nenašli, ale úplný seznam nemáme. Zelená by tvrdila ověřený klid,
    na který doklad nemáme.
  */
  nedolozeno: { dlazdice: "border-linka2 bg-transparent", tecka: "bg-tlum2", slovo: "text-tlum", ikona: "info" },
  nevime: { dlazdice: "border-dashed border-linka bg-transparent", tecka: "bg-tlum2", slovo: "text-tlum2", ikona: "otaznik" },
};

/** Stavy, na které se lidé ptají první. Stojí v čele své skupiny. */
const KLICOVE = ["p-mobilizace", "p-nouzovy-stav", "p-vycestovani", "p-hranice", "n-clanek-5", "v-elektrina"];

/*
  Tři skupiny stavů. NATO a Evropská unie jsou dvě různé věci — do jedné
  dlaždice se slévat nesmějí, protože každá rozhoduje o něčem jiném.
*/
const SKUPINY = [
  { predpona: "p", nazev: "Právní stav" },
  { predpona: "n", nazev: "NATO" },
  { predpona: "v", nazev: "Běžný život" },
];

const KRATCE_PRAVNI: Record<string, string> = {
  "stav-ohrozeni": "Stav ohrožení státu", "valecny-stav": "Válečný stav", mobilizace: "Mobilizace", "nouzovy-stav": "Nouzový stav",
  vycestovani: "Vycestování z ČR", hranice: "Hranice ČR", "schuze-parlamentu": "Mimoř. schůze Parlamentu",
};
const KRATCE_NATO: Record<string, string> = {
  "clanek-4": "NATO čl. 4", "clanek-5": "NATO čl. 5", readiness: "Pohotovost NATO", evakuace: "Evakuace personálu", "vychodni-kridlo": "Východní křídlo",
};
const IKONY_PRAVNI: Record<string, NazevIkony> = {
  "stav-ohrozeni": "vystraha", "valecny-stav": "stit", mobilizace: "uzivatel", "nouzovy-stav": "sirena", vycestovani: "pas", hranice: "hranice", "schuze-parlamentu": "vaha",
};

interface Dlazdice {
  klic: string; nazev: string; ikona: NazevIkony; ton: Ton; stav: string;
  /** Původní položka a skupina — z nich se skládá rozbalený detail. */
  zdrojovaPolozka: PravniPolozka | NatoPolozka | ProvozniPolozka;
  skupina: "Právní stav" | "NATO" | "Běžný život";
  coByZmenilo?: string[];
  /** Čas, který se u položky ukazuje — věcné ověření, nebo jen poslední kontrola. */
  cas: string | null;
  popisekCasu: "ověřeno" | "kontrolováno" | "bez kontroly";
  /** Co položka znamená. Stálé, nemění se podle běhu sběru. */
  vysvetleni: string;
  /** Co plyne z POSLEDNÍ kontroly. Mění se každý běh. */
  stavVysvetleni: string;
}

function dlazdicePravni(p: PravniPolozka): Dlazdice {
  const st = stavPravni(p);
  return {
    klic: `p-${p.klic}`, nazev: KRATCE_PRAVNI[p.klic] ?? p.nazev, ikona: IKONY_PRAVNI[p.klic] ?? "dokument",
    ton: st.ton, stav: st.slovo, cas: st.cas, popisekCasu: st.popisekCasu,
    vysvetleni: p.vysvetleni, stavVysvetleni: st.vysvetleni,
    zdrojovaPolozka: p, skupina: "Právní stav",
  };
}

function dlazdiceNato(p: NatoPolozka): Dlazdice {
  const st = stavPravni(p);
  // Východní křídlo je dlouhodobý stav, ne vyhlášené opatření.
  const kridlo = p.klic === "vychodni-kridlo" && p.aktivni === true;
  return {
    klic: `n-${p.klic}`, nazev: KRATCE_NATO[p.klic] ?? p.nazev, ikona: "globus",
    ton: kridlo ? "pozor" : st.ton,
    stav: kridlo ? "posíleno" : st.slovo,
    cas: st.cas, popisekCasu: st.popisekCasu,
    vysvetleni: p.vysvetleni, stavVysvetleni: st.vysvetleni,
    zdrojovaPolozka: p, skupina: "NATO",
  };
}

function dlazdiceProvoz(p: ProvozniPolozka): Dlazdice {
  const st = stavProvozu(p);
  const d: Dlazdice = {
    klic: `v-${p.klic}`, nazev: p.nazev, ikona: (p.ikona as NazevIkony) || "dokument",
    ton: st.ton, stav: st.slovo, cas: st.cas, popisekCasu: st.popisekCasu,
    vysvetleni: p.detail, stavVysvetleni: st.vysvetleni,
    zdrojovaPolozka: p, skupina: "Běžný život", coByZmenilo: p.coByZmenilo,
  };

  /*
    U paliva se píše změřená cena nafty místo slova o dostupnosti. Dostupnost
    a cena jsou dvě různé věci a čtenáře zajímají obě; řádek přitom unese jen
    jeden údaj, a cena je ten, který se mění každý týden. Skok zvedne tón na
    „pozor" — ani tady ale nepadne slovo o tom, co bude dál. To by byla předpověď.
  */
  if (p.klic === "palivo" && p.stav !== "bez-zdroje") {
    const nafta = stavPaliva("nafta");
    const veta = vetaOCene(nafta);
    if (nafta.cena !== null && veta) {
      d.stav = `${nafta.cena.toFixed(2).replace(".", ",")} Kč/l`;
      if (nafta.skok) d.ton = "pozor";
      d.vysvetleni = `${veta} ${p.detail}`;
    }
  }

  return d;
}

/*
  Čas u položky.

  Ukazuje se, CO se stalo: „ověřeno" znamená doložený stav, „kontrolováno"
  znamená, že jsme se dívali do zdrojů. Dřív se obojí jmenovalo stejně a
  relativní čas byl jediný údaj — absolutní se dal zjistit jen najetím myší,
  což na dotyku ani klávesnici nejde.
*/
function Stari({ cas, popisek, ted }: { cas: string | null; popisek: Dlazdice["popisekCasu"]; ted: number }) {
  if (!cas) return <span className="shrink-0 text-mikro text-tlum2">bez kontroly</span>;
  // Čas je předaný, ne braný z Date.now() — jinak se vykreslení neshodnou.
  const c = cerstvost(cas, ted);
  const barva = c === "cerstve" || c === "nezname" ? "text-tlum2" : "text-stari-text";
  return (
    <span className={`shrink-0 text-right text-mikro leading-tight ${barva}`}>
      {popisek}
      <br />
      <span className="cislice">{datumCasPraha(cas)}</span>
    </span>
  );
}

/*
  Jeden stav jako řádek, ne jako kartička.

  Dvacet samostatných rámečků vedle sebe dělalo z přehledu mozaiku, ve které
  nešlo poznat, co je důležité. Teď má rámeček jen skupina; uvnitř jsou řádky
  oddělené linkou. Barevná plocha zbyla jen tam, kde něco platí nebo se něco
  prověřuje — tedy tam, kde barva opravdu něco znamená.

  Stav nese slovo i barva, ne jen barva: kdo barvy nerozliší nebo si web
  vytiskne černobíle, přečte totéž.
*/
function RadekStavu({ d, casSkupiny, ted }: { d: Dlazdice; casSkupiny: string | null; ted: number }) {
  const t = TON[d.ton];
  // Čas se u řádku píše jen tehdy, když se liší od času celé skupiny.
  const vlastniCas = d.cas !== casSkupiny;
  const zvyraznit = d.ton === "plati" || d.ton === "pozor";
  return (
    /*
      Rozbalený řádek zabere celou šířku panelu. V půlce dvousloupcové mřížky
      by detail padal do sloupce širokého pár slov a četl by se po kouskách.
    */
    <li className={`border-b border-linka2 has-[details[open]]:col-span-full ${zvyraznit ? t.dlazdice : ""}`}>
      {/*
        Rozkliknutí místo bubliny při najetí myší. Podrobnosti se tak dají
        otevřít dotykem i klávesnicí a zůstanou otevřené; z nápovědy na hover
        byla informace, ke které se na telefonu nikdo nedostal.
      */}
      <details className="group">
        <summary className="flex min-h-[54px] w-full cursor-pointer list-none items-center gap-2.5 px-3 py-2 text-left hover:bg-plocha2">
          <Ikona nazev={d.ikona} velikost={15} tah={1.8} trida="shrink-0 text-tlum2" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-male leading-tight text-tlum">{d.nazev}</span>
            <span className={`block text-zaklad font-bold leading-tight ${t.slovo}`}>{d.stav}</span>
          </span>
          {vlastniCas && <Stari cas={d.cas} popisek={d.popisekCasu} ted={ted} />}
          <Ikona nazev="dolu" velikost={13} tah={2} trida="shrink-0 text-tlum2 transition-transform group-open:rotate-180" />
        </summary>
        <StavDetail polozka={d.zdrojovaPolozka} skupina={d.skupina} vysvetleni={d.vysvetleni} stavVysvetleni={d.stavVysvetleni} coByZmenilo={d.coByZmenilo} />
      </details>
    </li>
  );
}

/** Velká dlaždice nahoře: jedno slovo, jedna barva, jedna řádka pod tím. */
function Hlavni({ nadpis, hodnota, ton, popis, overeno, napoveda, jiskra }: { nadpis: string; hodnota: string; ton: Ton | "uroven"; popis: string; overeno: string | null; napoveda: React.ReactNode; jiskra?: React.ReactNode; barva?: string }) {
  const t = ton === "uroven" ? null : TON[ton];
  return (
    <Napoveda cele popis={napoveda}>
      <span className={`flex min-h-[112px] w-full flex-col justify-between rounded-[18px] border p-4 text-left ${t ? t.dlazdice : "border-linka bg-plocha"}`}>
        <span className="flex items-center justify-between gap-2">
          <span className="stitek">{nadpis}</span>
          <Stari cas={overeno} popisek="kontrolováno" ted={Date.parse(overeno ?? "") || 0} />
        </span>
        <span className="mt-2 flex items-end justify-between gap-3">
          <span className={`text-cislo font-bold leading-none sm:text-cislo-l ${t ? t.slovo : ""}`}>{hodnota}</span>
          {jiskra}
        </span>
        <span className="mt-2 text-drobne leading-snug text-tlum">{popis}</span>
      </span>
    </Napoveda>
  );
}

function Cislo({ n, slovo }: { n: number; slovo: string }) {
  return (
    <span className="flex flex-col rounded-[18px] border border-linka2 bg-plocha px-3 py-2">
      <span className="cislice text-cislo font-bold leading-none text-inkoust">{n}</span>
      <span className="mt-1 text-mikro leading-tight text-tlum">{slovo}</span>
    </span>
  );
}

function Pruh({ nazev, n, max, barva, odkaz }: { nazev: React.ReactNode; n: number; max: number; barva: string; odkaz?: string }) {
  const telo = (
    <>
      <span className="flex w-[118px] shrink-0 items-center gap-1.5 truncate text-drobne text-inkoust">{nazev}</span>
      <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-linka2"><span className={`block h-full ${barva}`} style={{ width: `${max ? (n / max) * 100 : 0}%` }} /></span>
      <span className="cislice w-6 shrink-0 text-right text-male font-bold text-inkoust">{n}</span>
    </>
  );
  return odkaz ? <Link href={odkaz} className="flex min-h-[36px] items-center gap-2 hover:bg-plocha">{telo}</Link> : <span className="flex min-h-[36px] items-center gap-2">{telo}</span>;
}

export function Dashboard({
  stav, pravni, natoPolozky, provozPolozky, overeno, vse, neprosle, kandidati, nepotvrzene = [], tydny, watchlist, crHistoricky, hybridni, obcane, ted, snimky = [],
  tlakEvropa, tlakCesko, veta, kampane, nazvyZemi, overovaneAktivni = [], overovaneUzavrene = [],
}: {
  stav: CelkovyStav; pravni: PravniPolozka[]; natoPolozky: NatoPolozka[]; provozPolozky: ProvozniPolozka[];
  /** Čas sestavení. Klient z něj vychází, aby se první vykreslení shodlo. */
  ted: number;
  overeno: string | null; vse: Zaznam[]; neprosle: Nepotvrzene[]; kandidati: Kandidat[]; nepotvrzene?: Zaznam[]; tydny: TydenniHodnoceni[]; watchlist: Watchlist;
  crHistoricky: Uroven | null;
  /** Archiv snímků úředního stavu — z něj se čte, co se změnilo. */
  snimky?: Snimek[];
  hybridni: Uroven | null; obcane: { uroven: Uroven; popis: string; neovereno: number };
  tlakEvropa: HybridniTlak; tlakCesko: HybridniTlak; veta: HlavniVeta;
  kampane: Kampan[]; nazvyZemi: Record<string, string>;
  /** Zprávy, které se šíří a zatím nejsou ověřené. Do počtů nevstupují. */
  overovaneAktivni?: Overovana[];
  overovaneUzavrene?: Overovana[];
}) {
  const t = useT();
  const platiCr = pravni.filter((p) => p.plati === true);
  const neovereneCr = pravni.filter((p) => p.plati === null).length;
  const naruseno = provozPolozky.filter((p) => p.stav === "narusen");
  const sledujeme = provozPolozky.filter((p) => p.stav === "sledujeme");
  const cl4 = natoPolozky.find((p) => p.klic === "clanek-4"), cl5 = natoPolozky.find((p) => p.klic === "clanek-5");
  const natoAktivni = natoPolozky.filter((p) => p.aktivni === true && p.klic !== "vychodni-kridlo");
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const pasmo = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;

  /*
    Všechna okna se počítají z živého času (tedMs), ne z času sestavení.
    Web se sestavuje jednou za pár hodin; číslo „za 90 dní" spočítané při
    sestavení se od počítadel v liště, která si čas berou z prohlížeče,
    rozcházelo o záznam na hraně okna. Proto stejný čas pro všechno.
  */
  /*
    Číslo za 90 dní samo o sobě neřekne, jestli je to klid, nebo nejhorší
    čtvrtletí za dva roky. Proto se k němu počítá porovnání s průměrem —
    a to z posledních dvou let, ne z celého archivu od roku 2014, kde je
    sběr řídký a každé dnešní čtvrtletí by vyšlo jako mimořádné.
  */
  /*
    Čas přichází ze serverové stránky a po připojení se přepne na živý.
    Kdyby si ho komponenta brala sama přes Date.now(), lišilo by se
    vykreslení při sestavení a při hydrataci — React na to hlásil chybu
    #418 na úvodní straně, v událostech i v jazykových variantách.
  */
  const tedMs = useZiveHodiny(ted);
  const dni90 = pripady(vse, { dni: 90, ted: tedMs });
  /*
    Situace v Česku za 90 dní: nejvyšší závažnost z případů a operací
    proti občanům v okně. Dřív přicházela ze serveru s časem sestavení;
    tady je z téhož živého času jako všechno ostatní.
  */
  const czKampane90 = kampane.filter((k) => k.kodyZemi.includes("CZ") && tedMs - new Date(k.odhaleno).getTime() <= 90 * 86_400_000);
  const czUrovne: Uroven[] = [...dni90.filter((i) => i.kodZeme === "CZ").map((i) => i.zavaznost), ...czKampane90.map((k) => k.zavaznost)];
  const cr: Uroven | null = czUrovne.length ? czUrovne.reduce((m, u) => (UROVNE[u].poradi > UROVNE[m].poradi ? u : m), czUrovne[0]) : null;
  const crPocet = { pripadu: dni90.filter((i) => i.kodZeme === "CZ").length, kampani: czKampane90.length };
  const kampaneVOkne = (dni: number) => kampane.filter((k) => tedMs - new Date(k.odhaleno).getTime() <= dni * 86_400_000).length;
  const zapocitatelne90 = dni90.length + kampaneVOkne(90);
  const casyZapocitatelne = [
    ...vse.filter((i) => druh(i) === "pripad").map((i) => kdyZjisteno(i)),
    ...kampane.map((k) => k.odhaleno),
  ];
  const porovnani90 = porovnejSPrumerem(zapocitatelne90, prumerNaOkno(casyZapocitatelne, 90, tedMs));
  const zemi = new Set(dni90.map((i) => i.kodZeme)).size;
  const cz = dni90.filter((i) => i.kodZeme === "CZ").length;
  const potvrzeno = dni90.filter(pachatelPotvrzen).length;
  const uredni = dni90.filter(uredniZdroj).length;
  const rok = new Date(tedMs).getUTCFullYear();
  const letos = vyber(vse, { odRoku: rok });
  const zeme = podleZemi(letos).filter((z) => z.pripady > 0 || z.kodZeme === "CZ").slice(0, 6);
  const maxZeme = Math.max(1, ...zeme.map((z) => z.pripady));
  const puv = podlePuvodce(letos);
  const maxPuv = Math.max(1, ...puv.skupiny.map((s) => s.pocet));
  const stariCelkem = cerstvost(overeno, tedMs);

  const crHodnota = platiCr.length ? platiCr.map((p) => KRATCE_PRAVNI[p.klic] ?? p.nazev).join(", ") : naruseno.length ? "Narušeno" : sledujeme.length ? "Sledujeme" : "Bez omezení";
  const crTon: Ton = platiCr.length ? "plati" : naruseno.length ? "plati" : sledujeme.length ? "pozor" : neovereneCr === pravni.length ? "nevime" : "klid";
  const crPopis = platiCr.length
    ? `Platí: ${platiCr.map((p) => (KRATCE_PRAVNI[p.klic] ?? p.nazev).toLowerCase()).join(", ")}`
    : `Mobilizace ne · vycestování bez omezení · hranice běžně${neovereneCr ? ` · ${neovereneCr} neověřeno` : ""}`;

  const natoHodnota = natoAktivni.length ? natoAktivni.map((p) => KRATCE_NATO[p.klic] ?? p.nazev).join(", ") : cl4?.aktivni === null && cl5?.aktivni === null ? "Neověřeno" : "Bez aktivace";
  const natoTon: Ton = natoAktivni.length ? "plati" : cl4?.aktivni === null && cl5?.aktivni === null ? "nevime" : "klid";

  /*
    Dlaždice se počítají jednou a ukazují se VŠECHNY.

    Dřív jich šest stálo nahoře a čtrnáct bylo schovaných v rozbalovátku.
    Kdo sem chodí ve strachu, ale nehledá šest věcí — hledá tu jednu svoji,
    a klikat po ní nebude. Rozbalovátko taky mlčky tvrdí, že schovaný stav
    je méně důležitý.

    Pořadí uvnitř skupiny: na co se lidé ptají první, stojí vepředu.
  */
  const vsechnyDlazdice: Dlazdice[] = [
    ...pravni.map(dlazdicePravni),
    ...natoPolozky.map(dlazdiceNato),
    ...provozPolozky.map(dlazdiceProvoz),
  ];
  const skupinyDlazdic = SKUPINY.map((sk) => {
    const polozky = vsechnyDlazdice
      .filter((d) => d.klic.startsWith(`${sk.predpona}-`))
      .sort((a, b) => (KLICOVE.includes(a.klic) ? 0 : 1) - (KLICOVE.includes(b.klic) ? 0 : 1));
    /*
      Společný čas skupiny: nejstarší z položek. Skupina není zkontrolovanější,
      než je její nejhůř pokrytá položka — brát nejnovější čas by tvrdilo víc,
      než na co máme doklad.
    */
    const casy = polozky.map((d) => d.cas).filter((c): c is string => Boolean(c));
    const cas = casy.length ? casy.slice().sort()[0] : null;
    const popisekCasu = cas
      ? (polozky.every((d) => d.popisekCasu === "ověřeno") ? "ověřeno" as const : "kontrolováno" as const)
      : "bez kontroly" as const;
    return { ...sk, polozky, cas, popisekCasu };
  }).filter((sk) => sk.polozky.length > 0);

  void tydny;
  return (
    <>
    <PasZemi vse={vse} kampane={kampane} ted={ted} />
    <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7">
      {/* Nad budíky: co se šíří a zatím není ověřené. Bez toho by
          závažná, ale nepotvrzená zpráva propadla úplně. */}
      <PruhOverujeme aktivni={overovaneAktivni} uzavrene={overovaneUzavrene} ted={tedMs} />

      {/*
        Úvod tři pětiny, aktuality dvě pětiny.

        Třetina byla na dvouřádkové titulky úzká: řádek s vlajkou a datem
        nechal titulku ~200 px a lámal ho do tří řádků. Dvě pětiny stačí na
        dvě řádky a úvod o 90 px užší nic neztrácí.

        Na titulce nebylo poznat, že projekt žije: ověřené záznamy přibývají
        po dnech, protože každý musí projít člověkem, a mezi nimi web vypadal
        zamrzle, i když sběr každou hodinu něco zachytil. Sloupec vedle
        ukazuje obojí — nejdřív ověřené, pod nimi zachycené a neověřené,
        oddělené tak, aby se to nedalo splést.

        Na mobilu jsou pod sebou; třetinový sloupec na úzkém displeji není
        sloupec, jen úzký proužek.
      */}
      {/*
        Mezera mezi úvodem a sloupcem je větší než jinde v mřížce (40 px
        místo 16): úvod nemá rámeček, takže hranici mezi textem a kartou
        vedle dělá jen vzduch — a 16 px vzduchu hranici neudělá.
      */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:gap-10">
        <div className="min-w-0">
          <HeroDashboard stav={stav} cr={cr} crHistoricky={crHistoricky} crPocet={crPocet} obcane={obcane} veta={veta} />
        </div>
        {/*
          Sloupec smí být o kousek vyšší než úvod. Dřív byl přilepený
          absolutně na výšku úvodu, protože jednořádkových položek se do ní
          vešlo dvanáct a třináctá by se ořízla. Dvouřádkové řádky se ale do
          výšky úvodu (545 px bez rámečku) nevejdou ani čtyři a čtyři —
          a tři a tři už nejsou aktuality. Úvod bez rámečku prázdné místo
          pod sebou unese; oříznutý poslední řádek pod tlačítkem ne.

          Zlom je až na 1280 px. Při 1024 px by měl sloupec jen ~310 px,
          titulky by se lámaly do čtyř řádků a nevešly by se ani čtyři.
        */}
        <div className="min-w-0">
          <Aktuality zaznamy={vse} kandidati={kandidati} nepotvrzene={nepotvrzene} />
        </div>
      </div>

      {/*
        1b — urgentní upozornění na místě, kde byl rámeček s čísly. Čísla jsou
        v úvodu, tady je odpověď na otázku, se kterou sem člověk chodí: děje se
        právě teď něco, kvůli čemu bych měl něco dělat?
      */}
      <UrgentniUpozorneni kandidati={kandidati} zkontrolovano={overeno} ted={tedMs} />

      {/* 2 — mřížka stavů + poslední události */}
      <div className="nalet mt-14 sm:mt-20">
        <NadpisSekce
          stitek={t("Co právě platí")}
          nadpis={t("Úřední stav v Česku")}
        />
      </div>
      {/* Stejný poměr a mezera jako v úvodu: tři pětiny mřížka, dvě pětiny sloupec. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:gap-10">
        <section aria-label={t("Oficiální stavy")} id="opatreni" className="scroll-mt-[84px] space-y-4">
          {skupinyDlazdic.map((sk) => (
            <div key={sk.predpona} className="overflow-hidden rounded-[20px] border border-linka2 bg-plocha">
              {/*
                Čas kontroly stojí v hlavičce skupiny, ne u každého řádku.
                Dvacet stejných časových razítek pod sebou je šum; položka,
                která má čas jiný, si ho vypíše sama.
              */}
              <div className="flex items-center justify-between gap-3 border-b border-linka2 px-3 py-2">
                <span className="stitek">{sk.nazev}</span>
                <Stari cas={sk.cas} popisek={sk.popisekCasu} ted={tedMs} />
              </div>
              <ul className="sm:grid sm:grid-cols-2">
                {sk.polozky.map((d) => <RadekStavu key={d.klic} d={d} casSkupiny={sk.cas} ted={tedMs} />)}
              </ul>
            </div>
          ))}

          {/* Cena paliva: měřená řada ČSÚ. Nic o tom, kam ceny půjdou dál. */}
          <CenaPaliva />
        </section>

        {/*
          Vedle mřížky stavů: co se změnilo, ne co se stalo.

          Dřív tu byl seznam nových událostí — třetí místo na úvodní straně
          s touž otázkou. Události mají sloupec v úvodu a vlastní stránku.
          Sem patří změny, které se dotknou života tady: úřední stavy,
          cena paliva, opatření v Česku, u sousedů a v EU.
        */}
        <div className="space-y-4">
        <CoSeZmenilo zaznamy={vse} snimky={snimky} ted={tedMs} />

        {/*
          Signály z profilů představitelů a institucí. Zobrazí se jen tehdy,
          když nějaké máme — prázdná sekce s nadpisem by tvrdila, že se nic
          neděje, přitom by znamenala jen to, že profily zatím nesledujeme.
        */}
        <SignalySiti />
        {/*
          Tipy k přípravě. Odpovídají na jinou otázku než zbytek webu: ne co
          se stalo, ale co s tím může člověk udělat dnes. Bez tipu se
          nevykreslí nic.
        */}
        <TipyKPriprave ted={tedMs} />
        </div>
      </div>

      {/* 2b2 — manipulační kampaně: operace, ne události */}
      {kampane.length > 0 && (
        <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
          <NadpisSekce
            stitek="Manipulace"
            nadpis={t("Manipulace a útoky na občany")}
            popis="Podvržené dokumenty, weby a profily vydávající se za někoho jiného."
            akce={<Tlacitko kam="/manipulace/" varianta="obrys" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">{t("všechny rozbory")}</Tlacitko>}
          />
          {/*
            Karusel, ne mřížka. Kampaní přibývá a mřížka je buď useknutá na
            tři, nebo z ní je stěna dlaždic; takhle jich jde projet víc a
            výška sekce zůstane stejná.
          */}
          <div
            className="pas-scroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
            role="list"
            aria-label={t("Manipulace a útoky na občany")}
          >
            {kampane.slice(0, 8).map((k) => (
              <div key={k.slug} role="listitem" className="w-[min(82vw,360px)] shrink-0 snap-start">
                <DlazdiceKampane k={k} nazvyZemi={nazvyZemi} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2c — čím je tlak tvořený: pavučina typů hrozeb */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        {/*
          Popisek říká, co data opravdu jsou. Dřív tu stálo „za 90 dní", jenže
          osy se počítají jako nejvyšší úroveň ze všech záznamů od roku 2014 —
          bez časového filtru. Popisek, který slibuje jiný výřez než graf
          ukazuje, je horší než žádný.
        */}
        <NadpisSekce
          stitek="Typy událostí"
          nadpis={t("Typy evidovaných událostí")}
          popis="Nejvyšší doložená úroveň v každé oblasti od roku 2014. Prázdné pole = odtud takový záznam nemáme."
        />
        {/*
          Jedna pavučina a jedna tabulka, ne třináct pavučin v karuselu.

          Pavučina ukazuje tvar tlaku pro Evropu jako celek — na to je tvar
          dobrý. Země se porovnávají v tabulce vedle: řádek země, sloupec typ,
          v buňce tečka a slovo. Třináct skoro stejných šestiúhelníků vedle
          sebe porovnat nešlo; tabulka se čte jedním pohledem.
        */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <PavucinaHrozeb
            nadpis="Evropa jako celek"
            popis={t("Všechny sledované země od roku 2014.")}
            tlak={tlakEvropa}
            odkaz={{ href: "/metodika/", text: "jak se hodnotí →" }}
            velikostObrazce={260}
            sPopisky
          />
          <TabulkaZemi />
        </div>
      </div>

      {/*
        Pořadí prohozeno: nejdřív seznam záznamů, pak čísla o něm.

        Čtenář, který dojde až sem, hledá konkrétní událost — ne souhrnnou
        statistiku. Čísla dávají smysl až nad seznamem, který si prohlédl,
        ne před ním.
      */}
      {/*
        4 — úplný seznam tu už není.

        Stál tu celý archiv s filtry — totéž, co je na stránce Události,
        a k tomu potřetí to, co ukazují aktuality nahoře. Úvodní strana
        na archiv odkazuje (tlačítko v aktualitách), sama ho nenese.
        Zůstává jen to, co jinde není: možnost ohlásit, co chybí.
      */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <Nahlaseni />
      </div>

      {/* 3 — čísla, kde, kdo */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek={t("Čísla")}
          nadpis={t("Kolik toho je, kde a kdo za tím stojí")}
          popis={t("Počítají se jen skutečné události — ne jejich pokračování, opatření ani prohlášení.")}
        />
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <section aria-label={t("Posledních 90 dnů")}>
          <div className="mb-1.5 flex items-center justify-between"><span className="stitek">{t("Posledních 90 dnů · incidenty")}</span><Tlacitko kam="/udalosti/?obdobi=30d" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">detail</Tlacitko></div>
          <div className="grid grid-cols-2 gap-1.5">
            <Cislo n={zapocitatelne90} slovo={`za 90 dní · celkem ${casyZapocitatelne.length} od 2014`} />
            <Cislo n={zemi} slovo={sklon(zemi, "země", "země", "zemí")} />
            <Cislo n={cz + kampane.filter((k) => k.kodyZemi.includes("CZ")).length} slovo="v Česku od 2014" />
            <Cislo n={potvrzeno} slovo="s potvrzeným pachatelem" />
          </div>
          {porovnani90 && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-mikro text-tlum2">
              <Odznak ton={porovnani90.smer === "vyssi" ? "pozor" : porovnani90.smer === "nizsi" ? "klid" : "neutral"} duraz="silny">
                {porovnani90.slovo} než průměr
              </Odznak>
              <span>průměr posledních {porovnani90.zaLet} let je {cislem(porovnani90.prumer)} na čtvrtletí</span>
            </p>
          )}
          <p className="mt-1.5 text-mikro text-tlum2">{uredni} z {dni90.length} případů s úředním zdrojem. Počítají se případy a manipulační operace; aktualizace a prohlášení ne.</p>
        </section>
        <section aria-label="Kde">
          <div className="mb-1.5 flex items-center justify-between"><span className="stitek">Kde · případy {rok}</span><Tlacitko kam="/zeme/" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">{t("všechny země")}</Tlacitko></div>
          <ul className="space-y-0.5">
            {zeme.map((z) => (
              <li key={z.kodZeme}><Pruh nazev={<><Vlajka kod={z.kodZeme} /> {z.zeme}</>} n={z.pripady} max={maxZeme} barva={z.kodZeme === "CZ" ? "bg-akcent" : "bg-tlum2/70"} odkaz={`/zeme/${z.kodZeme.toLowerCase()}/`} /></li>
            ))}
          </ul>
        </section>
        <section aria-label="Kdo">
          <div className="mb-1.5 flex items-center justify-between"><span className="stitek">Kdo · případy {rok}</span><span className="text-mikro text-tlum2">potvrzeno / celkem</span></div>
          <ul className="space-y-0.5">
            {puv.skupiny.map((s) => (
              <li key={s.klic} className="flex min-h-[36px] items-center gap-2">
                <span className="w-[118px] shrink-0 truncate text-drobne text-inkoust">{s.nazev}</span>
                <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-linka2">
                  <span className="block h-full bg-tlum2/70" style={{ width: `${(s.pocet / maxPuv) * 100}%` }}>
                    <span className="block h-full bg-oranz" style={{ width: `${s.pocet ? (s.potvrzeno / s.pocet) * 100 : 0}%` }} />
                  </span>
                </span>
                <span className="cislice w-12 shrink-0 text-right text-male text-inkoust"><b className="font-bold">{s.potvrzeno}</b><span className="text-tlum2"> / {s.pocet}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 3b — tmavší deska: jediné místo, kde web něco chce po čtenáři */}
      <div className="mt-14 sm:mt-20"><VyzvaTelegram /></div>

      {/* 5 — sledovat a partneři */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek={t("Odběr")}
          nadpis={t("Jak se to dozvíte, aniž byste sem chodili")}
          popis={t("Kanály, čtečka nebo vlastní přehled. Nic z toho po vás nechce jméno ani e-mail.")}
        />
        <Sledovat />
      </div>
      <div className="mt-12 sm:mt-16"><Partneri /></div>

      {/* 6 — sbalené: proč, co by změnilo, odběr */}
      <div className="mt-14 grid gap-3 border-t border-linka pt-12 sm:mt-20 sm:pt-14 md:grid-cols-3">
        <details className="group rounded-[18px] border border-linka2 bg-plocha">
          <summary className="flex min-h-[40px] cursor-pointer items-center justify-between px-3 text-male font-semibold text-inkoust">Proč je hodnocení {d ? d.nazev.toLowerCase() : "takové"}<Ikona nazev="dolu" velikost={12} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" /></summary>
          <p className="border-t border-linka2 px-3 py-2.5 text-male leading-relaxed text-tlum">{stav.shrnuti || "Bez zdůvodnění."} <Link href="/metodika/" className="odkaz">Metodika</Link></p>
        </details>
        <details className="group rounded-[18px] border border-linka2 bg-plocha">
          <summary className="flex min-h-[40px] cursor-pointer items-center justify-between px-3 text-male font-semibold text-inkoust">Co by hodnocení zhoršilo<Ikona nazev="dolu" velikost={12} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" /></summary>
          <ol className="space-y-1 border-t border-linka2 px-3 py-2.5 text-male leading-snug text-tlum">
            {watchlist.eskalacni.map((e) => <li key={e.cislo} className="flex gap-2"><span className="cislice text-tlum2">{e.cislo}</span>{e.nazev}</li>)}
          </ol>
        </details>
        <div className="flex min-h-[40px] items-center justify-between gap-3 rounded-[18px] border border-linka2 bg-plocha px-3 text-male">
          <span className="text-tlum">{t("Změny bez sledování webu")}</span>
          <span className="flex items-center gap-3">
            <Tlacitko kam="/feed.xml" varianta="tichy" velikost="s" ikona="rss">RSS</Tlacitko>
            <Tlacitko kam="/odber/" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">{t("odběr")}</Tlacitko>
          </span>
        </div>
      </div>
    </div>
    </>
  );
}
