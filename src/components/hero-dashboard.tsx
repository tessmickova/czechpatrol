"use client";

import type { StavObcanu } from "@/lib/data";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav, Uroven } from "@/lib/typy";
import type { HlavniVeta } from "@/lib/veta";
import { Ikona } from "./ikony";
import { Znacka } from "./znacka";
import { ObloukovyMerak } from "./mericky";
import { Napoveda, VykladUrovne } from "./zaklad";
import { Tlacitko } from "./ui";
import { sklon } from "./zeme";
import { useT } from "@/lib/i18n";

/*
  Hlavička přehledu: jedna věta, jeden velký budík, dva malé.

  Bez vysvětlivek na ploše. Období budíku je součástí jeho štítku
  („Situace v Česku · 90 dní"), počty a doplňky jsou v nápovědě po
  najetí nebo klepnutí, provozní řádek s časem ověření je pryč (čas
  kontroly je v liště nahoře). Na ploše zůstává jen to, co se dá přečíst
  za tři vteřiny: věta, úroveň, trend, dvě slova na malých budících.

  Tohle je první obrazovka člověka, který se bojí. Platí tu proto přísnější
  pravidlo než jinde na webu: na plochu jde jen to, co takový člověk potřebuje
  k rychlé orientaci. Jak se co počítá, čím se to liší od jiného okna a co do
  věty nevstupuje — to všechno patří do nápovědy pod budíkem, ne před oči.
  Vysvětlivka navíc tady nikoho neuklidní, jen zdrží.

  Každý budík má u sebe období, za které platí. Bez toho vedle sebe stály
  údaje z různých oken („vysoká“ za celou historii vedle „0 případů“ za
  devadesát dní) a vypadaly jako rozpor, i když rozpor nebyl.
*/

function Merak({
  nadpis, uroven, obdobi, popis, velikost = 136, vlastniSlovo, dodatek, bezVykladu = false, neutralni = false,
}: {
  nadpis: string; uroven: Uroven | null; obdobi: string; velikost?: number; vlastniSlovo?: string;
  /** Neukazovat výklad bezpečnostní škály (u běžného života by lhal). */
  bezVykladu?: boolean;
  /** Šedě místo barvy pásma: nemáme doklad. */
  neutralni?: boolean;
  /** Popis i doplněk jdou jen do nápovědy. Na plochu budíku se nedostanou. */
  popis?: string; dodatek?: string;
}) {
  const t = useT();
  const pasmo = uroven && !neutralni ? PASMA[UROVNE[uroven].pasmo] : null;
  return (
    <Napoveda
      cele
      popis={
        <span className="block">
          {popis && <span className="mb-1.5 block text-inkoust">{popis}</span>}
          {bezVykladu ? null : uroven ? <VykladUrovne uroven={uroven} /> : t("Za sledované období tu není jediný ověřený případ ani operace proti občanům.")}
          {dodatek && <span className="mt-1.5 block text-tlum2">{dodatek}</span>}
        </span>
      }
    >
      {/*
        Na mobilu bez oblouku.

        Tři oblouky pod sebou zabraly půl obrazovky a dva z nich říkaly totéž
        co slovo pod nimi — jen pomaleji. Na úzkém displeji proto zůstává
        barevná tečka, slovo a jedna věta; oblouk se vrací od šířky tabletu,
        kde má kam se vejít.
      */}
      <span className="flex w-full flex-col items-center px-1.5 py-2.5 text-center sm:py-3">
        <span className="stitek whitespace-nowrap">{nadpis} <span className="text-tlum2">· {obdobi}</span></span>
        <span className="hidden sm:block">
          <ObloukovyMerak uroven={uroven} naNoci velikost={velikost} skrytPopisek />
        </span>
        <span aria-hidden className={`mt-2 mb-1 h-[7px] w-[7px] rounded-full sm:hidden ${pasmo ? pasmo.tecka : "bg-klid"}`} />
        <span className={`text-zaklad font-bold uppercase leading-tight tracking-[0.03em] sm:-mt-1 ${pasmo ? pasmo.text : vlastniSlovo && !neutralni ? "text-klid-text" : "text-tlum2"}`}>
          {vlastniSlovo ?? (uroven ? UROVNE[uroven].nazev : "bez hodnocení")}
        </span>
      </span>
    </Napoveda>
  );
}

export function HeroDashboard({
  stav, cr, crHistoricky, crPocet, obcane, veta, pas,
}: {
  stav: CelkovyStav; cr: Uroven | null; crHistoricky: Uroven | null;
  /** Kompaktní urgentní pás pod úvodní větou (viz urgentni.tsx). */
  pas?: React.ReactNode;
  /** Kolik případů a kolik manipulačních operací v Česku za 90 dní. */
  crPocet: { pripadu: number; kampani: number };
  obcane: StavObcanu;
  veta: HlavniVeta;
}) {
  const t = useT();
  /*
    „Bez záznamu“ znělo, jako by web nic nevěděl. Přitom to znamená pravý
    opak: za devadesát dní tu nic nebylo. Napsat to rovnou je informace,
    kterou čtenář hledá — a je to jediná dobrá zpráva na celém budíku.
  */
  const crSlovo = cr ? undefined : "Bez incidentu";
  // Období stojí nad budíkem, tak se v popisu neopakuje.
  const crPopis = cr
    ? [
        crPocet.pripadu ? `${crPocet.pripadu} ${sklon(crPocet.pripadu, "případ", "případy", "případů")}` : null,
        crPocet.kampani ? `${crPocet.kampani} ${sklon(crPocet.kampani, "operace proti občanům", "operace proti občanům", "operací proti občanům")}` : null,
      ].filter(Boolean).join(" a ")
    : "ani jeden případ";
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const pasmo = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;
  return (
    <section aria-label={t("Bezpečnostní aktivita")} className="paralax-deska xl:flex xl:h-full xl:flex-col">
      {/*
        Bez rámečku. Úvod je začátek stránky, ne karta v ní — orámovaný
        vypadal jako jeden z panelů a soupeřil s aktualitami vedle. Vnitřní
        dělicí linky zůstávají, jen se nezavírají do rámu.
      */}
      {/*
        Hlavička úvodu ve stejném tvaru jako u každé jiné sekce: značka,
        štítek v barvě značky, nadpis v .titul-sekce. Dřív tu stál nadpis
        vlastního formátu (15px verzálkami, šedý) — vypadal jako popisek
        a čtenář z něj nepoznal, že je to nadpis stránky.
      */}
      <div>
      <div className="border-b border-linka2 pt-1 sm:pt-2">
        <div className="mb-2 flex items-center gap-2">
          <Znacka velikost={26} tmave />
          <span className="stitek-znacky">{t("Bezpečnostní přehled")}</span>
        </div>
        <h1 className="titul-sekce pb-3">{t("Bezpečnostní situace v Česku a okolí")}</h1>
      </div>
      {/*
        Jedna věta, kterou má čtenář odnést, i kdyby dál nečetl. Nic pod ní:
        poznámka o neověřených položkách, která tu stála, je v Aktualitách
        vedle — tam má vlastní oddíl a nemusí se vysvětlovat jednou větou.
      */}
      <p className="uvodni-veta max-w-[40rem] border-b border-linka2 pb-4 pt-3 sm:pb-5">
        <strong className="font-bold text-inkoust">{veta.cesko}</strong>{" "}
        <span className="text-tlum">{veta.evropa}</span>
      </p>
      </div>

      {/*
        Sloupec s minimem 0. Bez toho má jediný sloupec na mobilu minimum
        „auto" a roztáhne se podle nejširšího obsahu — dva budíky vedle sebe
        ho vyhnaly na 677 px a celý panel se na 390 px displeji ořízl vpravo.
      */}
      {/*
        Rozložení na výšku sloupce vedle: nadpis s větou drží pohromadě
        nahoře, budíky se vystředí ve zbylém místě (my-auto ve sloupci).
        Vzduch je tak nad budíky i pod nimi, ne v jednom kusu. Budíky jsou
        větší než dřív ze stejného důvodu — úvod bez čísel a vysvětlivek
        byl o 190 px nižší než aktuality a zbytek zel prázdnotou.
      */}
      {/*
        Poměr sloupců 1.25 : 1.2. Vedle aktualit má úvod na 1280 px jen
        715 px; při 1.05 : 1.4 zbylo na slovo u velkého budíku 129 px a
        „Zvýšená" se lámala uprostřed slova. Dvěma malým budíkům stačí
        po 175 px — oblouk má 136 px a štítek se vejde.
      */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 py-3 sm:py-4 xl:my-auto lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.2fr)]">
        <div className="flex min-w-0 items-center gap-4 border-b border-linka2 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <Napoveda popis={stav.uroven ? <VykladUrovne uroven={stav.uroven} /> : <span className="block">{t("Hodnocení zatím nebylo stanoveno.")}</span>}>
            <span className="block"><ObloukovyMerak uroven={stav.uroven} naNoci velikost={164} skrytPopisek /></span>
          </Napoveda>
          <div className="min-w-0">
            <div className="stitek whitespace-nowrap">{t("Evropa · dnes")}</div>
            {/*
              Velikost podle délky slova. „Zvýšená" ve 44 px měřila 179 px a
              přetékala přes dělicí linku do vedlejšího budíku. Slovo nad osm
              znaků („Nestanoveno", „Mírně zvýšená") jde o stupeň menší a smí
              se zalomit jen mezi slovy, nikdy uprostřed slova.
            */}
            <p className={`${(d ? d.nazev : "Nestanoveno").length > 8 ? "text-cislo" : "text-cislo-l"} font-bold leading-[0.95] [overflow-wrap:normal] ${pasmo ? pasmo.text : "text-tlum"}`}>{d ? d.nazev : "Nestanoveno"}</p>
            {/*
              Trend hned pod slovem, ne v provozním řádku na patě. Patří
              k úrovni — je to její pohyb — a bez patičky nemá kam jinam.
              Barvu nese šipka, slovo zůstává neutrální.
            */}
            {stav.trend === "nahoru" && (
              <p className="mt-1.5 flex items-center gap-1 text-mikro font-semibold text-tlum">
                <span className="text-stari"><Ikona nazev="nahoru" velikost={11} tah={2.2} /></span>{t("zhoršení za 7 dní")}
              </p>
            )}
            {stav.trend === "dolu" && (
              <p className="mt-1.5 flex items-center gap-1 text-mikro font-semibold text-tlum">
                <span className="text-klid"><Ikona nazev="dolu" velikost={11} tah={2.2} /></span>{t("zlepšení za 7 dní")}
              </p>
            )}
            {stav.trend === "beze-zmeny" && <p className="mt-1.5 text-mikro text-tlum2">{t("beze změny 7 dní")}</p>}
            {/*
              Číslo „6 z 10" je pryč. Vypadalo jako měření, ale je to jen jinak
              zapsané totéž slovo — a hlavně se dalo číst jako pravděpodobnost
              útoku, což není. Stupnice i s čísly zůstává v metodice a v detailu
              záznamu, kde je vedle ní vysvětlení.
            */}
            {/* Jedno tlačítko. Cesta k záznamům je v Aktualitách vedle, tady by byla podruhé. */}
            <p className="mt-3">
              <Tlacitko kam="#sledovat" varianta="obrys" velikost="s" ikona="zvonek" trida="whitespace-nowrap">{t("Sledovat změny")}</Tlacitko>
            </p>
          </div>
        </div>
        {/*
          Dřív tu stály tři budíky a jeden z nich („Aktivita v Evropě") říkal
          totéž co velký budík vlevo — jen jiným slovem a jiným číslem.
          Dva konstrukty s téměř shodným názvem vedle sebe se nedaly rozlišit.
          Zůstávají dva, které odpovídají na jinou otázku než velký budík:
          co se děje v Česku a co z toho plyne pro dnešek.
        */}
        <div className="grid min-w-0 grid-cols-2 divide-x divide-linka2">
          <Merak
            nadpis={t("Česko")}
            uroven={cr}
            obdobi="90 dní"
            popis={crPopis}
            vlastniSlovo={crSlovo}
            dodatek={crHistoricky ? `Nejvýš od roku 2014: ${UROVNE[crHistoricky].nazev.toLowerCase()}.` : undefined}
          />
          <Merak
            nadpis={t("Běžný život")}
            uroven={obcane.uroven}
            obdobi="teď"
            popis={obcane.popis}
            vlastniSlovo={obcane.slovo}
            bezVykladu
            neutralni={obcane.neutralni}
          />
        </div>
      </div>

      {/* Urgentní pás až pod budíky: nejdřív stav, pak odpověď „děje se něco právě teď?“. */}
      {pas && <div className="border-t border-linka2 pt-4">{pas}</div>}
    </section>
  );
}
