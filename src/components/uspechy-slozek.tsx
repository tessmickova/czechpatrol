"use client";

import { useState } from "react";
import { datumPraha } from "@/lib/cas";
import { SLOZKY, type Slozka, type Uspech } from "@/lib/uspechy";
import { HlavickaWidgetu } from "./widgety";
import { Vlajka } from "./zeme";

/*
  Úspěchy složek — přepínání podle typu složky (26. 9. 2026).

  Protiváha k výčtu hrozeb: co policie, služby, armáda nebo vlády odvrátily
  a dotáhly. Jen z ověřených záznamů (src/lib/uspechy.ts), každá položka
  vede na záznam se zdroji. Konečný výčet: tři na kartu, nic se nedočítá.
*/

const NA_KARTU = 3;

export function UspechySlozek({ uspechy }: { uspechy: Uspech[] }) {
  const typy = SLOZKY.filter((s) => uspechy.some((u) => u.slozka === s.klic));
  const [vybrano, setVybrano] = useState<Slozka | "vse">("vse");
  if (!uspechy.length) return null;
  const vyber = vybrano === "vse" ? uspechy : uspechy.filter((u) => u.slozka === vybrano);
  const popis = vybrano === "vse" ? "Nejnovější ze všech složek." : SLOZKY.find((s) => s.klic === vybrano)!.popis;

  return (
    <section aria-labelledby="uspechy-nadpis" className="overflow-hidden rounded-[22px] bg-plocha">
      <HlavickaWidgetu
        ikona="stit"
        id="uspechy-nadpis"
        nazev="Úspěchy složek"
        ton="klid"
        meta={<span className="cislice">{uspechy.length} za půl roku</span>}
        napoveda={<span className="block">Co bezpečnostní složky v Evropě odvrátily, odhalily nebo dotáhly k soudu — v našich tématech (sabotáže, špionáž, drony, kyber). Jen z ověřených záznamů; každý vede na zdroje.</span>}
      />
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
        <p className="mb-2 text-mikro text-tlum2">{popis}</p>
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
