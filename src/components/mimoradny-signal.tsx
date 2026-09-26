import { UROVNE } from "@/lib/skala";
import type { CelkovyStav } from "@/lib/typy";
import { datum } from "@/lib/format";
import { Napoveda } from "./zaklad";

/*
  Poznámka u hodnocení, když ho zvedá mimořádný signál vyhodnocený redakcí
  (sber/hodnoceni.ts). Bez ní by čtenář viděl vyšší úroveň a hledal by
  případy, které ji způsobily — a nenašel by je. Viditelně jen jedna
  řádka; důvod a meze vyhodnocení po najetí nebo klepnutí.
*/
export function MimoradnySignalPoznamka({ stav, className = "" }: { stav: CelkovyStav; className?: string }) {
  const m = stav.mimoradny;
  if (!m) return null;
  return (
    <Napoveda cele popis={
      <span className="block">
        <span className="block">{m.proc}</span>
        <span className="mt-1.5 block text-tlum2">{m.mez}</span>
        <span className="mt-1.5 block text-tlum2">Bez tohoto signálu by hodnocení bylo: {UROVNE[m.zakladni].nazev.toLowerCase()}. Platí do {datum(m.platiDo)}.</span>
        {m.zaznam && <a href={`/incident/${m.zaznam}/`} className="odkaz mt-1.5 block">Záznam a zdroje</a>}
      </span>
    }>
      <span className={`flex w-full items-start gap-2 rounded-[14px] border border-dashed border-jantar/55 bg-jantar/[0.06] px-3 py-2 text-left text-mikro leading-snug ${className}`}>
        <span aria-hidden className="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full bg-jantar" />
        <span>
          <b className="font-semibold text-inkoust">O stupeň výš: mimořádný signál</b>
          <span className="block text-tlum">{m.kratce}. Naše vyhodnocení, ne úřední.</span>
        </span>
      </span>
    </Napoveda>
  );
}
