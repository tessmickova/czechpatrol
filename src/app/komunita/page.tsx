import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Ikona, type NazevIkony } from "@/components/ikony";
import { Karta } from "@/components/zaklad";
import { KOMUNITA } from "@/config/web";

export const metadata: Metadata = {
  title: "Komunita",
  description: "Otevřená data, tipy na události a opravy chyb.",
};

const MISTA: { klic: string; nazev: string; popis: string; ikona: NazevIkony; odstin: "modra" | "zelena" | "pisek" | "slez" }[] = [
  {
    klic: "github",
    nazev: "Data i kód",
    popis: "Každá změna hodnoty je samostatný commit. Dá se dohledat, co web kdy tvrdil a odkud to měl.",
    ikona: "kyber",
    odstin: "modra",
  },
  {
    klic: "diskuse",
    nazev: "Diskuse o metodice",
    popis: "Připadá vám hodnocení špatně nastavené? Tady se o tom dá vést spor.",
    ikona: "vaha",
    odstin: "slez",
  },
  {
    klic: "skupina",
    nazev: "Skupina",
    popis: "Místo, kde se sdílí odkazy na primární zdroje dřív, než se dostanou do přehledu.",
    ikona: "komunikace",
    odstin: "zelena",
  },
  {
    klic: "tipy",
    nazev: "Poslat tip nebo opravu",
    popis: "Nejcennější je odkaz na primární zdroj. Tvrzení bez zdroje nezveřejňujeme.",
    ikona: "dokument",
    odstin: "pisek",
  },
];

export default function Komunita() {
  return (
    <>
      <HlavickaStranky
        ikona="globus"
        stitek="Komunita"
        nadpis="Web stojí a padá s tím, kdo ho kontroluje"
        popis="Data jsou otevřená. Když najdete chybu, chceme o ní vědět."
      />
      <Obsah>
        <ul className="grid gap-4 sm:grid-cols-2">
          {MISTA.map((m) => {
            const url = KOMUNITA[m.klic] ?? "";
            const obsah = (
              <>
                <span className="mb-5 flex items-start justify-between gap-3">
                  <span className="grid h-[40px] w-[40px] place-items-center rounded-[14px] border border-white/70 bg-white/70">
                    <Ikona nazev={m.ikona} velikost={19} />
                  </span>
                  {!url && (
                    <span className="stitek-tmavy rounded-full border border-white/80 bg-white/60 px-2.5 py-1 text-tlum">
                      Připravujeme
                    </span>
                  )}
                </span>
                <span className="block text-[17px] font-semibold tracking-[-0.025em]">{m.nazev}</span>
                <span className="mt-2 block text-[13.5px] leading-relaxed text-tlum">{m.popis}</span>
              </>
            );
            return (
              <li key={m.klic}>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block h-full">
                    <Karta odstin={m.odstin} zdvih className="flex h-full flex-col p-5 sm:p-6">
                      {obsah}
                    </Karta>
                  </a>
                ) : (
                  <Karta odstin={m.odstin} className="flex h-full flex-col p-5 opacity-80 sm:p-6">
                    {obsah}
                  </Karta>
                )}
              </li>
            );
          })}
        </ul>
      </Obsah>
    </>
  );
}
