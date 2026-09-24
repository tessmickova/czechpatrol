import Link from "next/link";
import { datumCasPraha } from "@/lib/cas";
import { NAZVY_HROZEB, type PripravitTed as Data } from "@/lib/priprava";
import { Ikona } from "./ikony";
import { HlavickaWidgetu, PatickaWidgetu } from "./widgety";

/*
  Karta „Připravit teď“ (24. 9. 2026): tři věci pro domácnost podle toho,
  co web právě dokládá. Každá vede do seznamu zásob na stránce Odolnost,
  kde se dá zaškrtnout, co doma je, a přepnout na rozšířený seznam nebo tipy.
  Není to předpověď — pod kartou stojí, z čeho se počítá.
*/
export function PripravitTed({ priprava }: { priprava: Data }) {
  if (!priprava.polozky.length) return null;
  const hlavni = priprava.hrozby.slice(0, 3);
  return (
    <section aria-label="Připravit teď" className="overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
      <HlavickaWidgetu
        ikona="stit"
        nazev="Připravit teď"
        napoveda={<span className="block">Tři věci pro domácnost podle tlaku doložených událostí za 30 dní, narušených služeb a platných opatření. Přepočítává se po každém sběru. Není to předpověď ani úřední pokyn.</span>}
        meta={<span className="cislice">přepočítáno {datumCasPraha(priprava.prepocitano)}</span>}
      />
      <ol className="grid divide-y divide-linka2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {priprava.polozky.map((p, i) => (
          <li key={p.klic} className="min-w-0">
            <Link href={`/odolnost/?seznam=${p.seznam}&zvyrazni=${p.klic}`} className="group flex h-full items-start gap-3 px-4 py-3 hover:bg-plocha2">
              <span className="cislice mt-[2px] text-velke font-bold leading-none text-akcent">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-male font-bold leading-snug text-inkoust">{p.nazev}</span>
                {p.mnozstvi && <span className="block text-drobne text-tlum">{p.mnozstvi}</span>}
                <span className="mt-1 block text-drobne leading-snug text-tlum2">
                  <b className="font-semibold text-tlum">{NAZVY_HROZEB[p.hrozba]}</b> · {p.duvod}
                </span>
              </span>
              <Ikona nazev="nahoru" velikost={12} tah={2} trida="mt-1 shrink-0 rotate-90 text-tlum2 transition-colors group-hover:text-akcent" />
            </Link>
          </li>
        ))}
      </ol>
      <PatickaWidgetu akce={<Link href="/odolnost/?seznam=72h" className="whitespace-nowrap font-semibold text-tlum hover:text-inkoust">celý seznam a kalkulačka →</Link>}>
        Největší tlak: {hlavni.map((h) => NAZVY_HROZEB[h.klic]).join(", ")}. Z doložených záznamů, ne z předpovědi.
      </PatickaWidgetu>
    </section>
  );
}
