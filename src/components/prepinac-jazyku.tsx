"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikona } from "./ikony";
import { JAZYKY } from "@/lib/jazyky";

/*
  Přepínač jazyků v hlavičce.

  Patnáct jazyků se do lišty nevejde, proto rozbalovací seznam. Stojí na
  <details>, ne na vlastním stavu: zavírá se klávesou Esc i kliknutím vedle
  bez jediného řádku javascriptu navíc, a hlavně funguje i dřív, než se
  stránka oživí.

  Čeština je v seznamu první a označená jako závazné znění — cizojazyčné
  stránky jsou rozcestník k němu, ne rovnocenná větev webu.
*/
export function PrepinacJazyku({ trida = "" }: { trida?: string }) {
  const cesta = usePathname();
  const kod = JAZYKY.find((j) => cesta.startsWith(`/${j.kod}/`))?.kod ?? null;
  const aktivni = JAZYKY.find((j) => j.kod === kod);

  return (
    <details className={`relative ${trida}`}>
      <summary
        className="flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-tlum transition-colors hover:bg-[rgb(255_255_255/0.08)] hover:text-inkoust"
        style={{ fontFamily: "var(--font-mono)" }}
        aria-label="Jazyk / Language"
      >
        <Ikona nazev="mapa" velikost={16} tah={1.8} />
        <span>{aktivni ? aktivni.kod.toUpperCase() : "CS"}</span>
        <Ikona nazev="dolu" velikost={11} tah={2} />
      </summary>

      <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[230px] overflow-y-auto rounded-[18px] border border-linka2 bg-plocha p-2 shadow-lg">
        <Link
          href="/"
          hrefLang="cs"
          className={`block rounded-[12px] px-3 py-2 text-[13.5px] transition-colors hover:bg-plocha2 ${
            kod === null ? "font-semibold text-inkoust" : "text-tlum"
          }`}
        >
          Čeština
          <span className="block text-[11.5px] text-tlum2">závazné znění</span>
        </Link>
        <div className="my-1 border-t border-linka2" />
        {JAZYKY.map((j) => (
          <Link
            key={j.kod}
            href={`/${j.kod}/`}
            hrefLang={j.kod}
            aria-current={j.kod === kod ? "page" : undefined}
            className={`block rounded-[12px] px-3 py-2 text-[13.5px] transition-colors hover:bg-plocha2 ${
              j.kod === kod ? "font-semibold text-inkoust" : "text-tlum"
            }`}
          >
            {j.nazev}
          </Link>
        ))}
      </div>
    </details>
  );
}
