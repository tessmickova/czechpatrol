import type { Metadata } from "next";
import { CoDal } from "@/components/co-dal";
import { HlavickaStranky } from "@/components/nadpisy";
import { SidebarWebu } from "@/components/sidebar-webu";
import { prehledTypu, TypyUtokuPrehled } from "@/components/typy-utoku-prehled";
import { sklon } from "@/components/zeme";

export const metadata: Metadata = {
  title: "Typy útoků a co s nimi",
  description: "Nejčastější typy útoků v Evropě podle naší evidence: drony, sabotáže, útoky na infrastrukturu, kyberútoky, podvody. U každého, jak se připravit předem a co dělat jako občan.",
};

export default function TypyUtoku() {
  const prehled = prehledTypu();
  const zaznamu = prehled.reduce((s, p) => s + p.zaznamu, 0);
  const zprav = prehled.reduce((s, p) => s + p.zprav, 0);
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Připravenost"
        nadpis="Nejčastější typy útoků v Evropě"
        uvod={
          <>
            Pořadí podle naší evidence: {zaznamu} {sklon(zaznamu, "doložený záznam", "doložené záznamy", "doložených záznamů")} a {zprav} {sklon(zprav, "zpráva", "zprávy", "zpráv")} z médií o internetu v Česku.
            Není to evropská statistika, jen to, co prošlo naší kontrolou. U každého typu: co to je, co udělat předem a co dělat, když nastane.
            Rady jsou obecné; závazný postup vydává úřad, na který odkazujeme.
          </>
        }
      />
      <div className="mt-12 grid gap-10 sm:mt-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-16">
        <div className="min-w-0"><TypyUtokuPrehled prehled={prehled} /><CoDal /></div>
        <SidebarWebu />
      </div>
    </div>
  );
}
