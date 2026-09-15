import { kandidati } from "@/lib/data";
import { casPraha, datumPraha } from "@/lib/cas";
import { Ikona, type NazevIkony } from "./ikony";
import { Sdeleni } from "./ui";

/*
  Signály z profilů na sociálních sítích.

  Ministr nebo úřad často řeknou věc nejdřív na svém profilu. Tenhle blok je
  ukazuje hned, ale bez jakéhokoli předstírání: je to NEOVĚŘENÝ signál, ne
  záznam. Do žádného počtu nevstupuje a závažnost nezvyšuje.

  Řadí se podle času, nejnovější nahoře, a u každého je vidět síť i profil.
  Bez toho by čtenář nepoznal, jestli mluví ministerstvo, nebo účet, který se
  za ministerstvo jen vydává — a přesně tohle je způsob, jak se šíří podvrhy.

  Když žádný signál není, blok se nezobrazí. Prázdná sekce s nadpisem by
  tvrdila, že se nic neděje; přitom by znamenala jen to, že profily zatím
  nesledujeme.
*/

const IKONY_SITI: Record<string, NazevIkony> = {
  mastodon: "komunikace",
  bluesky: "komunikace",
  telegram: "komunikace",
};

export function SignalySiti({ maxPolozek = 5 }: { maxPolozek?: number }) {
  const signaly = kandidati()
    .filter((k) => k.zdroj.typ === "social")
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, maxPolozek);

  if (!signaly.length) return null;

  return (
    <section aria-label="Signály z profilů" className="overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
      <div className="flex items-center justify-between gap-2 border-b border-linka2 px-4 py-2">
        <span className="stitek">Signály z profilů</span>
        <span className="text-[11.5px] text-tlum2">neověřeno</span>
      </div>

      <div className="px-4 pt-3">
        <Sdeleni ton="neutral" ikona="info">
          Příspěvek na profilu je signál, ne doklad. Do počtů nevstupuje a závažnost nezvyšuje.
        </Sdeleni>
      </div>

      <ol className="divide-y divide-linka2">
        {signaly.map((k) => {
          const kdy = k.publikovano ?? k.zachyceno;
          const sit = k.zeSite?.sit ?? "";
          return (
            <li key={k.id} className="px-4 py-2.5">
              <div className="flex items-center gap-2 text-[12px] text-tlum2">
                <Ikona nazev={IKONY_SITI[sit] ?? "komunikace"} velikost={13} tah={1.9} trida="shrink-0" />
                <span className="truncate">{k.zdroj.nazev}</span>
                <span aria-hidden>·</span>
                <span className="cislice shrink-0">{datumPraha(kdy)} {casPraha(kdy)}</span>
              </div>
              <a
                href={k.zdroj.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-[14px] leading-snug text-inkoust hover:text-akcent-svetla"
              >
                {k.titulek}
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
