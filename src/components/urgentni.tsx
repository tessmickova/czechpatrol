import Link from "next/link";
import { datumCasPraha, datumPraha } from "@/lib/cas";
import { vystraha } from "@/lib/data";
import type { Kandidat } from "@/lib/typy";
import { Ikona } from "./ikony";

/*
  Urgentní upozornění.

  Stojí hned pod úvodem — na místě, kde dřív byl rámeček s pěti velkými čísly
  (ta jsou teď v úvodu). Odpovídá na otázku, se kterou sem člověk ve strachu
  chodí: děje se právě teď něco, kvůli čemu bych měl něco dělat?

  Tři stupně, v tomhle pořadí:
    1. platná mimořádná výstraha — vyhlášená mobilizace, krizové vysílání,
    2. zachycené naléhavé signály, které ještě nikdo neověřil,
    3. nic z toho — a to se taky napíše, protože prázdné místo by čtenář
       četl jako „web nefunguje", ne jako „je klid".

  Neověřené je vždy označené jako neověřené. Rozdíl mezi „platí" a „někdo to
  píše" je jediná věc, kterou tahle sekce nesmí rozmazat.
*/

const NAZVY = {
  "mobilizace-rusko": "vyhlášení mobilizace v Rusku",
  "priprava-mobilizace": "přípravy mobilizace v Rusku",
  "krizove-vysilani": "krizové vysílání Českého rozhlasu",
  "clanek-nato": "článek 4 nebo 5 NATO",
  "pravni-stav-cr": "mimořádný právní stav v ČR",
  "hranice-cr": "uzavření hranic ČR",
  "vzdusny-prostor-nato": "narušení vzdušného prostoru Aliance",
} as const;

export function UrgentniUpozorneni({
  kandidati,
  zkontrolovano,
}: {
  kandidati: Kandidat[];
  /** Kdy se naposledy četly zdroje. Bez toho je „nic urgentního" slib bez krytí. */
  zkontrolovano: string | null;
}) {
  const v = vystraha();
  const naliehave = kandidati
    .filter((k) => k.naliehave)
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, 3);

  return (
    <section aria-labelledby="urgentni-nadpis" className="mt-4 overflow-hidden rounded-[20px] border border-linka2 bg-plocha">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-linka2 px-4 py-2.5">
        <h2 id="urgentni-nadpis" className="stitek flex items-center gap-1.5">
          <Ikona nazev="sirena" velikost={12} tah={2} />
          Urgentní upozornění
        </h2>
        {zkontrolovano && (
          <span className="cislice text-mikro text-tlum2">zdroje čteny {datumCasPraha(zkontrolovano)}</span>
        )}
      </div>

      {v ? (
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="stitek-tmavy rounded-full border border-akcent/60 px-2 py-[3px] text-akcent">Platí</span>
            <span className="cislice text-mikro text-tlum2">{datumCasPraha(v.kdy)}</span>
          </div>
          <p className="mt-1.5 text-vetsi font-bold leading-snug text-inkoust">{v.nadpis}</p>
          <p className="mt-1 text-male leading-snug text-tlum">{v.text}</p>
        </div>
      ) : naliehave.length > 0 ? (
        <div className="px-4 py-3">
          <p className="text-male text-tlum">
            <b className="text-inkoust">Žádná výstraha neplatí.</b> Sběr ale zachytil zprávy, které čekají na ověření
            — nejsou potvrzené a do počtů nevstupují.
          </p>
          <ul className="mt-2 space-y-1.5">
            {naliehave.map((k) => (
              <li key={k.id} className="flex flex-wrap items-baseline gap-x-2 text-male">
                <span className="cislice shrink-0 text-mikro text-tlum2">{datumPraha(k.publikovano ?? k.zachyceno)}</span>
                <span className="stitek-tmavy shrink-0 text-akcent">{NAZVY[k.naliehave!.druh]}</span>
                <a href={k.zdroj.url} target="_blank" rel="noopener noreferrer" className="min-w-0 text-tlum hover:text-inkoust">
                  {k.titulek}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
          <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-klid" />
          <p className="text-male text-tlum">
            <b className="text-inkoust">Teď nic urgentního.</b> Ve sledovaných zdrojích není vyhlášená mobilizace,
            krizové vysílání ani mimořádný právní stav.
          </p>
        </div>
      )}

      <div className="border-t border-linka2 px-4 py-2">
        <Link href="/odber/" className="stitek text-tlum2 transition-colors hover:text-inkoust">
          Jak se to dozvíte hned →
        </Link>
      </div>
    </section>
  );
}
