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
  const barvaAktivni = t ? (naNoci ? t.plnaNoc : t.plna) : "#9d9a92";
  /*
    Prázdný díl oblouku a díly pod aktivním: patrné, ale nesmí soupeřit
    s barvou úrovně. Jako tokeny, ne natvrdo — bílé krytí je na světlém
    podkladu neviditelné a ve světlém režimu z budíku zbyl jediný barevný
    dílek ve vzduchu.
  */
  const barvaPrazdna = "var(--color-linka)";
  /*
    Barevný je jen dílek, na kterém hodnocení stojí; dílky pod ním jsou
    světlý inkoust.

    Dřív jich svítilo barvou všech třináct, se stoupající průhledností a
    se `drop-shadow` kolem každého — tři takové budíky vedle sebe udělaly
    z hlavičky neon. Přístroj má mít ručičku, ne podsvícený ciferník:
    kde hodnocení je, řekne jedna barevná značka na konci stupnice, a že
    stupnice pokračuje dál, řeknou prázdné dílky napravo.
  */
  const barvaPod = "var(--color-tlum2)";

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
          stroke={s.i === aktivni - 1 ? barvaAktivni : s.i < aktivni ? barvaPod : barvaPrazdna}
        />
      ))}

      {/* Krajní popisky rozsahu — bez nich by měřák neříkal, čeho je to škála. */}
      <text x={cx - r - 6} y={cy + 17} textAnchor="start" fontSize="10" fontFamily="var(--font-mono)"
        fill="var(--color-tlum2)" letterSpacing="0.9">NÍZKÁ</text>
      <text x={cx + r + 6} y={cy + 17} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)"
        fill="var(--color-tlum2)" letterSpacing="0.9">VÁŽNÁ</text>

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
        /* Slovo je inkoust. Barvu úrovně nese dílek oblouku nad ním. */
        fill={uroven ? "var(--color-inkoust)" : "var(--color-tlum2)"}
      >
        {popisek ?? (uroven ? UROVNE[uroven].nazev : "Zatím nestanoveno")}
      </text>
      )}
    </svg>
  );
}

/* ---------------- radar hybridního tlaku ---------------- */

/*
  Názvy os. „Kdo to byl", „Infrastr." a „Voj. střet" byly zkratky, které
  neoznačovaly měřenou veličinu — první nebyla ani metrika, další dvě se
  nedaly přečíst. Celé názvy jsou delší, ale dají se pochopit bez legendy.
*/
const POPISKY: Record<string, string> = {
  sabotaze: "Sabotáže",
  atribuce: "Připsání",
  kyber: "Kybernetické",
  drony: "Drony",
  infrastruktura: "Infrastruktura",
  primy: "Vojenský střet",
};

/**
 * Radar šesti dílčích ukazatelů.
 *
 * Přímý vojenský střet je záměrně jednou z os: na jednom obrazci je pak vidět,
 * že hybridní tlak může být vysoký, zatímco přímé riziko zůstává nízké.
 * To je celý smysl grafu.
 */
export function RadarTlaku({
  tlak, velikost = 300, okraj = 72, bezPopisku = false,
}: { tlak: HybridniTlak; velikost?: number; okraj?: number; bezPopisku?: boolean }) {
  const osy = tlak.podkategorie;
  if (osy.length < 3) return null;

  /*
    Plátno je širší než vyšší. Popisky os jsou vodorovné a nejdelší z nich
    („Infrastruktura", „Vojenský střet") přesahovaly hranu čtverce a ořezávaly
    se — z „Vojenský střet" zbylo „ký střet". Rozšíření je levnější než
    zkracování názvů: zkratky na osách byly ta věc, kterou audit vytýkal.

    Bez popisků je plátno čtvercové: šířka navíc je jen místo pro text, a
    když text není, jen by obrazec zmenšila.
  */
  const sirka = bezPopisku ? velikost : Math.round(velikost * 1.45);
  const cx = sirka / 2;
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
      viewBox={`0 0 ${sirka} ${velikost}`}
      width={sirka}
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
          stroke="var(--color-linka)"
          strokeWidth="1"
        />
      ))}
      {osy.map((_, i) => {
        const [x, y] = bodOsy(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-linka)" strokeWidth="1" />;
      })}

      {maUdaje && (
        <>
          {/*
            Obrazec je neutrální, barvu nesou body na osách.

            Červený obrazec na každé z třinácti karet karuselu znamenal
            třináct červených pavučin v jedné řadě — a červená je u téhle
            značky vyhrazená značce, hlavní akci a mimořádné výstraze.
            Tvar obrazce nese informaci sám, barvu k tomu nepotřebuje.
          */}
          <polygon points={body.join(" ")} fill="var(--color-noc)" stroke="var(--color-tlum2)" strokeWidth="1.4" />
          {osy.map((o, i) => {
            const [x, y] = bodOsy(i, Math.max(podily[i], 0.02));
            const barva = o.uroven ? PASMA[UROVNE[o.uroven].pasmo].plnaNoc : "#9d9a92";
            return <circle key={i} cx={x} cy={y} r="3.4" fill={barva} stroke="#0d0d0a" strokeWidth="1.4" />;
          })}
        </>
      )}

      {!bezPopisku && osy.map((o, i) => {
        const [x, y] = bodOsy(i, 1.26);
        return (
          <text
            key={o.klic}
            x={x}
            y={y + 3.5}
            textAnchor={Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end"}
            fontSize="10.5"
            fill="var(--color-tlum2)"
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
