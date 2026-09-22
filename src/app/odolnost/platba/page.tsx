import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { PlatbaVysledek } from "@/components/premium-klient";

export const metadata: Metadata = { title: "Stav platby", robots: { index: false, follow: false } };

/* Návrat z platební brány. Stránka nic neodemyká; stav čte z API. */
export default function PlatbaStranka() {
  return (
    <>
      <HlavickaStranky stitek="Odolnost domácnosti" ikona="stit" nadpis="Stav platby" popis="Odemknutí se zapíše, až ho potvrdí brána. Sem se jen díváte, jak to dopadlo." />
      <Obsah>
        <PlatbaVysledek />
      </Obsah>
    </>
  );
}
