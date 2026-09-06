import type { Metadata } from "next";
import { UdalostiKlient } from "@/components/udalosti-klient";
import { incidenty, nepotvrzene } from "@/lib/data";

export const metadata: Metadata = {
  title: "Události",
  description: "Ověřené bezpečnostní události z Česka a Evropy s uvedenými zdroji. Filtrování podle země, tématu, období a stavu ověření.",
};

export default function Udalosti() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 max-w-[64ch]">
        <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">Události</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-tlum">
          Případy, jejich aktualizace, oficiální opatření a prohlášení — vždy se zdrojem. Jedna událost se počítá jednou,
          i když o ní vyjde více článků. Co se nepotvrdilo nebo bylo vyvráceno, je tu také, ale do počtů nevstupuje.
        </p>
      </div>
      <UdalostiKlient zaznamy={incidenty()} neprosle={nepotvrzene()} />
    </div>
  );
}
