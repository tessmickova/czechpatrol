import Link from "next/link";
import { datumCasPraha } from "@/lib/cas";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav, Uroven } from "@/lib/typy";
import { Ikona } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { Napoveda, VykladUrovne } from "./zaklad";

/*
  Hero s tachometry. Jeden velký = hodnocení projektu pro Evropu,
  tři menší = Česko (ze záznamů CZ), NATO a Evropa (hybridní tlak),
  občané ČR (z úředních opatření). Barva a slovo; výklad v nápovědě.
*/

function Merak({ nadpis, uroven, popis, velikost = 118, vlastniSlovo }: { nadpis: string; uroven: Uroven | null; popis: string; velikost?: number; vlastniSlovo?: string }) {
  const t = uroven ? PASMA[UROVNE[uroven].pasmo] : null;
  return (
    <Napoveda cele popis={uroven ? <VykladUrovne uroven={uroven} /> : <span className="block">Bez záznamu, ze kterého by šlo hodnotit. Nedopočítáváme.</span>}>
      <span className="flex w-full flex-col items-center px-1 py-2 text-center">
        <span className="stitek">{nadpis}</span>
        <ObloukovyMerak uroven={uroven} naNoci velikost={velikost} skrytPopisek />
        <span className={`-mt-1 text-[14px] font-bold uppercase leading-tight tracking-[0.03em] ${t ? t.text : "text-tlum2"}`}>
          {vlastniSlovo ?? (uroven ? UROVNE[uroven].nazev : "bez záznamu")}
        </span>
        <span className="mt-0.5 text-[11.5px] text-tlum2">{popis}</span>
      </span>
    </Napoveda>
  );
}

export function HeroDashboard({
  stav, cr, hybridni, obcane, overeno, pocetZaznamu, pocet90,
}: {
  stav: CelkovyStav; cr: Uroven | null; hybridni: Uroven | null;
  obcane: { uroven: Uroven; popis: string; neovereno: number };
  overeno: string | null; pocetZaznamu: number; pocet90: number;
}) {
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const t = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;
  return (
    <section aria-label="Míra nebezpečí" className="sklo rounded-[30px]">
      <div className="grid gap-2 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)]">
        <div className="flex items-center gap-4 border-b border-linka2 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <Napoveda popis={stav.uroven ? <VykladUrovne uroven={stav.uroven} /> : <span className="block">Hodnocení zatím nebylo stanoveno.</span>}>
            <span className="block"><ObloukovyMerak uroven={stav.uroven} naNoci velikost={164} skrytPopisek /></span>
          </Napoveda>
          <div className="min-w-0">
            <div className="stitek">Celková míra nebezpečí · Evropa</div>
            <p className={`text-[34px] font-bold leading-none sm:text-[40px] ${t ? t.text : "text-tlum"}`}>{d ? d.nazev : "Nestanoveno"}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-tlum">
              {stav.trend === "nahoru" && <span className="flex items-center gap-1 font-semibold text-[#f0996e]"><Ikona nazev="nahoru" velikost={12} tah={2.2} /> zhoršení za 7 dní</span>}
              {stav.trend === "dolu" && <span className="flex items-center gap-1 font-semibold text-[#8fd6ae]"><Ikona nazev="dolu" velikost={12} tah={2.2} /> zlepšení za 7 dní</span>}
              {stav.trend === "beze-zmeny" && <span>beze změny 7 dní</span>}
              <span>{overeno ? `ověřeno ${datumCasPraha(overeno)}` : "ověření neproběhlo"}</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 text-[12.5px] text-tlum">
              <span><b className="cislice text-[16px] font-bold text-inkoust">{pocet90}</b> případů / 90 dnů</span>
              <span><b className="cislice text-[16px] font-bold text-inkoust">{pocetZaznamu}</b> záznamů celkem</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-2">
              <Link href="#zaznamy" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[12px] border border-akcent/60 bg-akcent/15 px-3 text-[12.5px] font-bold text-akcent-svetla hover:bg-akcent/25"><Ikona nazev="osa" velikost={13} tah={2} /> Všechny záznamy</Link>
              <Link href="#sledovat" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[12px] border border-linka px-3 text-[12.5px] font-bold text-inkoust hover:border-akcent"><Ikona nazev="zvonek" velikost={13} tah={2} /> Sledovat změny</Link>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-linka2">
          <Merak nadpis="Česko" uroven={cr} popis="ze záznamů CZ" />
          <Merak nadpis="NATO a Evropa" uroven={hybridni} popis="hybridní tlak" />
          <Merak nadpis="Občané ČR" uroven={obcane.uroven} popis={obcane.uroven === "G1" ? "žádné omezení" : "omezení platí"} vlastniSlovo={obcane.uroven === "G1" ? "Bez omezení" : undefined} />
        </div>
      </div>
    </section>
  );
}
