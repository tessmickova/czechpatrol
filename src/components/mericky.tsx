import { PASMA, UROVNE } from "@/lib/skala";
import type { HybridniTlak, TydenniHodnoceni, Uroven } from "@/lib/typy";

/* ---------------- obloukový měřák celkové úrovně ---------------- */

const SEGMENTU = 13;

function bod(cx: number, cy: number, r: number, uhel: number) {
  const a = ((uhel - 180) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

/**
 * Půlkruhový měřák. Třináct dílků odpovídá třinácti úrovním stupnice —
 * je z něj vidět, kde se hodnocení pohybuje v rámci celého rozsahu, ne jen
 * jaká je barva. Prázdné dílky napravo jsou stejně důležitá informace jako
 * plné nalevo.
 */
export function ObloukovyMerak({
  uroven, naNoci = false, velikost = 260, popisek, skrytPopisek = false,
}: {
  uroven: Uroven | null; naNoci?: boolean; velikost?: number;
  popisek?: string; skrytPopisek?: boolean;
}) {
  const cx = velikost / 2;
  const cy = velikost / 2;
  const r = velikost / 2 - 16;
  const sirka = 13;
  const aktivni = uroven ? UROVNE[uroven].poradi : 0;

  const segmenty = Array.from({ length: SEGMENTU }, (_, i) => {
    const mezera = 1.6;
    const krok = 180 / SEGMENTU;
    const od = i * krok + mezera / 2;
    const do_ = (i + 1) * krok - mezera / 2;
    const [x1, y1] = bod(cx, cy, r, od);
    const [x2, y2] = bod(cx, cy, r, do_);
    return { i, d: `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}` };
  });

  const t = uroven ? PASMA[UROVNE[uroven].pasmo] : null;
  const barvaAktivni = t ? (naNoci ? t.plnaNoc : t.plna) : "#64789a";
  const barvaPrazdna = naNoci ? "rgba(255,255,255,0.12)" : "#1a2a44";

  return (
    <svg
      viewBox={`0 0 ${velikost} ${cy + (skrytPopisek ? 24 : 62)}`}
      width={velikost}
      height={cy + (skrytPopisek ? 24 : 62)}
      role="img"
      aria-label={uroven ? `Celková úroveň: ${UROVNE[uroven].nazev}` : "Celková úroveň zatím nestanovena"}
      className="max-w-full"
    >
      {segmenty.map((s) => (
        <path
          key={s.i}
          d={s.d}
          fill="none"
          strokeWidth={sirka}
          strokeLinecap="butt"
          stroke={s.i < aktivni ? barvaAktivni : barvaPrazdna}
          opacity={s.i < aktivni ? (0.55 + (0.45 * (s.i + 1)) / Math.max(1, aktivni)) : 1}
          style={s.i < aktivni ? { filter: `drop-shadow(0 0 4px ${barvaAktivni})` } : undefined}
        />
      ))}

      {/* Krajní popisky rozsahu — bez nich by měřák neříkal, čeho je to škála. */}
      <text x={cx - r - 6} y={cy + 17} textAnchor="start" fontSize="10" fontFamily="var(--font-mono)"
        fill={naNoci ? "#64789a" : "#64789a"} letterSpacing="0.9">NÍZKÁ</text>
      <text x={cx + r + 6} y={cy + 17} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)"
        fill={naNoci ? "#64789a" : "#64789a"} letterSpacing="0.9">VÁŽNÁ</text>

      {/* Hodnota patří dovnitř přístroje — pokud ji nenese okolí. */}
      {!skrytPopisek && (
      <text
        x={cx}
        y={cy + 50}
        textAnchor="middle"
        fontSize={Math.min(27, (velikost * 1.55) / Math.max(8, (popisek ?? (uroven ? UROVNE[uroven].nazev : "Zatím nestanoveno")).length))}
        fontWeight="700"
        letterSpacing="0.3"
        style={{ textTransform: "uppercase" }}
        fill={
          uroven
            ? naNoci
              ? PASMA[UROVNE[uroven].pasmo].plnaNoc
              : PASMA[UROVNE[uroven].pasmo].plna
            : naNoci
              ? "#64789a"
              : "#64789a"
        }
      >
        {popisek ?? (uroven ? UROVNE[uroven].nazev : "Zatím nestanoveno")}
      </text>
      )}
    </svg>
  );
}

/* ---------------- radar hybridního tlaku ---------------- */

const POPISKY: Record<string, string> = {
  sabotaze: "Sabotáže",
  atribuce: "Atribuce",
  kyber: "Kyber",
  drony: "Drony",
  infrastruktura: "Infra.",
  primy: "Střet",
};

/**
 * Radar šesti dílčích ukazatelů.
 *
 * Přímý vojenský střet je záměrně jednou z os: na jednom obrazci je pak vidět,
 * že hybridní tlak může být vysoký, zatímco přímé riziko zůstává nízké.
 * To je celý smysl grafu.
 */
export function RadarTlaku({ tlak, velikost = 300, okraj = 72 }: { tlak: HybridniTlak; velikost?: number; okraj?: number }) {
  const osy = tlak.podkategorie;
  if (osy.length < 3) return null;

  const cx = velikost / 2;
  const cy = velikost / 2;
  const r = velikost / 2 - okraj;
  const n = osy.length;

  const uhel = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2;
  const bodOsy = (i: number, podil: number) => [
    cx + r * podil * Math.cos(uhel(i)),
    cy + r * podil * Math.sin(uhel(i)),
  ];

  const podily = osy.map((o) => (o.uroven ? UROVNE[o.uroven].poradi / 13 : 0));
  const maUdaje = podily.some((p) => p > 0);
  const body = podily.map((p, i) => bodOsy(i, Math.max(p, 0.02)).map((x) => x.toFixed(1)).join(","));

  return (
    <svg
      viewBox={`0 0 ${velikost} ${velikost}`}
      width={velikost}
      height={velikost}
      role="img"
      aria-label="Rozložení hybridního tlaku podle dílčích ukazatelů"
      className="max-w-full"
    >
      {[0.25, 0.5, 0.75, 1].map((p) => (
        <polygon
          key={p}
          points={osy.map((_, i) => bodOsy(i, p).map((x) => x.toFixed(1)).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="1"
        />
      ))}
      {osy.map((_, i) => {
        const [x, y] = bodOsy(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.09)" strokeWidth="1" />;
      })}

      {maUdaje && (
        <>
          <polygon points={body.join(" ")} fill="rgba(56,232,255,0.16)" stroke="#38e8ff" strokeWidth="1.6" style={{ filter: "drop-shadow(0 0 6px rgba(56,232,255,0.6))" }} />
          {osy.map((o, i) => {
            const [x, y] = bodOsy(i, Math.max(podily[i], 0.02));
            const barva = o.uroven ? PASMA[UROVNE[o.uroven].pasmo].plnaNoc : "#9db1cc";
            return <circle key={i} cx={x} cy={y} r="3.4" fill={barva} stroke="#071426" strokeWidth="1.4" />;
          })}
        </>
      )}

      {osy.map((o, i) => {
        const [x, y] = bodOsy(i, 1.26);
        return (
          <text
            key={o.klic}
            x={x}
            y={y + 3.5}
            textAnchor={Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end"}
            fontSize="11"
            fill="#9db1cc"
            fontFamily="var(--font-mono)"
            letterSpacing="0.6"
          >
            {POPISKY[o.klic] ?? o.nazev}
          </text>
        );
      })}
    </svg>
  );
}

/* ---------------- jiskra (sparkline) ---------------- */

/** Miniaturní křivka do řádku tabulky. Ukazuje tvar, ne hodnoty. */
export function Jiskra({
  tydny, klic, sirka = 74, vyska = 22,
}: { tydny: TydenniHodnoceni[]; klic: "celkova" | "hybridni" | "primyStret"; sirka?: number; vyska?: number }) {
  if (tydny.length < 2) return null;
  const hodnoty = tydny.map((t) => UROVNE[t[klic]].poradi);
  const x = (i: number) => (i / (tydny.length - 1)) * (sirka - 4) + 2;
  const y = (v: number) => vyska - 3 - ((v - 1) / 12) * (vyska - 6);
  const posledni = hodnoty[hodnoty.length - 1];
  const barva = PASMA[UROVNE[tydny[tydny.length - 1][klic]].pasmo].plna;

  return (
    <svg viewBox={`0 0 ${sirka} ${vyska}`} width={sirka} height={vyska} aria-hidden className="shrink-0">
      <polyline
        points={hodnoty.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
        fill="none"
        stroke={barva}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx={x(hodnoty.length - 1)} cy={y(posledni)} r="2.2" fill={barva} />
    </svg>
  );
}
