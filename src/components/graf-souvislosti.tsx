import Link from "next/link";
import { tokeny } from "@/lib/skala";
import type { Incident } from "@/lib/typy";

/**
 * Graf souvislostí. Potvrzená vazba je plná čára, vyšetřovaná přerušovaná —
 * a nikdy nevypadají stejně. Kdyby ano, web by tvrdil víc, než ví.
 */
export function GrafSouvislosti({
  stred, souvisejici,
}: {
  stred: Incident;
  souvisejici: { incident: Incident; potvrzena: boolean; popis: string }[];
}) {
  if (!souvisejici.length) return null;

  // Pevná soustava 1000 × N, kterou viewBox roztáhne na šířku karty.
  const RADEK = 74, VYSKA_BOXU = 54;
  const vyska = 16 + souvisejici.length * RADEK;
  const STRED_X = 8, STRED_S = 230;
  const CIL_X = 380, CIL_S = 612;
  const stredY = vyska / 2;

  const zkrat = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

  return (
    <div className="rounded-[22px] border border-linka bg-plocha p-5 sm:p-6">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="podnadpis text-[16px]">Souvislosti</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 text-[11.5px] text-tlum">
            <svg width="22" height="2" aria-hidden><line x1="0" y1="1" x2="22" y2="1" stroke="#14140f" strokeWidth="1.6" /></svg>
            potvrzená
          </span>
          <span className="flex items-center gap-2 text-[11.5px] text-tlum">
            <svg width="22" height="2" aria-hidden><line x1="0" y1="1" x2="22" y2="1" stroke="#6f6c64" strokeWidth="1.6" strokeDasharray="3 3" /></svg>
            vyšetřovaná
          </span>
        </div>
      </div>
      <p className="stitek mb-5">Vyšetřovaná vazba není prokázaná souvislost</p>

      {/* Na úzkém displeji stačí seznam pod grafem; kresba by se nevešla. */}
      <div className="hidden overflow-x-auto sm:block">
        <svg
          viewBox={`0 0 1000 ${vyska}`}
          role="img"
          aria-label={`Souvislosti události ${stred.titulek}`}
          className="w-full min-w-[620px]"
          style={{ height: vyska }}
        >
          {souvisejici.map((s, i) => {
            const y = 8 + i * RADEK + VYSKA_BOXU / 2;
            return (
              <path
                key={`c${s.incident.id}`}
                d={`M ${STRED_X + STRED_S} ${stredY} C ${STRED_X + STRED_S + 70} ${stredY}, ${CIL_X - 70} ${y}, ${CIL_X} ${y}`}
                fill="none"
                stroke={s.potvrzena ? "#14140f" : "#6f6c64"}
                strokeWidth="1.6"
                strokeDasharray={s.potvrzena ? undefined : "3 3"}
              />
            );
          })}

          <g>
            <rect x={STRED_X} y={stredY - VYSKA_BOXU / 2} width={STRED_S} height={VYSKA_BOXU} rx="5"
              fill="#fffefb" stroke="#f4f3f1" />
            <rect x={STRED_X} y={stredY - VYSKA_BOXU / 2} width="3" height={VYSKA_BOXU}
              fill={tokeny(stred.zavaznost).plna} />
            <text x={STRED_X + 14} y={stredY - 6} fontSize="11.5" fill="#6f6c64" letterSpacing="0.9">
              TATO UDÁLOST
            </text>
            <text x={STRED_X + 14} y={stredY + 13} fontSize="15" fill="#14140f" fontWeight="600">
              {zkrat(stred.kratkyTitulek || stred.titulek, 30)}
            </text>
          </g>

          {souvisejici.map((s, i) => {
            const y = 8 + i * RADEK;
            const t = tokeny(s.incident.zavaznost);
            return (
              <g key={s.incident.id}>
                <rect x={CIL_X} y={y} width={CIL_S} height={VYSKA_BOXU} rx="5" fill="#fff" stroke="#f4f3f1" />
                <rect x={CIL_X} y={y} width="3" height={VYSKA_BOXU} fill={t.plna} />
                <text x={CIL_X + 14} y={y + 21} fontSize="11.5" fill="#6f6c64" letterSpacing="0.9">
                  {s.potvrzena ? "POTVRZENÁ SOUVISLOST" : "VYŠETŘOVANÁ SOUVISLOST"}
                </text>
                <text x={CIL_X + 14} y={y + 40} fontSize="15" fill="#14140f" fontWeight="600">
                  {zkrat(s.incident.kratkyTitulek || s.incident.titulek, 62)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="mt-5 space-y-2.5 border-t border-linka2 pt-4">
        {souvisejici.map((s) => (
          <li key={s.incident.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              aria-hidden
              className={`stitek-tmavy rounded-[16px] border px-1.5 py-[3px] ${
                s.potvrzena ? "border-inkoust text-inkoust" : "border-dashed border-linka text-tlum2"
              }`}
            >
              {s.potvrzena ? "Potvrzená" : "Vyšetřovaná"}
            </span>
            <Link href={`/incident/${s.incident.slug}/`} className="odkaz text-[13px] font-medium">
              {s.incident.titulek}
            </Link>
            <span className="text-[12.5px] text-tlum">{s.popis}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
