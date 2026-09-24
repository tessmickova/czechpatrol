"use client";

import { useState, type ReactNode } from "react";
import { Ikona, type NazevIkony } from "./ikony";

/** Tlačítko, které rozbalí obsah pod ním. Obsah může přijít ze serveru. */
export function Rozbalovac({
  tlacitko, ikona = "terc", children, otevreno: vychozi = false, akcent = false,
}: { tlacitko: string; ikona?: NazevIkony; children: ReactNode; otevreno?: boolean; akcent?: boolean }) {
  const [otevreno, setOtevreno] = useState(vychozi);
  return (
    <>
      <button
        type="button"
        onClick={() => setOtevreno((x) => !x)}
        aria-expanded={otevreno}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-drobne font-bold uppercase tracking-[0.05em] transition-colors ${
          otevreno
            ? "border-akcent bg-akcent text-papir"
            : akcent
              ? "border-stari/60 bg-stari/15 text-stari-text hover:bg-stari/25"
              : "border-akcent/60 bg-akcent/15 text-akcent-svetla hover:bg-akcent/25"
        }`}
      >
        <Ikona nazev={ikona} velikost={13} tah={2} />
        {tlacitko}
        <Ikona nazev="dolu" velikost={12} tah={2.2} trida={`transition-transform ${otevreno ? "rotate-180" : ""}`} />
      </button>
      {otevreno && <div className="rozbaleno mt-3 w-full">{children}</div>}
    </>
  );
}
