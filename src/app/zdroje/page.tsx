import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { SeznamZdroju } from "@/components/zdroje";
import { Karta } from "@/components/zaklad";
import { vsechnyZdroje } from "@/lib/data";
import { TYPY_ZDROJU } from "@/lib/kategorie";
import type { TypZdroje } from "@/lib/typy";
import { KontrolaPokryti } from "@/components/kontrola-pokryti";

export const metadata: Metadata = {
  title: "Zdroje",
  description: "Přehled všech zdrojů, ze kterých web čerpá, včetně jejich typu a pořadí důvěryhodnosti.",
};

/*
  Pořadí podle toho, jak blízko je zdroj věci a jak se dá ověřit — ne podle
  země, značky ani politického spektra (24. 9. 2026). Dřívější seznam
  jmenoval západní agentury na druhém místě a působil jako stranění.
*/
const PORADI = [
  "orgán, který věc sám vyšetřuje nebo provozuje — policie, armáda, úřad, provozovatel infrastruktury, v kterékoli zemi",
  "nezávislé potvrzení z druhé strany — jiný stát, mezinárodní organizace, nebo druhá redakce z jiné země",
  "redakce a agentury, které uvádějí zdroje, podepisují autory a zveřejňují opravy — bez ohledu na zemi; agentura má náskok v rychlosti, ne v pravdivosti",
  "jedna redakce bez potvrzení — signál, ne doklad",
  "sociální sítě a anonymní účty — signál; jistotu nikdy nezvyšují",
];
const ZASADY_ZDROJU = [
  "Zdroje neřadíme podle zeměpisu ani podle politického spektra. Ruský úřad je úřad, ukrajinská redakce je redakce; tvrzení strany konfliktu uvádíme jako její tvrzení a hledáme k němu druhou stranu.",
  "V kanálu u každé zprávy píšeme, kde se o ní píše (úřad, západní, ukrajinská, ruská nezávislá, ruská státní), aby si čtenář mohl udělat obrázek sám.",
  "Média ze sankčního seznamu EU nepoužíváme, protože to zakazuje právo EU. Není to naše hodnocení jejich kvality.",
];

export default function Zdroje() {
  const zdroje = vsechnyZdroje();
  return (
    <>
      <HlavickaStranky
        ikona="dokument"
        stitek="Zdroje"
        nadpis="Odkud informace pocházejí"
        popis="Každé konkrétní tvrzení na webu má uvedený zdroj. Sociální sítě označujeme jako neověřené a samy o sobě nikdy nezvyšují stupeň hrozby."
      />
      <Obsah>
        <div className="mb-10">
          <KontrolaPokryti />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-x-16">
          <Karta className="h-fit p-5 sm:p-6">
            <h2 className="podnadpis mb-4 text-vetsi">Pořadí důvěryhodnosti</h2>
            <ol className="space-y-2.5">
              {PORADI.map((p, i) => (
                <li key={i} className="flex gap-3 text-male leading-relaxed text-tlum">
                  <span className="cislice stitek mt-[3px] w-3 shrink-0">{i + 1}</span>
                  {p}
                </li>
              ))}
            </ol>
            <ul className="mt-5 space-y-2 border-t border-linka2 pt-4">
              {ZASADY_ZDROJU.map((z) => (
                <li key={z} className="flex gap-2.5 text-male leading-relaxed text-tlum"><span aria-hidden className="mt-[1px] shrink-0 text-akcent">·</span>{z}</li>
              ))}
            </ul>
          </Karta>

          <Karta className="p-5 sm:p-6">
            <h2 className="podnadpis mb-4 text-vetsi">Použité zdroje</h2>
            {/*
              Seskupeno podle typu a sbalené (26. 9. 2026): jeden seznam přes
              460 zdrojů byl na telefonu 67 obrazovek dlouhý. Počty jsou vidět
              hned, jednotlivé zdroje po rozbalení.
            */}
            <div className="space-y-2">
              {(Object.keys(TYPY_ZDROJU) as TypZdroje[]).map((typ) => {
                const z = zdroje.filter((x) => x.typ === typ);
                if (!z.length) return null;
                return (
                  <details key={typ} className="group rounded-[16px] border border-linka">
                    <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-male font-semibold text-inkoust">
                      <span>{TYPY_ZDROJU[typ].znacka} <span className="cislice font-normal text-tlum2">· {z.length}</span></span>
                      <span aria-hidden className="text-tlum2 transition-transform group-open:rotate-180">▾</span>
                    </summary>
                    <div className="px-4 pb-4">
                      <p className="mb-3 text-mikro text-tlum2">{TYPY_ZDROJU[typ].popis}</p>
                      <SeznamZdroju zdroje={z} husty />
                    </div>
                  </details>
                );
              })}
            </div>
          </Karta>
        </div>
      </Obsah>
    </>
  );
}
