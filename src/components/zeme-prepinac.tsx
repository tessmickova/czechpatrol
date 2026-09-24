"use client";

import Link from "next/link";
import { useState } from "react";
import { datumPraha } from "@/lib/cas";
import { PASMA, UROVNE, zDeseti } from "@/lib/skala";
import type { Uroven } from "@/lib/typy";
import { Ikona } from "./ikony";
import { Tlacitko } from "./ui";
import { HlavickaWidgetu } from "./widgety";
import { sklon, Vlajka } from "./zeme";

/*
  Země na jedné stránce (24. 9. 2026, podle zadání): malé dlaždice zemí,
  klepnutím se přepne karta pod nimi — bez přechodu na novou stránku.
  Celá stránka země zůstává na odkaz v kartě.
*/
export interface ZemeRadek {
  kodZeme: string; zeme: string; pripady: number; opatreni: number; reakce: number;
  nejvyssi: Uroven | null; posledni: string | null; kategorie: string[];
  posledniZaznamy: { slug: string; titulek: string; kdy: string; zavaznost: Uroven }[];
}

export function ZemePrepinac({ radky }: { radky: ZemeRadek[] }) {
  const [kod, setKod] = useState(radky[0]?.kodZeme ?? "CZ");
  const z = radky.find((r) => r.kodZeme === kod) ?? radky[0];
  if (!z) return null;
  const t = z.nejvyssi ? PASMA[UROVNE[z.nejvyssi].pasmo] : null;
  return (
    <div>
      <ul className="flex flex-wrap gap-2" role="tablist" aria-label="Země">
        {radky.map((r) => {
          const p = r.nejvyssi ? PASMA[UROVNE[r.nejvyssi].pasmo] : null;
          const aktivni = r.kodZeme === kod;
          return (
            <li key={r.kodZeme}>
              <button type="button" role="tab" aria-selected={aktivni} onClick={() => setKod(r.kodZeme)}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-full border px-3 text-drobne font-semibold transition-colors ${aktivni ? "border-inkoust bg-plocha text-inkoust" : "border-linka2 bg-plocha/60 text-tlum hover:border-akcent hover:text-inkoust"}`}>
                <Vlajka kod={r.kodZeme} />
                <span>{r.zeme}</span>
                <span className="cislice text-mikro text-tlum2">{r.pripady}</span>
                {p && <span aria-hidden className={`h-[6px] w-[6px] rounded-full ${p.tecka}`} />}
              </button>
            </li>
          );
        })}
      </ul>

      <section key={z.kodZeme} className="pop mt-5 overflow-hidden rounded-[22px] bg-plocha" aria-live="polite">
        <HlavickaWidgetu ikona="globus" nazev={z.zeme} jako="h2" meta={z.posledni ? <span className="cislice">naposledy {datumPraha(z.posledni)}</span> : undefined}
          akce={<Tlacitko kam={`/zeme/${z.kodZeme.toLowerCase()}/`} varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">celá stránka</Tlacitko>} />
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
          {[["případy", z.pripady], ["opatření", z.opatreni], ["reakce", z.reakce]].map(([n, v]) => (
            <span key={n} className="rounded-[14px] bg-plocha2/60 px-3 py-2.5">
              <span className="cislice block text-cislo font-bold leading-none text-inkoust">{v}</span>
              <span className="mt-1 block text-mikro text-tlum2">{n} od roku 2014</span>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 text-drobne">
          {z.nejvyssi && t ? <span className={`flex items-center gap-1.5 font-semibold ${t.text}`}><span aria-hidden className={`h-[7px] w-[7px] rounded-full ${t.tecka}`} />nejvýš {UROVNE[z.nejvyssi].nazev.toLowerCase()} {zDeseti(z.nejvyssi)}/10</span> : <span className="text-tlum2">bez doloženého záznamu</span>}
          {z.kategorie.length > 0 && <span className="text-tlum2">{z.kategorie.join(" · ")}</span>}
        </div>
        {z.posledniZaznamy.length > 0 && (
          <ul className="mt-3 px-3 pb-3">
            {z.posledniZaznamy.map((r) => {
              const pr = PASMA[UROVNE[r.zavaznost].pasmo];
              return (
                <li key={r.slug}>
                  <Link href={`/incident/${r.slug}/`} className="group flex items-center gap-2.5 rounded-[10px] px-2 py-2 hover:bg-plocha2/60">
                    <span aria-hidden className={`h-[24px] w-[3px] shrink-0 rounded-full ${pr.tecka}`} />
                    <span className="min-w-0 flex-1">
                      <span className="cislice block text-mikro text-tlum2">{datumPraha(r.kdy)}</span>
                      <span className="line-clamp-2 block text-male leading-snug text-inkoust">{r.titulek}</span>
                    </span>
                    <Ikona nazev="nahoru" velikost={12} tah={2} trida="shrink-0 rotate-90 text-tlum2 group-hover:text-akcent" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
