/*
  Mikrograf: sloupky nebo čára z pár čísel, bez os a popisků (24. 9. 2026).
  Nese jen tvar — roste, klesá, tiše. Hodnoty jsou v title pro čtečky.
*/
export function Sloupky({ hodnoty, vyska = 22, sirka = 72, barva = "currentColor", popis }: { hodnoty: number[]; vyska?: number; sirka?: number; barva?: string; popis?: string }) {
  const max = Math.max(1, ...hodnoty);
  const n = hodnoty.length || 1;
  const mezera = 2;
  const w = (sirka - mezera * (n - 1)) / n;
  return (
    <svg width={sirka} height={vyska} viewBox={`0 0 ${sirka} ${vyska}`} role="img" aria-label={popis ?? hodnoty.join(", ")} className="shrink-0">
      {hodnoty.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * (vyska - 2)));
        return <rect key={i} x={i * (w + mezera)} y={vyska - h} width={w} height={h} rx={1.5} fill={barva} opacity={v === 0 ? 0.25 : i === n - 1 ? 1 : 0.6} />;
      })}
    </svg>
  );
}

export function Cara({ hodnoty, vyska = 26, sirka = 96, barva = "currentColor", popis }: { hodnoty: number[]; vyska?: number; sirka?: number; barva?: string; popis?: string }) {
  const max = Math.max(1, ...hodnoty);
  const n = Math.max(1, hodnoty.length - 1);
  const body = hodnoty.map((v, i) => [Math.round((i / n) * (sirka - 2)) + 1, Math.round(vyska - 2 - (v / max) * (vyska - 4)) + 1] as const);
  const d = body.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const posledni = body[body.length - 1];
  return (
    <svg width={sirka} height={vyska} viewBox={`0 0 ${sirka} ${vyska}`} role="img" aria-label={popis ?? hodnoty.join(", ")} className="shrink-0">
      <path d={`${d} L${sirka - 1} ${vyska - 1} L1 ${vyska - 1} Z`} fill={barva} opacity={0.12} />
      <path d={d} fill="none" stroke={barva} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      {posledni && <circle cx={posledni[0]} cy={posledni[1]} r={2.4} fill={barva} />}
    </svg>
  );
}

/** Počty po dnech za posledních N dní (poslední den = dnes). */
export function poDnech(casy: string[], dni: number, ted: number): number[] {
  const out = new Array<number>(dni).fill(0);
  for (const c of casy) {
    const d = Math.floor((ted - new Date(c).getTime()) / 86_400_000);
    if (d >= 0 && d < dni) out[dni - 1 - d]++;
  }
  return out;
}
