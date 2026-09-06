import Link from "next/link";
import { ATRIBUCE, KATEGORIE, STAVY } from "@/lib/kategorie";
import { datum } from "@/lib/format";
import { tokeny, UROVNE } from "@/lib/skala";
import type { Incident } from "@/lib/typy";
import type { SUkazkou } from "@/lib/data";
import { Ikona } from "./ikony";
import { OdznakUkazky } from "./pruhy";
import { SeznamZdroju } from "./zdroje";
import { Napoveda, OdznakJistoty, OdznakTypu, VykladUrovne } from "./zaklad";

/** Údaj v metařádku. Klíč mono nahoře, hodnota pod ním. */
function Udaj({ stitek, hodnota, napoveda }: { stitek: string; hodnota: string; napoveda?: string }) {
  const telo = (
    <span className="block">
      <span className="stitek mb-1.5 block">{stitek}</span>
      <span className="block text-[13px] font-medium leading-tight">{hodnota}</span>
    </span>
  );
  return napoveda ? <Napoveda popis={<span className="block">{napoveda}</span>}>{telo}</Napoveda> : telo;
}

/**
 * Karta jedné události. Vypadá jako záznam v evidenci, ne jako článek:
 * nahoře strojová hlavička, pak titulek, pak metadata v jednom pásu.
 */
export function KartaUdalosti({
  incident, rozbalitelna = true, vychoziOtevrena = false,
}: { incident: SUkazkou<Incident>; rozbalitelna?: boolean; vychoziOtevrena?: boolean }) {
  const t = tokeny(incident.zavaznost);
  const d = UROVNE[incident.zavaznost];
  const teple = d.pasmo === "oranzova" || d.pasmo === "cervena" || d.pasmo === "prechod";

  return (
    <article
      className={`zdvih group relative overflow-hidden rounded-[20px] border ${t.ramecek} ${
        teple ? t.pozadi : "bg-plocha"
      }`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[4px] ${t.pruh}`} />

      {/* strojová hlavička */}
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b ${t.ramecek} px-5 py-2.5 pl-6`}>
        <span className="stitek-tmavy rounded-[10px] border border-current/25 px-1.5 py-1 opacity-80">
          {incident.kodZeme}
        </span>
        <span className="stitek">{incident.zeme}</span>
        <span aria-hidden className="h-3 w-px bg-current/15" />
        <span className="stitek">
          {incident.kategorie.map((k) => KATEGORIE[k].nazev).join(" · ")}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {incident.novy && (
            <span className="stitek-tmavy rounded-full bg-inkoust px-2 py-1 text-plocha">Nové</span>
          )}
          {incident.archivniZaznam && (
            <Napoveda
              vpravo
              popis={
                <span className="block">
                  Záznam z dřívějšího monitoringu. Odkaz na primární zdroj u něj zatím
                  není doplněný.
                </span>
              }
            >
              <span className="stitek-tmavy rounded-full border border-current/30 px-2 py-1 opacity-70">
                Archiv
              </span>
            </Napoveda>
          )}
          {incident.ukazka && <OdznakUkazky />}
          <Napoveda popis={<VykladUrovne uroven={incident.zavaznost} />} vpravo>
            <span
              className={`stitek-tmavy inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${t.ramecek} ${t.text}`}
            >
              <span aria-hidden className={`h-[6px] w-[6px] rounded-[2px] ${t.tecka}`} />
              {d.nazev}
            </span>
          </Napoveda>
        </span>
      </div>

      <div className="px-5 pb-5 pl-6 pt-5">
        <h3 className="podnadpis text-[19px] sm:text-[21px]">
          <Link href={`/incident/${incident.slug}/`} className="hover:underline hover:underline-offset-4">
            {incident.titulek}
          </Link>
        </h3>

        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
          <Udaj stitek="Událost" hodnota={datum(incident.datumUdalosti)} />
          {incident.datumZjisteni ? (
            <Udaj
              stitek="Zjištěno"
              hodnota={datum(incident.datumZjisteni)}
              napoveda="Kdy věc vyšla najevo. Není to datum, kdy se stala."
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
      </div>

      <div className={`flex items-center justify-between gap-3 border-t ${t.ramecek} px-5 py-3 pl-6`}>
        <OdznakJistoty jistota={incident.jistota} />
        <span className="stitek">{incident.zdroje.length} zdroje</span>
      </div>

      {rozbalitelna && (
        <details open={vychoziOtevrena} className="group/d">
          <summary
            className={`flex items-center justify-between border-t ${t.ramecek} px-5 py-3.5 pl-6 text-[13px] font-medium transition-colors hover:bg-inkoust/[0.03]`}
          >
            <span>Fakta, zdroje a co nevíme</span>
            <Ikona nazev="dolu" velikost={14} tah={1.8} trida="transition-transform group-open/d:rotate-180" />
          </summary>
          <div className={`border-t ${t.ramecek} px-5 pb-6 pl-6 pt-5`}>
            <ObsahUdalosti incident={incident} />
          </div>
        </details>
      )}
    </article>
  );
}

/** Rozbalený obsah — používá se v kartě i na stránce detailu. */
export function ObsahUdalosti({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-7">
      <Blok typ="fakt" nadpis="Co víme">
        <ul className="space-y-2.5">
          {incident.fakta.map((f, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
              <span aria-hidden className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-inkoust" />
              {f}
            </li>
          ))}
        </ul>
      </Blok>

      <Blok typ="nepotvrzeno" nadpis="Co nevíme">
        <ul className="space-y-2.5">
          {incident.neznameho.map((f, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-tlum">
              <span aria-hidden className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-tlum2" />
              {f}
            </li>
          ))}
        </ul>
      </Blok>

      <Blok typ="odhad" nadpis="Proč to sledujeme">
        <p className="text-[14px] leading-relaxed text-tlum">{incident.vyznam}</p>
      </Blok>

      {incident.eskalacniSpousteče.length > 0 && (
        <Blok typ="scenar" nadpis="Co by hodnocení změnilo">
          <ul className="space-y-2.5">
            {incident.eskalacniSpousteče.map((f, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-tlum">
                <span className="mt-[2px] shrink-0 text-[#e8834a]">
                  <Ikona nazev="nahoru" velikost={13} tah={2} />
                </span>
                {f}
              </li>
            ))}
            {incident.deeskalacniSignaly.map((f, i) => (
              <li key={`d${i}`} className="flex gap-3 text-[14px] leading-relaxed text-tlum">
                <span className="mt-[2px] shrink-0 text-[#4fbe86]">
                  <Ikona nazev="dolu" velikost={13} tah={2} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </Blok>
      )}

      <div>
        <div className="stitek mb-3">Zdroje</div>
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
      <div className="mb-3 flex items-center gap-2.5">
        <OdznakTypu typ={typ} />
        <span className="stitek">{nadpis}</span>
      </div>
      {children}
    </div>
  );
}
