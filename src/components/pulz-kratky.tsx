"use client";

import { useZiveHodiny } from "@/lib/cas-klient";
import type { Pulz } from "@/lib/pulz";

/*
  Pulz hlídky v horním pruhu (24. 9. 2026): jedna řádka místo samostatné
  lišty. Tečka, čas od průchodu (tiká), zdroje a nové zprávy. Po pěti
  hodinách bez průchodu tečka zešedne a slovo se změní na „stojí“.
*/
export function PulzKratky({ pulz, ted }: { pulz: Pulz; ted: number }) {
  const nyni = useZiveHodiny(ted);
  const min = pulz.kdy ? Math.max(0, Math.round((nyni - new Date(pulz.kdy).getTime()) / 60_000)) : null;
  const stoji = min === null || min > 5 * 60;
  const kdy = min === null ? "bez záznamu" : min < 1 ? "právě teď" : min < 60 ? `před ${min} min` : `před ${Math.floor(min / 60)} h`;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-tlum2" title={pulz.kdy ? `Poslední průchod sběru ${new Date(pulz.kdy).toLocaleString("cs-CZ")}` : undefined}>
      <span className="flex items-center gap-1.5 font-semibold text-tlum">
        <span className="relative flex h-2 w-2">
          {!stoji && <span className="pulz-kruh absolute inline-flex h-full w-full rounded-full bg-klid opacity-60" />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${stoji ? "bg-tlum2" : "bg-klid"}`} />
        </span>
        {stoji ? "Hlídka" : "Hlídka běží"}
      </span>
      <span className="cislice">{kdy}</span>
      {pulz.zdrojuCelkem > 0 && <span className="cislice">{pulz.zdrojuOk}/{pulz.zdrojuCelkem} zdrojů</span>}
      <span className="cislice">{pulz.zachyceno24} nových / 24 h</span>
    </span>
  );
}
