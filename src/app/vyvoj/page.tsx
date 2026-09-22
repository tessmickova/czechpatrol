import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky, NadpisSekce } from "@/components/nadpisy";
import { Otaznik } from "@/components/zaklad";
import { GrafMesicuPripadu } from "@/components/graf-mesicu-pripadu";
import { GrafTrendu, TabulkaTydnu } from "@/components/trend";
import { sklon, Vlajka } from "@/components/zeme";
import { pocty, podlePuvodce, podleZemi, pripadyPoMesicich, vyber } from "@/lib/agregace";
import { datumPraha } from "@/lib/cas";
import { lidskaZmena } from "@/lib/archiv-text";
import { archiv, incidenty, mesice, tydny } from "@/lib/data";
import { UROVNE } from "@/lib/skala";
import type { Uroven } from "@/lib/typy";

export const metadata: Metadata = {
  title: "Vývoj",
  description: "Jak se měnil počet případů a hodnocení v čase. Objem sledování a závažnost zvlášť, chybějící data jako chybějící.",
};

/*
  Vývoj v čase. Dvě různé věci, dva různé grafy:
  - objem: kolik jedinečných případů jsme zjistili v měsíci,
  - závažnost: jak se měnilo hodnocení po týdnech.
  Každý graf má textový ekvivalent, aby ho přečetl i ten, kdo grafy nevidí.
*/
export default function Vyvoj() {
  const vse = incidenty();
  const rada = pripadyPoMesicich(vse);
  const hodnoceni = new Map<string, Uroven>(mesice().mesice.filter((m) => m.uroven).map((m) => [m.mesic, m.uroven!]));
  const tydenni = tydny();
  const rok = new Date().getUTCFullYear();
  const letos = vyber(vse, { odRoku: rok });
  const p = pocty(letos, `rok ${rok}`);
  const zeme = podleZemi(letos).filter((z) => z.celkem > 0 || z.kodZeme === "CZ");
  const puv = podlePuvodce(letos);
  // Jen změny, které něco znamenají: hodnocení, právní stav, NATO, začátek archivu.
  // Počty zveřejněných událostí a přechody „bez zdroje ↔ běžný“ jsou provozní šum.
  const vyznamna = (z: string) => /^(celková úroveň|právní stav|NATO|začátek)/.test(z) || (z.startsWith("provoz") && !/bez-zdroje/.test(z));
  const zmenyArchivu = [...archiv().snimky].reverse()
    .map((s) => ({ ...s, zmeny: s.zmeny.filter(vyznamna).map(lidskaZmena) }))
    .filter((s) => s.zmeny.length).slice(0, 12);
  const poRoce = new Map<string, number>();
  for (const m of rada) if (m.pripady) poRoce.set(m.mesic.slice(0, 4), (poRoce.get(m.mesic.slice(0, 4)) ?? 0) + m.pripady);
  const prvniPlny = rada.find((m) => m.uplne)?.mesic;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Vývoj"
        nadpis="Jak se situace mění v čase"
        uvod={<>Dvě různé věci zvlášť: <b className="font-semibold text-akcent">kolik</b> případů jsme zjistili a <b className="font-semibold text-akcent">jak závažná</b> je situace. Víc záznamů neznamená horší situaci — často jen lepší sledování.</>}
      />

      <section aria-labelledby="objem" className="nalet mt-16 border-t border-linka pt-12 sm:mt-24 sm:pt-16">
        <NadpisSekce
          id="objem"
          stitek="Kolik toho je"
          nadpis="Případy po měsících"
          popis={<>Počítá se den, kdy věc vyšla najevo. Aktualizace, opatření a prohlášení se nepočítají. Plný monitoring běží od {prvniPlny ? prvniPlny.split("-").reverse().join("/") : "—"}; starší záznamy jsme doplnili zpětně, proto jsou ty měsíce šrafované (hodnota chybí, není nula). Sloupec = počet jedinečných případů podle data zjištění.</>}
        />
        <GrafMesicuPripadu rada={rada} hodnoceni={hodnoceni} />
        <details className="mt-3">
          <summary className="min-h-[36px] cursor-pointer text-male font-semibold text-tlum hover:text-inkoust">Stejná data jako tabulka po letech <Otaznik popis={<span className="block">Roky 2010–2013: žádný záznam, který by prošel ověřením. Neznamená to, že se nic nestalo.</span>} /></summary>
          <table className="mt-2 w-full max-w-[420px] text-left text-male">
            <thead><tr className="border-b border-linka"><th className="stitek py-1.5 font-medium">Rok</th><th className="stitek py-1.5 text-right font-medium">Případů</th><th className="stitek py-1.5 text-right font-medium">Pokrytí</th></tr></thead>
            <tbody>
              {[...poRoce.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([r, n]) => (
                <tr key={r} className="border-b border-linka2 last:border-0">
                  <td className="cislice py-1.5">{r}</td>
                  <td className="cislice py-1.5 text-right text-inkoust">{n}</td>
                  <td className="py-1.5 text-right text-tlum2">{prvniPlny && r >= prvniPlny.slice(0, 4) ? "monitoring" : "zpětně doplněno"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section aria-labelledby="zavaznost" className="nalet mt-16 border-t border-linka pt-12 sm:mt-24 sm:pt-16">
        <NadpisSekce
          id="zavaznost"
          stitek="Jak je to vážné"
          nadpis="Hodnocení po týdnech"
          popis={<>Hodnocení projektu podle <Link href="/metodika/" className="odkaz">metodiky</Link>, letos týden po týdnu. Svislá osa je stupnice úrovní, ne počet. Týdny bez hodnocení zůstávají prázdné.</>}
        />
        <GrafTrendu tydny={tydenni} />
        <details className="mt-3">
          <summary className="min-h-[36px] cursor-pointer text-male font-semibold text-tlum hover:text-inkoust">Týdenní přehled jako tabulka</summary>
          <div className="mt-2"><TabulkaTydnu tydny={tydenni} /></div>
        </details>
      </section>

      <section aria-labelledby="zmeny" className="nalet mt-16 border-t border-linka pt-12 sm:mt-24 sm:pt-16">
        <NadpisSekce
          id="zmeny"
          stitek="Co se úředně změnilo"
          nadpis="Významné změny stavu"
          popis="Z archivu: kdy se změnilo hodnocení, právní stav nebo stav NATO. Zapisujeme jen skutečnou změnu, ne každý den znovu."
        />
        {zmenyArchivu.length ? (
          <ol className="divide-y divide-linka2 border-y border-linka2">
            {zmenyArchivu.map((s) => (
              <li key={s.kdy} className="flex gap-4 py-2.5 text-zaklad">
                <span className="cislice w-[92px] shrink-0 text-male text-tlum">{datumPraha(s.kdy)}</span>
                <span className="min-w-0">
                  {s.uroven && <span className="mr-2 text-drobne text-tlum2">{UROVNE[s.uroven].nazev}</span>}
                  {s.zmeny.join(" · ")}
                </span>
              </li>
            ))}
          </ol>
        ) : <p className="text-zaklad text-tlum">Archiv zatím nezachytil žádnou změnu.</p>}
      </section>

      <section aria-labelledby="kde" className="nalet mt-16 border-t border-linka pt-12 sm:mt-24 sm:pt-16">
        <NadpisSekce
          id="kde"
          stitek={`Rok ${rok}`}
          nadpis="Kde se to dělo a kdo za tím stojí"
          popis={<>{p.pripady} {sklon(p.pripady, "případ", "případy", "případů")}, {p.aktualizace} {sklon(p.aktualizace, "aktualizace", "aktualizace", "aktualizací")}, {p.opatreni} opatření a {p.reakce} {sklon(p.reakce, "reakce", "reakce", "reakcí")}. Česko uvádíme vždy první, i když v něm nic není.</>}
        />
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-male">
              <thead>
                <tr className="border-b border-linka">
                  <th className="stitek py-2 pr-3 font-medium">Země</th>
                  <th className="stitek py-2 pr-3 text-right font-medium">Případy</th>
                  <th className="stitek py-2 pr-3 text-right font-medium">s potvrzeným pachatelem</th>
                  <th className="stitek py-2 pr-3 text-right font-medium">Opatření</th>
                  <th className="stitek py-2 pr-3 text-right font-medium">Reakce</th>
                  <th className="stitek py-2 pr-3 font-medium">Nejzávažnější</th>
                  <th className="stitek py-2 font-medium">Poslední</th>
                </tr>
              </thead>
              <tbody>
                {zeme.map((z) => (
                  <tr key={z.kodZeme} className="border-b border-linka2 last:border-0">
                    <td className="py-2 pr-3"><Link href={`/udalosti/?zeme=${z.kodZeme}&obdobi=letos`} className="inline-flex min-h-[36px] items-center gap-2 font-semibold text-inkoust hover:text-akcent-svetla"><Vlajka kod={z.kodZeme} /> {z.zeme}</Link></td>
                    <td className="cislice py-2 pr-3 text-right text-inkoust">{z.pripady}</td>
                    <td className="cislice py-2 pr-3 text-right text-tlum">{z.pripadyPotvrzenyPachatel}</td>
                    <td className="cislice py-2 pr-3 text-right text-tlum">{z.opatreni}</td>
                    <td className="cislice py-2 pr-3 text-right text-tlum">{z.reakce}</td>
                    <td className="py-2 pr-3 text-tlum">{z.nejvyssi ? UROVNE[z.nejvyssi].nazev : "—"}</td>
                    <td className="cislice whitespace-nowrap py-2 text-tlum">{z.posledni ? datumPraha(z.posledni) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1.5"><span className="stitek">Kdo za případy stojí</span><Otaznik popis={<span className="block">Do hodnocení projektu tento rozpad nevstupuje.</span>} /></div>
            <ul className="divide-y divide-linka2 border-y border-linka2">
              {puv.skupiny.map((s) => (
                <li key={s.klic} className="py-2 text-zaklad">
                  <div className="flex items-center gap-3">
                    <span className={s.pocet ? "font-semibold text-inkoust" : "text-tlum2"}>{s.nazev}</span>
                    <span className="cislice ml-auto text-vetsi font-bold text-inkoust">{s.pocet}</span>
                  </div>
                  {s.pocet > 0 && s.klic !== "neznamy" && (
                    <div className="text-drobne text-tlum2">{s.potvrzeno} potvrzeno · {s.vysetruje} vyšetřuje se · {s.podezreni} podezření bez potvrzení</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
