import Link from "next/link";
import { druh, kdyZjisteno, novaZjisteni, pachatelPotvrzen, podlePuvodce, podleZemi, posledniZmeny, pripady, uredniZdroj, vyber, type Zaznam } from "@/lib/agregace";
import { cerstvost, datumCasPraha, datumPraha, stariSlovy } from "@/lib/cas";
import type { CelkovyStav, HybridniTlak, Kampan, Kandidat, NatoPolozka, Nepotvrzene, PravniPolozka, ProvozniPolozka, TydenniHodnoceni, Uroven, Watchlist } from "@/lib/typy";
import { PASMA, UROVNE } from "@/lib/skala";
import type { HlavniVeta } from "@/lib/veta";
import { Ikona, type NazevIkony } from "./ikony";
import { HeroDashboard } from "./hero-dashboard";
import { DlazdiceKampane } from "./kampane";
import { NadpisSekce } from "./nadpisy";
import { PocitadlaEvropa, type PolozkaPoctu } from "./pocitadla-zive";
import { NovaZjisteni } from "./nova-zjisteni";
import { OdznakNove } from "./odznak-nove";
import { PavucinaHrozeb } from "./pavucina";
import { PasZemi } from "./pas-zemi";
import { Pocitadla } from "./pocitadla";
import { Partneri, Sledovat } from "./sledovat";
import { UdalostiKlient } from "./udalosti-klient";
import { Napoveda } from "./zaklad";
import { sklon, Vlajka } from "./zeme";

/*
  Dashboard. Jedna obrazovka, žádné odstavce.

  Pořadí podle toho, co člověk v krizi hledá nejdřív:
  1. tři velké stavy: Česko, NATO, hodnocení,
  2. mřížka oficiálních stavů — každý jedna dlaždice, barva = stav,
  3. poslední události, čísla za 90 dnů, kde a kdo, křivka letos.
  Vysvětlení jsou v nápovědách a na podstránkách, ne tady.
*/

type Ton = "klid" | "pozor" | "plati" | "nevime";

/*
  Stav nesmí být poznat jen podle barvy. Ke každému tónu proto patří i tvar
  (ikona) a slovo — jinak by dlaždice nic neříkala tomu, kdo barvy nerozliší,
  ani tomu, kdo si web vytiskne černobíle.
*/
const TON: Record<Ton, { dlazdice: string; tecka: string; slovo: string; ikona: NazevIkony }> = {
  klid: { dlazdice: "border-linka2 bg-plocha", tecka: "bg-[#5cbf8a]", slovo: "text-[#8fd6ae]", ikona: "fajfka" },
  pozor: { dlazdice: "border-[#d9b24c]/40 bg-[#d9b24c]/10", tecka: "bg-[#d9b24c]", slovo: "text-[#e6c977]", ikona: "vykricnik" },
  plati: { dlazdice: "border-[#e8484f]/50 bg-[#e8484f]/12", tecka: "bg-[#e8484f]", slovo: "text-[#f2848a]", ikona: "sirena" },
  nevime: { dlazdice: "border-dashed border-linka bg-transparent", tecka: "bg-tlum2", slovo: "text-tlum2", ikona: "otaznik" },
};

/** Šest stavů, na které se lidé ptají první. Zbytek je o klik dál. */
const KLICOVE = ["p-mobilizace", "p-nouzovy-stav", "p-vycestovani", "p-hranice", "n-clanek-5", "v-elektrina"];

/*
  Skupiny ve sbaleném seznamu. NATO a Evropská unie jsou dvě různé věci —
  do jedné dlaždice se slévat nesmějí, protože každá rozhoduje o něčem jiném.
*/
const SKUPINY = [
  { predpona: "p", nazev: "Právní stav Česka" },
  { predpona: "n", nazev: "NATO (obranná aliance, ne Evropská unie)" },
  { predpona: "v", nazev: "Provoz a běžné služby" },
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

interface Dlazdice { klic: string; nazev: string; ikona: NazevIkony; ton: Ton; stav: string; overeno: string | null; vysvetleni: string }

function dlazdicePravni(p: PravniPolozka): Dlazdice {
  return {
    klic: `p-${p.klic}`, nazev: KRATCE_PRAVNI[p.klic] ?? p.nazev, ikona: IKONY_PRAVNI[p.klic] ?? "dokument",
    ton: p.plati === null ? "nevime" : p.plati ? "plati" : "klid",
    stav: p.plati === null ? "neověřeno" : p.plati ? "PLATÍ" : p.klic === "vycestovani" ? "bez omezení" : p.klic === "hranice" ? "běžný režim" : "nevyhlášen",
    overeno: p.overeno, vysvetleni: p.vysvetleni,
  };
}
function dlazdiceNato(p: NatoPolozka): Dlazdice {
  return {
    klic: `n-${p.klic}`, nazev: KRATCE_NATO[p.klic] ?? p.nazev, ikona: "globus",
    ton: p.aktivni === null ? "nevime" : p.aktivni ? (p.klic === "vychodni-kridlo" ? "pozor" : "plati") : "klid",
    stav: p.aktivni === null ? "neověřeno" : p.aktivni ? (p.klic === "vychodni-kridlo" ? "posíleno" : "AKTIVNÍ") : "neaktivní",
    overeno: p.overeno, vysvetleni: p.vysvetleni,
  };
}
function dlazdiceProvoz(p: ProvozniPolozka): Dlazdice {
  return {
    klic: `v-${p.klic}`, nazev: p.nazev, ikona: (p.ikona as NazevIkony) || "dokument",
    ton: p.stav === "bez-zdroje" ? "nevime" : p.stav === "bezny" ? "klid" : p.stav === "sledujeme" ? "pozor" : "plati",
    stav: p.stav === "bez-zdroje" ? "bez zdroje" : p.stav === "bezny" ? "běžný" : p.stav === "sledujeme" ? "sledujeme" : "NARUŠENO",
    overeno: p.overeno, vysvetleni: p.detail,
  };
}

function Stari({ overeno }: { overeno: string | null }) {
  const c = cerstvost(overeno);
  const barva = c === "cerstve" ? "text-tlum2" : c === "nezname" ? "text-tlum2" : "text-[#eaa96b]";
  return <span className={`cislice text-[10.5px] ${barva}`} title={overeno ? datumCasPraha(overeno) : "nikdy neověřeno"}>{overeno ? stariSlovy(overeno) : "neověřeno"}</span>;
}

function Dlazdice({ d }: { d: Dlazdice }) {
  const t = TON[d.ton];
  return (
    <li>
      <Napoveda cele popis={<span className="block"><b className="font-semibold">{d.nazev}</b> — {d.stav}. {d.vysvetleni}</span>}>
        <span className={`flex min-h-[64px] w-full flex-col justify-between rounded-[16px] border px-2.5 py-2 text-left ${t.dlazdice}`}>
          <span className="flex items-center gap-1.5 text-[12px] leading-tight text-tlum">
            <Ikona nazev={d.ikona} velikost={13} tah={1.9} trida="shrink-0" />
            <span className="truncate">{d.nazev}</span>
          </span>
          <span className="mt-1 flex items-center justify-between gap-2">
            <span className={`flex items-center gap-1.5 text-[13px] font-bold leading-none ${t.slovo}`}>
              <Ikona nazev={t.ikona} velikost={13} tah={2.2} trida="shrink-0" />{d.stav}
            </span>
            {d.ton !== "nevime" && <Stari overeno={d.overeno} />}
          </span>
        </span>
      </Napoveda>
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
          <Stari overeno={overeno} />
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
    <span className="flex flex-col rounded-[16px] border border-linka2 bg-plocha px-3 py-2">
      <span className="cislice text-[24px] font-bold leading-none text-inkoust">{n}</span>
      <span className="mt-1 text-[11.5px] leading-tight text-tlum">{slovo}</span>
    </span>
  );
}

function Pruh({ nazev, n, max, barva, odkaz }: { nazev: React.ReactNode; n: number; max: number; barva: string; odkaz?: string }) {
  const telo = (
    <>
      <span className="flex w-[118px] shrink-0 items-center gap-1.5 truncate text-[12.5px] text-inkoust">{nazev}</span>
      <span className="h-[8px] flex-1 overflow-hidden rounded-[2px] bg-linka2"><span className={`block h-full ${barva}`} style={{ width: `${max ? (n / max) * 100 : 0}%` }} /></span>
      <span className="cislice w-6 shrink-0 text-right text-[13px] font-bold text-inkoust">{n}</span>
    </>
  );
  return odkaz ? <Link href={odkaz} className="flex min-h-[28px] items-center gap-2 hover:bg-plocha">{telo}</Link> : <span className="flex min-h-[28px] items-center gap-2">{telo}</span>;
}

export function Dashboard({
  stav, pravni, natoPolozky, provozPolozky, overeno, vse, neprosle, kandidati, tydny, watchlist, cr, crHistoricky, hybridni, obcane,
  tlakEvropa, tlakCesko, veta, kampane, nazvyZemi,
}: {
  stav: CelkovyStav; pravni: PravniPolozka[]; natoPolozky: NatoPolozka[]; provozPolozky: ProvozniPolozka[];
  overeno: string | null; vse: Zaznam[]; neprosle: Nepotvrzene[]; kandidati: Kandidat[]; tydny: TydenniHodnoceni[]; watchlist: Watchlist;
  cr: Uroven | null; crHistoricky: Uroven | null; hybridni: Uroven | null; obcane: { uroven: Uroven; popis: string; neovereno: number };
  tlakEvropa: HybridniTlak; tlakCesko: HybridniTlak; veta: HlavniVeta;
  kampane: Kampan[]; nazvyZemi: Record<string, string>;
}) {
  const platiCr = pravni.filter((p) => p.plati === true);
  const neovereneCr = pravni.filter((p) => p.plati === null).length;
  const naruseno = provozPolozky.filter((p) => p.stav === "narusen");
  const sledujeme = provozPolozky.filter((p) => p.stav === "sledujeme");
  const cl4 = natoPolozky.find((p) => p.klic === "clanek-4"), cl5 = natoPolozky.find((p) => p.klic === "clanek-5");
  const natoAktivni = natoPolozky.filter((p) => p.aktivni === true && p.klic !== "vychodni-kridlo");
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const pasmo = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;

  const dni90 = pripady(vse, { dni: 90 });
  // Do prohlížeče posíláme jen datum a příznak Česka — počítadla si zbytek dopočítají sama.
  const pocitadlaData: PolozkaPoctu[] = vse
    .filter((i) => druh(i) === "pripad")
    .map((i) => ({ kdy: kdyZjisteno(i), cz: i.kodZeme === "CZ" }));
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
  const posledni = posledniZmeny(6, vse);
  const stariCelkem = cerstvost(overeno);

  const crHodnota = platiCr.length ? platiCr.map((p) => KRATCE_PRAVNI[p.klic] ?? p.nazev).join(", ") : naruseno.length ? "Narušeno" : sledujeme.length ? "Sledujeme" : "Bez omezení";
  const crTon: Ton = platiCr.length ? "plati" : naruseno.length ? "plati" : sledujeme.length ? "pozor" : neovereneCr === pravni.length ? "nevime" : "klid";
  const crPopis = platiCr.length
    ? `Platí: ${platiCr.map((p) => (KRATCE_PRAVNI[p.klic] ?? p.nazev).toLowerCase()).join(", ")}`
    : `Mobilizace ne · vycestování bez omezení · hranice běžně${neovereneCr ? ` · ${neovereneCr} neověřeno` : ""}`;

  const natoHodnota = natoAktivni.length ? natoAktivni.map((p) => KRATCE_NATO[p.klic] ?? p.nazev).join(", ") : cl4?.aktivni === null && cl5?.aktivni === null ? "Neověřeno" : "Bez aktivace";
  const natoTon: Ton = natoAktivni.length ? "plati" : cl4?.aktivni === null && cl5?.aktivni === null ? "nevime" : "klid";

  // Dlaždice se počítají jednou: šest klíčových nahoru, zbytek do rozbalovátka.
  const vsechnyDlazdice: Dlazdice[] = [
    ...pravni.map(dlazdicePravni),
    ...natoPolozky.map(dlazdiceNato),
    ...provozPolozky.map(dlazdiceProvoz),
  ];
  const klicove = KLICOVE.map((k) => vsechnyDlazdice.find((d) => d.klic === k)).filter((d): d is Dlazdice => Boolean(d));
  const ostatni = vsechnyDlazdice.filter((d) => !KLICOVE.includes(d.klic));

  void tydny;
  return (
    <>
    <PasZemi vse={vse} />
    <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7">
      <HeroDashboard stav={stav} cr={cr} crHistoricky={crHistoricky} hybridni={hybridni} obcane={obcane} overeno={overeno} pocetZaznamu={vse.length} pocet90={dni90.length} veta={veta} />

      {/* 1b — kolik případů přibylo; počítá se v prohlížeči, ne při sestavení */}
      <PocitadlaEvropa polozky={pocitadlaData} ted={Date.now()} />

      {/* 2 — mřížka stavů + poslední události */}
      <div className="nalet mt-14 sm:mt-20">
        <NadpisSekce
          stitek="Co právě platí"
          nadpis="Úřední stav v Česku"
          popis="Šest věcí, na které se lidé ptají jako první. Zaškrtnutí znamená, že opatření neplatí — ověřeno v úřední sbírce, ne odhadnuto. Zbylých čtrnáct je o jeden klik dál."
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-label="Oficiální stavy" id="opatreni" className="scroll-mt-[84px]">
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {klicove.map((d) => <Dlazdice key={d.klic} d={d} />)}
          </ul>
          <details className="group mt-3 overflow-hidden rounded-[18px] border border-linka2 bg-plocha">
            <summary className="flex min-h-[46px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-[13.5px] font-semibold text-inkoust hover:bg-plocha2">
              <span>Dalších {ostatni.length} {sklon(ostatni.length, "stav", "stavy", "stavů")}</span>
              <span className="flex items-center gap-2 text-[12.5px] font-normal text-tlum2">
                právní stav · NATO · provoz
                <Ikona nazev="dolu" velikost={13} tah={2} trida="transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="space-y-4 border-t border-linka2 p-3">
              {SKUPINY.map((sk) => {
                const polozky = ostatni.filter((d) => d.klic.startsWith(`${sk.predpona}-`));
                if (!polozky.length) return null;
                return (
                  <div key={sk.predpona}>
                    <div className="stitek mb-2">{sk.nazev}</div>
                    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {polozky.map((d) => <Dlazdice key={d.klic} d={d} />)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </details>
        </section>

        <section aria-label="Poslední události" className="rounded-[18px] border border-linka2 bg-plocha">
          <div className="flex items-center justify-between border-b border-linka2 px-3 py-2">
            <span className="stitek">Poslední události</span>
            <Link href="/udalosti/" className="text-[12.5px] font-semibold text-akcent hover:text-akcent-svetla">všechny →</Link>
          </div>
          <ol className="divide-y divide-linka2">
            {posledni.map((z) => {
              const t = PASMA[UROVNE[z.zavaznost].pasmo];
              return (
                <li key={z.id}>
                  <Link href={`/incident/${z.slug}/`} className="flex min-h-[40px] items-center gap-2 px-3 py-1.5 hover:bg-plocha2">
                    <span className="cislice w-[38px] shrink-0 text-[11.5px] text-tlum">{datumPraha(kdyZjisteno(z)).replace(/ \d{4}$/, "")}</span>
                    <span aria-hidden className={`h-[8px] w-[8px] shrink-0 rounded-[2px] ${druh(z) === "pripad" ? t.tecka : "border border-tlum2"}`} />
                    <Vlajka kod={z.kodZeme} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-inkoust">{z.kratkyTitulek || z.titulek}</span>
                    <OdznakNove kdy={kdyZjisteno(z)} />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {/* 2b — posuny ve vyšetřování starších případů */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Nová zjištění"
          nadpis="Co se zjistilo o tom, co se stalo dřív"
          popis="Obvinění, rozsudky, úředně potvrzený pachatel. Nejsou to nové události — je to posun ve vyšetřování těch starých."
          akce={<Link href="/udalosti/?overeni=potvrzeny-pachatel" className="text-[13px] font-semibold text-akcent hover:text-akcent-svetla">všechna zjištění →</Link>}
        />
        <NovaZjisteni polozky={novaZjisteni(vse, 6)} />
      </div>

      {/* 2b2 — manipulační kampaně: operace, ne události */}
      {kampane.length > 0 && (
        <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
          <NadpisSekce
            stitek="Manipulace"
            nadpis="Kampaně, které cíleně šíří nepravdu"
            popis="Podvržené dokumenty, falešné weby, profily vydávající se za úředníky. U každé zvlášť říkáme, jestli je manipulace doložená — a jestli víme, kdo za ní stojí."
            akce={<Link href="/manipulace/" className="text-[13px] font-semibold text-akcent hover:text-akcent-svetla">všechny rozbory →</Link>}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kampane.slice(0, 3).map((k) => <DlazdiceKampane key={k.slug} k={k} nazvyZemi={nazvyZemi} />)}
          </div>
        </div>
      )}

      {/* 2c — čím je tlak tvořený: pavučina typů hrozeb */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Typy hrozeb"
          nadpis="Čím je ten tlak tvořený"
          popis="Ne jak je velký, ale z čeho se skládá. Vlevo celá sledovaná Evropa — členské i nečlenské země NATO dohromady. Vpravo jen Česko. Rozdíl mezi obrazci je to podstatné."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <PavucinaHrozeb
            nadpis="Evropa jako celek"
            popis="Všechny sledované země od roku 2014, ať jsou v NATO, nebo ne."
            tlak={tlakEvropa}
            odkaz={{ href: "/metodika/", text: "jak se hodnotí →" }}
          />
          <PavucinaHrozeb
            nadpis="Česko"
            popis="Jen české záznamy od roku 2014. Prázdná osa znamená, že takový záznam nemáme."
            tlak={tlakCesko}
            odkaz={{ href: "/udalosti/?zeme=CZ", text: "české záznamy →" }}
          />
        </div>
      </div>

      {/* 3 — čísla, kde, kdo */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Čísla"
          nadpis="Kolik toho je, kde a kdo za tím stojí"
          popis="Počítají se jen případy, tedy skutečné události. Pokračování případu, opatření ani prohlášení číslo nezvyšují."
        />
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <section aria-label="Posledních 90 dnů">
          <div className="mb-1.5 flex items-center justify-between"><span className="stitek">Posledních 90 dnů · případy</span><Link href="/udalosti/?obdobi=30d" className="text-[12px] text-akcent hover:text-akcent-svetla">detail →</Link></div>
          <div className="grid grid-cols-2 gap-1.5">
            <Cislo n={dni90.length} slovo={sklon(dni90.length, "případ", "případy", "případů")} />
            <Cislo n={zemi} slovo={sklon(zemi, "země", "země", "zemí")} />
            <Cislo n={cz} slovo="v Česku" />
            <Cislo n={potvrzeno} slovo="s potvrzeným pachatelem" />
          </div>
          <p className="mt-1.5 text-[11.5px] text-tlum2">{uredni} z {dni90.length} s úředním zdrojem. Aktualizace a prohlášení se nepočítají.</p>
        </section>
        <section aria-label="Kde">
          <div className="mb-1.5 flex items-center justify-between"><span className="stitek">Kde · případy {rok}</span><Link href="/zeme/" className="text-[12px] text-akcent hover:text-akcent-svetla">všechny země →</Link></div>
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
                <span className="h-[8px] flex-1 overflow-hidden rounded-[2px] bg-linka2">
                  <span className="block h-full bg-tlum2/70" style={{ width: `${(s.pocet / maxPuv) * 100}%` }}>
                    <span className="block h-full bg-[#e8763f]" style={{ width: `${s.pocet ? (s.potvrzeno / s.pocet) * 100 : 0}%` }} />
                  </span>
                </span>
                <span className="cislice w-12 shrink-0 text-right text-[13px] text-inkoust"><b className="font-bold">{s.potvrzeno}</b><span className="text-tlum2"> / {s.pocet}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 4 — započítávání a úplný seznam */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Archiv"
          nadpis="Všechny záznamy od roku 2014"
          popis="Případy, jejich pokračování, úřední opatření, prohlášení a také to, co neprošlo ověřením. Filtry si můžete uložit v adrese."
          akce={<Link href="/udalosti/" className="text-[13px] font-semibold text-akcent hover:text-akcent-svetla">samostatná stránka →</Link>}
        />
      </div>
      <div className="mb-5"><Pocitadla vse={vse} neprosle={neprosle} kandidati={kandidati} /></div>
      <section id="zaznamy" aria-label="Všechny záznamy" className="scroll-mt-[84px] rounded-[22px] border border-linka2 bg-plocha p-4 sm:p-6">
        <UdalostiKlient zaznamy={vse} neprosle={neprosle} kandidati={kandidati} />
      </section>

      {/* 5 — sledovat a partneři */}
      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Odběr"
          nadpis="Jak se to dozvíte, aniž byste sem chodili"
          popis="Kanály, čtečka nebo vlastní přehled ve vašem zařízení. Nic z toho po vás nechce jméno ani e-mail."
        />
        <Sledovat />
      </div>
      <div className="mt-12 sm:mt-16"><Partneri /></div>

      {/* 6 — sbalené: proč, co by změnilo, odběr */}
      <div className="mt-14 grid gap-3 border-t border-linka pt-12 sm:mt-20 sm:pt-14 md:grid-cols-3">
        <details className="group rounded-[16px] border border-linka2 bg-plocha">
          <summary className="flex min-h-[40px] cursor-pointer items-center justify-between px-3 text-[13px] font-semibold text-inkoust">Proč je hodnocení {d ? d.nazev.toLowerCase() : "takové"}<Ikona nazev="dolu" velikost={12} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" /></summary>
          <p className="border-t border-linka2 px-3 py-2.5 text-[13px] leading-relaxed text-tlum">{stav.shrnuti || "Bez zdůvodnění."} <Link href="/metodika/" className="odkaz">Metodika</Link></p>
        </details>
        <details className="group rounded-[16px] border border-linka2 bg-plocha">
          <summary className="flex min-h-[40px] cursor-pointer items-center justify-between px-3 text-[13px] font-semibold text-inkoust">Co by hodnocení zhoršilo<Ikona nazev="dolu" velikost={12} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" /></summary>
          <ol className="space-y-1 border-t border-linka2 px-3 py-2.5 text-[13px] leading-snug text-tlum">
            {watchlist.eskalacni.map((e) => <li key={e.cislo} className="flex gap-2"><span className="cislice text-tlum2">{e.cislo}</span>{e.nazev}</li>)}
          </ol>
        </details>
        <div className="flex min-h-[40px] items-center justify-between gap-3 rounded-[16px] border border-linka2 bg-plocha px-3 text-[13px]">
          <span className="text-tlum">Změny bez sledování webu</span>
          <span className="flex items-center gap-3">
            <a href="/feed.xml" className="inline-flex items-center gap-1 font-semibold text-akcent hover:text-akcent-svetla"><Ikona nazev="rss" velikost={13} tah={2} /> RSS</a>
            <Link href="/odber/" className="font-semibold text-akcent hover:text-akcent-svetla">odběr →</Link>
          </span>
        </div>
      </div>
      <p className="mt-8 text-[12px] text-tlum2">Není to úřední zdroj ani varovný systém. V nouzi 112. Najeďte na dlaždici pro vysvětlení; každé číslo vede na svůj seznam.</p>
    </div>
    </>
  );
}
