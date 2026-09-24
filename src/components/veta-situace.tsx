"use client";

import { casPraha } from "@/lib/cas";
import { useZiveHodiny } from "@/lib/cas-klient";
import type { SouhrnSituace } from "@/lib/souhrn-situace";
import type { HlavniVeta } from "@/lib/veta";
import { Otaznik } from "./zaklad";

/*
  Věta pod hlavním nadpisem se živým ukazatelem (24. 9. 2026).

  Přednost má souhrn od ověřovatele (AI shrnutí doložených záznamů), když
  je čerstvý; jinak věta z úředního stavu. Tečka vedle věty tepe, dokud
  poslední průchod sběru není starší než pět hodin — pak zešedne. Řádek
  pod větou říká, odkud věta je a kdy byla naposled obnovena, ať si nikdo
  neplete shrnutí s úřední výstrahou.
*/
export function VetaSituace({ souhrn, veta, kontrola, ted }: { souhrn: SouhrnSituace; veta: HlavniVeta; kontrola: string | null; ted: number }) {
  const nyni = useZiveHodiny(ted);
  const zive = Boolean(kontrola) && nyni - new Date(kontrola!).getTime() <= 5 * 3_600_000;
  const ai = Boolean(souhrn.veta);
  return (
    <div className="mt-3 max-w-[46rem]">
      <p className="uvodni-veta flex items-start gap-3">
        <span aria-hidden className="relative mt-[0.55em] flex h-2.5 w-2.5 shrink-0">
          {zive && <span className="pulz-kruh absolute inline-flex h-full w-full rounded-full bg-klid opacity-60" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${zive ? "bg-klid" : "bg-tlum2"}`} />
        </span>
        <span className="font-bold text-inkoust">{ai ? souhrn.veta : veta.cesko}</span>
      </p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 pl-[22px] text-mikro text-tlum2">
        {ai ? (
          <>
            <span className="stitek">AI shrnutí</span>
            <span className="cislice">{casPraha(souhrn.aktualizovano!)}</span>
            <Otaznik popis={<span className="block">Shrnutí doložených záznamů za 7 dní a úředního stavu, napsané ověřovatelem projektu. Není to úřední zpráva ani předpověď. Po 30 hodinách ho nahradí věta z úředního stavu. Sběr běží každých 30 minut, web se přestaví do několika minut po změně dat.</span>} />
          </>
        ) : (
          <>
            <span>podle úředního stavu</span>
            {kontrola && <span className="cislice">čteno {casPraha(kontrola)}</span>}
            <Otaznik popis={<span className="block">Věta sestavená z úředního stavu Česka a kontrolovaných zdrojů. Není to úřední zpráva ani předpověď. Sběr běží každých 30 minut, web se přestaví do několika minut po změně dat.</span>} />
          </>
        )}
      </p>
    </div>
  );
}
