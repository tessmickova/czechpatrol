import Link from "next/link";
import { datumCas } from "@/lib/format";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav, HybridniTlak } from "@/lib/typy";
import { Ikona, type NazevIkony } from "./ikony";
import { ObloukovyMerak, RadarTlaku } from "./mericky";
import { Napoveda, VykladUrovne } from "./zaklad";

const TRENDY = {
  nahoru: { ikona: "nahoru" as NazevIkony, text: "zhoršení za 7 dní", tridy: "text-[#ffa877]" },
  dolu: { ikona: "dolu" as NazevIkony, text: "uklidnění za 7 dní", tridy: "text-[#8ff0c0]" },
  "beze-zmeny": { ikona: "fajfka" as NazevIkony, text: "beze změny 7 dní", tridy: "text-noc-tlum" },
} as const;

/**
 * Hero jako přístrojová deska: úroveň, trend, aktuální signál, čísla
 * a dva radary — Evropa a ČR zvlášť. Nic tu není dvakrát: co platí
 * a neplatí, je v liště nahoře.
 */
export function SituacniPanel({
  stav, hybridni, tlakCr, dnyBezZmeny = null, overeno = null, pocetZaznamu,
}: {
  stav: CelkovyStav;
  hybridni: HybridniTlak;
  tlakCr: HybridniTlak;
  dnyBezZmeny?: { dnu: number; odZacatkuArchivu: boolean } | null;
  overeno?: string | null;
  pocetZaznamu: number;
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
        <div className="sklo sklo-akcent sken relative grid gap-5 overflow-hidden rounded-[22px] px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
          {/* levá polovina: úroveň + signál + čísla */}
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              <Napoveda popis={stav.uroven ? <VykladUrovne uroven={stav.uroven} /> : <span className="block">Hodnocení zatím nebylo stanoveno.</span>}>
                <span className="block"><ObloukovyMerak uroven={stav.uroven} naNoci velikost={150} skrytPopisek /></span>
              </Napoveda>
              <div className="min-w-0">
                <div className="stitek mb-1.5 !text-noc-tlum">Celková úroveň · Evropa a ČR</div>
                <p className={`nadpis svit-silny text-[32px] sm:text-[40px] ${t ? t.textNoc : "text-noc-tlum"}`}>
                  {d ? d.nazev : "Nestanoveno"}
                </p>
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

            {stav.shrnuti && (
              <div className={`flex gap-3 rounded-[14px] border p-3.5 ${zhorseni ? "border-[#ff8a4c]/50 bg-[#ff8a4c]/10" : "border-akcent/40 bg-akcent/8"}`}>
                <span className={`mt-[1px] shrink-0 ${zhorseni ? "text-[#ffa877]" : "text-akcent"}`}>
                  <Ikona nazev={zhorseni ? "vystraha" : "info"} velikost={18} tah={1.9} />
                </span>
                <div>
                  <div className={`stitek mb-1 ${zhorseni ? "!text-[#ffa877]" : "!text-akcent"}`}>{zhorseni ? "Proč se hodnocení zhoršilo" : "Aktuální signál"}</div>
                  <p className="text-[14.5px] leading-relaxed text-noc-text">{stav.shrnuti}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                { s: "nové signály", h: s.celkem },
                { s: "vysoké", h: s.vysoke },
                { s: "vážné", h: s.kriticke },
                { s: "záznamů celkem", h: pocetZaznamu },
              ].map((x) => (
                <span key={x.s} className="flex items-baseline gap-1.5">
                  <span className="velke-cislo svit text-[26px] text-akcent-svetla">{x.h}</span>
                  <span className="stitek !text-noc-tlum">{x.s}</span>
                </span>
              ))}
              {dnyBezZmeny && (
                <span className="stitek-tmavy inline-flex items-center gap-1.5 rounded-full border border-[#4fdd9a]/35 bg-[#4fdd9a]/10 px-2.5 py-1 text-[#8ff0c0]">
                  <Ikona nazev="hodiny" velikost={11} tah={1.7} />
                  {dnyBezZmeny.odZacatkuArchivu ? "právo ČR beze změny celý archiv" : `právo ČR beze změny ${dnyBezZmeny.dnu} dní`}
                </span>
              )}
            </div>
          </div>

          {/* pravá polovina: dva radary */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Radar nadpis="Evropa" popis="hybridní tlak podle hodnocení" tlak={hybridni} />
            <Radar nadpis="Česko" popis="jen ze záznamů s kódem CZ" tlak={tlakCr} />
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
              <span className="stitek !text-noc-tlum">
                {(() => {
                  const primy = hybridni.podkategorie.find((p) => p.klic === "primy");
                  return primy?.uroven ? `přímé vojenské riziko: ${UROVNE[primy.uroven].nazev.toLowerCase()}` : "přímé vojenské riziko: nevyhodnoceno";
                })()}
              </span>
              <Link href="#zeme" className="inline-flex items-center gap-1.5 rounded-full border border-akcent/60 bg-akcent/15 px-3.5 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.05em] text-akcent-svetla hover:bg-akcent/25">
                <Ikona nazev="mapa" velikost={13} tah={2} /> Dopad po zemích
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Radar({ nadpis, popis, tlak }: { nadpis: string; popis: string; tlak: HybridniTlak }) {
  const t = tlak.celkem ? PASMA[UROVNE[tlak.celkem].pasmo] : null;
  return (
    <div className="sklo-noc-slabe rounded-[14px] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-bold uppercase tracking-[0.04em] text-noc-text">{nadpis}</span>
        <span className={`stitek-tmavy ${t ? t.textNoc : "text-noc-tlum"}`}>{tlak.celkem ? UROVNE[tlak.celkem].nazev : "bez záznamu"}</span>
      </div>
      <div className="stitek mb-1 !text-noc-tlum">{popis}</div>
      <div className="mx-auto max-w-[230px]">
        <RadarTlaku tlak={tlak} velikost={240} okraj={62} />
      </div>
    </div>
  );
}
