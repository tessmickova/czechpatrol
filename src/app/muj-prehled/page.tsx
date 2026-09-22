import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { MujPrehledKlient } from "@/components/muj-prehled-klient";
import { incidenty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Můj přehled",
  description: "Sledované země a témata a uložené události. Pro přihlášené; výběr zůstává jen v tomto zařízení, bez polohy.",
};

export default function MujPrehled() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Můj přehled"
        nadpis="Vyberte si, co chcete vidět první"
        uvod="Jen pro přihlášené. Výběr se ukládá ve vašem zařízení, bez polohy a bez e-mailu."
      />
      <div className="mt-12 sm:mt-16" />
      <MujPrehledKlient zaznamy={incidenty()} />
    </div>
  );
}
