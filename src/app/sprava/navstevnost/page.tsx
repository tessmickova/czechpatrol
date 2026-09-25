import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { NavstevnostKlient } from "@/components/navstevnost-klient";

export const metadata: Metadata = { title: "Návštěvnost", robots: { index: false, follow: false } };

export default function NavstevnostStranka() {
  return (
    <>
      <HlavickaStranky
        stitek="Správa"
        ikona="graf"
        nadpis="Návštěvnost, prokliky a teplotní mapa"
        popis="Jen pro správce. Součty po dnech bez identifikace: zobrazení, kliknutí na prvky, původ návštěvy, zařízení a mřížka kliknutí a pohybu myši."
      />
      <Obsah>
        <NavstevnostKlient />
      </Obsah>
    </>
  );
}
