"use client";

import { casPraha } from "@/lib/cas";
import { SLOVA_STAVU, SLUZBY, type StavSluzby } from "@/lib/sluzby";
import type { ZivyStav } from "@/lib/sluzby-klient";
import { Ikona } from "./ikony";
import { PanelNahledu, useNahled } from "./nahled-radku";

/* Odkazy ven: nofollow, web za cizí stránky neručí. */
const VEN = "nofollow noopener noreferrer";

/*
  Panel „Služby naživo".

  Stejná stavba jako Aktuality a Co se změnilo: hlavička s tečkou,
  řádky, patička. Řádek = tečka stavu, název, slovo stavu, a když
  provozovatel hlásí incident, jeho název na druhé řádce. Barva nese
  jen tečka; slovo je vždycky u ní (docs/ZNACKA.md).

  Sledovaná služba (má vazbu na položku v mřížce stavů) dostane při
  výpadku slovo „sledovaná" navíc a totéž se propíše k položce vedle —
  jako signál, ne jako změna úředního stavu. Stavová stránka provozovatele
  není úřad; úřední stav mění jen kontrola zdrojů, ne tohle.
*/

const TECKA: Record<StavSluzby, string> = {
  provoz: "bg-klid",
  omezeni: "bg-pozor",
  vypadek: "bg-akcent",
  nezjisteno: "border border-linka",
};

export function StavSluzeb({ stavy, kdy }: { stavy: ZivyStav[]; kdy: string | null }) {
  const { nahled, kde, ukaz, skryj, pohyb } = useNahled();
  const zive = stavy.some((s) => s.zive);
  const vypadky = stavy.filter((s) => s.stav === "vypadek" || s.stav === "omezeni").length;

  return (
    <section aria-label="Služby naživo" className="relative flex flex-col overflow-hidden rounded-[22px] border border-linka2 bg-plocha" onPointerLeave={skryj}>
      <div className="flex items-center justify-between gap-2 border-b border-linka2 px-4 py-3">
        <span className="flex items-center gap-2">
          <span aria-hidden className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-akcent/50">
            <span className="h-[6px] w-[6px] rounded-full bg-akcent" />
          </span>
          <h3 className="stitek">Služby naživo</h3>
        </span>
        {/* Co číslo znamená, říká slovo; červená tečka jen když je co hlásit. */}
        <span className="flex items-center gap-1.5 text-mikro text-tlum2">
          {vypadky > 0 && <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-akcent" />}
          {vypadky > 0 ? `${vypadky} ${vypadky === 1 ? "hlášení" : "hlášení"}` : "bez hlášení"}
          {kdy ? ` · ${zive ? "čteno" : "snímek"} ${casPraha(kdy)}` : ""}
        </span>
      </div>

      <ul className="divide-y divide-linka2">
        {SLUZBY.map((s) => {
          const st = stavy.find((x) => x.klic === s.klic);
          const stav: StavSluzby = st?.stav ?? "nezjisteno";
          const incident = st?.incidenty[0] ?? null;
          /* Slovo „sledovaná" jen u výpadku — stejné pravidlo jako signál k položce mřížky. */
          const sledovana = Boolean(s.tyka) && stav === "vypadek";
          const nahledSluzby = {
            titulek: `${s.nazev}: ${SLOVA_STAVU[stav]}${st?.popis ? ` — ${st.popis}` : ""}`,
            radky: [s.kategorie, st?.zkontrolovano ? `${st.zive ? "čteno naživo" : "snímek ze sběru"} ${casPraha(st.zkontrolovano)}` : "zatím nečteno"],
            udaje: [
              ...(incident ? [{ popisek: "Incident", hodnota: incident.nazev }] : []),
              ...(st?.postizene.length ? [{ popisek: "Postiženo", hodnota: st.postizene.join(", ") }] : []),
              ...(st?.chyba ? [{ popisek: "Čtení", hodnota: st.chyba }] : []),
            ],
            poznamka: `${s.proc} Klepnutím se otevře stavová stránka provozovatele.`,
          };
          return (
            <li key={s.klic} onPointerEnter={(e) => ukaz(nahledSluzby, e)} onPointerMove={pohyb}>
              <a
                href={incident?.odkaz ?? s.odkaz}
                target="_blank"
                rel={VEN}
                className="flex items-start gap-2.5 px-4 py-2 hover:bg-plocha2"
                onFocus={(e) => { const b = e.currentTarget.getBoundingClientRect(); ukaz(nahledSluzby, { clientX: b.right, clientY: b.top }); }}
              >
                <span aria-hidden className={`mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full ${TECKA[stav]}`} />
                <span className="flex min-w-0 flex-1 items-start gap-2">
                  <span className="w-[96px] shrink-0 text-male font-semibold leading-[20px] text-inkoust">{s.nazev}</span>
                  <span className="line-clamp-2 text-male leading-[20px] text-tlum">
                    <span className={`stitek mr-1.5 ${stav === "vypadek" ? "text-inkoust" : "text-tlum2"}`}>{SLOVA_STAVU[stav]}</span>
                    {sledovana && <span className="stitek mr-1.5 text-akcent">sledovaná</span>}
                    {incident ? incident.nazev : st?.chyba && stav === "nezjisteno" ? "stavovou stránku se nepodařilo přečíst" : s.kategorie}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <PanelNahledu nahled={nahled} kde={kde} />

      {/*
        Co tu není, se řekne. České sítě, banky a distributoři veřejné
        stavové rozhraní nemají; jejich úřední stav je v mřížce vedle,
        hlášení lidí na downdetector.cz. Bez téhle věty by tři cizí služby
        vypadaly jako celý obraz.
      */}
      {/*
        Downdetector jako vlastní řádek, ne jen tlačítko v patičce: pro
        české sítě a banky je to jediný rychlý obraz, který existuje.
        Zůstává ale mimo seznam stavů — hlášení uživatelů nikdo neověřuje.
      */}
      <a href="https://downdetector.cz/" target="_blank" rel={VEN} className="flex items-start gap-2.5 border-t border-linka2 px-4 py-2.5 hover:bg-plocha2">
        <span className="mt-[1px] grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border border-linka2 text-tlum"><Ikona nazev="graf" velikost={14} tah={1.8} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-male font-semibold leading-[20px] text-inkoust">Downdetector</span>
          <span className="block text-mikro leading-snug text-tlum2">Hlášení uživatelů o výpadcích služeb a sítí. Není úřední zdroj.</span>
        </span>
        <Ikona nazev="nahoru" velikost={13} tah={2} trida="mt-1 shrink-0 rotate-45 text-tlum2" />
      </a>
      <div className="mt-auto border-t border-linka2 px-4 py-2">
        <span className="text-mikro leading-snug text-tlum2">Stavové stránky provozovatelů. České sítě a banky je nemají.</span>
      </div>
    </section>
  );
}
