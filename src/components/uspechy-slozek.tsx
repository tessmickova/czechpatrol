"use client";

import { useState } from "react";
import { datumPraha } from "@/lib/cas";
import { KARTA, OBLASTI, SLOZKY, vOblasti, type Oblast, type Slozka, type Uspech } from "@/lib/uspechy";
import { HlavickaWidgetu } from "./widgety";
import { Vlajka } from "./zeme";

/*
  Zásahy složek — přepínání podle typu složky (26. 9. 2026).

  Protiváha k výčtu hrozeb: co policie, služby, armáda nebo vlády oznámily.
  Texty nehodnotí a nestraní (KARTA v src/lib/uspechy.ts, CLAUDE.md pravidlo 6). Jen z ověřených záznamů (src/lib/uspechy.ts), každá položka
  vede na záznam se zdroji. Konečný výčet: tři na kartu, nic se nedočítá.

  Filtr Česko / V4 / Evropa (26. 9. 2026): oblast se volí první, typy složek se
  pak nabízejí jen ty, které v ní něco mají — prázdná záložka by klamala.
*/

const NA_KARTU = 3;

export function UspechySlozek({ uspechy }: { uspechy: Uspech[] }) {
  const [oblast, setOblast] = useState<Oblast>("cr");
  const [volba, setVybrano] = useState<Slozka | "vse">("vse");
  if (!uspechy.length) return null;
  const vOblast = uspechy.filter((u) => vOblasti(u, oblast));
  const typy = SLOZKY.filter((s) => vOblast.some((u) => u.slozka === s.klic));
  // Typ, který ve zvolené oblasti nic nemá, se nedrží — jinak by karta zůstala prázdná.
  const vybrano = typy.some((t) => t.klic === volba) ? volba : "vse";
  const vyber = vybrano === "vse" ? vOblast : vOblast.filter((u) => u.slozka === vybrano);
  const popis = vybrano !== "vse" ? SLOZKY.find((s) => s.klic === vybrano)!.popis : { cr: "Nejnovější z Česka.", v4: "Slovensko, Polsko, Maďarsko.", evropa: "Ostatní evropské země.", vse: "Nejnovější ze všech zemí." }[oblast];
  const pocet = oblast === "cr" ? `${vOblast.length} z Česka` : oblast === "vse" ? `${vOblast.length} celkem` : `${vOblast.length} za půl roku`;

  return (
    <section aria-labelledby="uspechy-nadpis" className="overflow-hidden rounded-[22px] bg-plocha">
      <HlavickaWidgetu
        ikona="stit"
        id="uspechy-nadpis"
        nazev={KARTA.nazev}
        ton="klid"
        napoveda={<span className="block">{KARTA.napoveda}</span>}
      />
      {/* Vlastní řádek, ne v hlavičce: na mobilu by přepínač přetekl přes nadpis. */}
      <div role="radiogroup" aria-label="Oblast" className="mx-3 mb-2 grid grid-cols-4 rounded-full border border-linka p-0.5 lg:inline-grid">
        {OBLASTI.map((o) => (
          <button
            key={o.klic}
            type="button"
            role="radio"
            aria-checked={oblast === o.klic}
            onClick={() => setOblast(o.klic)}
            className={`min-h-[32px] rounded-full px-3 text-mikro font-semibold ${oblast === o.klic ? "bg-klid/15 text-inkoust" : "text-tlum hover:text-inkoust"}`}
          >
            {o.nazev}
          </button>
        ))}
      </div>
      <div role="tablist" aria-label="Typ složky" className="flex gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
        {[{ klic: "vse" as const, nazev: "Vše" }, ...typy].map((t) => (
          <button
            key={t.klic}
            type="button"
            role="tab"
            aria-selected={vybrano === t.klic}
            onClick={() => setVybrano(t.klic)}
            className={`min-h-[34px] shrink-0 whitespace-nowrap rounded-full border px-3 text-mikro font-semibold ${vybrano === t.klic ? "border-klid/60 bg-klid/10 text-inkoust" : "border-linka text-tlum hover:border-klid/50"}`}
          >
            {t.nazev}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="px-4 pb-3">
        <div className="mb-2 flex justify-between gap-3 text-mikro text-tlum2"><span>{popis}</span><span className="shrink-0">{pocet}</span></div>
        {!vOblast.length && <p className="text-male text-tlum">{KARTA.prazdno}</p>}
        <ul className="space-y-2.5">
          {vyber.slice(0, NA_KARTU).map((u, i) => (
            /* Mobil: dvě položky na kartu, fakt na jeden řádek — karta byla přes 500 px. */
            <li key={u.slug} className={i >= 2 ? "max-lg:hidden" : ""}>
              <a href={`/incident/${u.slug}/`} className="group block">
                <span className="flex items-center gap-1.5 text-mikro text-tlum2"><Vlajka kod={u.kodZeme} /> {datumPraha(u.datum)} · {u.zeme}</span>
                <span className="mt-0.5 block text-male font-semibold leading-snug text-inkoust group-hover:underline">{u.titulek}</span>
                {u.coSeStalo && <span className="mt-0.5 line-clamp-1 text-mikro leading-snug text-tlum lg:line-clamp-2">{u.coSeStalo}</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
