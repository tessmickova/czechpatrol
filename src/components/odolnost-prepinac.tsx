"use client";

import { useEffect, useState, useTransition } from "react";
import { PORADI_SEZNAMU, seznamy, type KlicSeznamu } from "@/lib/priprava";
import { OdolnostKlient } from "./odolnost-klient";
import { SeznamyZasob } from "./seznamy-zasob";

/*
  Přepínač na stránce Odolnost (24. 9. 2026): kalkulačka, nebo jeden ze tří
  seznamů zásob. Volba je v adrese (?seznam=72h), takže odkaz z karty
  „Připravit teď“ otevře rovnou správný seznam a zvýrazní položku.
*/
type Volba = "kalkulacka" | KlicSeznamu;
const JE_SEZNAM = (v: string | null): v is KlicSeznamu => (PORADI_SEZNAMU as string[]).includes(v ?? "");

export function OdolnostPrepinac() {
  const [volba, setVolba] = useState<Volba>("kalkulacka");
  /*
    Obsah se přepíná jako přechod (26. 9. 2026, výkon): záložka se zvýrazní
    hned po klepnutí a těžší kalkulačka nebo seznam se vykreslí za ní.
    Dřív klepnutí čekalo na celé vykreslení (~180 ms na telefonu).
  */
  const [zobrazeno, setZobrazeno] = useState<Volba>("kalkulacka");
  const [, prechod] = useTransition();
  const [zvyrazni, setZvyrazni] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const s = q.get("seznam");
    if (JE_SEZNAM(s)) { setVolba(s); setZobrazeno(s); }
    setZvyrazni(q.get("zvyrazni"));
  }, []);
  const zmen = (v: Volba) => {
    setVolba(v);
    prechod(() => setZobrazeno(v));
    const q = new URLSearchParams(window.location.search);
    if (v === "kalkulacka") { q.delete("seznam"); q.delete("zvyrazni"); } else q.set("seznam", v);
    if (v !== volba) { q.delete("zvyrazni"); setZvyrazni(null); }
    const dotaz = q.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${dotaz ? `?${dotaz}` : ""}`);
  };
  const volby: { klic: Volba; nazev: string }[] = [{ klic: "kalkulacka", nazev: "Kalkulačka" }, ...seznamy().map((s) => ({ klic: s.klic, nazev: s.nazev }))];
  return (
    <div>
      <div role="tablist" aria-label="Kalkulačka nebo seznam" className="pas-scroll -mx-4 mb-8 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:inline-flex sm:rounded-full sm:border sm:border-linka2 sm:bg-plocha sm:p-1 sm:px-1">
        {volby.map((v) => (
          <button
            key={v.klic}
            type="button"
            role="tab"
            aria-selected={volba === v.klic}
            onClick={() => zmen(v.klic)}
            className={`min-h-[40px] shrink-0 rounded-full px-4 text-male font-semibold transition-colors ${volba === v.klic ? "bg-akcent text-papir" : "text-tlum hover:bg-plocha2 hover:text-inkoust"}`}
          >
            {v.nazev}
          </button>
        ))}
      </div>
      {zobrazeno === "kalkulacka" ? <OdolnostKlient /> : <SeznamyZasob seznam={zobrazeno} zvyrazni={zvyrazni} />}
    </div>
  );
}
