"use client";

import Link from "next/link";
import { useState } from "react";
import { datumCasPraha, datumPraha, predKolika } from "@/lib/cas";
import { useZiveHodiny } from "@/lib/cas-klient";
import { kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { jeCesky } from "@/lib/jazyk";
import { vetaPrekladu } from "@/lib/preklad";
import { ZnackaOdchylky, VYZNAM_ODCHYLKY } from "./odchylka";
import { PoznamkaPrekladu } from "./poznamka-prekladu";
import type { OdchylkaKandidata } from "@/lib/odchylky";
import { naliehaveNahoru, naliehavaBezRedakci, naliehavaDo, naliehavostSkupiny, nazevNaliehave, type NaliehavostSkupiny } from "@/lib/naliehave";
import { jeSignal, pocetZdroju, seskupSignaly } from "@/lib/signaly";
import { KATEGORIE } from "@/lib/kategorie";
import { JISTOTY, PASMA, UROVNE } from "@/lib/skala";
import type { Kandidat, Kategorie } from "@/lib/typy";
import { Ikona } from "./ikony";
import { HlavickaWidgetu, IkonaKruh } from "./widgety";
import { OKNO_TEMAT_DNI, temaZpravy, ZEME_HRANIC, type Tema } from "@/lib/temata";
import { RadaKTypu } from "./rada-k-typu";
import { Otaznik } from "./zaklad";
import { sklon, Vlajka } from "./zeme";

/*
  Aktuality ve dvou sloupcích bez rámečku (24. 9. 2026, podle zadání):
  vlevo „Doloženo zdroji“ (dva nezávislé nebo úřední zdroje), vpravo
  „Signály z médií“. Každý sloupec ukáže osm řádků a po
  kliknutí dalších osm.

  Řádek má pevnou výšku, aby n-tý řádek vlevo začínal i končil na stejné
  výšce jako n-tý řádek vpravo. Klik neodvádí pryč: rozbalí pod řádkem
  krátké shrnutí (kde, jak vážné, jak jisté, první doložený fakt nebo
  zachycené shrnutí, zdroj) a teprve odtud vede odkaz na celý záznam.
  Datum je krátké („21. 9.“), rok jen když není letošní.

  Naléhavé nahoře (9. 11. 2026, provozovatelka): zpráva, kterou síto
  označilo jako naléhavou, nezapadne mezi ostatní. Dokud běží lhůta jejího
  druhu (src/lib/naliehave.ts), stojí ve sloupci Signály z médií nahoře,
  seřazená podle data, s červeným rámečkem, když o ní píší aspoň dvě
  nezávislé redakce (s napadenou tři; téhož dne) — silným u stupně 1 (mobilizace,
  článek 5, mimořádný stav, krizové vysílání, hranice ČR), tenkým u stupně 2
  — a místo data říká „před 3 dny“. Po lhůtě se zařadí mezi ostatní podle
  data a štítek „naléhavé“ ztratí. Rámeček je uvnitř řádku, výška zůstává
  stejná, takže řádky obou sloupců dál lícují.

  Vlajka je vždy země, kde se věc stala, ne země redakce (téhož dne).
*/
interface Radek {
  klic: string;
  kam: string;
  ven: boolean;
  kodZeme: string | null;
  zeme: string | null;
  kdy: string | null;
  titulek: string;
  stitek: "nepotvrzeno" | "zachyceno" | "naléhavé" | "jen média" | "doloženo" | null;
  /* Jen u naléhavých zachycených: čeho se týká (stejné slovo jako v Souhrnu situace). */
  naliehave?: string | null;
  /* Naléhavost, jejíž lhůta běží: řádek je nahoře a v rámečku. */
  naliehavost?: NaliehavostSkupiny | null;
  /* Byla naléhavá, lhůta skončila (ISO) — do rozbalení, ať čtenář ví, proč už není nahoře. */
  naliehaveSkoncilo?: string | null;
  /* Naléhavá s běžící lhůtou, ale zatím jen od jedné redakce: nezvýrazní se, do rozbalení proč. */
  naliehaveCeka?: { ma: number; potreba: 2 | 3 } | null;
  /* Titulek v cizím jazyce — čtenář má vědět, proč je ve sloupci anglicky. */
  cizojazycne?: boolean;
  /* Strojově přeloženo (20. 11. 2026): kód jazyka originálu a původní titulek. Řádek začíná „přeloženo:“. */
  prelozeno?: { z: string; puvodni: string } | null;
  pruh: string;
  /* Do rozbalení. */
  zavaznost: { nazev: string; trida: string } | null;
  jistota: string | null;
  kategorie: string[];
  /* Klíče kategorií pro radu „Co mohu udělat“. */
  klice: string[];
  text: string | null;
  textPopis: "Doloženo" | "Nepotvrzeno" | "Zachyceno";
  zdroj: { nazev: string; url: string } | null;
  /*
    Všechny zprávy o téže události (3. 11. 2026): počet redakcí stojí
    v řádku, po rozbalení jejich seznam. Bez vlajky redakce (9. 11. 2026):
    vlajka na webu znamená zemi události a ta je u řádku.
  */
  zdroje: ZdrojRadku[];
  pocetZdroju: number;
  /*
    Zdroj, který o téže události tvrdí něco zásadně jiného (src/lib/odchylky.ts):
    v řádku jen značka, po rozbalení který a proč. `vlastni` = týká se zprávy,
    která řádek zastupuje; jinak jiného zdroje ve skupině.
  */
  odchylka?: { uroven: OdchylkaKandidata["uroven"]; vlastni: boolean } | null;
  odchylkyZdroju?: { nazev: string; odchylka: OdchylkaKandidata }[];
}

interface ZdrojRadku { klic: string; nazev: string; url: string; kdy: string | null; titulek: string | null; odchylka?: OdchylkaKandidata | null; prelozeno?: boolean }

const KROK = 8;

const bezZeme = (titulek: string, zeme: string | null) => {
  if (!zeme) return titulek;
  const z = `${zeme}:`;
  if (!titulek.toLowerCase().startsWith(z.toLowerCase())) return titulek;
  const zbytek = titulek.slice(z.length).trim();
  return zbytek ? zbytek.charAt(0).toUpperCase() + zbytek.slice(1) : titulek;
};

/** „21. 9.“; rok jen u loňských a starších. */
function kratkeDatum(iso: string | null, ted: number): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return y === new Date(ted).getFullYear() ? `${d}. ${m}.` : `${d}. ${m}. ${y}`;
}

function zZaznamu(z: Zaznam, klic: string, kam: string, stitek: Radek["stitek"], pruh: string): Radek {
  const nepotvrzeny = stitek !== null && stitek !== "doloženo";
  return {
    klic, kam, ven: false, kodZeme: z.kodZeme, zeme: z.zeme, kdy: kdyZjisteno(z),
    titulek: bezZeme(z.kratkyTitulek || z.titulek, z.zeme), stitek, pruh,
    zavaznost: { nazev: UROVNE[z.zavaznost].nazev, trida: PASMA[UROVNE[z.zavaznost].pasmo].text },
    jistota: JISTOTY[z.jistota]?.nazev ?? null,
    kategorie: z.kategorie.map((k) => KATEGORIE[k as Kategorie]?.nazev ?? k),
    klice: z.kategorie,
    text: z.fakta[0] ?? z.neznameho[0] ?? null,
    textPopis: nepotvrzeny ? "Nepotvrzeno" : z.fakta[0] ? "Doloženo" : "Nepotvrzeno",
    zdroj: z.zdroje[0] ? { nazev: z.zdroje[0].nazev, url: z.zdroje[0].url } : null,
    /*
      Úvod nese u záznamu celý jen první a úřední zdroj (odlehci.ts), ostatní
      bez názvu a odkazu kvůli velikosti stránky. Počet se bere z délky,
      do seznamu jdou jen pojmenované; celý seznam je na stránce záznamu.
    */
    zdroje: z.zdroje.filter((s) => s.nazev && s.url && s.url !== "#").map((s, i) => ({ klic: `${i}-${s.url}`, nazev: s.nazev, url: s.url, kdy: null, titulek: null })),
    pocetZdroju: z.zdroje.length,
  };
}

function Rozbaleni({ r }: { r: Radek }) {
  return (
    <div className="mb-2 ml-[37px] rounded-[12px] bg-plocha2/70 px-3 py-2.5 text-drobne">
      <p className="text-male font-semibold leading-snug text-inkoust">{r.prelozeno && <span className="font-normal text-tlum2">přeloženo: </span>}{r.titulek}</p>
      {r.prelozeno && <p className="mt-0.5 text-mikro leading-snug text-tlum2">{vetaPrekladu(r.prelozeno.z)} Původně: <span lang={r.prelozeno.z}>„{r.prelozeno.puvodni}“</span></p>}
      {r.cizojazycne && !r.prelozeno && <PoznamkaPrekladu trida="mt-1" />}
      <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-mikro text-tlum2">
        {r.zeme && <span>{r.zeme}</span>}
        {r.kdy && <span className="cislice">{datumCasPraha(r.kdy)}</span>}
        {r.zavaznost && <span className={`font-semibold ${r.zavaznost.trida}`}>{r.zavaznost.nazev}</span>}
        {r.jistota && <span>jistota {r.jistota.toLowerCase()}</span>}
        {r.kategorie.slice(0, 2).map((k) => <span key={k}>{k}</span>)}
        {r.cizojazycne && <span>v cizím jazyce</span>}
      </p>
      {r.naliehave && r.naliehavost && <p className="mt-1.5 text-male leading-snug text-inkoust">K okamžité kontrole: {r.naliehave}. Nahoře do {datumPraha(r.naliehavost.platiDo)}; nová zpráva o téže věci lhůtu prodlouží. Neověřeno, do počtů nevstupuje.</p>}
      {r.naliehave && !r.naliehavost && r.naliehaveCeka && <p className="mt-1.5 text-male leading-snug text-tlum">Síto ji označilo jako naléhavou: {r.naliehave}. Zvýrazní se, až o ní budou psát aspoň {r.naliehaveCeka.potreba} nezávislé redakce; teď {r.naliehaveCeka.ma === 1 ? "jedna" : r.naliehaveCeka.ma}.</p>}
      {r.naliehave && !r.naliehavost && !r.naliehaveCeka && r.naliehaveSkoncilo && <p className="mt-1.5 text-male leading-snug text-tlum">Byla označená jako naléhavá: {r.naliehave}. Lhůta skončila {datumPraha(r.naliehaveSkoncilo)}, proto už není nahoře.</p>}
      {r.odchylkyZdroju?.length ? (
        <div className="mt-1.5 text-male leading-snug">
          {r.odchylkyZdroju.map((o, i) => (
            <p key={i} className="flex items-start gap-1.5 text-stari-text">
              <ZnackaOdchylky uroven={o.odchylka.uroven} text={null} trida="mt-[5px] shrink-0" />
              <span><span className="font-semibold">{o.nazev}</span> {o.odchylka.uroven === "podezrele" ? "— podezřelé" : "— liší se od ostatních"}: {o.odchylka.duvody.join("; ")}.</span>
            </p>
          ))}
          <p className="mt-1 text-mikro text-tlum2">{VYZNAM_ODCHYLKY}</p>
        </div>
      ) : null}
      {r.text && (
        <p className="mt-1.5 line-clamp-4 leading-relaxed text-tlum">
          <span className="stitek mr-1.5 text-tlum2">{r.textPopis}:</span>{r.text}
        </p>
      )}
      {r.zdroje.length > 1 && (
        <ul className="mt-2 space-y-1 border-t border-linka/60 pt-2">
          {r.zdroje.map((s) => (
            <li key={s.klic} className="flex items-start gap-2 text-mikro leading-snug text-tlum2">
              {s.odchylka
                ? <span className="flex w-[18px] shrink-0 justify-center pt-[3px]"><ZnackaOdchylky uroven={s.odchylka.uroven} text={null} /></span>
                : <span aria-hidden className="w-[18px] shrink-0 text-center leading-none">·</span>}
              <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="min-w-0 flex-1 hover:text-inkoust">
                <span className="font-semibold text-tlum">{s.nazev}</span>
                {s.kdy && <span className="cislice"> · {datumCasPraha(s.kdy)}</span>}
                {s.titulek && <span className="block truncate">{s.prelozeno && "přeloženo: "}{s.titulek}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate text-mikro text-tlum2">{r.zdroje.length > 1 ? `${r.pocetZdroju} ${sklon(r.pocetZdroju, "zdroj", "zdroje", "zdrojů")}` : r.zdroj ? `Zdroj: ${r.zdroj.nazev}` : ""}</span>
        <span className="flex items-center gap-3">
          <RadaKTypu kategorie={r.klice} vpravo />
          {r.ven
            ? <a href={r.kam} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-inkoust hover:text-akcent">Otevřít zdroj <Ikona nazev="nahoru" velikost={11} tah={2} trida="rotate-45" /></a>
            : <Link href={r.kam} className="inline-flex items-center gap-1 font-semibold text-inkoust hover:text-akcent">Celý záznam <Ikona nazev="nahoru" velikost={11} tah={2} trida="rotate-90" /></Link>}
        </span>
      </p>
    </div>
  );
}

/**
 * Jeden řádek sloupce nebo boxu. Zvýrazněný řádek (naléhavost) má rámeček;
 * slovo nad titulkem je ve Signálech „naléhavé“, v boxech témat „důležité“
 * (20. 11. 2026, provozovatelka).
 */
function PolozkaRadku({ r, ted, otevreno, prepni, slovo = "naléhavé", trida = "" }: { r: Radek; ted: number; otevreno: boolean; prepni: () => void; slovo?: string; trida?: string }) {
  const n = r.naliehavost;
  return (
    <li className={`${n ? "py-[2px]" : ""} ${trida}`}>
      <button
        type="button"
        aria-expanded={otevreno}
        onClick={prepni}
        className={`group -mx-2 flex w-[calc(100%+16px)] items-center gap-2.5 rounded-[10px] px-2 text-left hover:bg-plocha2/60 ${n ? `h-[60px] bg-akcent/[0.06] ring-inset ${n.stupen === 1 ? "ring-2 ring-akcent" : "ring-1 ring-akcent/60"}` : "h-[64px]"} ${otevreno ? "bg-plocha2/60" : ""}`}
      >
        <span aria-hidden className={`h-[28px] w-[3px] shrink-0 rounded-full ${n ? "bg-akcent" : r.pruh}`} />
        <span className="w-[22px] shrink-0 text-center leading-none">{r.kodZeme ? <Vlajka kod={r.kodZeme} /> : <span className="text-tlum2">·</span>}</span>
        <span className="min-w-0 flex-1">
          {n ? (
            <span className="flex items-center gap-1.5 text-mikro leading-none text-tlum2">
              <span className="font-semibold uppercase tracking-[0.06em] text-akcent">{slovo}</span>
              <span className="cislice whitespace-nowrap text-inkoust">· {r.kdy ? predKolika(r.kdy, ted) : "—"}</span>
              {/* Nepřeložené cizojazyčné (20. 11. 2026): strojový překlad je vypnutý, titulek je v originále. Glóbus místo slov — při šířce 1024 px zbývá v řádku 181 px; legendu nese červená poznámka nad seznamem. */}
              {r.cizojazycne && !r.prelozeno && <span title="v cizím jazyce" className="inline-flex shrink-0 items-center gap-1"><span aria-hidden>·</span><Ikona nazev="globus" velikost={11} tah={2} /><span className="sr-only">v cizím jazyce</span></span>}
              {r.pocetZdroju > 1 && <span className="cislice min-w-0 shrink-[20] truncate whitespace-nowrap">· {r.pocetZdroju} {sklon(r.pocetZdroju, "zdroj", "zdroje", "zdrojů")}</span>}
              {r.odchylka && <ZnackaOdchylky uroven={r.odchylka.uroven} text={r.odchylka.vlastni && r.odchylka.uroven === "podezrele" ? "podezřelé" : "liší se"} trida="min-w-0" />}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-mikro leading-none text-tlum2">
              <span className="cislice whitespace-nowrap">{kratkeDatum(r.kdy, ted)}</span>
              {r.stitek && <span className="whitespace-nowrap uppercase tracking-[0.06em]">{r.stitek}</span>}
              {/* Nepřeložené cizojazyčné (20. 11. 2026): strojový překlad je vypnutý, titulek je v originále. Glóbus místo slov — při šířce 1024 px zbývá v řádku 181 px; legendu nese červená poznámka nad seznamem. */}
              {r.cizojazycne && !r.prelozeno && <span title="v cizím jazyce" className="inline-flex shrink-0 items-center gap-1"><span aria-hidden>·</span><Ikona nazev="globus" velikost={11} tah={2} /><span className="sr-only">v cizím jazyce</span></span>}
              {r.pocetZdroju > 1 && <span className="cislice min-w-0 shrink-[20] truncate whitespace-nowrap">· {r.pocetZdroju} {sklon(r.pocetZdroju, "zdroj", "zdroje", "zdrojů")}</span>}
              {r.odchylka && <ZnackaOdchylky uroven={r.odchylka.uroven} text={r.odchylka.vlastni && r.odchylka.uroven === "podezrele" ? "podezřelé" : "liší se"} trida="min-w-0" />}
            </span>
          )}
          <span className={`mt-1 line-clamp-2 text-male leading-[1.3] ${n ? "font-semibold text-inkoust" : r.stitek ? "text-tlum" : "text-inkoust"}`}>{r.prelozeno && <span className="font-normal text-tlum2">přeloženo: </span>}{r.titulek}</span>
        </span>
        <Ikona nazev="dolu" velikost={12} tah={2} trida={`shrink-0 text-tlum2 transition-transform group-hover:text-akcent ${otevreno ? "rotate-180" : ""}`} />
      </button>
      {otevreno && <Rozbaleni r={r} />}
    </li>
  );
}

function Sloupec({ nadpis, ikona, ton, radky, prazdne, paticka, ted, napoveda, trida = "" }: { nadpis: string; ikona: "fajfka" | "otaznik"; ton: "klid" | "pozor"; radky: Radek[]; prazdne: string; paticka?: React.ReactNode; ted: number; napoveda?: string; trida?: string }) {
  const [limit, setLimit] = useState(KROK);
  const [otevreny, setOtevreny] = useState<string | null>(null);
  const videt = radky.slice(0, limit);
  return (
    <div className={`min-w-0 ${trida}`}>
      <div className="flex h-[34px] items-center justify-between gap-3">
        <span className="flex items-center gap-2"><IkonaKruh ikona={ikona} ton={ton} velikost="s" /><h3 className="nadpis-boxu">{nadpis}</h3>{napoveda && <Otaznik popis={<span className="block">{napoveda}</span>} />}</span>
        <span className="cislice text-mikro text-tlum2">{radky.length}</span>
      </div>
      {radky.some((r) => r.cizojazycne && !r.prelozeno) && <PoznamkaPrekladu trida="mb-1" />}
      {videt.length ? (
        /* Osm řádků i na telefonu (4. 11. 2026, provozovatelka); dřív se na mobilu schovávalo od šestého. */
        <ul className="mt-1">
          {videt.map((r) => <PolozkaRadku key={r.klic} r={r} ted={ted} otevreno={otevreny === r.klic} prepni={() => setOtevreny(otevreny === r.klic ? null : r.klic)} />)}
        </ul>
      ) : (
        <p className="py-3 text-male text-tlum2">{prazdne}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {radky.length > limit ? (
          <button type="button" onClick={() => setLimit((l) => l + KROK)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-linka px-3.5 text-drobne font-semibold text-inkoust hover:border-akcent">
            zobrazit dalších {Math.min(KROK, radky.length - limit)} <Ikona nazev="dolu" velikost={11} tah={2} />
          </button>
        ) : <span />}
        {paticka}
      </div>
    </div>
  );
}

/** Kdy naléhavost skupiny skončila (ISO), nebo null. */
function konecNaliehavosti(polozky: Kandidat[]): string | null {
  const konce = polozky.map((p) => naliehavaDo(p)).filter((x): x is number => x !== null);
  return konce.length ? new Date(Math.max(...konce)).toISOString() : null;
}

/** Skupina zachycených zpráv o téže události → jeden řádek. Stejné pro Signály i boxy témat. */
function zeSkupiny({ hlavni: k, polozky }: { hlavni: Kandidat; polozky: Kandidat[] }, ted: number): Radek {
  const naliehavost = naliehavostSkupiny(polozky, ted);
  const ceka = naliehavost ? null : naliehavaBezRedakci(polozky, ted);
  const druh = naliehavost?.druh ?? ceka?.druh ?? polozky.find((p) => p.naliehave)?.naliehave?.druh ?? null;
  return {
    klic: `k-${k.id}`, kam: k.zdroj.url, ven: true, kodZeme: k.kodZeme, zeme: k.zeme, kdy: k.publikovano ?? k.zachyceno, titulek: k.titulek, stitek: naliehavost ? "naléhavé" : "zachyceno", pruh: "bg-tlum2",
    naliehave: druh ? nazevNaliehave(druh) : null, naliehavost, naliehaveSkoncilo: druh && !naliehavost && !ceka ? konecNaliehavosti(polozky) : null, naliehaveCeka: ceka ? { ma: ceka.ma, potreba: ceka.potreba } : null, cizojazycne: !jeCesky(k.titulek), prelozeno: k.preklad ? { z: k.preklad.z, puvodni: k.titulekPuvodni } : null,
    zavaznost: null, jistota: null, kategorie: k.kategorie.map((c) => KATEGORIE[c as Kategorie]?.nazev ?? c), klice: k.kategorie, text: k.shrnuti || null, textPopis: "Zachyceno", zdroj: { nazev: k.zdroj.nazev, url: k.zdroj.url },
    zdroje: polozky.map((p) => ({ klic: p.id, nazev: p.zdroj.nazev, url: p.zdroj.url, kdy: p.publikovano ?? p.zachyceno, titulek: p.id === k.id ? null : p.titulek, odchylka: p.odchylka ?? null, prelozeno: Boolean(p.preklad) })),
    pocetZdroju: pocetZdroju(polozky),
    ...odchylkaRadku(k, polozky),
  };
}

/** Značka řádku a seznam odlišných zdrojů skupiny (podezřelé první). */
function odchylkaRadku(k: Kandidat, polozky: readonly Kandidat[]): Pick<Radek, "odchylka" | "odchylkyZdroju"> {
  const odlisne = polozky.filter((p) => p.odchylka).sort((a, b) => (a.odchylka!.uroven === "podezrele" ? 0 : 1) - (b.odchylka!.uroven === "podezrele" ? 0 : 1));
  if (!odlisne.length) return { odchylka: null, odchylkyZdroju: [] };
  const vlastni = Boolean(k.odchylka);
  return {
    odchylka: { uroven: vlastni ? k.odchylka!.uroven : odlisne[0].odchylka!.uroven, vlastni },
    odchylkyZdroju: odlisne.map((p) => ({ nazev: p.zdroj.nazev, odchylka: p.odchylka! })),
  };
}

/* ---------- boxy témat: hranice NATO a mezinárodní vody (20. 11. 2026) ---------- */

const DEN = 86_400_000;

/**
 * Záznam je v boxu „důležitý“, když má závažnost Vysoká nebo Vážná a je
 * z posledních 7 dní; jen z médií navíc s aspoň dvěma zdroji (stejná
 * hranice dvou redakcí jako u naléhavých zpráv ze sběru).
 */
function dulezitostZaznamu(z: Zaznam, kdy: string | null, ted: number): NaliehavostSkupiny | null {
  const pasmo = UROVNE[z.zavaznost]?.pasmo;
  if ((pasmo !== "oranzova" && pasmo !== "cervena") || !kdy) return null;
  if (z.overeni === "neovereno" && z.zdroje.length < 2) return null;
  const t = new Date(kdy).getTime();
  if (ted - t > 7 * DEN) return null;
  return { druh: "zaznam", stupen: pasmo === "cervena" ? 1 : 2, platiDo: new Date(t + 7 * DEN).toISOString() };
}

/**
 * Řádky boxu: záznamy (doložené i jen z médií) za OKNO_TEMAT_DNI, nepotvrzené
 * záznamy a skupiny zachycených zpráv. Důležité nahoře podle data, pod
 * nimi ostatní podle data — stejně jako ve Signálech.
 */
function radkyTematu(tema: Tema, zaznamy: Zaznam[], nepotvrzene: Zaznam[], zachycene: Kandidat[], ted: number): Radek[] {
  const vOkne = (z: Zaznam) => ted - new Date(kdyZjisteno(z)).getTime() <= OKNO_TEMAT_DNI * DEN;
  const zaz = zaznamy.filter((z) => temaZpravy(z) === tema && vOkne(z)).map((z) => {
    const dolozeno = z.overeni !== "neovereno";
    const r = zZaznamu(z, `${tema}-${z.slug}`, `/incident/${z.slug}/`, dolozeno ? "doloženo" : "jen média", dolozeno ? PASMA[UROVNE[z.zavaznost].pasmo].tecka : "bg-jantar");
    return { ...r, naliehavost: dulezitostZaznamu(z, r.kdy, ted) };
  });
  const nep = nepotvrzene.filter((z) => temaZpravy(z) === tema && vOkne(z)).map((z) => zZaznamu(z, `${tema}-n-${z.id}`, `/nepotvrzeno/${z.id}/`, "nepotvrzeno", "bg-jantar"));
  const kand = seskupSignaly(zachycene.filter((k) => temaZpravy(k) === tema)).map((g) => zeSkupiny(g, ted));
  return naliehaveNahoru<Radek>([...zaz, ...nep, ...kand]);
}

/**
 * Box tématu. Na počítači se seznam vejde do výšky, kterou mu dá sloupec
 * Signálů vedle: flex-wrap ve sloupci posune řádky, které by se nevešly,
 * do dalšího (skrytého) sloupce — vidět jsou jen celé řádky, nikdy
 * useknutý. Po rozbalení řádku se seznam uvnitř boxu posouvá.
 */
function TemaBox({ id, nadpis, ikona, napoveda, radky, celkem, ted, zalozky = false, prazdne, odkaz, maxMobil, trida = "", oriznout = true }: {
  /* Mezi 1024 a 1279 px je sloupec úzký (vedle je postranní panel): box hranic tam má kratší nadpis, jinak by přetekl přes počet. */
  id: string; nadpis: React.ReactNode; ikona: "hranice" | "voda"; napoveda: string; radky: Radek[]; celkem?: number; ted: number; zalozky?: boolean; prazdne: string; odkaz?: { kam: string; text: string }; maxMobil: number; trida?: string; oriznout?: boolean;
}) {
  const [zeme, setZeme] = useState("");
  const [otevreny, setOtevreny] = useState<string | null>(null);
  const zemeSRadky = zalozky ? ZEME_HRANIC.map((k) => ({ k, n: radky.filter((r) => r.kodZeme === k).length })).filter((x) => x.n > 0) : [];
  const videt = zeme ? radky.filter((r) => r.kodZeme === zeme) : radky;
  const vyber = (k: string) => { setZeme(k); setOtevreny(null); };
  return (
    <section aria-labelledby={id} className={`flex min-h-0 flex-col overflow-hidden rounded-[22px] bg-plocha ${trida}`}>
      <HlavickaWidgetu id={id} ikona={ikona} nazev={nadpis} napoveda={<span className="block">{napoveda}</span>}
        meta={<span className="cislice">{zeme ? videt.length : celkem ?? videt.length}</span>}
        akce={odkaz ? <Link href={odkaz.kam} className="whitespace-nowrap text-mikro font-semibold text-tlum hover:text-inkoust">{odkaz.text} →</Link> : undefined} />
      {zemeSRadky.length > 0 && (
        <div role="tablist" aria-label="Země" className="pas-scroll flex shrink-0 gap-1 overflow-x-auto px-3 pb-2 pt-1">
          {[{ k: "", nazev: "Hranice NATO", n: radky.length }, ...zemeSRadky.map((x) => ({ ...x, nazev: x.k as string }))].map((z) => (
            <button key={z.k || "vse"} type="button" role="tab" aria-selected={zeme === z.k} onClick={() => vyber(z.k)}
              className={`flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-full px-3 text-mikro font-semibold transition-colors ${zeme === z.k ? "bg-akcent text-papir" : "bg-plocha2/70 text-tlum hover:text-inkoust"}`}>
              {z.k && <Vlajka kod={z.k} />}{z.nazev}<span className="cislice opacity-70">{z.n}</span>
            </button>
          ))}
        </div>
      )}
      {videt.some((r) => r.cizojazycne && !r.prelozeno) && <PoznamkaPrekladu trida="shrink-0 px-4 pb-1.5" />}
      {videt.length ? (
        <ul className={`px-3 pb-2 ${oriznout ? `md:min-h-0 md:flex-1 ${otevreny ? "md:overflow-y-auto" : "md:flex md:flex-col md:flex-wrap md:content-start md:overflow-hidden"}` : ""}`}>
          {videt.map((r, i) => (
            <PolozkaRadku key={r.klic} r={r} ted={ted} slovo="důležité" otevreno={otevreny === r.klic} prepni={() => setOtevreny(otevreny === r.klic ? null : r.klic)}
              trida={`md:w-full ${i >= maxMobil ? "max-md:hidden" : ""}`} />
          ))}
        </ul>
      ) : (
        <p className="px-4 pb-4 pt-1 text-male text-tlum2">{prazdne}</p>
      )}
    </section>
  );
}

/*
  Levý sloupec úvodu (20. 11. 2026, provozovatelka): místo „Doloženo zdroji“
  dva boxy — Incidenty na hranicích se záložkami zemí a pod ním Mezinárodní
  vody. Na počítači lícují s horní i dolní hranou sloupce Signály z médií:
  sloupec je absolutně v buňce mřížky, takže výšku řádku určují Signály,
  a box hranic vyplní, co zbude pod boxem vod.
*/
function TemataSloupec({ hranice, vody, ted, poradi }: { hranice: Radek[]; vody: Radek[]; ted: number; poradi: { hranice: string; vody: string } }) {
  return (
    /* Na mobilu jsou oba obaly „display: contents“: boxy se stanou přímými položkami mřížky a dají se seřadit se Signály podle aktuálnosti. */
    <div className="relative min-w-0 max-md:contents md:min-h-[520px]">
      <div className="flex flex-col gap-4 max-md:contents md:absolute md:inset-0">
        <TemaBox id="box-hranice" nadpis={<><span className="lg:max-xl:hidden">Incidenty na hranicích</span><span className="hidden lg:max-xl:inline">Na hranicích</span></>} ikona="hranice" radky={hranice} ted={ted} zalozky maxMobil={6} trida={`md:flex-1 ${poradi.hranice}`}
          napoveda={`Hranice NATO s Ruskem a Běloruskem a drony nad Rumunskem: záznamy za ${OKNO_TEMAT_DNI} dní a zprávy zachycené sběrem. Štítek u řádku říká, co je doložené. Důležité (v rámečku): o zprávě píšou aspoň dvě nezávislé redakce, nebo jde o záznam se závažností Vysoká či Vážná za posledních 7 dní.`}
          prazdne={`Za ${OKNO_TEMAT_DNI} dní nic zachyceno.`} odkaz={{ kam: "/udalosti/?tab=cekajici&tema=hranice", text: "vše" }} />
        <TemaBox id="box-vody" nadpis="Mezinárodní vody" ikona="voda" radky={vody.slice(0, 2)} celkem={vody.length} ted={ted} maxMobil={2} trida={`md:shrink-0 ${poradi.vody}`} oriznout={false}
          napoveda={`Incidenty na moři a nepřátelské akce vedené z mezinárodních vod proti zemím NATO a Evropy: drony vypuštěné z lodí, rušení GPS, válečné lodě u pobřeží, stínová flotila, podmořské kabely — Balt, Černé, Severní a Středozemní moře. Stejná pravidla jako u hranic. Vidět jsou dvě nejdůležitější nebo nejnovější.`}
          prazdne={`Za ${OKNO_TEMAT_DNI} dní nic zachyceno.`} />
      </div>
    </div>
  );
}

/*
  Pořadí sloupců na mobilu (21. 11. 2026, provozovatelka: „na mobilní verzi
  uveď nejdřív nahoře ty sloupce, kde jsou nejaktuálnější varování“).
  Nejdřív sloupce s platnou naléhavou nebo důležitou zprávou (podle data té
  nejnovější), pak ostatní podle nejnovější zprávy. Třídy jsou vypsané celé,
  aby je Tailwind našel; na počítači (md+) nemají vliv.
*/
const TRIDY_PORADI = ["max-md:order-1", "max-md:order-2", "max-md:order-3"] as const;

export function poradiSloupcu<K extends string>(sloupce: Record<K, readonly { kdy: string | null; naliehavost?: unknown }[]>): Record<K, string> {
  const nejnovejsi = (r: readonly { kdy: string | null }[]) => r.reduce((m, x) => ((x.kdy ?? "") > m ? (x.kdy ?? "") : m), "");
  const klice = (Object.keys(sloupce) as K[]).map((k, i) => {
    const radky = sloupce[k];
    const dulezite = radky.filter((r) => r.naliehavost);
    return { k, i, dulezite: nejnovejsi(dulezite), vse: nejnovejsi(radky) };
  });
  klice.sort((a, b) => (b.dulezite ? 1 : 0) - (a.dulezite ? 1 : 0) || b.dulezite.localeCompare(a.dulezite) || b.vse.localeCompare(a.vse) || a.i - b.i);
  return Object.fromEntries(klice.map((x, poradi) => [x.k, TRIDY_PORADI[Math.min(poradi, TRIDY_PORADI.length - 1)]])) as Record<K, string>;
}

export function AktualitySloupce({ zaznamy, nepotvrzene = [], kandidati = [], temata = [], ted: tedServer = Date.now() }: { zaznamy: Zaznam[]; nepotvrzene?: Zaznam[]; kandidati?: Kandidat[]; /** Zachycené zprávy o hranicích a mořích z celé fronty (src/lib/data.ts, kandidatiTemat). */ temata?: Kandidat[]; ted?: number }) {
  /* Čas ze serveru při sestavení, po připojení skutečný (src/lib/cas-klient.ts): „před 3 dny“ a lhůta naléhavosti se počítají z něj. */
  const ted = useZiveHodiny(tedServer);
  /*
    Hranice NATO a moře mají od 20. 11. 2026 vlastní boxy vlevo; ve Signálech
    by tatáž zpráva stála vedle sebe dvakrát, jednou „důležitá“ a jednou
    „naléhavá“. Signály proto ukazují ostatní dění.
  */
  const vTematu = (z: Zaznam) => temaZpravy(z) !== null && ted - new Date(kdyZjisteno(z)).getTime() <= OKNO_TEMAT_DNI * DEN;
  const skupiny = seskupSignaly(kandidati.filter((k) => temaZpravy(k) === null));
  const neoverene: Radek[] = naliehaveNahoru<Radek>([
    ...zaznamy.filter((z) => z.overeni === "neovereno" && !vTematu(z)).map((z) => zZaznamu(z, `u-${z.slug}`, `/incident/${z.slug}/`, "jen média", "bg-jantar")),
    ...nepotvrzene.filter((z) => !vTematu(z)).map((z) => zZaznamu(z, `n-${z.id}`, `/nepotvrzeno/${z.id}/`, "nepotvrzeno", "bg-jantar")),
    /*
      Údery uvnitř Ukrajiny a Ruska bez doloženého následku pro sledované
      země jsou mimo rozsah (CLAUDE.md, rozsah války); na úvod jdou jen
      naléhavé. Zbytek posoudí ověřovatel ve frontě.
    */
    // Bez času vydání (ručně zapsané, když redakce čas neuvede) platí čas zachycení — jinak by zpráva spadla na konec seznamu.
    /*
      Které zachycené sem patří, říká jedno pravidlo pro celý web
      (src/lib/signaly.ts) — stejné zprávy jako v Souhrnu situace. Tatáž
      událost z několika redakcí je jeden řádek: zastupuje ji nejnovější
      česky psaná nebo naléhavá zpráva, ostatní (i cizojazyčné) jsou v něm
      jako zdroje. Vlajka řádku je země události (kodZeme), ne redakce.
    */
    ...skupiny.filter((g) => g.polozky.some(jeSignal)).map((g) => zeSkupiny(g, ted)),
  ]).slice(0, 40);
  /* Co se do sloupce nedostalo (cizí jazyk, nic o útoku, projev) — na úvodu jen jako počet s odkazem do fronty. */
  const zobrazene = new Set(skupiny.filter((g) => g.polozky.some(jeSignal)).flatMap((g) => g.polozky.map((p) => p.id)));
  const dalsich = kandidati.filter((k) => !zobrazene.has(k.id) && temaZpravy(k) === null).length;
  const hranice = radkyTematu("hranice", zaznamy, nepotvrzene, temata, ted);
  const vody = radkyTematu("vody", zaznamy, nepotvrzene, temata, ted);
  const poradiNaMobilu = poradiSloupcu({ signaly: neoverene, hranice, vody });
  return (
    <section aria-labelledby="aktuality-nadpis">
      <h2 id="aktuality-nadpis" className="sr-only">Aktuality</h2>
      <div className="grid gap-10 md:grid-cols-2 md:gap-x-16">
        {/* Místo „Doloženo zdroji“ boxy hranic a vod (20. 11. 2026); doložené záznamy jsou na stránce Události. */}
        <TemataSloupec hranice={hranice} vody={vody} ted={ted} poradi={{ hranice: poradiNaMobilu.hranice, vody: poradiNaMobilu.vody }} />
        {/* Mobil: sloupce podle aktuálnosti varování (21. 11. 2026). Na počítači zůstávají boxy vlevo a Signály vpravo. */}
        <Sloupec trida={poradiNaMobilu.signaly} ted={ted} nadpis="Signály z médií" ikona="otaznik" ton="pozor" radky={neoverene} prazdne="Právě žádný nový signál." napoveda="Neověřené. Do počtů ani hodnocení nevstupují. Hranice NATO a moře jsou v boxech vedle."
          paticka={dalsich > 0 ? <Link href="/udalosti/?tab=cekajici" className="text-drobne text-tlum2 hover:text-tlum">+ {dalsich} dalších ve frontě →</Link> : <span className="text-drobne text-tlum2">Do počtů ani hodnocení nevstupují.</span>} />
      </div>
    </section>
  );
}
