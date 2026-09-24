import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { PripravenostKlient } from "@/components/pripravenost-klient";
import { SidebarWebu } from "@/components/sidebar-webu";
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
        uvod="Stát už provozuje nástroje, které v krizi pomohou. Tady je seznam a co si u nich nastavit předem. CzechPatrol žádný z nich nenahrazuje."
      />
      <div className="mt-16 grid gap-10 sm:mt-24 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-16">
        <div className="min-w-0"><PripravenostKlient nastroje={oficialniNastroje()} /></div>
        <SidebarWebu />
      </div>
    </div>
  );
}
