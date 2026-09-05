"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { datumCas } from "@/lib/format";
import type { NatoPolozka, PravniPolozka, ProvozniPolozka, Zdroj } from "@/lib/typy";
import { Ikona, type NazevIkony } from "./ikony";
import { PlacenaVrstva } from "./placena-vrstva";
import { SeznamZdroju } from "./zdroje";

/*
  Stavová lišta pod menu.

  Všechno, co „platí / neplatí“, na jednom řádku: právní stav ČR, NATO,
  běžný život. Každá kostička je tlačítko — otevře vysvětlení, co by
  mohlo přijít jako první, zdroj a čas ověření. Barva nikdy nenese
  informaci sama: vždy je vedle ní ikona a slovo.
*/

type Ton = "klid" | "pozor" | "poplach" | "neznamo";

interface Kostka {
  klic: string;
  nazev: string;
  kratce: string;
  hodnota: string;
  ton: Ton;
  ikona: NazevIkony;
  vysvetleni: ReactNode;
  prvni?: string[];
  overeno: string | null;
  zdroje: Zdroj[];
  placene?: boolean;
}

const TON: Record<Ton, { tecka: string; text: string; ikona: NazevIkony; slovo: string; ramecek: string }> = {
  klid: { tecka: "bg-[#4fdd9a] shadow-[0_0_8px_rgb(79_221_154/0.8)]", text: "text-[#8ff0c0]", ikona: "fajfka", slovo: "ne", ramecek: "border-linka" },
  pozor: { tecka: "bg-[#ffd166] shadow-[0_0_8px_rgb(255_209_102/0.8)]", text: "text-[#ffe08a]", ikona: "oko", slovo: "sledujeme", ramecek: "border-[#ffd166]/50 bg-[#ffd166]/10" },
  poplach: { tecka: "bg-[#ff5c6c] shadow-[0_0_8px_rgb(255_92_108/0.8)]", text: "text-[#ff8c98]", ikona: "vystraha", slovo: "platí", ramecek: "border-[#ff5c6c]/60 bg-[#ff5c6c]/12" },
  neznamo: { tecka: "border border-linka bg-transparent", text: "text-tlum2", ikona: "info", slovo: "neověřeno", ramecek: "border-dashed border-linka" },
};

const tonPravni = (p: boolean | null): Ton => (p === null ? "neznamo" : p ? "poplach" : "klid");
const tonProvozu = (s: ProvozniPolozka["stav"]): Ton =>
  s === "bez-zdroje" ? "neznamo" : s === "bezny" ? "klid" : s === "sledujeme" ? "pozor" : "poplach";

const KRATCE_PRAVNI: Record<string, string> = {
  "stav-ohrozeni": "Ohrožení státu",
  "valecny-stav": "Válečný stav",
  mobilizace: "Mobilizace",
  "nouzovy-stav": "Nouzový stav",
  vycestovani: "Vycestování",
  hranice: "Hranice ČR",
  "schuze-parlamentu": "Schůze Parlamentu",
};
const IKONY_PRAVNI: Record<string, NazevIkony> = {
  "stav-ohrozeni": "vystraha", "valecny-stav": "vlajka", mobilizace: "vlajka", "nouzovy-stav": "dokument",
  vycestovani: "pas", hranice: "hranice", "schuze-parlamentu": "vaha",
};
const KRATCE_NATO: Record<string, string> = {
  "clanek-4": "Čl. 4 konzultace", "clanek-5": "Čl. 5 obrana", readiness: "Pohotovost", evakuace: "Evakuace", "vychodni-kridlo": "Vých. křídlo",
};
const IKONY_NATO: Record<string, NazevIkony> = {
  "clanek-4": "stit", "clanek-5": "stit-ok", readiness: "hodiny", evakuace: "pas", "vychodni-kridlo": "mapa",
};
const KRATCE_PROVOZU: Record<string, string> = {
  vycestovani: "Cestování", hranice: "Doprava", palivo: "Palivo", elektrina: "Elektřina", plyn: "Plyn", banky: "Banky", komunikace: "Sítě", "bezny-zivot": "Školy",
};

export function kostkyPravni(polozky: PravniPolozka[]): Kostka[] {
  return polozky.map((p) => ({
    klic: `pravni-${p.klic}`,
    nazev: p.nazev,
    kratce: KRATCE_PRAVNI[p.klic] ?? p.nazev,
    hodnota: p.plati === null ? "neověřeno" : p.plati ? "PLATÍ" : "NE",
    ton: tonPravni(p.plati),
    ikona: IKONY_PRAVNI[p.klic] ?? "dokument",
    vysvetleni: (
      <>
        <p>{p.vysvetleni}</p>
        {p.pravniZaklad && <p className="mt-2 text-tlum">Právní základ: {p.pravniZaklad}</p>}
      </>
    ),
    overeno: p.overeno,
    zdroje: p.zdroje,
    placene: false,
  }));
}

export function kostkyNato(polozky: NatoPolozka[]): Kostka[] {
  return polozky.map((p) => ({
    klic: `nato-${p.klic}`,
    nazev: p.nazev,
    kratce: KRATCE_NATO[p.klic] ?? p.nazev,
    hodnota: p.aktivni === null ? "neověřeno" : p.aktivni ? "AKTIVNÍ" : p.klic.startsWith("clanek") ? "NE" : "beze změny",
    ton: tonPravni(p.aktivni),
    ikona: IKONY_NATO[p.klic] ?? "stit",
    vysvetleni: <p>{p.vysvetleni}</p>,
    overeno: p.overeno,
    zdroje: p.zdroje,
  }));
}

export function kostkyProvozu(polozky: ProvozniPolozka[]): Kostka[] {
  return polozky.map((p) => ({
    klic: `provoz-${p.klic}`,
    nazev: p.nazev,
    kratce: KRATCE_PROVOZU[p.klic] ?? p.nazev,
    hodnota: p.stav === "bez-zdroje" ? "neověřeno" : p.stav === "bezny" ? "běžně" : p.stav === "sledujeme" ? "sledujeme" : "NARUŠENO",
    ton: tonProvozu(p.stav),
    ikona: (p.ikona as NazevIkony) ?? "radar",
    vysvetleni: <p>{p.detail}</p>,
    prvni: p.coByZmenilo,
    overeno: p.overeno,
    zdroje: p.zdroje,
    placene: p.klic === "hranice",
  }));
}

function Kosticka({ k, otevreno, onToggle }: { k: Kostka; otevreno: boolean; onToggle: () => void }) {
  const t = TON[k.ton];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={otevreno}
      aria-controls={`kostka-${k.klic}`}
      className={`group flex min-w-[112px] shrink-0 items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-left transition-colors hover:border-akcent/60 ${
        otevreno ? "border-akcent/70 bg-akcent/10" : t.ramecek
      }`}
    >
      <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-[2px] ${t.tecka}`} />
      <span className="min-w-0">
        <span className="stitek block truncate !text-[9.5px] !text-tlum">{k.kratce}</span>
        <span className={`flex items-center gap-1 text-[12.5px] font-bold uppercase leading-tight tracking-[0.02em] ${t.text}`}>
          {k.hodnota}
        </span>
      </span>
      <span
        aria-hidden
        className={`ml-auto grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors ${
          otevreno ? "border-akcent bg-akcent text-noc" : "border-akcent/50 text-akcent group-hover:bg-akcent/20"
        }`}
      >
        <Ikona nazev="info" velikost={11} tah={2.2} />
      </span>
    </button>
  );
}

function Detail({ k, onClose }: { k: Kostka; onClose: () => void }) {
  const t = TON[k.ton];
  return (
    <div id={`kostka-${k.klic}`} className="sklo sklo-akcent mt-2 rounded-[14px] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-akcent/40 bg-akcent/10 text-akcent">
            <Ikona nazev={k.ikona} velikost={17} />
          </span>
          <div>
            <div className="text-[16px] font-bold uppercase tracking-[0.02em]">{k.nazev}</div>
            <div className={`flex items-center gap-1.5 text-[13px] font-semibold ${t.text}`}>
              <Ikona nazev={t.ikona} velikost={13} tah={2} /> {k.hodnota}
              <span className="stitek ml-2 !text-tlum2">{k.overeno ? `ověřeno ${datumCas(k.overeno)}` : "zatím neověřeno automaticky"}</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-linka text-tlum hover:border-akcent hover:text-inkoust">
          <span className="sr-only">Zavřít</span>
          <Ikona nazev="krizek" velikost={14} tah={2} />
        </button>
      </div>
      <div className="mt-3 grid gap-4 text-[14.5px] leading-relaxed text-tlum lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>{k.vysvetleni}</div>
        {k.prvni && k.prvni.length > 0 && (
          <div className="rounded-[12px] border border-linka p-3.5">
            <div className="stitek mb-2 flex items-center gap-1.5 !text-jantar"><Ikona nazev="oko" velikost={12} /> Co by mohlo přijít jako první</div>
            <ul className="space-y-1.5">
              {k.prvni.map((x) => (
                <li key={x} className="flex gap-2 text-[13.5px] text-inkoust">
                  <span aria-hidden className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-jantar" />
                  {x}
                </li>
              ))}
            </ul>
            <p className="stitek mt-3 !text-tlum2">Když některý bod nastane, kostička změní barvu i slovo.</p>
          </div>
        )}
      </div>
      {k.zdroje.length > 0 && (
        <div className="mt-4 border-t border-linka2 pt-3">
          <SeznamZdroju zdroje={k.zdroje.slice(0, 3)} husty />
        </div>
      )}
    </div>
  );
}

function Skupina({
  nazev, ikona, kostky, otevrena, setOtevrena, barva,
}: { nazev: string; ikona: NazevIkony; kostky: Kostka[]; otevrena: string | null; setOtevrena: (k: string | null) => void; barva: string }) {
  const aktivni = kostky.find((k) => k.klic === otevrena) ?? null;
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`stitek flex shrink-0 items-center gap-1.5 ${barva}`}>
          <Ikona nazev={ikona} velikost={12} /> {nazev}
        </span>
        <div className="pas-scroll -my-1 flex flex-1 gap-1.5 overflow-x-auto py-1">
          {kostky.map((k) =>
            k.placene ? (
              <PlacenaVrstva key={k.klic} co="Doprava" kompaktni>
                <Kosticka k={k} otevreno={otevrena === k.klic} onToggle={() => setOtevrena(otevrena === k.klic ? null : k.klic)} />
              </PlacenaVrstva>
            ) : (
              <Kosticka key={k.klic} k={k} otevreno={otevrena === k.klic} onToggle={() => setOtevrena(otevrena === k.klic ? null : k.klic)} />
            ),
          )}
        </div>
      </div>
      {aktivni && <Detail k={aktivni} onClose={() => setOtevrena(null)} />}
    </div>
  );
}

export function StavovaLista({
  pravni, nato, provoz,
}: { pravni: PravniPolozka[]; nato: NatoPolozka[]; provoz: ProvozniPolozka[] }) {
  const [otevrena, setOtevrena] = useState<string | null>(null);
  const obal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otevrena) return;
    const klavesa = (e: KeyboardEvent) => e.key === "Escape" && setOtevrena(null);
    window.addEventListener("keydown", klavesa);
    return () => window.removeEventListener("keydown", klavesa);
  }, [otevrena]);

  return (
    <div ref={obal} className="neni-tisk border-b border-linka bg-papir/80">
      <div className="mx-auto max-w-[1320px] px-4 py-2.5 sm:px-6">
        <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-tlum">
          <span className="stitek-tmavy inline-flex items-center gap-1.5 rounded-full border border-linka px-2 py-[3px] text-tlum">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-tlum2" /> Beta · AI-assisted
          </span>
          <span>
            <b className="font-semibold text-inkoust">Hobby projekt.</b> Není součástí vlády ČR, Armády ČR, NATO, EU ani bezpečnostních složek.
          </span>
          <Link href="/metodika/" className="stitek ml-auto hover:text-inkoust">Metodika</Link>
        </p>
        <div className="space-y-2">
          <Skupina nazev="ČR" ikona="vaha" barva="!text-akcent" kostky={kostkyPravni(pravni)} otevrena={otevrena} setOtevrena={setOtevrena} />
          <Skupina nazev="NATO" ikona="stit" barva="!text-[#b28cff]" kostky={kostkyNato(nato)} otevrena={otevrena} setOtevrena={setOtevrena} />
          <Skupina nazev="Život" ikona="stit-ok" barva="!text-[#8ff0c0]" kostky={kostkyProvozu(provoz)} otevrena={otevrena} setOtevrena={setOtevrena} />
        </div>
      </div>
    </div>
  );
}
