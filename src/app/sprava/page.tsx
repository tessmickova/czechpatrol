import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { SpravaKlient } from "@/components/sprava-klient";

export const metadata: Metadata = { title: "Správa", robots: { index: false, follow: false } };

export default function SpravaStranka() {
  return (
    <>
      <HlavickaStranky
        stitek="Správa"
        ikona="zamek"
        nadpis="Účty, role a zprávy partnerů"
        popis="Jen pro správce. Role přiděluje člověk, zprávy partnerů schvaluje člověk, každý zásah zůstává v auditu."
      />
      <p className="mb-6 text-male"><a href="/sprava/navstevnost/" className="odkaz">Návštěvnost, prokliky a teplotní mapa →</a> · <a href="/sprava/opravy/" className="odkaz">Opravy dat →</a></p>
      <Obsah>
        <SpravaKlient />
      </Obsah>
    </>
  );
}
