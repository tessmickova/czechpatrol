import type { Metadata } from "next";
import { SeznamSFiltry } from "@/components/filtry";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { incidenty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Události",
  description: "Ověřené bezpečnostní události z Česka a Evropy s uvedenými zdroji, filtrovatelné podle oblasti, závažnosti a období.",
};

export default function Udalosti() {
  return (
    <>
      <HlavickaStranky
        ikona="oko"
        stitek="Události"
        nadpis="Ověřené události se zdrojem"
        popis="Každý záznam má datum události i datum zjištění. Jedna událost se počítá jednou, i když o ní vyjde více článků."
      />
      <Obsah>
        <SeznamSFiltry incidenty={incidenty()} odkdyCervenec="2026-07-01T00:00:00Z" />
      </Obsah>
    </>
  );
}
