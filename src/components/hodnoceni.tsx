import Link from "next/link";
import { datumCasPraha } from "@/lib/cas";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav } from "@/lib/typy";
import { Ikona } from "./ikony";
import { Napoveda, VykladUrovne } from "./zaklad";

/**
 * Hodnocení projektu. Je to analytická interpretace podle metodiky,
 * ne oficiální stupeň a ne hlavní titulek stránky. Proto stojí ve
 * vedlejším sloupci s výslovným označením a odkazem na metodiku.
 */
export function HodnoceniProjektu({ stav }: { stav: CelkovyStav }) {
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const t = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;
  return (
    <section aria-labelledby="hodnoceni" className="rounded-[22px] border border-linka bg-plocha p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="hodnoceni" className="stitek">Hodnocení projektu</h2>
        <Napoveda vpravo popis={<span className="block">Analytické hodnocení podle metodiky CzechPatrol. Není to oficiální stupeň ohrožení ani předpověď. Stanovuje ho člověk, ne automat.</span>}>
          <span className="grid h-6 w-6 place-items-center rounded-full text-tlum2 hover:text-inkoust"><Ikona nazev="info" velikost={14} /></span>
        </Napoveda>
      </div>
      {d ? (
        <Napoveda popis={<VykladUrovne uroven={stav.uroven!} />}>
          <span className={`inline-flex items-center gap-2 text-[22px] font-bold ${t!.text}`}>
            <span aria-hidden className={`h-3 w-3 rounded-[3px] ${t!.tecka}`} />
            {d.nazev}
          </span>
        </Napoveda>
      ) : (
        <p className="text-[18px] font-bold text-tlum">Zatím nestanoveno</p>
      )}
      {d && <p className="mt-2 text-[14px] leading-relaxed text-tlum">{d.znamena}</p>}
      {d && d.neznamena !== "—" && <p className="mt-1.5 text-[13.5px] leading-relaxed text-tlum2">{d.neznamena}</p>}
      <p className="mt-3 text-[12.5px] text-tlum2">
        {stav.aktualizovano ? `Stanoveno ${datumCasPraha(stav.aktualizovano)}` : "Datum stanovení chybí"} · <Link href="/metodika/" className="odkaz">metodika</Link>
      </p>
    </section>
  );
}
