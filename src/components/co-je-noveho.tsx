"use client";

import Link from "next/link";
import { useState } from "react";
import { kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { datumPraha } from "@/lib/cas";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Kandidat } from "@/lib/typy";
import { PanelNahledu, type Nahled } from "./nahled-radku";
import { Tlacitko } from "./ui";

/*
  Co je nového — jeden seznam všeho, co přibylo.

  Dřív tu byly tři oddíly pod sebou: ověřené záznamy, pod nimi zachycené
  zprávy a mezi tím nadpisy s vysvětlením. Mělo to dvě vady. Sloupec končil
  zhruba v půlce výšky vedlejší mřížky stavů, takže vedle něj zůstávalo
  prázdné místo. A hlavně: čtenář se ptá „co je nového", ne „co je nového
  v které z našich kategorií" — dělení podle stupně ověření je naše vnitřní
  starost.

  Teď je to jeden chronologický seznam a stupeň ověření nese tečka u data.
  Barva ale nikdy nenese význam sama (docs/ZNACKA.md), proto má každý
  neověřený řádek u sebe i slovo a nad seznamem stojí vysvětlivka.
*/

type Druh = "overeny" | "nepotvrzeny" | "zachyceny";

interface Radek {
  klic: string;
  kdy: string;
  druh: Druh;
  titulek: string;
  kam: string;
  /** Odkaz ven na zdroj, ne dovnitř na záznam. */
  ven: boolean;
  zavaznost?: Zaznam["zavaznost"];
  nahled: Nahled;
  stitek?: string;
}

const SLOVO: Record<Druh, string | null> = {
  overeny: null,
  nepotvrzeny: "nepotvrzeno",
  zachyceny: "zachyceno",
};

export function CoJeNoveho({
  zaznamy,
  nepotvrzene,
  kandidati,
  stitky,
  pocet = 22,
}: {
  zaznamy: Zaznam[];
  nepotvrzene: Zaznam[];
  kandidati: Kandidat[];
  /** Štítek u záznamu: nová událost, nebo posun ve vyšetřování starého případu. */
  stitky?: Map<string, string>;
  pocet?: number;
}) {
  const [nahled, setNahled] = useState<Nahled | null>(null);

  const zZaznamu = (z: Zaznam, druh: "overeny" | "nepotvrzeny"): Radek => ({
    klic: `${druh}-${z.id}`,
    kdy: kdyZjisteno(z),
    druh,
    titulek: z.kratkyTitulek || z.titulek,
    kam: druh === "overeny" ? `/incident/${z.slug}/` : "/udalosti/?tab=nepotvrzene",
    ven: false,
    zavaznost: z.zavaznost,
    stitek: stitky?.get(z.id),
    nahled: {
      titulek: z.titulek,
      radky: [datumPraha(kdyZjisteno(z)), z.zeme, `závažnost ${UROVNE[z.zavaznost].nazev.toLowerCase()}`, `${z.zdroje.length} ${z.zdroje.length === 1 ? "zdroj" : "zdrojů"}`],
      poznamka: druh === "overeny"
        ? (stitky?.get(z.id) ?? "Ověřený záznam. Počítá se do statistik.")
        : "Zpracováno, ale nikdo to zatím nepotvrdil. Do počtů nevstupuje.",
    },
  });

  const radky: Radek[] = [
    ...zaznamy.map((z) => zZaznamu(z, "overeny")),
    ...nepotvrzene.map((z) => zZaznamu(z, "nepotvrzeny")),
    ...kandidati.map((k) => ({
      klic: `zachyceny-${k.id}`,
      kdy: k.publikovano ?? k.zachyceno,
      druh: "zachyceny" as const,
      titulek: k.titulek,
      kam: k.zdroj.url,
      ven: true,
      nahled: {
        titulek: k.titulek,
        radky: [
          k.publikovano ? `zdroj vyšel ${datumPraha(k.publikovano)}` : `zachyceno ${datumPraha(k.zachyceno)}, datum zdroje neuvedeno`,
          k.zeme ?? "země neurčena",
          k.zdroj.nazev,
        ],
        poznamka: "Zachyceno sběrem, nikdo to zatím neověřil. Klepnutím se otevře původní zdroj.",
      },
    })),
  ]
    .sort((a, b) => b.kdy.localeCompare(a.kdy))
    .slice(0, pocet);

  return (
    <section
      aria-label="Co je nového"
      className="relative flex flex-col overflow-hidden rounded-[22px] border border-linka2 bg-plocha"
      onPointerLeave={() => setNahled(null)}
    >
      {/* Hlavička jako v úvodu: červená tečka a štítek. */}
      <div className="flex items-center justify-between gap-2 border-b border-linka2 px-4 py-2">
        <span className="flex items-center gap-2">
          <span aria-hidden className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-akcent/50">
            <span className="h-[6px] w-[6px] rounded-full bg-akcent" />
          </span>
          <span className="stitek">Co je nového</span>
        </span>
        <Tlacitko kam="/udalosti/" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">všechny</Tlacitko>
      </div>

      {/*
        Vysvětlivka teček. Bez ní by barva byla jediné, co rozlišuje ověřený
        záznam od zachycené zprávy — a to je přesně to, co se na tomhle webu
        dělat nesmí.
      */}
      <p className="border-b border-linka2 px-4 py-2 text-mikro leading-snug text-tlum2">
        Plná tečka = ověřený záznam, počítá se. Prázdná = nepotvrzeno nebo jen zachyceno sběrem, do počtů nevstupuje.
        Barva tečky je závažnost. U zachycených zpráv je uvedené datum vydání zdroje, ne datum události — to se určuje
        až při ověření.
      </p>

      <ol className="divide-y divide-linka2">
        {radky.map((r) => {
          const pasmo = r.zavaznost ? PASMA[UROVNE[r.zavaznost].pasmo] : null;
          const telo = (
            <>
              <span
                aria-hidden
                className={`h-[7px] w-[7px] shrink-0 translate-y-[-1px] rounded-full ${
                  r.druh === "overeny" && pasmo
                    ? pasmo.tecka
                    : pasmo
                      ? `border ${pasmo.pruh.replace("bg-", "border-")}`
                      : "border border-linka"
                }`}
              />
              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="cislice shrink-0 text-mikro text-tlum2">{datumPraha(r.kdy)}</span>
                {SLOVO[r.druh] && <span className="stitek shrink-0 text-tlum2">{SLOVO[r.druh]}</span>}
                <span className={`truncate text-male leading-snug ${r.druh === "overeny" ? "text-inkoust" : "text-tlum"}`}>
                  {r.titulek}
                </span>
              </span>
            </>
          );
          const trida = "flex items-baseline gap-2.5 px-4 py-2 hover:bg-plocha2";
          return (
            <li key={r.klic} onPointerEnter={() => setNahled(r.nahled)}>
              {r.ven ? (
                <a href={r.kam} target="_blank" rel="noopener noreferrer" className={trida} onFocus={() => setNahled(r.nahled)}>
                  {telo}
                </a>
              ) : (
                <Link href={r.kam} className={trida} onFocus={() => setNahled(r.nahled)}>
                  {telo}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <PanelNahledu nahled={nahled} />

      <div className="mt-auto border-t border-linka2 px-4 py-2">
        <Tlacitko kam="/udalosti/?overeni=potvrzeny-pachatel" varianta="tichy" velikost="s">
          jen posuny ve vyšetřování
        </Tlacitko>
      </div>
    </section>
  );
}
