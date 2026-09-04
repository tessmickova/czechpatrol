import Link from "next/link";
import { ATRIBUCE, KATEGORIE, STAVY } from "@/lib/kategorie";
import { datum } from "@/lib/format";
import { tokeny, UROVNE } from "@/lib/skala";
import type { Incident } from "@/lib/typy";
import type { SUkazkou } from "@/lib/data";
import { OdznakUkazky } from "./pruhy";
import { SeznamZdroju } from "./zdroje";
import { Napoveda, OdznakJistoty, OdznakTypu, Tecka, VykladUrovne } from "./zaklad";

/** Údaj v hlavičce karty: malý štítek nad hodnotou. */
function Udaj({ stitek, hodnota, napoveda }: { stitek: string; hodnota: string; napoveda?: string }) {
  const telo = (
    <span className="block">
      <span className="stitek mb-1.5 block">{stitek}</span>
      <span className="cislice block text-[12.5px] font-medium leading-tight">{hodnota}</span>
    </span>
  );
  return napoveda ? <Napoveda popis={<span className="block">{napoveda}</span>}>{telo}</Napoveda> : telo;
}

/**
 * Karta jedné události.
 *
 * Závažnost nesignalizuje jen barevný puntík — nese ji několik nenápadných
 * prvků současně: levý proužek, odstín rámečku, jemné tónování a odznak.
 * Celočervené karty se nepoužívají; červená má být vzácná, a proto výrazná.
 */
export function KartaUdalosti({
  incident, rozbalitelna = true, vychoziOtevrena = false,
}: { incident: SUkazkou<Incident>; rozbalitelna?: boolean; vychoziOtevrena?: boolean }) {
  const t = tokeny(incident.zavaznost);
  const d = UROVNE[incident.zavaznost];
  const zvyraznit = d.pasmo === "oranzova" || d.pasmo === "cervena";

  return (
    <article
      className={`relative overflow-hidden rounded-[7px] border ${t.ramecek} ${
        zvyraznit ? t.pozadi : "bg-plocha"
      }`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${t.pruh}`} />

      <div className="pl-[15px] pr-4 pt-4 sm:pl-5 sm:pr-5 sm:pt-5">
        <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <Napoveda popis={<VykladUrovne uroven={incident.zavaznost} />}>
            <span className={`stitek-tmavy inline-flex items-center gap-1.5 ${t.text}`}>
              <Tecka uroven={incident.zavaznost} />
              {d.nazev}
            </span>
          </Napoveda>
          <span aria-hidden className="h-3 w-px bg-linka" />
          <span className="stitek">
            {incident.zeme}
            {incident.kategorie[0] && ` · ${KATEGORIE[incident.kategorie[0]].nazev}`}
          </span>
          {incident.novy && (
            <span className="stitek-tmavy rounded border border-linka bg-linka2 px-1.5 py-[3px] text-tlum">
              Nové
            </span>
          )}
          {incident.ukazka && <OdznakUkazky />}
        </div>

        <h3 className="podnadpis text-[16.5px] sm:text-[18px]">
          <Link href={`/incident/${incident.slug}/`} className="hover:underline hover:underline-offset-4">
            {incident.titulek}
          </Link>
        </h3>

        <p className="mt-2.5 max-w-[46rem] text-[13.5px] leading-relaxed text-tlum">
          {incident.vyznam.split(". ").slice(0, 2).join(". ")}
          {incident.vyznam.split(". ").length > 2 ? "." : ""}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-linka2 pt-4 sm:grid-cols-4">
          <Udaj stitek="Datum události" hodnota={datum(incident.datumUdalosti)} />
          {incident.datumZjisteni ? (
            <Udaj
              stitek="Nové zjištění"
              hodnota={datum(incident.datumZjisteni)}
              napoveda="Datum, kdy věc vyšla najevo nebo kdy přišlo nové vyšetřovací zjištění. Není totožné s datem, kdy se událost stala."
            />
          ) : (
            <Udaj stitek="Zveřejněno" hodnota={datum(incident.aktualizovano)} />
          )}
          <Udaj stitek="Stav" hodnota={STAVY[incident.stav]} />
          <Udaj
            stitek="Atribuce"
            hodnota={ATRIBUCE[incident.atribuce].nazev}
            napoveda={ATRIBUCE[incident.atribuce].popis}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-linka2 pt-3.5">
          <OdznakJistoty jistota={incident.jistota} />
          <span className="stitek">
            {incident.zdroje.length} {incident.zdroje.length === 1 ? "zdroj" : incident.zdroje.length < 5 ? "zdroje" : "zdrojů"}
          </span>
        </div>
      </div>

      {rozbalitelna ? (
        <details open={vychoziOtevrena} className="group">
          <summary className="flex items-center justify-between border-t border-linka2 py-3 pl-[15px] pr-4 text-[12.5px] font-medium transition-colors hover:bg-linka2/40 sm:pl-5 sm:pr-5">
            <span>Proč je to důležité</span>
            <span aria-hidden className="text-tlum2 transition-transform group-open:rotate-180">
              ↓
            </span>
          </summary>
          <div className="border-t border-linka2 pb-5 pl-[15px] pr-4 pt-4 sm:pl-5 sm:pr-5">
            <ObsahUdalosti incident={incident} />
          </div>
        </details>
      ) : (
        <div className="h-4" />
      )}
    </article>
  );
}

/** Rozbalený obsah — používá se v kartě i na stránce detailu. */
export function ObsahUdalosti({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-6">
      <Blok typ="fakt" nadpis="Co víme">
        <ul className="space-y-2">
          {incident.fakta.map((f, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
              <span aria-hidden className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-inkoust" />
              {f}
            </li>
          ))}
        </ul>
      </Blok>

      <Blok typ="nepotvrzeno" nadpis="Co nevíme">
        <ul className="space-y-2">
          {incident.neznameho.map((f, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-tlum">
              <span aria-hidden className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-tlum2" />
              {f}
            </li>
          ))}
        </ul>
      </Blok>

      <Blok typ="odhad" nadpis="Proč to sledujeme">
        <p className="text-[13.5px] leading-relaxed text-tlum">{incident.vyznam}</p>
      </Blok>

      {incident.eskalacniSpousteče.length > 0 && (
        <Blok typ="scenar" nadpis="Co by změnilo hodnocení">
          <ul className="space-y-2">
            {incident.eskalacniSpousteče.map((f, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-tlum">
                <span aria-hidden className="mt-[2px] shrink-0 text-[#c25e18]">↑</span>
                {f}
              </li>
            ))}
            {incident.deeskalacniSignaly.map((f, i) => (
              <li key={`d${i}`} className="flex gap-2.5 text-[13.5px] leading-relaxed text-tlum">
                <span aria-hidden className="mt-[2px] shrink-0 text-[#3f8f5c]">↓</span>
                {f}
              </li>
            ))}
          </ul>
        </Blok>
      )}

      <div>
        <div className="stitek mb-3">Zdroje {incident.zdroje.length}</div>
        <SeznamZdroju zdroje={incident.zdroje} />
      </div>
    </div>
  );
}

function Blok({
  typ, nadpis, children,
}: { typ: "fakt" | "odhad" | "scenar" | "nepotvrzeno"; nadpis: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <OdznakTypu typ={typ} />
        <span className="stitek">{nadpis}</span>
      </div>
      {children}
    </div>
  );
}
