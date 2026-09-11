import { datumCasPraha } from "@/lib/cas";
import { PASMA, UROVNE, zDeseti } from "@/lib/skala";
import type { CelkovyStav, Uroven } from "@/lib/typy";
import type { HlavniVeta } from "@/lib/veta";
import { Ikona } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { Napoveda, VykladUrovne } from "./zaklad";
import { Tlacitko } from "./ui";
import { sklon } from "./zeme";

/*
  Hlavička přehledu: jedna věta, jeden velký budík, tři malé.

  Věta je nahoře záměrně. Budík je rychlý, ale dá se přečíst špatně — proto
  nad ním stojí napsané, co z toho plyne pro běžný den v Česku.

  Každý budík má u sebe období, za které platí. Bez toho vedle sebe stály
  údaje z různých oken („vysoká“ za celou historii vedle „0 případů“ za
  devadesát dní) a vypadaly jako rozpor, i když rozpor nebyl.
*/

function Merak({
  nadpis, uroven, obdobi, popis, velikost = 112, vlastniSlovo,
}: {
  nadpis: string; uroven: Uroven | null; obdobi: string; popis?: string; velikost?: number; vlastniSlovo?: string;
}) {
  const t = uroven ? PASMA[UROVNE[uroven].pasmo] : null;
  return (
    <Napoveda cele popis={uroven ? <VykladUrovne uroven={uroven} /> : <span className="block">Bez záznamu, ze kterého by šlo hodnotit. Nedopočítáváme.</span>}>
      <span className="flex w-full flex-col items-center px-1.5 py-3 text-center">
        <span className="stitek">{nadpis}</span>
        <span className="mt-1 text-[11px] leading-none text-tlum2">{obdobi}</span>
        <ObloukovyMerak uroven={uroven} naNoci velikost={velikost} skrytPopisek />
        <span className={`-mt-1 text-[14px] font-bold uppercase leading-tight tracking-[0.03em] ${t ? t.text : "text-tlum2"}`}>
          {vlastniSlovo ?? (uroven ? UROVNE[uroven].nazev : "bez záznamu")}
        </span>
        {popis && <span className="mt-1 block max-w-[15rem] text-[11.5px] leading-snug text-tlum2">{popis}</span>}
      </span>
    </Napoveda>
  );
}

export function HeroDashboard({
  stav, cr, crHistoricky, hybridni, obcane, overeno, pocetZaznamu, pocet90, veta,
}: {
  stav: CelkovyStav; cr: Uroven | null; crHistoricky: Uroven | null; hybridni: Uroven | null;
  obcane: { uroven: Uroven; popis: string; neovereno: number };
  overeno: string | null; pocetZaznamu: number; pocet90: number; veta: HlavniVeta;
}) {
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const t = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;
  return (
    <section aria-label="Bezpečnostní aktivita" className="sklo rounded-[28px]">
      {/* Jedna věta, kterou má čtenář odnést, i kdyby dál nečetl. */}
      <p className="border-b border-linka2 px-5 py-5 text-[17px] leading-relaxed text-tlum sm:px-7 sm:py-6 sm:text-[19px]">
        <strong className="font-bold text-inkoust">{veta.cesko}</strong>{" "}
        <span>{veta.evropa}</span>
        {veta.neovereno > 0 && (
          <span className="mt-2 flex items-center gap-1.5 text-[13px] text-tlum2">
            <Ikona nazev="otaznik" velikost={13} tah={1.9} />
            {veta.neovereno} {sklon(veta.neovereno, "položka nemá", "položky nemají", "položek nemá")} ověření — do věty nevstupuje.
          </span>
        )}
      </p>

      <div className="grid gap-2 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)]">
        <div className="flex items-center gap-4 border-b border-linka2 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <Napoveda popis={stav.uroven ? <VykladUrovne uroven={stav.uroven} /> : <span className="block">Hodnocení zatím nebylo stanoveno.</span>}>
            <span className="block"><ObloukovyMerak uroven={stav.uroven} naNoci velikost={164} skrytPopisek /></span>
          </Napoveda>
          <div className="min-w-0">
            <div className="stitek">Bezpečnostní aktivita · Evropa</div>
            <p className={`text-[34px] font-bold leading-none sm:text-[40px] ${t ? t.text : "text-tlum"}`}>{d ? d.nazev : "Nestanoveno"}</p>
            <p className="mt-1 text-[12.5px] text-tlum2">
              {stav.uroven ? `${zDeseti(stav.uroven)} z 10 · ` : ""}hodnocení k dnešnímu dni, ne za celou historii
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-tlum">
              {stav.trend === "nahoru" && <span className="flex items-center gap-1 font-semibold text-[#f0996e]"><Ikona nazev="nahoru" velikost={12} tah={2.2} /> zhoršení za 7 dní</span>}
              {stav.trend === "dolu" && <span className="flex items-center gap-1 font-semibold text-[#8fd6ae]"><Ikona nazev="dolu" velikost={12} tah={2.2} /> zlepšení za 7 dní</span>}
              {stav.trend === "beze-zmeny" && <span>beze změny 7 dní</span>}
              <span>{overeno ? `ověřeno ${datumCasPraha(overeno)}` : "ověření neproběhlo"}</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 text-[12.5px] text-tlum">
              <span><b className="cislice text-[16px] font-bold text-inkoust">{pocet90}</b> případů za 90 dní</span>
              <span><b className="cislice text-[16px] font-bold text-inkoust">{pocetZaznamu}</b> záznamů od roku 2014</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-2">
              <Tlacitko kam="#zaznamy" varianta="zvyrazneny" velikost="s" ikona="osa">Všechny záznamy</Tlacitko>
              <Tlacitko kam="#sledovat" varianta="obrys" velikost="s" ikona="zvonek">Sledovat změny</Tlacitko>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-linka2">
          <Merak nadpis="Aktivita v Evropě" uroven={hybridni} obdobi="stav k dnešku" popis="hybridní tlak napříč Evropou, i mimo NATO" />
          <Merak
            nadpis="Situace v Česku"
            uroven={cr}
            obdobi="za 90 dní"
            popis={cr ? "z ověřených českých případů" : `žádný ověřený případ${crHistoricky ? `; nejvýš od 2014 ${UROVNE[crHistoricky].nazev.toLowerCase()}` : ""}`}
          />
          <Merak
            nadpis="Dopad na běžný život dnes"
            uroven={obcane.uroven}
            obdobi="platí teď"
            popis={obcane.uroven === "G1" ? "žádné omezení pohybu, nákupů ani služeb" : obcane.popis}
            vlastniSlovo={obcane.uroven === "G1" ? "Bez omezení" : undefined}
          />
        </div>
      </div>
    </section>
  );
}
