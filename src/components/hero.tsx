import Link from "next/link";
import type { ReactNode } from "react";
import { datum, datumCas } from "@/lib/format";
import type { SUkazkou } from "@/lib/data";
import { PASMA, tokeny, UROVNE } from "@/lib/skala";
import type { CelkovyStav, HybridniTlak, Incident, Uroven } from "@/lib/typy";
import { Ikona, type NazevIkony } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { Rozbalovac } from "./rozbalovac";
import { Napoveda, VykladUrovne } from "./zaklad";
import { Vlajka } from "./zeme";

const TRENDY = {
  nahoru: { ikona: "nahoru" as NazevIkony, text: "zhoršení za 7 dní", tridy: "text-[#ffa877]" },
  dolu: { ikona: "dolu" as NazevIkony, text: "uklidnění za 7 dní", tridy: "text-[#8ff0c0]" },
  "beze-zmeny": { ikona: "fajfka" as NazevIkony, text: "beze změny 7 dní", tridy: "text-noc-tlum" },
} as const;

/**
 * Hero: celková úroveň, tři dílčí měřáky (Česko, NATO a Evropa, dopad na
 * občany), poslední záznamy a dvě tlačítka. Důvod zhoršení a spouštěče
 * eskalace jsou rozbalovací — čtou se, když je někdo chce, ne pořád.
 */
export function SituacniPanel({
  stav, hybridni, tlakCr, obcane, posledni, overeno = null, pocetZaznamu, watchlist,
}: {
  stav: CelkovyStav;
  hybridni: HybridniTlak;
  tlakCr: HybridniTlak;
  obcane: { uroven: Uroven; popis: string; neovereno: number };
  posledni: SUkazkou<Incident>[];
  overeno?: string | null;
  pocetZaznamu: number;
  watchlist: ReactNode;
}) {
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const t = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;
  const trend = stav.trend ? TRENDY[stav.trend] : null;
  const s = stav.noveSignaly;
  const zhorseni = stav.trend === "nahoru";

  return (
    <section className="noc relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div data-vrstva="0.05" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[45%]" />
        <div data-vrstva="0.12" className="vrstva vzor-zare absolute inset-x-0 -inset-y-[60%]" />
      </div>

      <div className="mx-auto max-w-[1320px] px-4 pt-4 sm:px-6">
        <div className="sklo sklo-akcent sken relative overflow-hidden rounded-[22px] px-5 py-5 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
            {/* levá: celková úroveň + tři měřáky */}
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <Napoveda popis={stav.uroven ? <VykladUrovne uroven={stav.uroven} /> : <span className="block">Hodnocení zatím nebylo stanoveno.</span>}>
                  <span className="block"><ObloukovyMerak uroven={stav.uroven} naNoci velikost={150} skrytPopisek /></span>
                </Napoveda>
                <div className="min-w-0">
                  <div className="stitek mb-1.5 !text-noc-tlum">Celková úroveň</div>
                  <p className={`nadpis svit-silny text-[32px] sm:text-[40px] ${t ? t.textNoc : "text-noc-tlum"}`}>{d ? d.nazev : "Nestanoveno"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {trend && (
                      <span className={`flex items-center gap-1.5 text-[14px] font-semibold ${trend.tridy}`}>
                        <Ikona nazev={trend.ikona} velikost={14} tah={1.9} /> {trend.text}
                      </span>
                    )}
                    <span className="stitek !text-noc-tlum">{overeno ? `ověřeno ${datumCas(overeno)}` : "sběr zatím neproběhl"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Merak nadpis="Česko" popis="ze záznamů CZ" uroven={tlakCr.celkem} />
                <Merak nadpis="NATO a Evropa" popis="hybridní tlak" uroven={hybridni.celkem} />
                <Merak nadpis="Občané ČR" popis={obcane.uroven === "G1" ? "bez omezení" : "omezení platí"} uroven={obcane.uroven} vlastniNazev={obcane.uroven === "G1" ? "Bez omezení" : undefined} napoveda={`${obcane.popis}${obcane.neovereno ? ` · ${obcane.neovereno} položek zatím neověřeno` : ""}`} />
              </div>

              {stav.shrnuti && (
                <details className={`group rounded-[14px] border ${zhorseni ? "border-[#ff8a4c]/50 bg-[#ff8a4c]/10" : "border-akcent/40 bg-akcent/8"}`}>
                  <summary className={`flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] ${zhorseni ? "text-[#ffa877]" : "text-akcent"}`}>
                    <Ikona nazev={zhorseni ? "vystraha" : "info"} velikost={15} tah={2} />
                    {zhorseni ? "Proč se hodnocení zhoršilo" : "Aktuální signál"}
                    <Ikona nazev="dolu" velikost={13} tah={2.2} trida="ml-auto transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-3.5 pb-3.5 text-[14.5px] leading-relaxed text-noc-text">{stav.shrnuti}</p>
                </details>
              )}
            </div>

            {/* pravá: poslední záznamy + čísla + tlačítka */}
            <div className="flex flex-col gap-3">
              <div className="sklo-noc-slabe rounded-[14px] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="stitek !text-noc-tlum">Poslední záznamy</span>
                  <Link href="#udalosti" className="stitek !text-akcent hover:!text-akcent-svetla">všechny</Link>
                </div>
                <ol className="divide-y divide-white/8">
                  {posledni.map((i) => {
                    const tk = tokeny(i.zavaznost);
                    return (
                      <li key={i.id}>
                        <Link href={`/incident/${i.slug}/`} className="flex items-center gap-2.5 py-1.5 text-[13px] hover:text-akcent-svetla">
                          <span className="cislice w-[42px] shrink-0 text-[12px] text-noc-tlum">{datum(i.datumZjisteni ?? i.datumUdalosti).replace(/ \d{4}$/, "")}</span>
                          <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-[2px] ${tk.tecka}`} />
                          <Vlajka kod={i.kodZeme} />
                          <span className="min-w-0 flex-1 truncate font-semibold text-noc-text">{i.kratkyTitulek || i.titulek}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {[
                  { s: "nové signály", h: s.celkem },
                  { s: "vysoké", h: s.vysoke },
                  { s: "vážné", h: s.kriticke },
                  { s: "záznamů", h: pocetZaznamu },
                ].map((x) => (
                  <span key={x.s} className="flex items-baseline gap-1.5">
                    <span className="velke-cislo svit text-[24px] text-akcent-svetla">{x.h}</span>
                    <span className="stitek !text-noc-tlum">{x.s}</span>
                  </span>
                ))}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2">
                <Rozbalovac tlacitko="Co vyeskaluje situaci" ikona="terc" akcent>
                  {watchlist}
                </Rozbalovac>
                <Link href="#zeme" className="inline-flex items-center gap-1.5 rounded-full border border-akcent/60 bg-akcent/15 px-3.5 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.05em] text-akcent-svetla hover:bg-akcent/25">
                  <Ikona nazev="mapa" velikost={13} tah={2} /> Dopad po zemích
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Merak({
  nadpis, popis, uroven, vlastniNazev, napoveda,
}: { nadpis: string; popis: string; uroven: Uroven | null; vlastniNazev?: string; napoveda?: string }) {
  const t = uroven ? PASMA[UROVNE[uroven].pasmo] : null;
  const obsah = (
    <span className="sklo-noc-slabe flex flex-col items-center rounded-[14px] px-2 py-2.5 text-center">
      <span className="stitek !text-[9.5px] !text-noc-text">{nadpis}</span>
      <ObloukovyMerak uroven={uroven} naNoci velikost={104} skrytPopisek />
      <span className={`-mt-1 text-[12.5px] font-bold uppercase leading-tight tracking-[0.03em] ${t ? t.textNoc : "text-noc-tlum"}`}>
        {vlastniNazev ?? (uroven ? UROVNE[uroven].nazev : "bez záznamu")}
      </span>
      <span className="stitek mt-1 !text-[8.5px] !text-noc-tlum">{popis}</span>
    </span>
  );
  return napoveda ? <Napoveda popis={<span className="block">{napoveda}</span>}>{obsah}</Napoveda> : obsah;
}
