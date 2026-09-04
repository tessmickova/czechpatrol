import Link from "next/link";
import { KATEGORIE } from "@/lib/kategorie";
import { datum } from "@/lib/format";
import { tokeny, UROVNE } from "@/lib/skala";
import type { Incident } from "@/lib/typy";
import type { SUkazkou } from "@/lib/data";
import { Prazdno } from "./zaklad";

/**
 * Časová osa. Smyslem je, aby byla na první pohled vidět kumulace —
 * ne aby se dal přečíst každý detail.
 */
export function CasovaOsa({ incidenty }: { incidenty: SUkazkou<Incident>[] }) {
  if (!incidenty.length) {
    return (
      <Prazdno
        nadpis="Časová osa je zatím prázdná"
        popis="Na osu se zapisují jen ověřené záznamy se zdrojem. Dokud takové nejsou, zůstává prázdná."
      />
    );
  }

  const serazene = [...incidenty].sort((a, b) =>
    (b.datumZjisteni ?? b.datumUdalosti).localeCompare(a.datumZjisteni ?? a.datumUdalosti),
  );

  return (
    <ol className="relative">
      <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-linka sm:left-[76px]" />
      {serazene.map((i) => {
        const t = tokeny(i.zavaznost);
        const kdy = i.datumZjisteni ?? i.datumUdalosti;
        const jeZjisteni = Boolean(i.datumZjisteni && i.datumZjisteni !== i.datumUdalosti);
        return (
          <li key={i.id} className="relative">
            <Link
              href={`/incident/${i.slug}/`}
              className="group flex items-start gap-4 py-3.5 sm:gap-5"
            >
              <span className="cislice hidden w-[60px] shrink-0 pt-[1px] text-right text-[12px] font-medium text-tlum sm:block">
                {datum(kdy).replace(/ \d{4}$/, "")}
              </span>
              <span
                aria-hidden
                className={`relative z-10 mt-[5px] h-[11px] w-[11px] shrink-0 rounded-[2px] border-2 border-papir ${t.pruh}`}
              />
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="cislice stitek sm:hidden">{datum(kdy)}</span>
                  <span className="stitek">{i.zeme}</span>
                  {i.kategorie[0] && (
                    <span className="stitek !text-tlum2">{KATEGORIE[i.kategorie[0]].nazev}</span>
                  )}
                  <span className={`stitek-tmavy ${t.text}`}>{UROVNE[i.zavaznost].nazev}</span>
                  {jeZjisteni && (
                    <span className="stitek-tmavy rounded-[10px] border border-linka px-1.5 py-[2px] text-tlum2">
                      Nové zjištění
                    </span>
                  )}
                </span>
                <span className="block text-[14px] font-medium leading-snug tracking-[-0.01em] group-hover:underline group-hover:underline-offset-4">
                  {i.kratkyTitulek || i.titulek}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
