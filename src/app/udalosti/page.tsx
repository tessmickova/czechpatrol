import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { UdalostiKlient } from "@/components/udalosti-klient";
import { CoDal } from "@/components/co-dal";
import { incidenty, kandidati, nepotvrzene, nepotvrzeneZaznamy, opravy } from "@/lib/data";

export const metadata: Metadata = {
  title: "Události",
  description: "Ověřené bezpečnostní události z Česka a Evropy s uvedenými zdroji. Filtrování podle země, tématu, období a stavu ověření.",
};

export default function Udalosti() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Události"
        nadpis="Co se stalo a odkud to víme"
        uvod="Případy, jejich pokračování, opatření a prohlášení. Každý záznam má zdroj. Jedna událost = jeden záznam, i když o ní vyjde deset článků."
      />
      <div className="mt-12 sm:mt-16" />
      <UdalostiKlient zaznamy={incidenty()} neprosle={nepotvrzene()} kandidati={kandidati()} nepotvrzene={nepotvrzeneZaznamy()} opravy={opravy()} />
      <CoDal bez="/udalosti/" />
    </div>
  );
}
