import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { SpravaPartneriKlient } from "@/components/sprava-partneri-klient";

export const metadata: Metadata = { title: "Poptávky partnerů", robots: { index: false, follow: false } };

export default function SpravaPartneri() {
  return (
    <>
      <HlavickaStranky stitek="Správa" ikona="srdce" nadpis="Poptávky partnerů" popis="Jen pro správce. Schváleného partnera zapište do data/partneri.json." />
      <Obsah><SpravaPartneriKlient /></Obsah>
    </>
  );
}
