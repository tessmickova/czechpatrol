"use client";

import { HlavickaWidgetu, IkonaKruh } from "./widgety";
import { AktualitySloupce } from "./aktuality-sloupce";
import { Znacka } from "./znacka";
import { SidebarUvodu } from "./sidebar-uvodu";
import { PulzSberu } from "./pulz-sberu";
import type { Pulz } from "@/lib/pulz";
import { UVOD_V2 } from "@/config/web";
import Link from "next/link";
import { pripady, type Zaznam } from "@/lib/agregace";
import { cerstvost, datumCasPraha, datumPraha } from "@/lib/cas";
import type { StavObcanu } from "@/lib/data";
import type { CelkovyStav, HybridniTlak, Kampan, Kandidat, NatoPolozka, Nepotvrzene, OficialniNastroj, Overovana, PravniPolozka, ProvozniPolozka, Snimek, TydenniHodnoceni, Uroven, Watchlist } from "@/lib/typy";
import { CenaPaliva } from "./palivo";
import { stavPaliv, stavPaliva, vetaOCene } from "@/lib/palivo";
import { stavPravni, stavProvozu } from "@/lib/pokryti";
import { StavDetail } from "./stav-detail";
import { PASMA, UROVNE } from "@/lib/skala";
import type { HlavniVeta } from "@/lib/veta";
import { Ikona, type NazevIkony } from "./ikony";
import { HeroDashboard } from "./hero-dashboard";
import { DlazdiceKampane } from "./kampane";
import { NadpisSekce } from "./nadpisy";
import { SouhrnOverujeme } from "./overujeme";
import { PripravitTed } from "./pripravit-ted";
import type { PripravitTed as DataPripravy } from "@/lib/priprava";
import { Partneri, Sledovat } from "./sledovat";
import { Aktuality } from "./aktuality";
import { UrgentniPas } from "./urgentni";
import { TriTemata } from "./tri-temata";
import { Tlacitko } from "./ui";
import { useZiveHodiny } from "@/lib/cas-klient";
import { PripravenostKarta } from "./pripravenost-klient";
import { TipyKPriprave } from "./tipy";
import { PasZemi } from "./pas-zemi";
import { CoSeZmenilo } from "./co-se-zmenilo";
import { StavSluzeb } from "./stav-sluzeb";
import { snimekSluzeb, SLOVA_STAVU, SLUZBY, type StavSluzby } from "@/lib/sluzby";
import { useStavSluzeb, type ZivyStav } from "@/lib/sluzby-klient";
import { casPraha } from "@/lib/cas";
import { Nahlaseni } from "./nahlaseni";
import { Napoveda } from "./zaklad";
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
/* Ikona skupiny v hlavičce widgetu: váhy pro právo, glóbus pro NATO, člověk pro běžný život. */
const IKONY_SKUPIN: Record<string, NazevIkony> = { p: "vaha", n: "globus", v: "uzivatel" };

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
/*
  Signál od provozovatele k položce v mřížce.

  Když Signal nebo Cloudflare hlásí výpadek, patří to k „Mobilní síť
  a internet" — ale jako signál, ne jako stav. Úřední stav mění jen
  kontrola zdrojů; stavová stránka firmy není úřad. Proto věta pod
  názvem, se slovem „neověřeno", a ne přebarvená dlaždice.
*/
interface SignalSluzby { sluzba: string; stav: string; kdy: string | null; zive: boolean }

function signalyKPolozkam(stavy: ZivyStav[]): Record<string, SignalSluzby[]> {
  const out: Record<string, SignalSluzby[]> = {};
  for (const s of SLUZBY) {
    if (!s.tyka) continue;
    const st = stavy.find((x) => x.klic === s.klic);
    /*
      Jen výpadek, ne omezení. Cloudflare hlásí „minor" skoro pořád —
      první snímek nesl omezení kvůli Arice a Annabě. Kdyby se to psalo
      k „Mobilní síť a internet" v Česku, byl by tam signál napořád
      a skutečný výpadek by v něm zapadl.
    */
    if (!st || st.stav !== "vypadek") continue;
    (out[s.tyka] ??= []).push({ sluzba: s.nazev, stav: "výpadek", kdy: st.zkontrolovano, zive: st.zive });
  }
  return out;
}

function RadekStavu({ d, casSkupiny, ted, signaly = [] }: { d: Dlazdice; casSkupiny: string | null; ted: number; signaly?: SignalSluzby[] }) {
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
            {signaly.map((sg) => (
              <span key={sg.sluzba} className="mt-0.5 flex items-center gap-1.5 text-mikro leading-snug text-tlum">
                <span aria-hidden className="h-[5px] w-[5px] shrink-0 rounded-full bg-akcent" />
                signál: {sg.sluzba} hlásí {sg.stav}{sg.kdy ? ` (${casPraha(sg.kdy)})` : ""} · neověřeno
              </span>
            ))}
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



/*
  Souhrn oblasti: kolik z kolika sledovaných položek je v jakém stavu.

  Hlavička skupiny dřív nesla jen čas. Kdo přišel zjistit „je něco
  vyhlášeno?", musel přečíst dvacet řádků. Teď to řekne jedna věta
  a paleta teček — jedna tečka za každou sledovanou položku, nic se
  nezamlčí a nic se nesčítá do dojmu. Nula je taky informace: „0 z 7
  platí" je přesně ta věta, kvůli které sem lidé chodí.
*/
const SLOVA_TONU: Record<Ton, string> = { plati: "platí", pozor: "sledujeme", klid: "v normálu", nedolozeno: "nedoloženo", nevime: "neověřeno" };
const PORADI_TONU: Ton[] = ["plati", "pozor", "klid", "nedolozeno", "nevime"];

function souhrnTonu(tony: Ton[], hlavni = "platí", slova: Partial<Record<Ton, string>> = {}): string {
  const pocet = (t: Ton) => tony.filter((x) => x === t).length;
  const casti = [`${pocet("plati")} z ${tony.length} ${hlavni}`];
  for (const t of PORADI_TONU.slice(1)) if (pocet(t)) casti.push(`${pocet(t)} ${slova[t] ?? SLOVA_TONU[t]}`);
  return casti.join(" · ");
}

function Paleta({ polozky }: { polozky: { nazev: string; tecka: string; slovo: string }[] }) {
  return (
    <span className="flex flex-wrap items-center gap-[5px]" role="img" aria-label={polozky.map((p) => `${p.nazev}: ${p.slovo}`).join(", ")}>
      {polozky.map((p) => (
        <span key={p.nazev} title={`${p.nazev}: ${p.slovo}`} className={`h-[9px] w-[9px] rounded-[3px] ${p.tecka}`} />
      ))}
    </span>
  );
}

/*
  Rozklikávací oblast pod výpisem sledovaných faktorů.

  Služby naživo a ceny paliva měly vlastní boxy vedle mřížky a vypadaly
  jako samostatné sekce, ne jako další sledované oblasti. Teď jsou pod
  mřížkou ve stejné stavbě jako Právní stav, NATO a Běžný život: v náhledu
  souhrn přes VŠECHNY sledované položky a paleta, detail po rozkliknutí.
*/
function RozbalovaciOblast({ nazev, ikona, souhrn, paleta, poznamka, children }: {
  nazev: string; ikona: NazevIkony; souhrn: string; paleta: { nazev: string; tecka: string; slovo: string }[]; poznamka?: string; children: React.ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
      <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-2.5 hover:bg-plocha2">
        <IkonaKruh ikona={ikona} velikost="s" />
        <span className="min-w-0 flex-1">
          <span className="stitek block">{nazev}</span>
          <span className="mt-1 block text-male font-semibold leading-snug text-inkoust">{souhrn}</span>
          {poznamka && <span className="mt-0.5 block text-mikro leading-snug text-tlum2">{poznamka}</span>}
        </span>
        <Paleta polozky={paleta} />
        <Ikona nazev="dolu" velikost={13} tah={2} trida="shrink-0 text-tlum2 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-linka2">{children}</div>
    </details>
  );
}

const TECKA_SLUZBY: Record<StavSluzby, string> = { provoz: "bg-klid", omezeni: "bg-pozor", vypadek: "bg-akcent", nezjisteno: "border border-linka" };

export function Dashboard({
  stav, pravni, natoPolozky, provozPolozky, overeno, vse, neprosle, kandidati, nepotvrzene = [], tydny, watchlist, crHistoricky, hybridni, obcane, ted, snimky = [], nastroje = [],
  tlakEvropa, tlakCesko, veta, kampane, nazvyZemi, overovaneAktivni = [], overovaneUzavrene = [], priprava, pulz,
}: {
  stav: CelkovyStav; pravni: PravniPolozka[]; natoPolozky: NatoPolozka[]; provozPolozky: ProvozniPolozka[];
  /** Čas sestavení. Klient z něj vychází, aby se první vykreslení shodlo. */
  ted: number;
  overeno: string | null; vse: Zaznam[]; neprosle: Nepotvrzene[]; kandidati: Kandidat[]; nepotvrzene?: Zaznam[]; tydny: TydenniHodnoceni[]; watchlist: Watchlist;
  crHistoricky: Uroven | null;
  /** Archiv snímků úředního stavu — z něj se čte, co se změnilo. */
  snimky?: Snimek[];
  /** Katalog oficiálních nástrojů pro kartu „Jsem připraven/a?". */
  nastroje?: OficialniNastroj[];
  hybridni: Uroven | null; obcane: StavObcanu;
  tlakEvropa: HybridniTlak; tlakCesko: HybridniTlak; veta: HlavniVeta;
  kampane: Kampan[]; nazvyZemi: Record<string, string>;
  /** Zprávy, které se šíří a zatím nejsou ověřené. Do počtů nevstupují. */
  overovaneAktivni?: Overovana[];
  overovaneUzavrene?: Overovana[];
  priprava?: DataPripravy;
  pulz?: Pulz;
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
  /* Stav služeb: snímek ze sběru, po připojení živé čtení stavových stránek. */
  const sluzby = useStavSluzeb(snimekSluzeb());
  const signalySluzeb = signalyKPolozkam(sluzby.stavy);
  /*
    Potíže za posledních 24 h: služba, která teď neběží naplno, nebo měla
    incident aktualizovaný během dne. Jen aktuální stav by v noci po
    ranním výpadku tvrdil „bez potíží".
  */
  const souhrnSluzeb = (() => {
    const den = tedMs - 86_400_000;
    const stavy = SLUZBY.map((sl) => sluzby.stavy.find((x) => x.klic === sl.klic));
    const potize = stavy.filter((st) => st && (st.stav === "vypadek" || st.stav === "omezeni" || st.incidenty.some((i) => i.aktualizovano && new Date(i.aktualizovano).getTime() >= den))).length;
    const pocet = (k: StavSluzby) => stavy.filter((st) => (st?.stav ?? "nezjisteno") === k).length;
    const casti = [`${potize} z ${SLUZBY.length} sledovaných služeb mělo za 24 h potíže`];
    if (pocet("vypadek")) casti.push(`${pocet("vypadek")} výpadek`);
    if (pocet("omezeni")) casti.push(`${pocet("omezeni")} omezení`);
    if (pocet("nezjisteno")) casti.push(`${pocet("nezjisteno")} nezjištěno`);
    return {
      veta: casti.join(" · "),
      poznamka: `Stavové stránky provozovatelů${sluzby.kdy ? `, ${sluzby.stavy.some((x) => x.zive) ? "čteno" : "snímek"} ${casPraha(sluzby.kdy)}` : ""}. České sítě a banky je nemají — viz Downdetector v detailu.`,
    };
  })();
  const paliva = stavPaliv().filter((p) => p.cena !== null);
  /*
    Situace v Česku za 90 dní: nejvyšší závažnost z případů a operací
    proti občanům v okně. Dřív přicházela ze serveru s časem sestavení;
    tady je z téhož živého času jako všechno ostatní.
  */
  const czKampane90 = kampane.filter((k) => k.kodyZemi.includes("CZ") && tedMs - new Date(k.odhaleno).getTime() <= 90 * 86_400_000);
  const czUrovne: Uroven[] = [...dni90.filter((i) => i.kodZeme === "CZ").map((i) => i.zavaznost), ...czKampane90.map((k) => k.zavaznost)];
  const cr: Uroven | null = czUrovne.length ? czUrovne.reduce((m, u) => (UROVNE[u].poradi > UROVNE[m].poradi ? u : m), czUrovne[0]) : null;
  const crPocet = { pripadu: dni90.filter((i) => i.kodZeme === "CZ").length, kampani: czKampane90.length };
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
    {UVOD_V2 && pulz && <PulzSberu pulz={pulz} ted={tedMs} />}
    <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7">
      {/*
        Úvod v2: na mobilu úvodní věta, ciferníky, pak zprávy. Na počítači
        zprávy vlevo přes obě řady, sloupec vpravo. UVOD_V2=false vrátí
        původní úvod níž.
      */}
      {UVOD_V2 ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-6">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <Znacka velikost={26} tmave />
              <span className="stitek-znacky">{t("Bezpečnostní přehled")}</span>
            </div>
            <h1 className="titul-sekce">{t("Bezpečnostní situace v Česku a okolí")}</h1>
            <p className="uvodni-veta mt-3 max-w-[46rem]">
              <strong className="font-bold text-inkoust">{veta.cesko}</strong>{" "}
              <span className="text-tlum">{veta.evropa}</span>
            </p>
            <div className="mt-4"><UrgentniPas kandidati={kandidati} zkontrolovano={overeno} ted={tedMs} /></div>
          </div>
          <div className="order-3 min-w-0 lg:order-none lg:col-start-1 lg:row-start-2"><AktualitySloupce zaznamy={vse} nepotvrzene={nepotvrzene} kandidati={kandidati} /></div>
          <div className="order-2 min-w-0 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <SidebarUvodu stav={stav} cr={cr} crHistoricky={crHistoricky} crPocet={crPocet} obcane={obcane} veta={veta} pulz={pulz} priprava={priprava} vse={vse} kampane={kampane} ted={tedMs} />
          </div>
        </div>
      ) : (
      <>

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
      {/*
        Stejná mřížka jako tři desky pod tím: tři sloupce, úvod přes dva,
        aktuality přesně v třetím. Pravá hrana aktualit tak sedí na hraně
        třetí desky. Titulky v aktualitách se kvůli tomu lámou do tří
        řádků častěji než při dvou pětinách — je to vědomá cena za linie.
      */}
      <div className="grid gap-4 xl:grid-cols-3 xl:gap-10">
        <div className="min-w-0 xl:col-span-2">
          <HeroDashboard stav={stav} cr={cr} crHistoricky={crHistoricky} crPocet={crPocet} obcane={obcane} veta={veta} pas={<UrgentniPas kandidati={kandidati} zkontrolovano={overeno} ted={tedMs} />} />
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
      </>
      )}

      {/* Tři věci pro domácnost podle doložených hrozeb (24. 9. 2026). */}
      {!UVOD_V2 && priprava && <div className="mt-5"><PripravitTed priprava={priprava} /></div>}

      {/*
        „Právě ověřujeme“ jako malý souhrn pod úvodem (24. 9. 2026). Velké
        karty nad budíky zabíraly celou obrazovku; tady je jeden řádek na
        zprávu a zbytek na rozkliknutí.
      */}
      {overovaneAktivni.length > 0 && (
        <div className="mt-5 xl:max-w-[60%]"><SouhrnOverujeme aktivni={overovaneAktivni} ted={tedMs} /></div>
      )}


      {/* 2 — mřížka stavů + poslední události */}
      <div className="nalet mt-14 sm:mt-20">
        <NadpisSekce
          stitek={t("Co právě platí")}
          ikona="vaha"
          nadpis={t("Úřední stav v Česku")}
        />
      </div>
      {/* Stejný poměr a mezera jako v úvodu: tři pětiny mřížka, dvě pětiny sloupec. */}
      {/*
        Jediný sloupec na mobilu s minimem 0. Bez toho má sloupec minimum
        „auto" a roztáhne se podle nejširšího nezalomitelného obsahu —
        profil s dlouhým jménem vyhnal celý sloupec na 422 px a boxy pod
        ním se na 390 px displeji řízly vpravo.
      */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:gap-10">
        <section aria-label={t("Oficiální stavy")} id="opatreni" className="scroll-mt-[84px] space-y-4">
          {skupinyDlazdic.map((sk) => (
            <div key={sk.predpona} className="overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
              {/*
                Čas kontroly stojí v hlavičce skupiny, ne u každého řádku.
                Dvacet stejných časových razítek pod sebou je šum; položka,
                která má čas jiný, si ho vypíše sama.
              */}
              <HlavickaWidgetu
                ikona={IKONY_SKUPIN[sk.predpona] ?? "stit"}
                nazev={sk.nazev}
                podtitul={souhrnTonu(sk.polozky.map((d) => d.ton), sk.predpona === "n" ? "aktivní" : sk.predpona === "v" ? "narušeno" : "platí", sk.predpona === "v" ? { nedolozeno: "bez hlášení" } : {})}
                meta={
                  <span className="flex items-center gap-3">
                    <span className="hidden sm:block"><Paleta polozky={sk.polozky.map((d) => ({ nazev: d.nazev, tecka: TON[d.ton].tecka, slovo: d.stav }))} /></span>
                    <Stari cas={sk.cas} popisek={sk.popisekCasu} ted={tedMs} />
                  </span>
                }
              />
              {/*
                Na počítači všechny řádky ve dvou sloupcích. Na mobilu jen
                klíčové položky a ty, které se odchylují od klidu; zbytek za
                „dalších N v klidu“ (revize 24. 9. 2026: dvacet řádků
                „nedoloženo“ pod sebou zabralo 1 100 px). Souhrn skupiny
                v hlavičce platí pro všechny, i pro sbalené.
              */}
              {(() => {
                const radek = (d: Dlazdice) => <RadekStavu key={d.klic} d={d} casSkupiny={sk.cas} ted={tedMs} signaly={signalySluzeb[d.zdrojovaPolozka.klic] ?? []} />;
                const zvlastni = sk.polozky.filter((d) => KLICOVE.includes(d.klic) || d.ton === "plati" || d.ton === "pozor" || d.ton === "nevime" || (signalySluzeb[d.zdrojovaPolozka.klic] ?? []).length > 0);
                const klidne = sk.polozky.filter((d) => !zvlastni.includes(d));
                return (
                  <>
                    <ul className="hidden sm:grid sm:grid-cols-2">{sk.polozky.map(radek)}</ul>
                    <ul className="sm:hidden">{zvlastni.map(radek)}</ul>
                    {klidne.length > 0 && (
                      <details className="group sm:hidden">
                        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 text-drobne font-semibold text-tlum hover:bg-plocha2">
                          <span>dalších {klidne.length} v klidu</span>
                          <Ikona nazev="dolu" velikost={12} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" />
                        </summary>
                        <ul className="border-t border-linka2">{klidne.map(radek)}</ul>
                      </details>
                    )}
                  </>
                );
              })()}
            </div>
          ))}

          {/* Služby naživo: souhrn přes všechny sledované služby, ne výběr. */}
          <RozbalovaciOblast
            nazev="Služby naživo"
            ikona="komunikace"
            souhrn={souhrnSluzeb.veta}
            poznamka={souhrnSluzeb.poznamka}
            paleta={SLUZBY.map((sl) => {
              const st = sluzby.stavy.find((x) => x.klic === sl.klic)?.stav ?? "nezjisteno";
              return { nazev: sl.nazev, tecka: TECKA_SLUZBY[st], slovo: SLOVA_STAVU[st] };
            })}
          >
            <StavSluzeb stavy={sluzby.stavy} kdy={sluzby.kdy} vnoreny />
          </RozbalovaciOblast>

          {/* Cena paliva: měřená řada ČSÚ. Nic o tom, kam ceny půjdou dál. */}
          {paliva.length > 0 && (
            <RozbalovaciOblast
              nazev="Ceny pohonných hmot"
              ikona="palivo"
              souhrn={paliva.map((p) => `${p.nazev} ${p.cena!.toFixed(2).replace(".", ",")} Kč/l${p.zaTyden ? ` (${p.zaTyden > 0 ? "+" : "−"}${Math.abs(p.zaTyden).toFixed(2).replace(".", ",")})` : ""}`).join(" · ")}
              poznamka={`Týdenní šetření ČSÚ${paliva[0].konec ? `, týden do ${datumPraha(paliva[0].konec)}` : ""}. ${paliva.filter((p) => p.skok).length} z ${paliva.length} s neobvyklým týdenním pohybem. Měření, ne předpověď.`}
              paleta={paliva.map((p) => ({ nazev: p.nazev, tecka: p.skok ? "bg-pozor" : "bg-klid", slovo: p.skok ? "neobvyklý pohyb" : "běžný pohyb" }))}
            >
              <CenaPaliva vnoreny />
            </RozbalovaciOblast>
          )}
        </section>

        {/*
          Vedle mřížky stavů: co se změnilo, ne co se stalo.

          Dřív tu byl seznam nových událostí — třetí místo na úvodní straně
          s touž otázkou. Události mají sloupec v úvodu a vlastní stránku.
          Sem patří změny, které se dotknou života tady: úřední stavy,
          cena paliva, opatření v Česku, u sousedů a v EU.
        */}
        <div className="min-w-0 space-y-4">
        <CoSeZmenilo zaznamy={vse} snimky={snimky} ted={tedMs} />

        {/* Připravenost: co mít nastavené dřív, než se něco stane. Skóre je z odpovědí čtenáře v jeho prohlížeči. */}
        <PripravenostKarta nastroje={nastroje} />


        {/*
          Tipy k přípravě. Odpovídají na jinou otázku než zbytek webu: ne co
          se stalo, ale co s tím může člověk udělat dnes. Bez tipu se
          nevykreslí nic.
        */}
        <TipyKPriprave ted={tedMs} />
        </div>
      </div>

      {/*
        2a — tmavší deska s výzvou k odběru hned za úředním stavem: kdo si
        právě přečetl, co platí, tady dostane cestu, jak se dozvědět změnu
        dřív, než sem zase přijde. Dřív stála až za čísly.
      */}
      {/*
        Tři témata (komunita, dotazník, upozornění) až pod úředním stavem,
        jako kompaktní dlaždice. Sekce „Urgentní upozornění“ tu už není:
        Telegram nabízí pás v úvodu a sekce Odběr níž (revize 24. 9. 2026).
      */}
      <div className="mt-10 sm:mt-12"><TriTemata /></div>

      {/* 2b2 — manipulační kampaně: operace, ne události */}
      {kampane.length > 0 && (
        <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
          <NadpisSekce
            stitek="Manipulace"
            ikona="bublina"
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

      {/* 2c — typy událostí jsou v Analýzách (první sekce). */}

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

      {/* 3 — čísla „kolik, kde, kdo“ jsou v Analýzách. */}

      {/* 5 — sledovat a partneři */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek={t("Odběr")}
          ikona="zvonek"
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
