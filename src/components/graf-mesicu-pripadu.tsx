import { UROVNE } from "@/lib/skala";
import type { Uroven } from "@/lib/typy";

/*
  Objem sledování po měsících: jedinečné případy podle data zjištění.

  Neříká nic o závažnosti — ta je zvlášť. Měsíce před plným monitoringem
  nemají nulu, ale prázdno (šrafování): „nevíme“ není „nic“.
*/
export function GrafMesicuPripadu({
  rada, hodnoceni,
}: { rada: { mesic: string; pripady: number | null; uplne: boolean }[]; hodnoceni: Map<string, Uroven> }) {
  const SIRKA = 1000, V = 110, LEVO = 34, PRAVO = 8, NAHORE = 10, DOLE = 26;
  const S = (SIRKA - LEVO - PRAVO) / Math.max(1, rada.length);
  const max = Math.max(1, ...rada.map((m) => m.pripady ?? 0));
  const kroky = [0, Math.ceil(max / 2), max];
  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${SIRKA} ${NAHORE + V + DOLE}`} role="img" aria-label="Počet jedinečných případů po měsících" className="h-[150px] w-full min-w-[640px]">
          <defs>
            <pattern id="srafy-pripady" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#7f8ea0" strokeWidth="1" strokeOpacity="0.3" />
            </pattern>
          </defs>
          {kroky.map((k) => {
            const y = NAHORE + V - (k / max) * V;
            return (
              <g key={k}>
                <line x1={LEVO} x2={SIRKA - PRAVO} y1={y} y2={y} stroke="#202a36" strokeWidth="1" />
                <text x={LEVO - 6} y={y + 4} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="#acb7c5">{k}</text>
              </g>
            );
          })}
          {rada.map((m, i) => {
            const [y, mm] = m.mesic.split("-").map(Number);
            const x0 = LEVO + i * S;
            const popisek = mm === 1 && (rada.length < 60 || y % 2 === 0) && (
              <text x={x0 + 2} y={NAHORE + V + 18} fontSize="11" fontFamily="var(--font-mono)" fill="#7f8ea0">{y}</text>
            );
            if (m.pripady === null) {
              return <g key={m.mesic}><rect x={x0} y={NAHORE} width={S} height={V} fill="url(#srafy-pripady)" /><title>{`${mm}/${y}: mimo plné pokrytí`}</title>{popisek}</g>;
            }
            const h = (m.pripady / max) * V;
            const u = hodnoceni.get(m.mesic);
            return (
              <g key={m.mesic}>
                <rect x={x0 + 0.5} y={NAHORE + V - h} width={Math.max(1, S - 1)} height={h} fill="#75b9cc" rx="1">
                  <title>{`${mm}/${y}: ${m.pripady} ${m.pripady === 1 ? "případ" : m.pripady < 5 ? "případy" : "případů"}${u ? ` · hodnocení ${UROVNE[u].nazev}` : ""}`}</title>
                </rect>
                {popisek}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-[12.5px] text-tlum2">Sloupec = počet jedinečných případů podle data zjištění · šrafovaně = období bez plného monitoringu (hodnota chybí, není nula).</p>
    </div>
  );
}
