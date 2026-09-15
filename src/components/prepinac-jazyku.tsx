"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Ikona } from "./ikony";
import { JAZYKY } from "@/lib/jazyky";
import { bezJazyka, sJazykem, useJazyk } from "@/lib/i18n";

/*
  Přepínač jazyků v hlavičce.

  Patnáct jazyků se do lišty nevejde, proto rozbalovací seznam. Původně stál
  na <details>, jenže ten se zavírá jen kliknutím na sebe — kliknutí vedle ho
  nechalo viset otevřený. Proto vlastní stav a tři způsoby zavření, které lidé
  zkoušejí: kliknutí mimo, Esc a výběr položky.

  Odkaz vede na tutéž stránku v jiném jazyce, ne na rozcestník. Kdo čte seznam
  událostí a přepne na polštinu, má zůstat u seznamu událostí.
*/
export function PrepinacJazyku({ trida = "" }: { trida?: string }) {
  const { kod, cesta } = useJazyk();
  const [otevreno, nastavOtevreno] = useState(false);
  const obal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otevreno) return;

    const naKlik = (e: MouseEvent) => {
      if (!obal.current?.contains(e.target as Node)) nastavOtevreno(false);
    };
    const naKlavesu = (e: KeyboardEvent) => {
      if (e.key === "Escape") nastavOtevreno(false);
    };

    // pointerdown, ne click: zavře se hned při stisku, ne až po puštění.
    document.addEventListener("pointerdown", naKlik);
    document.addEventListener("keydown", naKlavesu);
    return () => {
      document.removeEventListener("pointerdown", naKlik);
      document.removeEventListener("keydown", naKlavesu);
    };
  }, [otevreno]);

  const aktivni = JAZYKY.find((j) => j.kod === kod);
  const holaCesta = bezJazyka(cesta);

  return (
    <div ref={obal} className={`relative ${trida}`}>
      <button
        type="button"
        onClick={() => nastavOtevreno((o) => !o)}
        aria-expanded={otevreno}
        aria-haspopup="menu"
        aria-label="Jazyk / Language"
        className="flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-drobne font-semibold uppercase tracking-[0.06em] text-tlum transition-colors hover:bg-[rgb(255_255_255/0.08)] hover:text-inkoust"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <Ikona nazev="mapa" velikost={16} tah={1.8} />
        <span>{(aktivni?.kod ?? "cs").toUpperCase()}</span>
        <Ikona nazev="dolu" velikost={11} tah={2} trida={otevreno ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {otevreno && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[230px] overflow-y-auto rounded-[18px] border border-linka2 bg-plocha p-2 shadow-lg"
        >
          <Link
            href={holaCesta}
            hrefLang="cs"
            role="menuitem"
            onClick={() => nastavOtevreno(false)}
            className={`block rounded-[12px] px-3 py-2 text-male transition-colors hover:bg-plocha2 ${
              kod === "cs" ? "font-semibold text-inkoust" : "text-tlum"
            }`}
          >
            Čeština
            <span className="block text-mikro text-tlum2">závazné znění</span>
          </Link>
          <div className="my-1 border-t border-linka2" />
          {JAZYKY.map((j) => (
            <Link
              key={j.kod}
              href={sJazykem(holaCesta, j.kod)}
              hrefLang={j.kod}
              role="menuitem"
              aria-current={j.kod === kod ? "page" : undefined}
              onClick={() => nastavOtevreno(false)}
              className={`block rounded-[12px] px-3 py-2 text-male transition-colors hover:bg-plocha2 ${
                j.kod === kod ? "font-semibold text-inkoust" : "text-tlum"
              }`}
            >
              {j.nazev}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
