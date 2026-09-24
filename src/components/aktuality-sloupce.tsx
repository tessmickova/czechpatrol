"use client";

import Link from "next/link";
import { useState } from "react";
import { datumPraha } from "@/lib/cas";
import { kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { jeCesky } from "@/lib/jazyk";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Kandidat } from "@/lib/typy";
import { Ikona } from "./ikony";
import { Tlacitko } from "./ui";
import { IkonaKruh } from "./widgety";
import { Vlajka } from "./zeme";

/*
  Aktuality ve dvou sloupcích bez rámečku (24. 9. 2026, podle zadání):
  vlevo ověřené, vpravo neověřené. Každý sloupec ukáže osm řádků a po
  kliknutí dalších osm. Řádek: pruh závažnosti, vlajka, datum, titulek,
  šipka. Sloupce jsou oddělené jen vzduchem a linkou.
*/
interface Radek { klic: string; kam: string; ven: boolean; kodZeme: string | null; kdy: string | null; titulek: string; stitek: "nepotvrzeno" | "zachyceno" | "neověřeno" | null; pruh: string }

const KROK = 8;

const bezZeme = (titulek: string, zeme: string | null) => {
  if (!zeme) return titulek;
  const z = `${zeme}:`;
  if (!titulek.toLowerCase().startsWith(z.toLowerCase())) return titulek;
  const zbytek = titulek.slice(z.length).trim();
  return zbytek ? zbytek.charAt(0).toUpperCase() + zbytek.slice(1) : titulek;
};

function Sloupec({ nadpis, ikona, ton, radky, prazdne, paticka }: { nadpis: string; ikona: "fajfka" | "otaznik"; ton: "klid" | "pozor"; radky: Radek[]; prazdne: string; paticka?: React.ReactNode }) {
  const [limit, setLimit] = useState(KROK);
  const videt = radky.slice(0, limit);
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 border-b border-linka pb-2">
        <span className="flex items-center gap-2"><IkonaKruh ikona={ikona} ton={ton} velikost="s" /><h3 className="stitek">{nadpis}</h3></span>
        <span className="cislice text-mikro text-tlum2">{radky.length}</span>
      </div>
      {videt.length ? (
        <ul className="divide-y divide-linka2">
          {videt.map((r) => {
            const telo = (
              <>
                <span aria-hidden className={`mt-[6px] h-[26px] w-[3px] shrink-0 rounded-full ${r.pruh}`} />
                <span className="w-[22px] shrink-0 pt-[3px] text-center leading-none">{r.kodZeme ? <Vlajka kod={r.kodZeme} /> : <span className="text-tlum2">·</span>}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-mikro text-tlum2">
                    <span className="cislice">{r.kdy ? datumPraha(r.kdy) : "bez data"}</span>
                    {r.stitek && <span className="uppercase tracking-[0.08em]">{r.stitek}</span>}
                  </span>
                  <span className={`mt-0.5 line-clamp-2 text-male leading-snug ${r.stitek ? "text-tlum" : "text-inkoust"}`}>{r.titulek}</span>
                </span>
                <Ikona nazev="nahoru" velikost={12} tah={2} trida="mt-2 shrink-0 rotate-90 text-tlum2 group-hover:text-akcent" />
              </>
            );
            const trida = "group flex items-start gap-2.5 py-2.5 hover:bg-plocha2/60 -mx-2 px-2 rounded-[10px]";
            return <li key={r.klic}>{r.ven ? <a href={r.kam} target="_blank" rel="nofollow noopener noreferrer" className={trida}>{telo}</a> : <Link href={r.kam} className={trida}>{telo}</Link>}</li>;
          })}
        </ul>
      ) : (
        <p className="py-3 text-male text-tlum2">{prazdne}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {radky.length > limit ? (
          <button type="button" onClick={() => setLimit((l) => l + KROK)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-linka px-3.5 text-drobne font-semibold text-inkoust hover:border-akcent">
            zobrazit dalších {Math.min(KROK, radky.length - limit)} <Ikona nazev="dolu" velikost={11} tah={2} />
          </button>
        ) : <span />}
        {paticka}
      </div>
    </div>
  );
}

export function AktualitySloupce({ zaznamy, nepotvrzene = [], kandidati = [] }: { zaznamy: Zaznam[]; nepotvrzene?: Zaznam[]; kandidati?: Kandidat[] }) {
  const serad = (a: { kdy: string | null }, b: { kdy: string | null }) => (b.kdy ?? "").localeCompare(a.kdy ?? "");
  const overene: Radek[] = zaznamy.filter((z) => z.overeni !== "neovereno").map((z) => ({ klic: `o-${z.slug}`, kam: `/incident/${z.slug}/`, ven: false, kodZeme: z.kodZeme, kdy: kdyZjisteno(z), titulek: bezZeme(z.kratkyTitulek || z.titulek, z.zeme), stitek: null, pruh: PASMA[UROVNE[z.zavaznost].pasmo].tecka })).sort(serad).slice(0, 40);
  const neoverene: Radek[] = [
    ...zaznamy.filter((z) => z.overeni === "neovereno").map((z): Radek => ({ klic: `u-${z.slug}`, kam: `/incident/${z.slug}/`, ven: false, kodZeme: z.kodZeme, kdy: kdyZjisteno(z), titulek: bezZeme(z.kratkyTitulek || z.titulek, z.zeme), stitek: "neověřeno", pruh: "bg-jantar" })),
    ...nepotvrzene.map((z): Radek => ({ klic: `n-${z.id}`, kam: `/nepotvrzeno/${z.id}/`, ven: false, kodZeme: z.kodZeme, kdy: kdyZjisteno(z), titulek: bezZeme(z.kratkyTitulek || z.titulek, z.zeme), stitek: "nepotvrzeno", pruh: "bg-jantar" })),
    ...kandidati.filter((k) => jeCesky(k.titulek)).map((k): Radek => ({ klic: `k-${k.id}`, kam: k.zdroj.url, ven: true, kodZeme: k.kodZeme, kdy: k.publikovano, titulek: k.titulek, stitek: "zachyceno", pruh: "bg-tlum2" })),
  ].sort(serad).slice(0, 40);
  const cizich = kandidati.filter((k) => !jeCesky(k.titulek)).length;
  return (
    <section aria-labelledby="aktuality-nadpis">
      <h2 id="aktuality-nadpis" className="sr-only">Aktuality</h2>
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <Sloupec nadpis="Ověřené" ikona="fajfka" ton="klid" radky={overene} prazdne="Zatím žádný ověřený záznam."
          paticka={<Tlacitko kam="/udalosti/" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">všechny záznamy od 2014</Tlacitko>} />
        <Sloupec nadpis="Neověřené" ikona="otaznik" ton="pozor" radky={neoverene} prazdne="Právě nic nečeká na ověření."
          paticka={cizich > 0 ? <Link href="/udalosti/?tab=cekajici" className="text-drobne text-tlum2 hover:text-tlum">+ {cizich} v cizím jazyce ve frontě →</Link> : <span className="text-drobne text-tlum2">Do počtů ani hodnocení nevstupují.</span>} />
      </div>
    </section>
  );
}
