"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { datum, datumCas, pocet } from "@/lib/format";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Archiv, Snimek } from "@/lib/typy";
import { Ikona } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { Prazdno } from "./zaklad";

const DEN = 86_400_000;

const PRAVNI_POPIS: Record<string, string> = {
  "stav-ohrozeni": "Stav ohrožení státu",
  "valecny-stav": "Válečný stav",
  mobilizace: "Mobilizace",
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
 * Osa jde po dnech, ne po snímcích. Stav se totiž nemění každý den — mezi
 * dvěma snímky platí ten starší, dokud ho něco nepřepíše. Proto se hodnota
 * přenáší dopředu; prázdné dny by tvrdily, že se stav ztratil.
 */
export function CasovyPosuvnik({ archiv }: { archiv: Archiv }) {
  const snimky = archiv.snimky;

  /** Pro každý den v rozsahu archivu ten poslední snímek, který k němu platí. */
  const dny = useMemo(() => {
    if (snimky.length < 2) return [];
    const od = new Date(snimky[0].kdy).setUTCHours(0, 0, 0, 0);
    const doKdy = new Date(snimky[snimky.length - 1].kdy).setUTCHours(0, 0, 0, 0);
    const out: { den: number; snimek: Snimek; jeZmena: boolean }[] = [];
    let i = 0;
    let posledni = snimky[0];
    for (let t = od; t <= doKdy; t += DEN) {
      let zmena = false;
      while (i < snimky.length && new Date(snimky[i].kdy).getTime() <= t + DEN - 1) {
        posledni = snimky[i];
        zmena = true;
        i++;
      }
      out.push({ den: t, snimek: posledni, jeZmena: zmena });
    }
    return out;
  }, [snimky]);

  /**
   * Pozice je desetinná, ne index dne.
   *
   * Přehrávání pohání requestAnimationFrame, takže běžec jede spojitě
   * a nezávisle na snímkové frekvenci. Krokování intervalem se pralo
   * s přechodem v CSS a viditelně sekalo.
   */
  const [pozice, setPozice] = useState(0);
  const [prehrava, setPrehrava] = useState(false);
  const snimek = useRef(0);

  useEffect(() => {
    setPozice(Math.max(0, dny.length - 1));
  }, [dny.length]);

  useEffect(() => {
    if (!prehrava || dny.length < 2) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPozice(dny.length - 1);
      setPrehrava(false);
      return;
    }

    const DNU_ZA_VTERINU = 4.5;
    let posledni = performance.now();

    const krok = (ted: number) => {
      const dt = Math.min(ted - posledni, 100) / 1000;
      posledni = ted;
      setPozice((x) => {
        const nova = x + dt * DNU_ZA_VTERINU;
        if (nova >= dny.length - 1) {
          setPrehrava(false);
          return dny.length - 1;
        }
        return nova;
      });
      snimek.current = requestAnimationFrame(krok);
    };

    snimek.current = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(snimek.current);
  }, [prehrava, dny.length]);

  const i = Math.round(pozice);

  if (dny.length < 2) {
    return (
      <Prazdno
        nadpis="Archiv se zatím plní"
        popis="Posuvník se objeví, jakmile bude v archivu aspoň druhý stav."
        ikona="hodiny"
      />
    );
  }

  const aktualni = dny[Math.min(i, dny.length - 1)];
  const s = aktualni.snimek;
  const posledni = i >= dny.length - 1;
  const t = s.uroven ? PASMA[UROVNE[s.uroven].pasmo] : null;

  /* --- křivka úrovně přes celý archiv --- */
  const SIRKA = 1000, VYSKA = 96, OKRAJ = 10;
  const x = (n: number) => (n / (dny.length - 1)) * SIRKA;
  const y = (d: (typeof dny)[number]) =>
    VYSKA - OKRAJ - ((d.snimek.uroven ? UROVNE[d.snimek.uroven].poradi - 1 : 0) / 12) * (VYSKA - 2 * OKRAJ);

  // Schodovitá křivka: hodnota drží, dokud ji nový snímek nezmění.
  const cesta = dny
    .map((d, n) => (n === 0 ? `M ${x(0)} ${y(d)}` : `L ${x(n)} ${y(dny[n - 1])} L ${x(n)} ${y(d)}`))
    .join(" ");
  const plocha = `${cesta} L ${x(dny.length - 1)} ${VYSKA} L 0 ${VYSKA} Z`;

  return (
    <div className="noc relative overflow-hidden rounded-[20px]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div data-vrstva="0.04" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[45%]" />
      </div>

      <div className="p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="stitek mb-2 !text-noc-tlum">Stav k datu</div>
            <p className="cislice text-[21px] font-semibold tracking-[-0.02em] text-noc-text sm:text-[25px]">
              {datum(new Date(aktualni.den).toISOString())}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (posledni && !prehrava) setPozice(0);
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
                setPozice(dny.length - 1);
              }}
              disabled={posledni}
              className="sklo-noc-slabe rounded-full px-3.5 py-2 text-[12.5px] font-medium text-noc-text transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              Nyní
            </button>
          </div>
        </div>

        {/* křivka s běžcem */}
        <div className="relative mb-3">
          <span aria-hidden className="stitek pointer-events-none absolute right-0 top-0 !text-[9px] !text-noc-tlum/60">
            Kritická
          </span>
          <span aria-hidden className="stitek pointer-events-none absolute bottom-0 right-0 !text-[9px] !text-noc-tlum/60">
            Nízká
          </span>
          <svg
            viewBox={`0 0 ${SIRKA} ${VYSKA}`}
            preserveAspectRatio="none"
            className="h-[104px] w-full"
            role="img"
            aria-label="Vývoj celkové úrovně v čase"
          >
            <defs>
              <linearGradient id="plocha-archiv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6f9dfb" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6f9dfb" stopOpacity="0" />
              </linearGradient>
              <clipPath id="do-bezce">
                <rect x="0" y="0" width={Math.max(0, x(pozice))} height={VYSKA} />
              </clipPath>
            </defs>

            {/*
              Osa drží celou stupnici, i když se data pohybují dole. Zkrácená
              osa by z drobného posunu udělala strmý skok — u hodnocení rizika
              je to ta nejběžnější lež v grafu.
            */}
            <line x1="0" y1={OKRAJ} x2={SIRKA} y2={OKRAJ} stroke="rgba(255,255,255,0.09)"
              strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1={VYSKA - OKRAJ} x2={SIRKA} y2={VYSKA - OKRAJ}
              stroke="rgba(255,255,255,0.09)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

            <path d={plocha} fill="url(#plocha-archiv)" opacity="0.35" />
            <path d={cesta} fill="none" stroke="#6f9dfb" strokeWidth="2" opacity="0.28"
              vectorEffect="non-scaling-stroke" />
            <g clipPath="url(#do-bezce)">
              <path d={plocha} fill="url(#plocha-archiv)" />
              <path d={cesta} fill="none" stroke="#6f9dfb" strokeWidth="2.5"
                vectorEffect="non-scaling-stroke" />
            </g>

            {dny.map((d, n) =>
              d.jeZmena ? (
                <circle key={n} cx={x(n)} cy={y(d)} r="4" fill="#0b1017" stroke="#6f9dfb"
                  strokeWidth="2" vectorEffect="non-scaling-stroke" />
              ) : null,
            )}
          </svg>

          {/*
            Vodorovný posun řídí rAF, proto tu není přechod — dvě animace
            najednou by se praly. Svislý skok je vzácný (jen při změně
            úrovně), tam přechod naopak pomáhá.
          */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-px bg-white/30"
            style={{ left: `${(pozice / (dny.length - 1)) * 100}%` }}
          >
            <span
              className={`absolute -left-[6px] h-[13px] w-[13px] -translate-y-1/2 rounded-full border-2 border-noc shadow-[0_0_0_3px_rgba(111,157,251,0.25)] transition-[top] duration-300 ease-out ${
                t ? t.teckaNoc : "bg-white/40"
              }`}
              style={{ top: `${(y(aktualni) / VYSKA) * 100}%` }}
            />
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={dny.length - 1}
          step={1}
          value={i}
          onChange={(e) => {
            setPrehrava(false);
            setPozice(Number(e.target.value));
          }}
          aria-label="Posun v čase"
          aria-valuetext={datum(new Date(aktualni.den).toISOString())}
          className="w-full accent-[#6f9dfb]"
        />
        <div className="cislice mb-7 mt-1 flex justify-between text-[10.5px] text-noc-tlum">
          <span>{datum(dny[0].den ? new Date(dny[0].den).toISOString() : "")}</span>
          <span>{datum(new Date(dny[dny.length - 1].den).toISOString())}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-center">
            <ObloukovyMerak uroven={s.uroven} naNoci velikost={210} />
            <p className="cislice mt-1 text-[12px] text-noc-tlum">
              {pocet(s.udalosti, "zveřejněná událost", "zveřejněné události", "zveřejněných událostí")}
            </p>
          </div>

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

          <div>
            <div className="stitek mb-3 !text-noc-tlum">
              {aktualni.jeZmena ? "Co se tento den změnilo" : "Poslední změna"}
            </div>
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

            {!aktualni.jeZmena && (
              <p className="stitek mt-3 !text-noc-tlum">
                z {datumCas(s.kdy)} — od té doby beze změny
              </p>
            )}

            <p className="stitek mt-5 border-t border-white/10 pt-4 !text-noc-tlum">
              Stav platí, dokud ho nepřepíše nový snímek · události k datu zjištění
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
