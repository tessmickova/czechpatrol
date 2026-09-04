"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { datumCas, pocet } from "@/lib/format";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Archiv, Snimek } from "@/lib/typy";
import { Ikona } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { Prazdno } from "./zaklad";

const PRAVNI_POPIS: Record<string, string> = {
  "stav-ohrozeni": "Stav ohrožení státu",
  "valecny-stav": "Válečný stav",
  mobilizace: "Mobilizace",
  "nouzovy-stav": "Nouzový stav",
  vycestovani: "Omezení vycestování",
  hranice: "Uzavření hranic",
};

const NATO_POPIS: Record<string, string> = {
  "clanek-4": "Článek 4",
  "clanek-5": "Článek 5",
};

function Radek({ nazev, plati }: { nazev: string; plati: boolean | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/8 py-2 last:border-0">
      <span className="text-[12.5px] text-noc-tlum">{nazev}</span>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={`h-[7px] w-[7px] rounded-[3px] ${
            plati === null ? "bg-white/20" : plati ? "bg-[#e8834a]" : "bg-[#4fbe86]"
          }`}
        />
        <span className="cislice text-[12px] font-medium text-noc-text">
          {plati === null ? "neověřeno" : plati ? "ANO" : "NE"}
        </span>
      </span>
    </div>
  );
}

/**
 * Časový posuvník.
 *
 * Ukazuje, co web tvrdil v daném okamžiku — ne rekonstrukci toho, co se
 * „doopravdy dělo“. Události se objevují k datu, kdy vyšly najevo, protože
 * dřív o nich nikdo nevěděl. Období před začátkem archivu nedopočítáváme.
 */
export function CasovyPosuvnik({ archiv }: { archiv: Archiv }) {
  const snimky = archiv.snimky;
  const [i, setI] = useState(Math.max(0, snimky.length - 1));
  const [prehrava, setPrehrava] = useState(false);
  const casovac = useRef<number | null>(null);

  useEffect(() => {
    if (!prehrava) return;
    casovac.current = window.setInterval(() => {
      setI((x) => {
        if (x >= snimky.length - 1) {
          setPrehrava(false);
          return x;
        }
        return x + 1;
      });
    }, 900);
    return () => {
      if (casovac.current) clearInterval(casovac.current);
    };
  }, [prehrava, snimky.length]);

  const s: Snimek | undefined = snimky[i];
  const posledni = i === snimky.length - 1;

  const rozsah = useMemo(() => {
    if (!snimky.length) return null;
    return { od: snimky[0].kdy, do: snimky[snimky.length - 1].kdy };
  }, [snimky]);

  if (!snimky.length || !s || !rozsah) {
    return (
      <Prazdno
        nadpis="Archiv se zatím plní"
        popis="Snímek se ukládá jen tehdy, když se něco změní. Posuvník se objeví, jakmile budou v archivu aspoň dva stavy."
      />
    );
  }

  const t = s.uroven ? PASMA[UROVNE[s.uroven].pasmo] : null;

  return (
    <div className="noc relative overflow-hidden rounded-[18px]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div data-vrstva="0.04" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[45%]" />
      </div>

      <div className="p-5 sm:p-7">
        {/* ovládání */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="stitek mb-2 !text-noc-tlum">Stav k okamžiku</div>
            <p className="cislice text-[19px] font-semibold tracking-[-0.02em] text-noc-text sm:text-[22px]">
              {datumCas(s.kdy)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (posledni && !prehrava) setI(0);
                setPrehrava((x) => !x);
              }}
              className="sklo-noc-slabe flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-medium text-noc-text transition-colors hover:bg-white/10"
            >
              <Ikona nazev={prehrava ? "krizek" : "hodiny"} velikost={14} tah={1.6} />
              {prehrava ? "Zastavit" : "Přehrát vývoj"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPrehrava(false);
                setI(snimky.length - 1);
              }}
              disabled={posledni}
              className="sklo-noc-slabe rounded-full px-3.5 py-2 text-[12.5px] font-medium text-noc-text transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              Nyní
            </button>
          </div>
        </div>

        {/* dráha */}
        <div className="mb-7">
          <input
            type="range"
            min={0}
            max={snimky.length - 1}
            step={1}
            value={i}
            onChange={(e) => {
              setPrehrava(false);
              setI(Number(e.target.value));
            }}
            aria-label="Posun v čase"
            aria-valuetext={datumCas(s.kdy)}
            className="w-full accent-[#6f9dfb]"
          />
          <div aria-hidden className="mt-2 flex justify-between">
            {snimky.map((x, n) => {
              const tt = x.uroven ? PASMA[UROVNE[x.uroven].pasmo] : null;
              return (
                <button
                  key={x.kdy}
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    setPrehrava(false);
                    setI(n);
                  }}
                  title={datumCas(x.kdy)}
                  className={`h-[18px] w-[6px] rounded-full transition-opacity ${
                    tt ? tt.teckaNoc : "bg-white/20"
                  } ${n === i ? "opacity-100" : "opacity-35 hover:opacity-70"}`}
                />
              );
            })}
          </div>
          <div className="cislice mt-2 flex justify-between text-[10.5px] text-noc-tlum">
            <span>{datumCas(rozsah.od)}</span>
            <span>{datumCas(rozsah.do)}</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,1fr)]">
          {/* měřák */}
          <div className="flex flex-col items-center">
            <ObloukovyMerak uroven={s.uroven} naNoci velikost={210} />
            <p className="cislice mt-1 text-[12px] text-noc-tlum">
              {pocet(s.udalosti, "zveřejněná událost", "zveřejněné události", "zveřejněných událostí")}
            </p>
          </div>

          {/* stav ČR a NATO */}
          <div>
            <div className="stitek mb-2 !text-noc-tlum">Právní stav ČR</div>
            <div className="mb-5">
              {Object.entries(PRAVNI_POPIS).map(([k, nazev]) => (
                <Radek key={k} nazev={nazev} plati={s.pravni[k] ?? null} />
              ))}
            </div>
            <div className="stitek mb-2 !text-noc-tlum">NATO</div>
            <div>
              {Object.entries(NATO_POPIS).map(([k, nazev]) => (
                <Radek key={k} nazev={nazev} plati={s.nato[k] ?? null} />
              ))}
            </div>
          </div>

          {/* co se změnilo */}
          <div>
            <div className="stitek mb-3 !text-noc-tlum">Co se v tomto kroku změnilo</div>
            <ul className="space-y-2">
              {s.zmeny.map((z, n) => (
                <li
                  key={n}
                  className="sklo-noc-slabe flex items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-[12.5px] leading-snug text-noc-text"
                >
                  <span className={`mt-[1px] ${t ? t.textNoc : "text-noc-tlum"}`}>
                    <Ikona nazev="radar" velikost={13} tah={1.6} />
                  </span>
                  {z}
                </li>
              ))}
            </ul>

            <p className="stitek mt-5 border-t border-white/10 pt-4 !text-noc-tlum">
              Snímek jen při změně · události k datu zjištění · před{" "}
              {datumCas(rozsah.od)} archiv nemá
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
