"use client";

import Link from "next/link";
import { datumPraha } from "@/lib/cas";
import { kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Kandidat } from "@/lib/typy";
import { Ikona } from "./ikony";
import { PanelNahledu, useNahled, type Nahled } from "./nahled-radku";

/*
  Aktuality vedle úvodu.

  Proč vznikly: na titulce nebylo poznat, že projekt vůbec žije. Ověřené
  záznamy přibývají po dnech, protože každý musí projít člověkem — a mezi
  nimi web vypadal jako zamrzlý, i když sběr každou hodinu něco zachytil.

  Sloupec proto ukazuje obojí, a to v tomhle pořadí:
    1. ověřené záznamy — to je to, za čím si projekt stojí,
    2. zachycené a neověřené — důkaz, že se čte, ne tvrzení, že se to stalo.

  Obojího stejně. Zachycené zprávy jsou skoro vždycky čerstvější (ověřený
  záznam čeká na člověka), takže když jich bylo míň, chyběla na titulce
  právě ta část, kvůli které se sem člověk dívá. Aby se obojí vešlo do výšky
  daného úvodem, má řádek jen jednu řádku: datum a titulek vedle sebe.

  Hranice mezi nimi je to jediné, co tenhle sloupec nesmí rozmazat. Neověřené
  má vlastní nadpis, vlastní vysvětlení a odkazuje ven na zdroj, ne dovnitř
  na záznam, který neexistuje.
*/

const NAZVY_NALEHAVOSTI: Record<string, string> = {
  "mobilizace-rusko": "mobilizace v Rusku",
  "priprava-mobilizace": "přípravy mobilizace",
  "krizove-vysilani": "krizové vysílání",
  "clanek-nato": "článek 4/5 NATO",
  "pravni-stav-cr": "právní stav ČR",
  "hranice-cr": "hranice ČR",
  "vzdusny-prostor-nato": "vzdušný prostor Aliance",
};

/*
  Šest a šest je změřené, ne odhadnuté.

  Sloupec je v širokém rozvržení natažený přes výšku úvodu, takže počet
  položek je daný tím, co se do ní vejde: dvanáct jednořádkových přesně,
  třináctá by se ořízla. Kdyby úvod kvůli jinému obsahu zkrátil, ubere se
  zdola — tedy nejstarší zachycená zpráva, což je ta nejméně podstatná.
  Celý seznam je stejně jen ochutnávka; úplný je v Událostech.
*/
/*
  Náhled zachycené zprávy.

  Datum se popisuje slovem. U zachycené zprávy totiž není datum události —
  je to datum článku, a když to zdroj neuvádí, je to datum, kdy si toho sběr
  všiml. Holé datum u řádku se přitom čte jako „tehdy se to stalo". Proto
  je v náhledu napsané, o které z nich jde.
*/
function nahledKandidata(k: Kandidat): Nahled {
  const radky = [
    k.publikovano ? `zdroj vyšel ${datumPraha(k.publikovano)}` : `zachyceno ${datumPraha(k.zachyceno)}, datum zdroje neuvedeno`,
    k.zeme ?? "země neurčena",
    k.zdroj.nazev,
  ];
  if (k.naliehave) radky.push(NAZVY_NALEHAVOSTI[k.naliehave.druh] ?? k.naliehave.druh);
  return {
    titulek: k.titulek,
    radky,
    poznamka: "Zachyceno sběrem, nikdo to zatím neověřil. Klepnutím se otevře původní zdroj.",
  };
}

export function Aktuality({
  zaznamy,
  kandidati,
  overenych = 6,
  zachycenych = 6,
}: {
  zaznamy: Zaznam[];
  kandidati: Kandidat[];
  overenych?: number;
  zachycenych?: number;
}) {
  const posledni = [...zaznamy]
    .sort((a, b) => kdyZjisteno(b).localeCompare(kdyZjisteno(a)))
    .slice(0, overenych);

  const zachycene = [...kandidati]
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, zachycenych);

  const { nahled, kde, ukaz, skryj, pohyb } = useNahled();

  return (
    <aside
      aria-labelledby="aktuality-nadpis"
      className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-linka2 bg-plocha xl:absolute xl:inset-0"
      onPointerLeave={skryj}
    >
      {/*
        Hlavička stejná jako v úvodu vedle: červená tečka a štítek. Barva je
        značka, ne plocha — jedna tečka do 8 px, nic víc (docs/ZNACKA.md).
      */}
      <div className="flex items-center gap-2 border-b border-linka2 px-4 py-3">
        <span aria-hidden className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-akcent/50">
          <span className="h-[6px] w-[6px] rounded-full bg-akcent" />
        </span>
        <h2 id="aktuality-nadpis" className="stitek">Aktuality</h2>
      </div>

      {/*
        Pojistka pro dny, kdy je zachyceného víc: zkrátí se seznam, ne patička.
        Bez min-h-0 by flexbox oblast nezmenšil a odkaz na všechny události by
        vypadl ze zaobleného rámu pryč.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ul className="divide-y divide-linka2">
        {posledni.map((z) => {
          const t = PASMA[UROVNE[z.zavaznost].pasmo];
          return (
            <li
              key={z.slug}
              onPointerEnter={(e) => ukaz({
                titulek: z.titulek,
                radky: [datumPraha(kdyZjisteno(z)), z.zeme, `závažnost ${UROVNE[z.zavaznost].nazev.toLowerCase()}`],
                poznamka: "Ověřený záznam. Klepnutím se otevře i se zdroji.",
              }, e)}
              onPointerMove={pohyb}
            >
              <Link
                href={`/udalosti/?u=${z.slug}`}
                className="flex items-baseline gap-2.5 px-4 py-2 hover:bg-plocha2"
                onFocus={(e) => ukaz({
                  titulek: z.titulek,
                  radky: [datumPraha(kdyZjisteno(z)), z.zeme, `závažnost ${UROVNE[z.zavaznost].nazev.toLowerCase()}`],
                  poznamka: "Ověřený záznam. Klepnutím se otevře i se zdroji.",
                }, e.currentTarget.getBoundingClientRect() as unknown as { clientX: number; clientY: number })}
              >
                <span aria-hidden className={`h-[6px] w-[6px] shrink-0 translate-y-[-1px] rounded-full ${t.tecka}`} />
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="cislice w-[74px] shrink-0 text-mikro text-tlum2">{datumPraha(kdyZjisteno(z))}</span>
                  <span className="truncate text-male leading-snug text-inkoust">{z.kratkyTitulek || z.titulek}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {zachycene.length > 0 && (
        <>
          {/*
            Předěl: černá plocha, bílý nadpis, červená ikona. Bez pruhu u kraje —
            vypadal jako výstraha, a tohle výstraha není.

            Nadpis je bílý místo tlumeného schválně: tohle je předěl, ne popisek.
            Odtud dolů přestává platit, že si za tím projekt stojí.
          */}
          <div className="border-y border-linka2 bg-plocha2/60 px-4 py-2">
            <div className="stitek flex items-center gap-1.5 text-inkoust">
              <Ikona nazev="otaznik" velikost={12} tah={2} trida="text-akcent" />
              Zachyceno, neověřeno
            </div>
            {/*
              Tahle věta tu musí být. Bez ní čte člověk seznam pod ověřenými
              záznamy jako jejich pokračování — a to by z neověřené zprávy
              udělalo tvrzení projektu.
            */}
            <p className="mt-1 text-mikro leading-snug text-tlum2">
              Přečetl to sběr, nikdo to zatím neověřil. Do počtů ani do hodnocení nevstupuje.
            </p>
          </div>
          <ul className="divide-y divide-linka2">
            {zachycene.map((k) => (
              <li key={k.id} onPointerEnter={(e) => ukaz(nahledKandidata(k), e)} onPointerMove={pohyb}>
                <a
                  href={k.zdroj.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-baseline gap-2.5 px-4 py-2 hover:bg-plocha2"
                  onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); ukaz(nahledKandidata(k), { clientX: r.right, clientY: r.top }); }}
                >
                  <span aria-hidden className="h-[6px] w-[6px] shrink-0 translate-y-[-1px] rounded-full border border-linka" />
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    {/*
                      Pevná šířka, aby titulky lícovaly. „Bez data" je kratší
                      než datum a bez ní začínaly řádky v různých místech.
                    */}
                    <span className="cislice w-[74px] shrink-0 text-mikro text-tlum2">
                      {/*
                        Když zdroj datum neuvádí, nepíše se datum zachycení.
                        Vypadalo by to jako dnešní zpráva — a 20. 9. 2026 se
                        takhle tvářilo hlášení estonské policie z roku 2024.
                      */}
                      {k.publikovano ? datumPraha(k.publikovano) : "bez data"}
                      {/*
                        Zdroj se sem nevešel a nechybí: odkaz vede přímo na něj.
                        Naléhavost ano — ta mění, jestli to má člověk číst teď.
                      */}
                      {k.naliehave && ` · ${NAZVY_NALEHAVOSTI[k.naliehave.druh] ?? k.naliehave.druh}`}
                    </span>
                    <span className="truncate text-male leading-snug text-tlum">{k.titulek}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      </div>

      <PanelNahledu nahled={nahled} kde={kde} />

      <div className="mt-auto border-t border-linka2 px-4 py-2.5">
        <Link href="/udalosti/" className="stitek text-tlum2 transition-colors hover:text-inkoust">
          Všechny události →
        </Link>
      </div>
    </aside>
  );
}
