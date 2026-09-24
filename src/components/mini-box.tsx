"use client";

import type { ReactNode } from "react";
import { Ikona, type NazevIkony } from "./ikony";
import { IkonaKruh, type TonWidgetu } from "./widgety";

/*
  Mini box: nadpis, jedna řádka souhrnu, na rozkliknutí celý obsah.
  Sdílený úvodem i postranním sloupcem ostatních stránek (24. 9. 2026).
*/
export function MiniBox({ nazev, ikona, souhrn, ton = "akcent", children }: { nazev: string; ikona: NazevIkony; souhrn: string; ton?: TonWidgetu; children: ReactNode }) {
  return (
    <details className={`group overflow-hidden rounded-[22px] border bg-plocha ${ton === "pozor" ? "border-dashed border-jantar/55 bg-jantar/[0.06]" : "border-transparent"}`}>
      <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-2.5 hover:bg-plocha2">
        <IkonaKruh ikona={ikona} ton={ton} velikost="s" />
        <span className="min-w-0 flex-1">
          <span className="nadpis-boxu block">{nazev}</span>
          <span className="mt-0.5 line-clamp-2 block text-male font-semibold leading-snug text-inkoust">{souhrn}</span>
        </span>
        <Ikona nazev="dolu" velikost={13} tah={2} trida="shrink-0 text-tlum2 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-0 pt-1">{children}</div>
    </details>
  );
}
