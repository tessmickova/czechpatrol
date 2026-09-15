"use client";

import Link from "next/link";
import { druh, kdyZjisteno, novaZjisteni, pachatelPotvrzen, podlePuvodce, podleZemi, posledniZmeny, pripady, uredniZdroj, vyber, type Zaznam } from "@/lib/agregace";
import { cerstvost, datumCasPraha, datumPraha, stariSlovy } from "@/lib/cas";
import type { CelkovyStav, HybridniTlak, Kampan, Kandidat, NatoPolozka, Nepotvrzene, Overovana, PravniPolozka, ProvozniPolozka, TydenniHodnoceni, Uroven, Watchlist } from "@/lib/typy";
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
import { PocitadlaEvropa, type PolozkaPoctu } from "./pocitadla-zive";
import { Odznak, RadekSeznamu, TeckaZavaznosti, Tlacitko } from "./ui";
import { PavucinaHrozeb } from "./pavucina";
import { KaruselZemi } from "./karusel-zemi";
import { useZiveHodiny } from "@/lib/cas-klient";
import { SignalySiti } from "./signaly-siti";
import { PasZemi } from "./pas-zemi";
import { Pocitadla } from "./pocitadla";
import { Partneri, Sledovat } from "./sledovat";
import { VyzvaTelegram } from "./vyzva-telegram";
import { UdalostiKlient } from "./udalosti-klient";
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
const TON: Record<Ton, { dlazdice: string; tecka: string; slovo: string; ikona: NazevIkony }> = {
  klid: { dlazdice: "border-linka2 bg-plocha", tecka: "bg-klid", slovo: "text-klid-text", ikona: "fajfka" },
  pozor: { dlazdice: "border-pozor/40 bg-pozor/10", tecka: "bg-pozor", slovo: "text-pozor-text", ikona: "vykricnik" },
  plati: { dlazdice: "border-akcent/50 bg-akcent/12", tecka: "bg-akcent", slovo: "text-akcent-svetla", ikona: "sirena" },
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
  if (!cas) return <span className="shrink-0 text-[10.5px] text-tlum2">bez kontroly</span>;
  // Čas je předaný, ne braný z Date.now() — jinak se vykreslení neshodnou.
  const c = cerstvost(cas, ted);
  const barva = c === "cerstve" || c === "nezname" ? "text-tlum2" : "text-stari-text";
  return (
    <span className={`shrink-0 text-right text-[10.5px] leading-tight ${barva}`}>
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
            <span className="block truncate text-[13.5px] leading-tight text-tlum">{d.nazev}</span>
            <span className={`block text-[15px] font-bold leading-tight ${t.slovo}`}>{d.stav}</span>
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
          <span className={`text-[26px] font-bold leading-none sm:text-[30px] ${t ? t.slovo : ""}`}>{hodnota}</span>
          {jiskra}
        </span>
        <span className="mt-2 text-[12.5px] leading-snug text-tlum">{popis}</span>
      </span>
    </Napoveda>
  );
}

function Cislo({ n, slovo }: { n: number; slovo: string }) {
  return (
    <span className="flex flex-col rounded-[18px] border border-linka2 bg-plocha px-3 py-2">
      <span className="cislice text-[24px] font-bold leading-none text-inkoust">{n}</span>
      <span className="mt-1 text-[11.5px] leading-tight text-tlum">{slovo}</span>
    </span>
  );
}

function Pruh({ nazev, n, max, barva, odkaz }: { nazev: React.ReactNode; n: number; max: number; barva: string; odkaz?: string }) {
  const telo = (
    <>
      <span className="flex w-[118px] shrink-0 items-center gap-1.5 truncate text-[12.5px] text-inkoust">{nazev}</span>
      <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-linka2"><span className={`block h-full ${barva}`} style={{ width: `${max ? (n / max) * 100 : 0}%` }} /></span>
      <span className="cislice w-6 shrink-0 text-right text-[13px] font-bold text-inkoust">{n}</span>
    </>
  );
  return odkaz ? <Link href={odkaz} className="flex min-h-[28px] items-center gap-2 hover:bg-plocha">{telo}</Link> : <span className="flex min-h-[28px] items-center gap-2">{telo}</span>;
}

export function Dashboard({
  stav, pravni, natoPolozky, provozPolozky, overeno, vse, neprosle, kandidati, tydny, watchlist, cr, crHistoricky, crPocet, hybridni, obcane, ted,
  tlakEvropa, tlakCesko, veta, kampane, nazvyZemi, overovaneAktivni = [], overovaneUzavrene = [],
}: {
  stav: CelkovyStav; pravni: PravniPolozka[]; natoPolozky: NatoPolozka[]; provozPolozky: ProvozniPolozka[];
  /** Čas sestavení. Klient z něj vychází, aby se první vykreslení shodlo. */
  ted: number;
  overeno: string | null; vse: Zaznam[]; neprosle: Nepotvrzene[]; kandidati: Kandidat[]; tydny: TydenniHodnoceni[]; watchlist: Watchlist;
  cr: Uroven | null; crHistoricky: Uroven | null; crPocet: { pripadu: number; kampani: number };
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

  const dni90 = pripady(vse, { dni: 90 });
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
  const kampaneVOkne = (dni: number) => kampane.filter((k) => tedMs - new Date(k.odhaleno).getTime() <= dni * 86_400_000).length;
  const zapocitatelne90 = dni90.length + kampaneVOkne(90);
  const casyZapocitatelne = [
    ...vse.filter((i) => druh(i) === "pripad").map((i) => kdyZjisteno(i)),
    ...kampane.map((k) => k.odhaleno),
  ];
  const porovnani90 = porovnejSPrumerem(zapocitatelne90, prumerNaOkno(casyZapocitatelne, 90, tedMs));
  // Do prohlížeče posíláme jen datum, příznak Česka a druh — počítadla si
  // zbytek dopočítají sama. Kampaně jsou tu schválně: manipulační operace
  // proti občanům je incident, i když nemá jedno místo a jeden okamžik.
  const pocitadlaData: PolozkaPoctu[] = [
    ...vse.filter((i) => druh(i) === "pripad").map((i) => ({ kdy: kdyZjisteno(i), cz: i.kodZeme === "CZ" })),
    ...kampane.map((k) => ({ kdy: k.odhaleno, cz: k.kodyZemi.includes("CZ"), kampan: true })),
  ];
  const zemi = new Set(dni90.map((i) => i.kodZeme)).size;
  const cz = dni90.filter((i) => i.kodZeme === "CZ").length;
  const potvrzeno = dni90.filter(pachatelPotvrzen).length;
  const uredni = dni90.filter(uredniZdroj).length;
  const rok = new Date().getUTCFullYear();
  const letos = vyber(vse, { odRoku: rok });
  const zeme = podleZemi(letos).filter((z) => z.pripady > 0 || z.kodZeme === "CZ").slice(0, 6);
  const maxZeme = Math.max(1, ...zeme.map((z) => z.pripady));
  const puv = podlePuvodce(letos);
  const maxPuv = Math.max(1, ...puv.skupiny.map((s) => s.pocet));
  /*
    Co je nového = nové záznamy i posuny ve vyšetřování starých případů,
    v jednom chronologickém seznamu. Štítek u řádku říká, o co jde.
  */
  const zjisteni = novaZjisteni(vse, 8);
  const stitkyNovinek = new Map(zjisteni.map((z) => [z.zaznam.id, z.duvod]));
  const coJeNoveho = [...posledniZmeny(8, vse), ...zjisteni.map((z) => z.zaznam)]
    .filter((z, i, pole) => pole.findIndex((x) => x.id === z.id) === i)
    .sort((a, b) => kdyZjisteno(b).localeCompare(kdyZjisteno(a)))
    .slice(0, 7);
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
    <PasZemi vse={vse} kampane={kampane} />
    <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7">
      {/* Nad budíky: co se šíří a zatím není ověřené. Bez toho by
          závažná, ale nepotvrzená zpráva propadla úplně. */}
      <PruhOverujeme aktivni={overovaneAktivni} uzavrene={overovaneUzavrene} ted={tedMs} />

      <HeroDashboard stav={stav} cr={cr} crHistoricky={crHistoricky} crPocet={crPocet} obcane={obcane} overeno={overeno} pocetZaznamu={vse.length} pocet90={zapocitatelne90} veta={veta} porovnani90={porovnani90} />

      {/* 1b — kolik případů přibylo; počítá se v prohlížeči, ne při sestavení */}
      <PocitadlaEvropa polozky={pocitadlaData} ted={ted} />

      {/* 2 — mřížka stavů + poslední události */}
      <div className="nalet mt-14 sm:mt-20">
        <NadpisSekce
          stitek={t("Co právě platí")}
          nadpis={t("Úřední stav v Česku")}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
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
          Jeden seznam „Co je nového", ne dvě sekce vedle sebe.

          Dřív stály na úvodu zvlášť „Poslední události" a zvlášť „Nová
          zjištění". Čtenář tím dostal dvakrát tutéž otázku — co je nového —
          rozdělenou podle toho, jestli jde o novou událost, nebo o posun ve
          vyšetřování staré. To je naše vnitřní rozlišení, ne jeho.

          Teď je to jeden chronologický seznam a typ nese štítek u řádku.
          Kdo chce jen posuny ve vyšetřování, má vedle nadpisu filtr.
        */}
        <section aria-label={t("Co je nového")} className="overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
          <div className="flex items-center justify-between gap-2 border-b border-linka2 px-4 py-2">
            <span className="stitek">{t("Co je nového")}</span>
            <Tlacitko kam="/udalosti/" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">{t("všechny")}</Tlacitko>
          </div>
          <ol className="divide-y divide-linka2">
            {coJeNoveho.map((z) => (
              <RadekSeznamu
                key={z.id}
                hustota="husta"
                kam={`/incident/${z.slug}/`}
                o={{
                  datum: kdyZjisteno(z),
                  tecka: <TeckaZavaznosti uroven={z.zavaznost} plna={druh(z) === "pripad"} velikost={8} />,
                  kodZeme: z.kodZeme,
                  zeme: z.zeme,
                  cerstvost: kdyZjisteno(z),
                  titulek: z.kratkyTitulek || z.titulek,
                  // Štítek říká, jestli je to nová událost, nebo posun ve vyšetřování staré.
                  meta: stitkyNovinek.has(z.id) ? [stitkyNovinek.get(z.id)] : undefined,
                }}
              />
            ))}
          </ol>
          <div className="border-t border-linka2 px-4 py-2">
            <Tlacitko kam="/udalosti/?overeni=potvrzeny-pachatel" varianta="tichy" velikost="s">
              {t("jen posuny ve vyšetřování")}
            </Tlacitko>
          </div>
        </section>

        {/*
          Signály z profilů představitelů a institucí. Zobrazí se jen tehdy,
          když nějaké máme — prázdná sekce s nadpisem by tvrdila, že se nic
          neděje, přitom by znamenala jen to, že profily zatím nesledujeme.
        */}
        <SignalySiti />
      </div>

      {/* 2b2 — manipulační kampaně: operace, ne události */}
      {kampane.length > 0 && (
        <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
          <NadpisSekce
            stitek="Manipulace"
            nadpis={t("Manipulace a útoky na občany")}
            popis="Podvržené dokumenty, weby vydávající se za redakce, profily vydávající se za úředníky."
            akce={<Tlacitko kam="/manipulace/" varianta="obrys" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">{t("všechny rozbory")}</Tlacitko>}
          />
          {/* Jedna kampaň by v třetině šířky vypadala jako zapomenutá dlaždice. */}
          <div className={`grid gap-3 ${kampane.length === 1 ? "" : kampane.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {kampane.slice(0, 3).map((k) => (
              <DlazdiceKampane key={k.slug} k={k} nazvyZemi={nazvyZemi} siroka={kampane.length === 1} />
            ))}
          </div>
        </div>
      )}

      {/* 2c — čím je tlak tvořený: pavučina typů hrozeb */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Typy událostí"
          nadpis={t("Typy evidovaných událostí")}
          popis="Evidované události podle typu za posledních 90 dní. Vlevo Evropa, vpravo Česko. Prázdná osa znamená, že odtud takový záznam nemáme — ne že se nic neděje."
        />
        {/*
          Nejdřív Evropa a Česko vedle sebe — to je hlavní srovnání. Pak
          karusel ostatních zemí: kdo chce vidět, kde se dělá co, projede ho;
          kdo ne, přejde dál. Neposouvá se sám.
        */}
        <div className="grid gap-4 lg:grid-cols-2">
          <PavucinaHrozeb
            nadpis="Evropa jako celek"
            popis={t("Všechny sledované země od roku 2014.")}
            tlak={tlakEvropa}
            odkaz={{ href: "/metodika/", text: "jak se hodnotí →" }}
          />
          <PavucinaHrozeb
            nadpis={t("Česko")}
            popis={t("Jen české záznamy od roku 2014.")}
            tlak={tlakCesko}
            odkaz={{ href: "/udalosti/?zeme=CZ", text: "české záznamy →" }}
          />
        </div>
        <div className="mt-4">
          <div className="stitek mb-2">Ostatní sledované země</div>
          <KaruselZemi />
        </div>
      </div>

      {/*
        Pořadí prohozeno: nejdřív seznam záznamů, pak čísla o něm.

        Čtenář, který dojde až sem, hledá konkrétní událost — ne souhrnnou
        statistiku. Čísla dávají smysl až nad seznamem, který si prohlédl,
        ne před ním.
      */}
      {/* 4 — započítávání a úplný seznam */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Archiv"
          nadpis={t("Všechny záznamy od roku 2014")}
          popis={t("Případy, jejich pokračování, opatření, prohlášení i to, co neprošlo ověřením.")}
          akce={<Tlacitko kam="/udalosti/" varianta="obrys" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">{t("samostatná stránka")}</Tlacitko>}
        />
      </div>
      <div className="mb-5"><Pocitadla vse={vse} neprosle={neprosle} kandidati={kandidati} /></div>
      <section id="zaznamy" aria-label={t("Všechny záznamy")} className="scroll-mt-[84px] rounded-[22px] border border-linka2 bg-plocha p-4 sm:p-6">
        <UdalostiKlient zaznamy={vse} neprosle={neprosle} kandidati={kandidati} />
      </section>

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
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-tlum2">
              <Odznak ton={porovnani90.smer === "vyssi" ? "pozor" : porovnani90.smer === "nizsi" ? "klid" : "neutral"} duraz="silny">
                {porovnani90.slovo} než průměr
              </Odznak>
              <span>průměr posledních {porovnani90.zaLet} let je {cislem(porovnani90.prumer)} na čtvrtletí</span>
            </p>
          )}
          <p className="mt-1.5 text-[11.5px] text-tlum2">{uredni} z {dni90.length} případů s úředním zdrojem. Počítají se případy a manipulační operace; aktualizace a prohlášení ne.</p>
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
          <div className="mb-1.5 flex items-center justify-between"><span className="stitek">Kdo · případy {rok}</span><span className="text-[11.5px] text-tlum2">potvrzeno / celkem</span></div>
          <ul className="space-y-0.5">
            {puv.skupiny.map((s) => (
              <li key={s.klic} className="flex min-h-[28px] items-center gap-2">
                <span className="w-[118px] shrink-0 truncate text-[12.5px] text-inkoust">{s.nazev}</span>
                <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-linka2">
                  <span className="block h-full bg-tlum2/70" style={{ width: `${(s.pocet / maxPuv) * 100}%` }}>
                    <span className="block h-full bg-oranz" style={{ width: `${s.pocet ? (s.potvrzeno / s.pocet) * 100 : 0}%` }} />
                  </span>
                </span>
                <span className="cislice w-12 shrink-0 text-right text-[13px] text-inkoust"><b className="font-bold">{s.potvrzeno}</b><span className="text-tlum2"> / {s.pocet}</span></span>
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
          <summary className="flex min-h-[40px] cursor-pointer items-center justify-between px-3 text-[13px] font-semibold text-inkoust">Proč je hodnocení {d ? d.nazev.toLowerCase() : "takové"}<Ikona nazev="dolu" velikost={12} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" /></summary>
          <p className="border-t border-linka2 px-3 py-2.5 text-[13px] leading-relaxed text-tlum">{stav.shrnuti || "Bez zdůvodnění."} <Link href="/metodika/" className="odkaz">Metodika</Link></p>
        </details>
        <details className="group rounded-[18px] border border-linka2 bg-plocha">
          <summary className="flex min-h-[40px] cursor-pointer items-center justify-between px-3 text-[13px] font-semibold text-inkoust">Co by hodnocení zhoršilo<Ikona nazev="dolu" velikost={12} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" /></summary>
          <ol className="space-y-1 border-t border-linka2 px-3 py-2.5 text-[13px] leading-snug text-tlum">
            {watchlist.eskalacni.map((e) => <li key={e.cislo} className="flex gap-2"><span className="cislice text-tlum2">{e.cislo}</span>{e.nazev}</li>)}
          </ol>
        </details>
        <div className="flex min-h-[40px] items-center justify-between gap-3 rounded-[18px] border border-linka2 bg-plocha px-3 text-[13px]">
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
