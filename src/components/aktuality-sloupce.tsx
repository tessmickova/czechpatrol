"use client";

import Link from "next/link";
import { useState } from "react";
import { datumCasPraha } from "@/lib/cas";
import { kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { jeCesky } from "@/lib/jazyk";
import { jeJenProjev } from "../../nastroje/zasady-textu.mjs";
import { KATEGORIE } from "@/lib/kategorie";
import { JISTOTY, PASMA, UROVNE } from "@/lib/skala";
import type { Kandidat, Kategorie } from "@/lib/typy";
import { Ikona } from "./ikony";
import { Tlacitko } from "./ui";
import { IkonaKruh } from "./widgety";
import { Otaznik } from "./zaklad";
import { Vlajka } from "./zeme";

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
*/
interface Radek {
  klic: string;
  kam: string;
  ven: boolean;
  kodZeme: string | null;
  zeme: string | null;
  kdy: string | null;
  titulek: string;
  stitek: "nepotvrzeno" | "zachyceno" | "jen média" | null;
  pruh: string;
  /* Do rozbalení. */
  zavaznost: { nazev: string; trida: string } | null;
  jistota: string | null;
  kategorie: string[];
  text: string | null;
  textPopis: "Doloženo" | "Nepotvrzeno" | "Zachyceno";
  zdroj: { nazev: string; url: string } | null;
}

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
  const nepotvrzeny = stitek !== null;
  return {
    klic, kam, ven: false, kodZeme: z.kodZeme, zeme: z.zeme, kdy: kdyZjisteno(z),
    titulek: bezZeme(z.kratkyTitulek || z.titulek, z.zeme), stitek, pruh,
    zavaznost: { nazev: UROVNE[z.zavaznost].nazev, trida: PASMA[UROVNE[z.zavaznost].pasmo].text },
    jistota: JISTOTY[z.jistota]?.nazev ?? null,
    kategorie: z.kategorie.map((k) => KATEGORIE[k as Kategorie]?.nazev ?? k),
    text: z.fakta[0] ?? z.neznameho[0] ?? null,
    textPopis: nepotvrzeny ? "Nepotvrzeno" : z.fakta[0] ? "Doloženo" : "Nepotvrzeno",
    zdroj: z.zdroje[0] ? { nazev: z.zdroje[0].nazev, url: z.zdroje[0].url } : null,
  };
}

function Rozbaleni({ r }: { r: Radek }) {
  return (
    <div className="mb-2 ml-[37px] rounded-[12px] bg-plocha2/70 px-3 py-2.5 text-drobne">
      <p className="text-male font-semibold leading-snug text-inkoust">{r.titulek}</p>
      <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-mikro text-tlum2">
        {r.zeme && <span>{r.zeme}</span>}
        {r.kdy && <span className="cislice">{datumCasPraha(r.kdy)}</span>}
        {r.zavaznost && <span className={`font-semibold ${r.zavaznost.trida}`}>{r.zavaznost.nazev}</span>}
        {r.jistota && <span>jistota {r.jistota.toLowerCase()}</span>}
        {r.kategorie.slice(0, 2).map((k) => <span key={k}>{k}</span>)}
      </p>
      {r.text && (
        <p className="mt-1.5 line-clamp-4 leading-relaxed text-tlum">
          <span className="stitek mr-1.5 text-tlum2">{r.textPopis}:</span>{r.text}
        </p>
      )}
      <p className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate text-mikro text-tlum2">{r.zdroj ? `Zdroj: ${r.zdroj.nazev}` : ""}</span>
        {r.ven
          ? <a href={r.kam} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-inkoust hover:text-akcent">Otevřít zdroj <Ikona nazev="nahoru" velikost={11} tah={2} trida="rotate-45" /></a>
          : <Link href={r.kam} className="inline-flex items-center gap-1 font-semibold text-inkoust hover:text-akcent">Celý záznam <Ikona nazev="nahoru" velikost={11} tah={2} trida="rotate-90" /></Link>}
      </p>
    </div>
  );
}

function Sloupec({ nadpis, ikona, ton, radky, prazdne, paticka, ted, napoveda }: { nadpis: string; ikona: "fajfka" | "otaznik"; ton: "klid" | "pozor"; radky: Radek[]; prazdne: string; paticka?: React.ReactNode; ted: number; napoveda?: string }) {
  const [limit, setLimit] = useState(KROK);
  const [otevreny, setOtevreny] = useState<string | null>(null);
  const videt = radky.slice(0, limit);
  return (
    <div className="min-w-0">
      <div className="flex h-[34px] items-center justify-between gap-3">
        <span className="flex items-center gap-2"><IkonaKruh ikona={ikona} ton={ton} velikost="s" /><h3 className="nadpis-boxu">{nadpis}</h3>{napoveda && <Otaznik popis={<span className="block">{napoveda}</span>} />}</span>
        <span className="cislice text-mikro text-tlum2">{radky.length}</span>
      </div>
      {videt.length ? (
        <ul className="mt-1">
          {videt.map((r) => {
            const otevreno = otevreny === r.klic;
            return (
              <li key={r.klic}>
                <button
                  type="button"
                  aria-expanded={otevreno}
                  onClick={() => setOtevreny(otevreno ? null : r.klic)}
                  className={`group -mx-2 flex h-[64px] w-[calc(100%+16px)] items-center gap-2.5 rounded-[10px] px-2 text-left hover:bg-plocha2/60 ${otevreno ? "bg-plocha2/60" : ""}`}
                >
                  <span aria-hidden className={`h-[28px] w-[3px] shrink-0 rounded-full ${r.pruh}`} />
                  <span className="w-[22px] shrink-0 text-center leading-none">{r.kodZeme ? <Vlajka kod={r.kodZeme} /> : <span className="text-tlum2">·</span>}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-mikro leading-none text-tlum2">
                      <span className="cislice">{kratkeDatum(r.kdy, ted)}</span>
                      {r.stitek && <span className="uppercase tracking-[0.06em]">{r.stitek}</span>}
                    </span>
                    <span className={`mt-1 line-clamp-2 text-male leading-[1.3] ${r.stitek ? "text-tlum" : "text-inkoust"}`}>{r.titulek}</span>
                  </span>
                  <Ikona nazev="dolu" velikost={12} tah={2} trida={`shrink-0 text-tlum2 transition-transform group-hover:text-akcent ${otevreno ? "rotate-180" : ""}`} />
                </button>
                {otevreno && <Rozbaleni r={r} />}
              </li>
            );
          })}
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

export function AktualitySloupce({ zaznamy, nepotvrzene = [], kandidati = [], ted = Date.now() }: { zaznamy: Zaznam[]; nepotvrzene?: Zaznam[]; kandidati?: Kandidat[]; ted?: number }) {
  const serad = (a: { kdy: string | null }, b: { kdy: string | null }) => (b.kdy ?? "").localeCompare(a.kdy ?? "");
  const overene: Radek[] = zaznamy.filter((z) => z.overeni !== "neovereno").map((z) => zZaznamu(z, `o-${z.slug}`, `/incident/${z.slug}/`, null, PASMA[UROVNE[z.zavaznost].pasmo].tecka)).sort(serad).slice(0, 40);
  const neoverene: Radek[] = [
    ...zaznamy.filter((z) => z.overeni === "neovereno").map((z) => zZaznamu(z, `u-${z.slug}`, `/incident/${z.slug}/`, "jen média", "bg-jantar")),
    ...nepotvrzene.map((z) => zZaznamu(z, `n-${z.id}`, `/nepotvrzeno/${z.id}/`, "nepotvrzeno", "bg-jantar")),
    /*
      Údery uvnitř Ukrajiny a Ruska bez doloženého následku pro sledované
      země jsou mimo rozsah (CLAUDE.md, rozsah války); na úvod jdou jen
      naléhavé. Zbytek posoudí ověřovatel ve frontě.
    */
    ...kandidati.filter((k) => jeCesky(k.titulek) && !jeJenProjev(k.titulek) && (k.naliehave || (k.kodZeme !== "UA" && k.kodZeme !== "RU"))).map((k): Radek => ({
      klic: `k-${k.id}`, kam: k.zdroj.url, ven: true, kodZeme: k.kodZeme, zeme: k.zeme, kdy: k.publikovano, titulek: k.titulek, stitek: "zachyceno", pruh: "bg-tlum2",
      zavaznost: null, jistota: null, kategorie: k.kategorie.map((c) => KATEGORIE[c as Kategorie]?.nazev ?? c), text: k.shrnuti || null, textPopis: "Zachyceno", zdroj: { nazev: k.zdroj.nazev, url: k.zdroj.url },
    })),
  ].sort(serad).slice(0, 40);
  const cizich = kandidati.filter((k) => !jeCesky(k.titulek)).length;
  return (
    <section aria-labelledby="aktuality-nadpis">
      <h2 id="aktuality-nadpis" className="sr-only">Aktuality</h2>
      <div className="grid gap-10 md:grid-cols-2 md:gap-x-14">
        <Sloupec ted={ted} nadpis="Doloženo zdroji" ikona="fajfka" ton="klid" radky={overene} prazdne="Zatím žádný doložený záznam." napoveda="Záznamy doložené dvěma nezávislými nebo úředními zdroji. Každé tvrzení má původce."
          paticka={<Tlacitko kam="/udalosti/" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">všechny záznamy od 2014</Tlacitko>} />
        <Sloupec ted={ted} nadpis="Signály z médií" ikona="otaznik" ton="pozor" radky={neoverene} prazdne="Právě žádný nový signál." napoveda="Zachycené zprávy bez úředního nebo druhého nezávislého zdroje. Do počtů ani hodnocení nevstupují."
          paticka={cizich > 0 ? <Link href="/udalosti/?tab=cekajici" className="text-drobne text-tlum2 hover:text-tlum">+ {cizich} v cizím jazyce ve frontě →</Link> : <span className="text-drobne text-tlum2">Do počtů ani hodnocení nevstupují.</span>} />
      </div>
    </section>
  );
}
