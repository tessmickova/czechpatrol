"use client";

import { useZiveHodiny } from "@/lib/cas-klient";
import { casPraha, datumCasPraha } from "@/lib/cas";
import type { Pulz } from "@/lib/pulz";
import { Ikona } from "./ikony";

/*
  Pruh „Hlídka běží“ pod hlavičkou (24. 9. 2026): tečka, čas od posledního
  průchodu (tiká v prohlížeči), přečtené zdroje, zachycené a ověřené za
  24 h. Po rozkliknutí seznam zdrojů se stavem. Po pěti hodinách bez
  průchodu tečka zešedne a věta řekne, že hlídka stojí.
*/
function stariMin(kdy: string | null, ted: number): number | null {
  if (!kdy) return null;
  return Math.max(0, Math.round((ted - new Date(kdy).getTime()) / 60_000));
}

function slovyMin(min: number): string {
  if (min < 1) return "právě teď";
  if (min < 60) return `před ${min} min`;
  const h = Math.floor(min / 60);
  return `před ${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
}

export function PulzSberu({ pulz, ted }: { pulz: Pulz; ted: number }) {
  const nyni = useZiveHodiny(ted);
  const min = stariMin(pulz.kdy, nyni);
  const stoji = min === null || min > 5 * 60;
  return (
    <details className="group border-b border-linka bg-papir">
      <summary className="block cursor-pointer list-none">
        <span className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-drobne text-tlum sm:px-6">
        <span className="flex items-center gap-2 font-semibold text-inkoust">
          <span className="relative flex h-2.5 w-2.5">
            {!stoji && <span className="pulz-kruh absolute inline-flex h-full w-full rounded-full bg-klid opacity-60" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${stoji ? "bg-tlum2" : "bg-klid"}`} />
          </span>
          {stoji ? "Hlídka stojí" : "Hlídka běží"}
        </span>
        <span className="cislice">{min === null ? "bez záznamu o průchodu" : `poslední průchod ${slovyMin(min)}`}</span>
        {pulz.zdrojuCelkem > 0 && <span><b className="cislice font-semibold text-inkoust">{pulz.zdrojuOk}</b> z {pulz.zdrojuCelkem} zdrojů přečteno</span>}
        <span><b className="cislice font-semibold text-inkoust">{pulz.zachyceno24}</b> {pulz.zachyceno24 === 1 ? "nová zpráva" : pulz.zachyceno24 < 5 ? "nové zprávy" : "nových zpráv"} za 24 h</span>
        <span><b className="cislice font-semibold text-inkoust">{pulz.overeno24}</b> {pulz.overeno24 === 1 ? "ověřený záznam" : pulz.overeno24 < 5 ? "ověřené záznamy" : "ověřených záznamů"}</span>
        <span className="ml-auto flex items-center gap-1 text-mikro text-tlum2">
          {pulz.kdy && <span className="cislice hidden sm:inline">{datumCasPraha(pulz.kdy)}</span>}
          <Ikona nazev="dolu" velikost={12} tah={2} trida="transition-transform group-open:rotate-180" />
        </span>
        </span>
      </summary>
      <div className="mx-auto max-w-[1280px] px-4 pb-3 sm:px-6">
        <p className="mb-2 text-mikro text-tlum2">
          Zdroje čtené při posledním průchodu{pulz.kdy ? ` v ${casPraha(pulz.kdy)}` : ""}. Zelená = přečteno, šedá = zdroj neodpověděl (web tím nepadá, položka se zkusí příště).
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {pulz.zdroje.map((z) => (
            <li key={z.klic} className={`flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-mikro ${z.ok ? "border-linka2 text-tlum" : "border-dashed border-linka text-tlum2"}`}>
              <span aria-hidden className={`h-[6px] w-[6px] rounded-full ${z.ok ? "bg-klid" : "bg-tlum2"}`} />
              {z.klic}{!z.ok && z.stav ? ` · ${z.stav}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
