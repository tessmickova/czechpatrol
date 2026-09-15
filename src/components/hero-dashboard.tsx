"use client";

import { datumCasPraha } from "@/lib/cas";
import { PASMA, UROVNE, zDeseti } from "@/lib/skala";
import type { CelkovyStav, Uroven } from "@/lib/typy";
import { cislem } from "@/lib/porovnani";
import type { Porovnani } from "@/lib/porovnani";
import type { HlavniVeta } from "@/lib/veta";
import { Ikona } from "./ikony";
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
        <span className="mt-1 text-[11px] leading-none text-tlum2">{obdobi}</span>
        <ObloukovyMerak uroven={uroven} naNoci velikost={velikost} skrytPopisek />
        <span className={`-mt-1 text-[14px] font-bold uppercase leading-tight tracking-[0.03em] ${pasmo ? pasmo.text : vlastniSlovo ? "text-[#8fd6ae]" : "text-tlum2"}`}>
          {vlastniSlovo ?? (uroven ? UROVNE[uroven].nazev : "bez hodnocení")}
        </span>
        {popis && <span className="mt-1 block max-w-[15rem] text-[11.5px] leading-snug text-tlum2">{popis}</span>}
      </span>
    </Napoveda>
  );
}

export function HeroDashboard({
  stav, cr, crHistoricky, crPocet, hybridni, obcane, overeno, pocetZaznamu, pocet90, veta, porovnani90,
}: {
  stav: CelkovyStav; cr: Uroven | null; crHistoricky: Uroven | null; hybridni: Uroven | null;
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
      {/* Jedna věta, kterou má čtenář odnést, i kdyby dál nečetl. */}
      <p className="border-b border-linka2 px-5 py-5 text-[17px] leading-relaxed text-tlum sm:px-7 sm:py-6 sm:text-[19px]">
        <strong className="font-bold text-inkoust">{veta.cesko}</strong>{" "}
        <span>{veta.evropa}</span>
        {veta.neovereno > 0 && (
          <span
            className="mt-2 flex items-center gap-1.5 text-[13px] text-tlum2"
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
            <div className="stitek">{t("Bezpečnostní aktivita · Evropa")}</div>
            <p className={`text-[34px] font-bold leading-none sm:text-[40px] ${pasmo ? pasmo.text : "text-tlum"}`}>{d ? d.nazev : "Nestanoveno"}</p>
            <p className="mt-1 text-[12.5px] text-tlum2" title="Hodnocení k dnešnímu dni, ne za celou historii.">
              {stav.uroven ? `${zDeseti(stav.uroven)} z 10 · ` : ""}dnes
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-tlum">
              {stav.trend === "nahoru" && <span className="flex items-center gap-1 font-semibold text-[#f0996e]"><Ikona nazev="nahoru" velikost={12} tah={2.2} />{t("zhoršení za 7 dní")}</span>}
              {stav.trend === "dolu" && <span className="flex items-center gap-1 font-semibold text-[#8fd6ae]"><Ikona nazev="dolu" velikost={12} tah={2.2} />{t("zlepšení za 7 dní")}</span>}
              {stav.trend === "beze-zmeny" && <span>{t("beze změny 7 dní")}</span>}
              <span>{overeno ? `ověřeno ${datumCasPraha(overeno)}` : "ověření neproběhlo"}</span>
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-tlum">
              <span><b className="cislice text-[16px] font-bold text-inkoust">{pocet90}</b>{t("incidentů za 90 dní")}</span>
              {porovnani90 && (
                <span title={`Průměr posledních ${porovnani90.zaLet} let je ${cislem(porovnani90.prumer)} incidentu na čtvrtletí.`}>
                  <Odznak ton={porovnani90.smer === "vyssi" ? "pozor" : porovnani90.smer === "nizsi" ? "klid" : "neutral"} duraz="silny">
                    {porovnani90.slovo} než průměr
                  </Odznak>
                </span>
              )}
              <span><b className="cislice text-[16px] font-bold text-inkoust">{pocetZaznamu}</b>{t("záznamů od roku 2014")}</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-2">
              <Tlacitko kam="#zaznamy" varianta="zvyrazneny" velikost="s" ikona="osa">{t("Všechny záznamy")}</Tlacitko>
              <Tlacitko kam="#sledovat" varianta="obrys" velikost="s" ikona="zvonek">{t("Sledovat změny")}</Tlacitko>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-linka2">
          <Merak nadpis={t("Aktivita v Evropě")} uroven={hybridni} obdobi="dnes" />
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
