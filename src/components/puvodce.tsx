import { Ikona } from "./ikony";
import { Karta } from "./zaklad";

const BARVY: Record<string, { pruh: string; text: string }> = {
  oficialni: { pruh: "bg-[#c25e18]", text: "text-[#93440e]" },
  vysetrovana: { pruh: "bg-[#c9a227]", text: "text-[#856713]" },
  nepotvrzena: { pruh: "bg-[#8a93a1]", text: "text-tlum" },
  domaci: { pruh: "bg-[#2e8b62]", text: "text-[#227050]" },
  neznama: { pruh: "bg-linka", text: "text-tlum2" },
};

/**
 * Co se ví o původci.
 *
 * Samostatný ukazatel vedle celkové úrovně. Ta stojí na závažnosti a kumulaci,
 * ne na počtu případů s potvrzeným státním řízením — jinak by ji jeden
 * vyšetřovací posun rozhoupal oběma směry.
 */
export function PuvodcePanel({
  skupiny, bezHlavicky = false,
}: {
  skupiny: { klic: string; nazev: string; pocet: number }[];
  bezHlavicky?: boolean;
}) {
  const celkem = skupiny.reduce((a, b) => a + b.pocet, 0);
  if (!celkem) return null;

  return (
    <Karta className="border-0 bg-transparent p-0">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        {!bezHlavicky && <h3 className="podnadpis text-[17px]">Co se ví o původci</h3>}
        <span className="stitek">{celkem} záznamů</span>
      </div>

      <div aria-hidden className="mb-5 flex h-[10px] gap-[2px] overflow-hidden rounded-full">
        {skupiny
          .filter((s) => s.pocet > 0)
          .map((s) => (
            <span
              key={s.klic}
              className={BARVY[s.klic].pruh}
              style={{ width: `${(s.pocet / celkem) * 100}%` }}
            />
          ))}
      </div>

      <dl className="space-y-3">
        {skupiny.map((s) => (
          <div key={s.klic} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2.5 text-[13.5px]">
              <span aria-hidden className={`h-[9px] w-[9px] shrink-0 rounded-[3px] ${BARVY[s.klic].pruh}`} />
              {s.nazev}
            </dt>
            <dd className={`cislice text-[14px] font-semibold ${s.pocet ? BARVY[s.klic].text : "text-tlum2"}`}>
              {s.pocet}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 flex items-start gap-2.5 border-t border-linka2 pt-4 text-[12.5px] leading-relaxed text-tlum">
        <span className="mt-[1px] shrink-0 text-tlum2">
          <Ikona nazev="vaha" velikost={14} />
        </span>
        Do celkové úrovně tenhle rozpad nevstupuje. Ta stojí na závažnosti a kumulaci
        signálů, ne na tom, kolika případům se prokázalo státní řízení.
      </p>
    </Karta>
  );
}
