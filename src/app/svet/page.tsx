import type { Metadata } from "next";
import Link from "next/link";
import { Ikona } from "@/components/ikony";
import { OdznakTypu } from "@/components/zaklad";
import { Vlajka } from "@/components/zeme";
import { HlavickaStranky, NadpisSekce } from "@/components/nadpisy";
import { datumPraha } from "@/lib/cas";
import { svet } from "@/lib/data";
import { ZpusobyVUziti } from "@/components/zpusoby";
import { TYPY_ZDROJU } from "@/lib/kategorie";
import type { SvetAktor, SvetTvrzeni } from "@/lib/typy";

export const metadata: Metadata = {
  title: "Aktéři a cíle",
  description: "Kdo chce co, co pro to dělá a jak daleko od toho je. Deklarované cíle se zdroji, míra přiblížení jako hodnocení projektu.",
};

/*
  Světová analýza na vrcholové úrovni. Dvě vrstvy, které se nesmí míchat:
  - FAKT: deklarované cíle a kroky, každý s odkazem na zdroj,
  - ODHAD: jak blízko k cíli aktér je — hodnocení projektu, datované a verzované.
  Žádná procenta, žádná předpověď. Kde je něco odhad i ve faktech
  (zdroje blízké Kremlu, analýzy), je to označené.
*/

function Odkazy({ idx, aktor }: { idx: number[]; aktor: SvetAktor }) {
  return (
    <span className="ml-1 inline-flex gap-0.5 align-super">
      {idx.map((i) => {
        const z = aktor.zdroje[i];
        if (!z) return null;
        return (
          <a key={i} href={z.url} target="_blank" rel="nofollow noopener noreferrer" title={z.nazev} className="cislice text-mikro text-akcent hover:text-akcent-svetla">
            [{i + 1}]
          </a>
        );
      })}
    </span>
  );
}

function Tvrzeni({ polozky, aktor, tlumene = false }: { polozky: SvetTvrzeni[]; aktor: SvetAktor; tlumene?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {polozky.map((t, i) => (
        <li key={i} className={`flex gap-2.5 text-zaklad leading-relaxed ${tlumene ? "text-tlum" : "text-inkoust"}`}>
          <span aria-hidden className={`mt-[9px] h-[4px] w-[4px] shrink-0 rounded-full ${t.odhad ? "bg-fialova-text" : "bg-akcent"}`} />
          <span>
            {t.text}
            {t.odhad && <span className="ml-1.5 align-middle"><OdznakTypu typ="odhad" /></span>}
            <Odkazy idx={t.zdroje} aktor={aktor} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Priblizeni({ stupen, stupne }: { stupen: number; stupne: string[] }) {
  const barvy = ["bg-tlum2", "bg-pozor", "bg-stari", "bg-oranz", "bg-akcent"];
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex gap-[3px]">
        {stupne.map((_, i) => <span key={i} className={`h-[10px] w-[26px] rounded-[2px] ${i <= stupen ? barvy[stupen] : "bg-linka2"}`} />)}
      </span>
      <span className="text-zaklad font-bold uppercase tracking-[0.03em] text-inkoust">{stupne[stupen]}</span>
      <span className="text-mikro text-tlum2">{stupen + 1} z {stupne.length}</span>
    </div>
  );
}

function Aktor({ a, stupne }: { a: SvetAktor; stupne: string[] }) {
  return (
    <article id={a.klic} className="scroll-mt-[72px] rounded-[22px] border border-linka bg-plocha p-5">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[18px] bg-plocha2">
          {a.kod ? <Vlajka kod={a.kod} velka /> : <Ikona nazev="globus" velikost={20} tah={1.8} trida="text-akcent" />}
        </span>
        <span className="min-w-0">
          <h3 className="text-velke font-bold leading-tight">{a.nazev}</h3>
          <p className="mt-0.5 text-male text-tlum">{a.role}</p>
        </span>
      </header>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center gap-2"><OdznakTypu typ="fakt" /><span className="stitek">Deklarované cíle</span></div>
        <Tvrzeni polozky={a.deklarovane} aktor={a} />
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center gap-2"><OdznakTypu typ="fakt" /><span className="stitek">Co pro to dělá</span></div>
        <Tvrzeni polozky={a.postup} aktor={a} tlumene />
      </div>
      <div className="mt-4 rounded-[18px] border border-fialova/30 bg-fialova/8 p-3.5">
        <div className="mb-2 flex items-center gap-2"><OdznakTypu typ="odhad" /><span className="stitek">Jak blízko k cílům je</span></div>
        <Priblizeni stupen={a.priblizeni.stupen} stupne={stupne} />
        <p className="mt-2 text-zaklad leading-relaxed text-tlum">{a.priblizeni.odhad}</p>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center gap-2"><OdznakTypu typ="scenar" /><span className="stitek">Co by obrázek změnilo</span></div>
        <ul className="space-y-1">
          {a.coByZmenilo.map((c) => <li key={c} className="flex gap-2.5 text-male leading-relaxed text-tlum"><span aria-hidden className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-tlum2" />{c}</li>)}
        </ul>
      </div>
      <details className="mt-4 group">
        <summary className="flex min-h-[36px] cursor-pointer items-center gap-2 text-male font-semibold text-tlum hover:text-inkoust">
          <Ikona nazev="dolu" velikost={12} tah={2} trida="transition-transform group-open:rotate-180" /> Zdroje ({a.zdroje.length})
        </summary>
        <ol className="mt-2 space-y-1.5">
          {a.zdroje.map((z, i) => (
            <li key={z.url} className="flex gap-2 text-male leading-snug">
              <span className="cislice shrink-0 text-tlum2">[{i + 1}]</span>
              <span className={`stitek-tmavy shrink-0 rounded-[12px] border px-1.5 py-[2px] ${TYPY_ZDROJU[z.typ].tridy}`}>{TYPY_ZDROJU[z.typ].znacka}</span>
              <a href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz min-w-0 break-words text-tlum">{z.nazev}</a>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

export default function Svet() {
  const s = svet();
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <div>
        <HlavickaStranky stitek="Aktéři a cíle" nadpis="Kdo čeho chce dosáhnout a jak blízko je" uvod={s.uvod} />
        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-drobne text-tlum2">
          <span>Hodnocení projektu k {datumPraha(s.aktualizovano)}, verze {s.verze}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1.5"><OdznakTypu typ="fakt" /> doloženo zdrojem</span>
          <span className="inline-flex items-center gap-1.5"><OdznakTypu typ="odhad" /> hodnocení projektu</span>
          <span className="inline-flex items-center gap-1.5"><OdznakTypu typ="scenar" /> možnost, ne předpověď</span>
          <span aria-hidden>·</span>
          <Link href="/metodika/" className="odkaz">metodika</Link>
        </p>
      </div>

      {/* rychlý přehled */}
      <section aria-label="Přehled aktérů" className="nalet mt-16 sm:mt-24">
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {s.aktori.map((a) => (
            <li key={a.klic}>
              <a href={`#${a.klic}`} className="flex min-h-[56px] items-center gap-3 rounded-[18px] bg-plocha px-3 py-2 hover:border-akcent">
                <span className="shrink-0">{a.kod ? <Vlajka kod={a.kod} /> : <Ikona nazev="globus" velikost={16} tah={1.8} trida="text-akcent" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-zaklad font-semibold text-inkoust">{a.nazev}</span>
                  <span className="block text-mikro text-tlum2">k cílům: {s.stupne[a.priblizeni.stupen]}</span>
                </span>
                <span aria-hidden className="flex gap-[2px]">
                  {s.stupne.map((_, i) => <span key={i} className={`h-[8px] w-[7px] rounded-[1px] ${i <= a.priblizeni.stupen ? "bg-fialova-text" : "bg-linka2"}`} />)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* mapa cílů */}
      <section aria-labelledby="mapa" className="nalet mt-16 border-t border-linka pt-12 sm:mt-24 sm:pt-16">
        <NadpisSekce
          id="mapa"
          stitek="Aktéři"
          nadpis="Mapa cílů"
          popis="U každého tři vrstvy: co říká nahlas, co doopravdy dělá a jak blízko je. Čísla v hranatých závorkách vedou na zdroje."
        />
        <div className="grid gap-5 lg:grid-cols-2">
          {s.aktori.map((a) => <Aktor key={a.klic} a={a} stupne={s.stupne} />)}
        </div>
      </section>

      {/* střet */}
      <section aria-labelledby="stret" className="nalet mt-16 border-t border-linka pt-12 sm:mt-24 sm:pt-16">
        <NadpisSekce
          id="stret"
          stitek="Rozpory"
          nadpis="Kde se cíle střetávají"
          popis="Stejné otázky, různé odpovědi. Pomlčka = aktér se k tomu nevyjadřuje nebo v tom nehraje roli."
        />
        <div className="overflow-x-auto rounded-[18px] border border-linka">
          <table className="w-full min-w-[980px] border-collapse text-left text-male">
            <thead>
              <tr className="border-b border-linka bg-plocha">
                <th className="stitek sticky left-0 bg-plocha px-3 py-2.5 font-medium">Otázka</th>
                {s.aktori.map((a) => (
                  <th key={a.klic} className="px-3 py-2.5 font-semibold text-inkoust">
                    <span className="inline-flex items-center gap-1.5">{a.kod ? <Vlajka kod={a.kod} /> : <Ikona nazev="globus" velikost={14} tah={1.8} trida="text-akcent" />} {a.nazev}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.stret.otazky.map((o, i) => (
                <tr key={o} className="border-b border-linka2 last:border-0">
                  <th scope="row" className="sticky left-0 bg-papir px-3 py-2.5 text-male font-semibold text-inkoust">{o}</th>
                  {s.aktori.map((a) => {
                    const p = s.stret.postoje[a.klic]?.[i] ?? "—";
                    return <td key={a.klic} className={`px-3 py-2.5 align-top leading-snug ${p === "—" ? "text-tlum2" : "text-tlum"}`}>{p}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* co sledovat */}
      <section aria-labelledby="sledovat" className="nalet mt-16 border-t border-linka pt-12 sm:mt-24 sm:pt-16">
        <NadpisSekce
          id="sledovat"
          stitek="Na co se dívat"
          nadpis="Co by obrázek změnilo"
          popis="Signály, které by hodnocení posunuly. Šipka říká kterým směrem."
        />
        <ul className="border-y border-linka2">
          {s.sledovat.map((x) => (
            <li key={x.text} className="flex items-start gap-3 py-2.5 text-zaklad leading-relaxed text-inkoust">
              <span className={`mt-[3px] shrink-0 ${x.smer === "nahoru" ? "text-stari-text2" : x.smer === "dolu" ? "text-klid-text" : "text-tlum2"}`}>
                <Ikona nazev={x.smer === "nahoru" ? "nahoru" : x.smer === "dolu" ? "dolu" : "minus"} velikost={13} tah={2.2} />
              </span>
              {x.text}
            </li>
          ))}
        </ul>
      </section>

      {/*
        Způsoby v užití stojí tady, protože tahle stránka už odděluje FAKT od
        ODHADU. Tabulka je celá na straně faktu: samá doložená čísla a žádný
        výhled — proto smí stát vedle deklarovaných cílů, aniž by se to smíchalo.
      */}
      <ZpusobyVUziti />

      <p className="mt-8 text-drobne leading-relaxed text-tlum2">
        Tahle stránka je náš rozbor veřejných zdrojů, ne úřední zpráva ani předpověď. Chyba nebo lepší zdroj? Napište přes <Link href="/o-projektu/" className="odkaz">O projektu</Link>.
      </p>
    </div>
  );
}
