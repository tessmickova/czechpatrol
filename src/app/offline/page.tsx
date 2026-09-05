import type { Metadata } from "next";
import Link from "next/link";
import { Ikona } from "@/components/ikony";

export const metadata: Metadata = { title: "Bez připojení", robots: { index: false } };

/** Stránka, kterou service worker ukáže, když není síť a stránka není v mezipaměti. */
export default function Offline() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-24 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] border border-akcent/40 bg-akcent/10 text-akcent">
        <Ikona nazev="komunikace" velikost={30} />
      </span>
      <h1 className="nadpis svit mt-6 text-[34px]">Bez připojení</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-tlum">
        Tahle stránka není uložená pro čtení bez sítě. Přehled, který jste už otevřeli, je
        k dispozici — poslední ověřený stav platí, dokud ho nepřepíše nový.
      </p>
      <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full border border-akcent/60 bg-akcent/15 px-5 py-3 text-[14px] font-bold uppercase tracking-[0.05em] text-akcent-svetla">
        Zpět na přehled
      </Link>
    </div>
  );
}
