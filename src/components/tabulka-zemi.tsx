import Link from "next/link";
import { podleZemi, pripady } from "@/lib/agregace";
import { incidenty, tlakZeme } from "@/lib/data";
import { PASMA, UROVNE } from "@/lib/skala";
import { Vlajka } from "./zeme";
import { Otaznik } from "./zaklad";

/*
  Typy událostí po zemích — tabulka místo karuselu pavučin.

  Karusel měl třináct karet a v každé pavučinu se šesti osami. Hodnoty jsou
  ale skoro všude „vysoká" nebo „zvýšená", takže obrazce splývaly do stejného
  malého šestiúhelníku; pruhy pod nimi říkaly totéž podruhé a jedna osa
  („přímé vojenské riziko") byla u každé země prázdná, protože se pro země
  nehodnotí. Smyslem sekce přitom bylo porovnání: kde se dělá co a jak se
  to liší od Česka. V karuselu vidíte čtyři karty a porovnáváte z paměti.

  Tabulka staví země pod sebe a typy vedle sebe, takže se porovnává očima.
  Buňka nese tečku a slovo — barva nikdy nenese význam sama (docs/ZNACKA.md).
  Prázdná buňka je pomlčka, ne nula: znamená, že takový záznam nemáme, ne že
  se nic nestalo.
*/

/** Krátké nadpisy sloupců; plné názvy os jsou u pavučiny Evropy vedle. */
const SLOUPCE: { klic: string; nazev: string }[] = [
  { klic: "sabotaze", nazev: "Sabotáže" },
  { klic: "atribuce", nazev: "Vyšetřování" },
  { klic: "kyber", nazev: "Kyber" },
  { klic: "drony", nazev: "Drony" },
  { klic: "infrastruktura", nazev: "Infrastruktura" },
];

export function TabulkaZemi({ maxZemi = 12 }: { maxZemi?: number }) {
  const zeme = podleZemi(pripady(incidenty()))
    .filter((z) => z.pripady > 0)
    .slice(0, maxZemi);
  if (!zeme.length) return null;

  return (
    <section aria-label="Typy událostí po zemích" className="flex h-full flex-col overflow-hidden rounded-[22px] bg-plocha">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="flex items-center gap-1.5"><span className="stitek">Podle zemí</span><Otaznik popis={<span className="block">Nejvyšší doložená úroveň od roku 2014. Pomlčka = záznam nemáme, ne že se nic nestalo. Vojenské riziko hodnotíme jen pro Evropu jako celek.</span>} /></span>
      </div>

      {/*
        Vodorovné rolování s přilepeným prvním sloupcem. Šest sloupců se na
        390 px nevejde a zkracovat slova úrovní na zkratky by bylo horší než
        rolovat: slovo je tu to hlavní sdělení.
      */}
      <div className="pas-scroll pas-okraj min-h-0 flex-1 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-male">
          <thead>
            <tr className="border-b border-linka2">
              <th scope="col" className="sticky left-0 z-10 bg-plocha px-4 py-2 text-left">
                <span className="stitek">Země</span>
              </th>
              {SLOUPCE.map((s) => (
                <th key={s.klic} scope="col" className="px-3 py-2 text-left">
                  <span className="stitek">{s.nazev}</span>
                </th>
              ))}
              <th scope="col" className="px-4 py-2 text-right">
                <span className="stitek">Záznamů</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linka2">
            {zeme.map((z) => {
              const tlak = tlakZeme(z.kodZeme);
              const podle = new Map(tlak.podkategorie.map((o) => [o.klic, o.uroven]));
              return (
                <tr key={z.kodZeme} className="hover:bg-plocha2">
                  <th scope="row" className="sticky left-0 z-10 bg-plocha px-4 py-2 text-left font-semibold text-inkoust">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <Vlajka kod={z.kodZeme} />
                      {z.zeme}
                    </span>
                  </th>
                  {SLOUPCE.map((s) => {
                    const u = podle.get(s.klic) ?? null;
                    const t = u ? PASMA[UROVNE[u].pasmo] : null;
                    return (
                      <td key={s.klic} className="px-3 py-2">
                        {u && t ? (
                          <span className="flex items-center gap-1.5 whitespace-nowrap text-tlum">
                            <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${t.tecka}`} />
                            {UROVNE[u].nazev.toLowerCase()}
                          </span>
                        ) : (
                          /* Pomlčka, ne nula: takový záznam nemáme. */
                          <span className="text-tlum2" aria-label="bez záznamu">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right">
                    <Link href={`/zeme/${z.kodZeme.toLowerCase()}/`} className="cislice inline-flex min-h-[32px] items-center gap-1 whitespace-nowrap text-inkoust hover:text-akcent">
                      {z.pripady} <span aria-hidden>→</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </section>
  );
}
