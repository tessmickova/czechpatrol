import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { SidebarWebu } from "@/components/sidebar-webu";
import { Sdeleni } from "@/components/ui";
import { Vlajka } from "@/components/zeme";
import { faktory, hranice, mapaEvropy, nejmeneChranene, ochranaZemi, poznamkaOchrany, type Faktor, type OchranaZeme } from "@/lib/ochrana";

export const metadata: Metadata = {
  title: "Ochranné vazby zemí",
  description: "Mapa Evropy: kolik doložených ochranných vazeb má která země — NATO, EU, vlastní jaderné zbraně, JEF, předsunuté síly NATO — a která sousedí s Ruskem nebo Běloruskem. Se zdroji.",
};

/*
  Stránka se sestaví celá při buildu: mapa je hotové SVG (nastroje/mapa-evropy.mjs),
  žádný JavaScript v prohlížeči. Barva říká jen počet vazeb, ne „bezpečno“.
*/
/* Stejné barvy jako v public/mapa-ochrany.svg (nastroje/mapa-evropy.mjs, BARVY_MAPY). */
const BARVY = ["rgba(128,128,128,0.10)", "rgba(164,148,214,0.25)", "rgba(164,148,214,0.42)", "rgba(164,148,214,0.60)", "rgba(164,148,214,0.78)", "rgba(164,148,214,0.95)"];

export default function Ochrana() {
  const mapa = mapaEvropy();
  const vsechnyFaktory = faktory();
  const poradi = nejmeneChranene();
  const sHranici = poradi.filter((z) => z.hranice);
  const bezVazby = poradi.filter((z) => !z.hranice && z.pocet === 0);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Ochranné vazby"
        nadpis="Kdo je v Evropě jak chráněn"
        uvod="Kolik doložených ochranných vazeb má každá země — spojenectví, smlouvy, jaderné zbraně, spojenecké jednotky — a která sousedí s Ruskem nebo Běloruskem. Počítáme fakta se zdrojem, ne vojenskou sílu."
      />
      <div className="mt-12 grid gap-10 sm:mt-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-16">
        <div className="min-w-0">
          <figure className="rounded-[22px] border border-linka bg-plocha p-2 sm:p-3">
            {/* Mapa je samostatný soubor (nastroje/mapa-evropy.mjs) — vložená by stránku zvětšila na 600 kB. */}
            <img src="/mapa-ochrany.svg" alt="Mapa Evropy podle počtu ochranných vazeb; čárkovaně země s hranicí s Ruskem nebo Běloruskem. Podrobnosti v seznamu pod mapou." width={mapa.sirka} height={mapa.vyska} className="h-auto w-full" loading="lazy" decoding="async" />
            <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 pb-1 pt-3 text-drobne text-tlum">
              <span className="flex items-center gap-1.5">
                {BARVY.map((b, n) => <span key={n} className="inline-block h-3 w-5 rounded-[3px] border border-linka" style={{ background: b }} title={`${n}`} />)}
                <span className="ml-1">0 → 5 vazeb</span>
              </span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-6 border-t-2 border-dashed border-akcent" /> hranice s Ruskem nebo Běloruskem</span>
              <span className="text-tlum2">Rusko a Bělorusko bez hodnocení</span>
            </figcaption>
          </figure>

          <h2 className="nadpis-boxu mb-3 mt-10">Země s hranicí s Ruskem nebo Běloruskem</h2>
          <TabulkaZemi radky={sHranici} faktory={vsechnyFaktory} />

          <h2 className="nadpis-boxu mb-3 mt-10">Bez jediné vazby</h2>
          <p className="text-male leading-relaxed text-tlum">
            {bezVazby.map((z, i) => <span key={z.kod}>{i > 0 && ", "}<Vlajka kod={z.kod} /> {z.nazev}</span>)}.
          </p>

          <details className="mt-10 rounded-[18px] border border-linka">
            <summary className="cursor-pointer px-4 py-3 text-zaklad font-semibold text-inkoust">Všechny země ({poradi.length})</summary>
            <div className="px-2 pb-3"><TabulkaZemi radky={[...poradi].sort((a, b) => b.pocet - a.pocet || a.nazev.localeCompare(b.nazev, "cs"))} faktory={vsechnyFaktory} /></div>
          </details>

          <h2 className="nadpis-boxu mb-3 mt-10">Co počítáme</h2>
          <ul className="space-y-3">
            {vsechnyFaktory.map((f) => (
              <li key={f.klic} className="rounded-[18px] border border-linka p-4">
                <div className="text-zaklad font-semibold text-inkoust">{f.nazev} <span className="cislice text-mikro text-tlum2">· {f.zeme.length} zemí</span></div>
                <p className="mt-1 text-male leading-snug text-tlum">{f.popis}</p>
                <p className="mt-1 text-drobne text-tlum2">
                  Zdroj: {f.zdroje.map((z, i) => <span key={z.url}>{i > 0 && " · "}<a href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">{z.nazev} ↗</a></span>)}
                </p>
              </li>
            ))}
            <li className="rounded-[18px] border border-dashed border-akcent/60 p-4">
              <div className="text-zaklad font-semibold text-inkoust">{hranice().nazev}</div>
              <p className="mt-1 text-male leading-snug text-tlum">{hranice().popis} Nepočítá se jako vazba, jen se vyznačí.</p>
              <p className="mt-1 text-drobne text-tlum2">
                Zdroj: {hranice().zdroje.map((z, i) => <span key={z.url}>{i > 0 && " · "}<a href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">{z.nazev} ↗</a></span>)}
              </p>
            </li>
          </ul>

          <Sdeleni ikona="info" trida="mt-8">
            {poznamkaOchrany()} Méně vazeb neznamená, že země je v ohrožení nebo něčím cílem — jen že ji chrání méně doložených závazků.
            Mapa: Natural Earth (volné dílo).
          </Sdeleni>
        </div>
        <SidebarWebu />
      </div>
    </div>
  );
}

function TabulkaZemi({ radky, faktory }: { radky: OchranaZeme[]; faktory: Faktor[] }) {
  return (
    <ul className="divide-y divide-linka2 rounded-[18px] border border-linka">
      {radky.map((z) => (
        <li key={z.kod} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
          <span className="min-w-[10rem] flex-1 text-zaklad text-inkoust"><Vlajka kod={z.kod} /> {z.nazev}</span>
          <span className="cislice text-male font-semibold text-inkoust">{z.pocet}</span>
          <span className="w-full text-drobne text-tlum2 sm:w-auto sm:flex-[2]">
            {z.faktory.length ? faktory.filter((f) => z.faktory.includes(f.klic)).map((f) => f.nazev.replace(/ \(.*\)/, "")).join(" · ") : "žádná doložená vazba"}
          </span>
        </li>
      ))}
    </ul>
  );
}
