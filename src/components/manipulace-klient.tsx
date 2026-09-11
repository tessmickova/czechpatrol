"use client";

import { useCallback, useEffect, useState } from "react";
import { METODY, PORADI_METOD, type Metoda } from "@/lib/metody";
import type { Kampan } from "@/lib/typy";
import { ctiDotaz, sledujDotaz, zapisDotaz } from "@/lib/url-stav";
import { KartaKampane } from "./kampane";
import { Ikona } from "./ikony";
import { Odznak, Sdeleni, Tlacitko } from "./ui";
import { sklon, Vlajka } from "./zeme";

/*
  Filtr nad operacemi.

  Podstatná otázka u téhle sekce nezní „co se stalo v Česku“, ale „dělají
  to jinde stejně?“. Proto se filtruje hlavně podle metody: když si čtenář
  klikne na Napodobený web redakce, uvidí vedle sebe Česko, Polsko
  i Estonsko — a teprve z toho je vidět, že nejde o náhodu.

  Volba žije v adrese (?zeme=PL&metoda=napodobeny-web), takže jde poslat dál.
*/

interface Filtr {
  zeme: string | null;
  metoda: Metoda | null;
}

function zAdresy(p: URLSearchParams): Filtr {
  const m = p.get("metoda");
  return {
    zeme: p.get("zeme")?.toUpperCase() || null,
    metoda: m && m in METODY ? (m as Metoda) : null,
  };
}

function doAdresy(f: Filtr): URLSearchParams {
  const p = new URLSearchParams();
  if (f.zeme) p.set("zeme", f.zeme);
  if (f.metoda) p.set("metoda", f.metoda);
  return p;
}

export function ManipulaceKlient({
  kampane, nazvyZemi,
}: {
  kampane: Kampan[]; nazvyZemi: Record<string, string>;
}) {
  const [f, setF] = useState<Filtr>({ zeme: null, metoda: null });
  useEffect(() => {
    const nacti = () => setF(zAdresy(ctiDotaz()));
    nacti();
    return sledujDotaz(nacti);
  }, []);
  const zmen = useCallback((zmena: Partial<Filtr>) => {
    setF((stary) => {
      const novy = { ...stary, ...zmena };
      zapisDotaz(doAdresy(novy), "replace");
      return novy;
    });
  }, []);

  // Nabízíme jen země a metody, které se opravdu v datech vyskytují.
  // Prázdný filtr, který nic nenajde, je horší než žádný filtr.
  const zeme = [...new Set(kampane.flatMap((k) => k.kodyZemi))].sort((a, b) =>
    a === "CZ" ? -1 : b === "CZ" ? 1 : a.localeCompare(b),
  );
  const metody = PORADI_METOD.filter((m) => kampane.some((k) => k.metody.includes(m)));
  const pocetMetody = (m: Metoda) => kampane.filter((k) => k.metody.includes(m)).length;
  const pocetZeme = (kod: string) => kampane.filter((k) => k.kodyZemi.includes(kod)).length;

  const vysledek = kampane.filter(
    (k) => (!f.zeme || k.kodyZemi.includes(f.zeme)) && (!f.metoda || k.metody.includes(f.metoda)),
  );
  // Kolik ZEMÍ ten způsob zasáhl, ne kolik operací. Dvě operace ve dvou
  // zemích a dvě operace v sedmi zemích jsou dvě různě silná tvrzení.
  const zemiVeVysledku = new Set(vysledek.flatMap((k) => k.kodyZemi)).size;
  const cip = (aktivni: boolean) =>
    `inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
      aktivni ? "border-akcent/60 bg-akcent/15 text-akcent-svetla" : "border-transparent text-tlum hover:bg-plocha2 hover:text-inkoust"
    }`;

  return (
    <>
      <div className="space-y-1.5 border-b border-linka2 pb-3" role="group" aria-label="Filtr operací">
        <div className="flex flex-wrap items-center gap-1">
          <span className="stitek mr-1 w-[62px] shrink-0">Země</span>
          <button type="button" onClick={() => zmen({ zeme: null })} className={cip(f.zeme === null)}>Vše</button>
          {zeme.map((kod) => (
            <button key={kod} type="button" onClick={() => zmen({ zeme: f.zeme === kod ? null : kod })} className={cip(f.zeme === kod)} title={nazvyZemi[kod] ?? kod}>
              <Vlajka kod={kod} /> <span className="cislice">{kod}</span> <span className="text-tlum2">{pocetZeme(kod)}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-start gap-1">
          <span className="stitek mr-1 mt-2 w-[62px] shrink-0">Způsob</span>
          <button type="button" onClick={() => zmen({ metoda: null })} className={cip(f.metoda === null)}>Vše</button>
          {metody.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => zmen({ metoda: f.metoda === m ? null : m })}
              className={cip(f.metoda === m)}
              title={`${METODY[m].popis} ${METODY[m].jakPoznat}`}
            >
              {METODY[m].nazev} <span className="text-tlum2">{pocetMetody(m)}</span>
            </button>
          ))}
        </div>
      </div>

      {f.metoda && (
        <Sdeleni ton="akcent" ikona="lupa" nadpis={METODY[f.metoda].nazev} trida="mt-3">
          {METODY[f.metoda].popis} <b className="font-semibold text-inkoust">Jak to poznat:</b> {METODY[f.metoda].jakPoznat}
        </Sdeleni>
      )}

      <p aria-live="polite" className="mt-3 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-tlum">
        <span>
          {vysledek.length} {sklon(vysledek.length, "rozebraná operace", "rozebrané operace", "rozebraných operací")}
          {f.zeme || f.metoda ? ` z ${kampane.length}` : ""}
        </span>
        {f.metoda && zemiVeVysledku > 1 && (
          <Odznak ton="pozor" duraz="silny" ikona="vykricnik">
            stejný způsob v {zemiVeVysledku} {sklon(zemiVeVysledku, "zemi", "zemích", "zemích")}
          </Odznak>
        )}
        {(f.zeme || f.metoda) && (
          <button type="button" onClick={() => zmen({ zeme: null, metoda: null })} className="inline-flex min-h-[32px] items-center gap-1.5 text-tlum underline underline-offset-4 hover:text-inkoust">
            Zrušit filtr <Ikona nazev="krizek" velikost={11} tah={2.4} />
          </button>
        )}
      </p>

      {vysledek.length ? (
        <div className="space-y-5">
          {vysledek.map((k) => <KartaKampane key={k.slug} k={k} nazvyZemi={nazvyZemi} />)}
        </div>
      ) : (
        <Sdeleni ikona="lupa">
          Tomuhle výběru neodpovídá žádná rozebraná operace. Neznamená to, že se takhle nikde nepostupuje — jen
          že jsme to zatím nedoložili.{" "}
          <Tlacitko onKlik={() => zmen({ zeme: null, metoda: null })} varianta="tichy" velikost="s">zrušit filtr</Tlacitko>
        </Sdeleni>
      )}
    </>
  );
}
