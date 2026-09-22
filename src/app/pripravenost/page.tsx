import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { PripravenostKlient } from "@/components/pripravenost-klient";
import { oficialniNastroje } from "@/lib/data";

export const metadata: Metadata = {
  title: "Jsem připraven/a?",
  description: "Průvodce oficiálními nástroji pro krizi: Záchranka, tísňové linky, varování na mobil, výstrahy ČHMÚ, DROZD, sirény, krizové vysílání, kanál obce. Co si nastavit dřív, než se něco stane.",
};

export default function Pripravenost() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Připravenost"
        nadpis="Jsem připraven/a?"
        uvod="Stát a veřejné instituce už provozují nástroje, které v krizi pomohou. Tohle je jejich seznam a to, co si u nich nastavit dřív, než budou potřeba. Žádný z nich CzechPatrol nenahrazuje."
      />
      <div className="mt-12 sm:mt-16" />
      <PripravenostKlient nastroje={oficialniNastroje()} />
    </div>
  );
}
