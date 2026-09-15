"use client";

import { datumCasPraha } from "@/lib/cas";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav, Uroven } from "@/lib/typy";
import { cislem } from "@/lib/porovnani";
import type { Porovnani } from "@/lib/porovnani";
import type { HlavniVeta } from "@/lib/veta";
import { Ikona } from "./ikony";
import { Znacka } from "./znacka";
import { ObloukovyMerak } from "./mericky";
import { Napoveda, VykladUrovne } from "./zaklad";
import { Odznak, Tlacitko } from "./ui";
import { sklon } from "./zeme";
import { useT } from "@/lib/i18n";

/*
  Hlavička přehledu: jedna věta, jeden velký budík, tři malé.

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
  nadpis, uroven, obdobi, popis, velikost = 112, vlastniSlovo, dodatek,
}: {
  nadpis: string; uroven: Uroven | null; obdobi: string; popis?: string; velikost?: number; vlastniSlovo?: string;
  /** Doplněk jen do nápovědy. Na plochu budíku se nedostane. */
  dodatek?: string;
}) {
  const t = useT();
  const pasmo = uroven ? PASMA[UROVNE[uroven].pasmo] : null;
  return (
    <Napoveda
      cele
      popis={
        <span className="block">
          {uroven ? <VykladUrovne uroven={uroven} /> : t("Za sledované období tu není jediný ověřený případ ani operace proti občanům.")}
          {dodatek && <span className="mt-1.5 block text-tlum2">{dodatek}</span>}
        </span>
      }
    >
      <span className="flex w-full flex-col items-center px-1.5 py-3 text-center">
        <span className="stitek">{nadpis}</span>
        <span className="mt-1 text-mikro leading-none text-tlum2">{obdobi}</span>
        <ObloukovyMerak uroven={uroven} naNoci velikost={velikost} skrytPopisek />
        <span className={`-mt-1 text-zaklad font-bold uppercase leading-tight tracking-[0.03em] ${pasmo ? pasmo.text : vlastniSlovo ? "text-klid-text" : "text-tlum2"}`}>
          {vlastniSlovo ?? (uroven ? UROVNE[uroven].nazev : "bez hodnocení")}
        </span>
        {popis && <span className="mt-1 block max-w-[15rem] text-mikro leading-snug text-tlum2">{popis}</span>}
      </span>
    </Napoveda>
  );
}

export function HeroDashboard({
  stav, cr, crHistoricky, crPocet, obcane, overeno, pocetZaznamu, pocet90, veta, porovnani90,
}: {
  stav: CelkovyStav; cr: Uroven | null; crHistoricky: Uroven | null;
  /** Kolik případů a kolik manipulačních operací v Česku za 90 dní. */
  crPocet: { pripadu: number; kampani: number };
  obcane: { uroven: Uroven; popis: string; neovereno: number };
  overeno: string | null; pocetZaznamu: number; pocet90: number; veta: HlavniVeta;
  /** Jak je čtvrtletí na tom proti průměru. null = málo historie na průměr. */
  porovnani90: Porovnani | null;
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
    <section aria-label={t("Bezpečnostní aktivita")} className="sklo paralax-deska rounded-[28px]">
      {/*
        Hlavička úvodu ve stejném tvaru jako u každé jiné sekce: značka,
        štítek v barvě značky, nadpis v .titul-sekce. Dřív tu stál nadpis
        vlastního formátu (15px verzálkami, šedý) — vypadal jako popisek
        a čtenář z něj nepoznal, že je to nadpis stránky.
      */}
      <div className="border-b border-linka2 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="mb-3 flex items-center gap-2">
          <Znacka velikost={26} tmave />
          <span className="stitek-znacky">{t("Bezpečnostní přehled")}</span>
        </div>
        <h1 className="titul-sekce pb-4">{t("Bezpečnostní situace v Česku a okolí")}</h1>
      </div>
      {/* Jedna věta, kterou má čtenář odnést, i kdyby dál nečetl. */}
      <p className="uvodni-veta border-b border-linka2 px-5 pb-5 pt-4 sm:px-7 sm:pb-6">
        <strong className="font-bold text-inkoust">{veta.cesko}</strong>{" "}
        <span className="text-tlum">{veta.evropa}</span>
        {veta.neovereno > 0 && (
          <span
            className="mt-2 flex items-center gap-1.5 text-male text-tlum2"
            title={`${veta.neovereno} ${sklon(veta.neovereno, "položka nemá", "položky nemají", "položek nemá")} ověření a do věty nevstupuje.`}
          >
            <Ikona nazev="otaznik" velikost={13} tah={1.9} />
            {veta.neovereno} {sklon(veta.neovereno, "neověřená položka", "neověřené položky", "neověřených položek")}
          </span>
        )}
      </p>

      <div className="grid gap-2 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)]">
        <div className="flex items-center gap-4 border-b border-linka2 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <Napoveda popis={stav.uroven ? <VykladUrovne uroven={stav.uroven} /> : <span className="block">{t("Hodnocení zatím nebylo stanoveno.")}</span>}>
            <span className="block"><ObloukovyMerak uroven={stav.uroven} naNoci velikost={164} skrytPopisek /></span>
          </Napoveda>
          <div className="min-w-0">
            <div className="stitek">{t("Hodnocení projektu · Evropa, dnes")}</div>
            <p className={`text-cislo-l font-bold leading-none sm:text-cislo-xl ${pasmo ? pasmo.text : "text-tlum"}`}>{d ? d.nazev : "Nestanoveno"}</p>
            {/*
              Číslo „6 z 10" je pryč. Vypadalo jako měření, ale je to jen jinak
              zapsané totéž slovo — a hlavně se dalo číst jako pravděpodobnost
              útoku, což není. Stupnice i s čísly zůstává v metodice a v detailu
              záznamu, kde je vedle ní vysvětlení.
            */}
            <p className="mt-1 text-drobne text-tlum2">dnes</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-drobne text-tlum">
              {stav.trend === "nahoru" && <span className="flex items-center gap-1 font-semibold text-stari-text2"><Ikona nazev="nahoru" velikost={12} tah={2.2} />{t("zhoršení za 7 dní")}</span>}
              {stav.trend === "dolu" && <span className="flex items-center gap-1 font-semibold text-klid-text"><Ikona nazev="dolu" velikost={12} tah={2.2} />{t("zlepšení za 7 dní")}</span>}
              {stav.trend === "beze-zmeny" && <span>{t("beze změny 7 dní")}</span>}
              <span>{overeno ? `ověřeno ${datumCasPraha(overeno)}` : "ověření neproběhlo"}</span>
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-drobne text-tlum">
              <span><b className="cislice text-vetsi font-bold text-inkoust">{pocet90}</b>{t("incidentů za 90 dní")}</span>
              {porovnani90 ? (
                <span title={`Průměr posledních ${porovnani90.zaLet} let je ${cislem(porovnani90.prumer)} incidentu na čtvrtletí.`}>
                  <Odznak ton={porovnani90.smer === "vyssi" ? "pozor" : porovnani90.smer === "nizsi" ? "klid" : "neutral"} duraz="silny">
                    {porovnani90.slovo}
                  </Odznak>
                </span>
              ) : (
                /*
                  Bez srovnatelného období se neporovnává. Pravidelný sběr běží
                  kratší dobu než okno průměru, takže vyšší dnešní číslo by
                  měřilo náš sběr, ne skutečnost.
                */
                <Napoveda popis={<span className="block">Pravidelný sběr běží od července 2026. Starší záznamy jsou doplněné zpětně a zachytily jen to nejviditelnější, takže se s dneškem porovnávat nedají.</span>}>
                  <span className="text-drobne text-tlum2">bez srovnání</span>
                </Napoveda>
              )}
              <span><b className="cislice text-vetsi font-bold text-inkoust">{pocetZaznamu}</b>{t("záznamů od roku 2014")}</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-2">
              <Tlacitko kam="#zaznamy" varianta="zvyrazneny" velikost="s" ikona="osa">{t("Všechny záznamy")}</Tlacitko>
              <Tlacitko kam="#sledovat" varianta="obrys" velikost="s" ikona="zvonek">{t("Sledovat změny")}</Tlacitko>
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
        <div className="grid grid-cols-2 divide-x divide-linka2">
          <Merak
            nadpis={t("Situace v Česku")}
            uroven={cr}
            obdobi="90 dní"
            popis={crPopis}
            vlastniSlovo={crSlovo}
            dodatek={crHistoricky ? `Nejvýš od roku 2014: ${UROVNE[crHistoricky].nazev.toLowerCase()}.` : undefined}
          />
          <Merak
            nadpis={t("Dopad na běžný život")}
            uroven={obcane.uroven}
            obdobi="teď"
            popis={obcane.uroven === "G1" ? "pohyb, nákupy i služby beze změny" : obcane.popis}
            vlastniSlovo={obcane.uroven === "G1" ? "Bez omezení" : undefined}
          />
        </div>
      </div>
    </section>
  );
}
