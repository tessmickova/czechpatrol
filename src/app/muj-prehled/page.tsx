import type { Metadata } from "next";
import { MujPrehledKlient } from "@/components/muj-prehled-klient";
import { incidenty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Můj přehled",
  description: "Sledované země a témata a uložené události. Vše uložené jen v tomto zařízení, bez účtu a bez polohy.",
};

export default function MujPrehled() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 max-w-[64ch]">
        <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">Můj přehled</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-tlum">Vyberte, co chcete vidět jako první. Bez účtu, bez polohy.</p>
      </div>
      <MujPrehledKlient zaznamy={incidenty()} />
    </div>
  );
}
