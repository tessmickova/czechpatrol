import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { MujPrehledKlient } from "@/components/muj-prehled-klient";
import { incidenty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Můj přehled",
  description: "Sledované země a témata a uložené události. Vše uložené jen v tomto zařízení, bez účtu a bez polohy.",
};

export default function MujPrehled() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <HlavickaStranky
        stitek="Můj přehled"
        nadpis="Vyberte si, co chcete vidět první"
        uvod="Uloží se to jen ve vašem zařízení. Bez účtu, bez polohy, bez e-mailu."
      />
      <div className="mt-12 sm:mt-16" />
      <MujPrehledKlient zaznamy={incidenty()} />
    </div>
  );
}
