"use client";

import { useEffect, useState } from "react";
import { PRIRUCKY } from "@/lib/letaky";
import { Ikona } from "./ikony";
import { Konfety } from "./konfety";
import { ObalkaPrirucky } from "./obalka-prirucky";

/*
  Oficiální příručky jako karty: náhled obálky, kdo ji vydal, jak dlouho
  čtení trvá, tlačítko ke stažení a „Přečteno“ (jen v prohlížeči).
*/
const KLIC = "cp:prirucky-prectene";

export function PriruckyKarty() {
  const [prectene, setPrectene] = useState<string[]>([]);
  const [oslava, setOslava] = useState(0);
  useEffect(() => {
    try { setPrectene(JSON.parse(localStorage.getItem(KLIC) ?? "[]")); } catch { /* bez úložiště nic */ }
  }, []);
  const prepni = (id: string) => {
    const nove = prectene.includes(id) ? prectene.filter((x) => x !== id) : [...prectene, id];
    if (!prectene.includes(id)) setOslava((n) => n + 1);
    setPrectene(nove);
    try { localStorage.setItem(KLIC, JSON.stringify(nove)); } catch { /* nevadí */ }
  };
  return (
    <div className="relative">
      {oslava > 0 && <Konfety klic={oslava} pocet={14} />}
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="stitek">Oficiální příručky</span>
        <span className="cislice text-drobne text-tlum2">přečteno {prectene.length} z {PRIRUCKY.length}</span>
      </div>
      <ul className="pas-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {PRIRUCKY.map((p) => {
          const hotovo = prectene.includes(p.id);
          return (
            <li key={p.id} className={`w-[200px] shrink-0 snap-start rounded-[18px] border p-3 transition-colors ${hotovo ? "border-klid/60 bg-klid/[0.07]" : "border-linka bg-plocha"}`}>
              <a href={p.url} target="_blank" rel="nofollow noopener noreferrer" className="group relative block">
                <ObalkaPrirucky vzor={p.vzor} trida="h-auto w-full rounded-[10px] shadow-[0_6px_18px_rgb(0_0_0/0.25)] transition-transform group-hover:-translate-y-0.5" />
                <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-mikro font-semibold text-white">{p.vlajka} {p.typ}</span>
              </a>
              <p className="mt-2 line-clamp-2 text-male font-semibold leading-snug text-inkoust">{p.nazev}</p>
              <p className="text-mikro leading-snug text-tlum2">{p.kdo} · ~{p.minut} min</p>
              {p.poznamka && <p className="mt-1 text-mikro leading-snug text-jantar">{p.poznamka}</p>}
              <div className="mt-2 flex items-center gap-2">
                <a href={p.url} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full bg-akcent px-3 text-drobne font-semibold text-papir hover:bg-akcent-svetla">
                  <Ikona nazev="dolu" velikost={13} tah={2.4} /> {p.typ === "PDF" ? "Stáhnout" : "Otevřít"}
                </a>
                <button type="button" role="checkbox" aria-checked={hotovo} aria-label={`Přečteno: ${p.nazev}`} onClick={() => prepni(p.id)}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-colors ${hotovo ? "pop border-klid bg-klid text-papir" : "border-linka text-tlum2 hover:border-klid"}`}>
                  <Ikona nazev="fajfka" velikost={15} tah={3} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
