"use client";

import { useEffect, useRef, useState } from "react";
import { PORADI_TEMAT, TEMATA, type TemaZkusenosti, type Zkusenost } from "@/lib/zkusenosti";
import { Ikona } from "./ikony";
import { sklon } from "./zeme";

/*
  Rozcestník bez přesměrování (28. 9. 2026, přání provozovatelky):
  klepnutí na téma otevře útržky přímo pod dlaždicemi, klepnutí na útržek
  ho rozbalí. Nikam se neodchází, zpět se nemusí.

  Otevřené téma žije v kotvě (#elektrina), takže jde poslat odkazem.
*/
export function ZkusenostiKlient({ polozky }: { polozky: Zkusenost[] }) {
  const temata = PORADI_TEMAT.filter((t) => polozky.some((p) => p.tema === t));
  const [tema, setTema] = useState<TemaZkusenosti | null>(null);
  const seznamRef = useRef<HTMLDivElement>(null);
  const zKlepnuti = useRef(false);

  useEffect(() => {
    const zKotvy = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      if (h in TEMATA) setTema(h as TemaZkusenosti);
    };
    zKotvy();
    window.addEventListener("hashchange", zKotvy);
    return () => window.removeEventListener("hashchange", zKotvy);
  }, []);
  useEffect(() => {
    if (tema && zKlepnuti.current) seznamRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    zKlepnuti.current = false;
  }, [tema]);

  const vyber = (t: TemaZkusenosti) => {
    zKlepnuti.current = true;
    const novy = tema === t ? null : t;
    setTema(novy);
    history.replaceState(null, "", novy ? `#${novy}` : location.pathname + location.search);
  };

  const vybrane = tema ? polozky.filter((p) => p.tema === tema) : [];

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Témata">
        {temata.map((t) => {
          const pocet = polozky.filter((p) => p.tema === t).length;
          const aktivni = tema === t;
          return (
            <li key={t}>
              <button
                type="button"
                onClick={() => vyber(t)}
                aria-expanded={aktivni}
                aria-controls="zkusenosti-seznam"
                className={`flex h-full min-h-[76px] w-full items-start gap-3 rounded-[18px] border p-4 text-left transition-colors ${
                  aktivni ? "border-akcent bg-akcent/10" : "border-linka bg-plocha hover:border-akcent"
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-akcent/15 text-akcent">
                  <Ikona nazev={TEMATA[t].ikona} velikost={18} tah={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-zaklad font-semibold leading-snug text-inkoust">{TEMATA[t].nazev}</span>
                  <span className="mt-0.5 block text-male leading-snug text-tlum">{TEMATA[t].popis}</span>
                  <span className="cislice mt-1 block text-mikro text-tlum2">
                    {pocet} {sklon(pocet, "útržek", "útržky", "útržků")}
                  </span>
                </span>
                <span className={`mt-1 shrink-0 text-tlum transition-transform ${aktivni ? "rotate-180" : ""}`} aria-hidden>
                  <Ikona nazev="dolu" velikost={16} tah={2} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div id="zkusenosti-seznam" ref={seznamRef} className="scroll-mt-[84px]" aria-live="polite">
        {tema && (
          <section className="pop mt-6" aria-labelledby="zkusenosti-nadpis">
            <h2 id="zkusenosti-nadpis" className="nadpis-boxu mb-3">{TEMATA[tema].nazev}</h2>
            <ul className="space-y-3">
              {vybrane.map((p) => (
                <li key={p.id}>
                  <Utrzek p={p} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

function Utrzek({ p }: { p: Zkusenost }) {
  return (
    <details className="group rounded-[18px] border border-linka bg-plocha">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-zaklad font-semibold leading-snug text-inkoust">{p.nadpis}</span>
          <span className="mt-0.5 block text-male leading-snug text-tlum2">{p.kdyKde}</span>
        </span>
        <span className="mt-1 shrink-0 text-tlum transition-transform group-open:rotate-180" aria-hidden>
          <Ikona nazev="dolu" velikost={16} tah={2} />
        </span>
      </summary>
      <dl className="space-y-3 border-t border-linka px-4 pb-4 pt-3 text-male leading-relaxed text-tlum">
        <Radek nazev="Co se stalo">{p.coSeStalo}</Radek>
        <Radek nazev="Co následovalo">{p.coNasledovalo}</Radek>
        <Radek nazev="Jak si lidé poradili">{p.jakToLideResili}</Radek>
        <div className="rounded-[14px] bg-akcent/10 px-3 py-2">
          <dt className="stitek text-akcent">Pro domácnost u nás</dt>
          <dd className="mt-0.5 text-inkoust">{p.pouceni}</dd>
        </div>
        <div>
          <dt className="stitek">Zdroj</dt>
          <dd className="mt-0.5">
            <ul className="space-y-0.5">
              {p.zdroje.map((z) => (
                <li key={z.url}>
                  <a href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">
                    {z.nazev} ↗
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </details>
  );
}

function Radek({ nazev, children }: { nazev: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="stitek">{nazev}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
