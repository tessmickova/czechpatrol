import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { SeznamZdroju } from "@/components/zdroje";
import { Karta } from "@/components/zaklad";
import { vsechnyZdroje } from "@/lib/data";
import { KontrolaPokryti } from "@/components/kontrola-pokryti";

export const metadata: Metadata = {
  title: "Zdroje",
  description: "Přehled všech zdrojů, ze kterých web čerpá, včetně jejich typu a pořadí důvěryhodnosti.",
};

const PORADI = [
  "oficiální orgán — policie, vláda, NATO, EU",
  "mezinárodní agentura — Reuters, AP, AFP",
  "kvalitní národní médium",
  "kvalitní regionální médium",
  "analytický zdroj",
];

export default function Zdroje() {
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
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-x-12">
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

          </Karta>

          <Karta className="p-5 sm:p-6">
            <h2 className="podnadpis mb-4 text-vetsi">Použité zdroje</h2>
            <SeznamZdroju zdroje={vsechnyZdroje()} />
          </Karta>
        </div>
      </Obsah>
    </>
  );
}
