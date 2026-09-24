/*
  Značka CzechPatrol — radarové stínítko.

  Plný kruh v Patrol Red, v něm soustředné kruhy, vodorovná a svislá osa,
  paprsek vpravo nahoru a plný bod ve středu. Poměry jsou z brandbooku
  (master 88 px) a drží se při každé velikosti, protože kreslíme do
  viewBoxu 88 × 88 a škálujeme.

  Detail ubývá podle velikosti: pod 64 px tři kruhy, pod 40 px dva,
  pod 28 px jeden a bez os. Kresba se nikdy nepřebarvuje.
*/

const R = 44; // poloměr v souřadnicích viewBoxu
const KRUHY = [
  { pomer: 0.841, kryti: 0.4 },
  { pomer: 0.648, kryti: 0.34 },
  { pomer: 0.4545, kryti: 0.3 },
  { pomer: 0.261, kryti: 0.26 },
];
const TAH = 88 * 0.0227;
const OSA = 88 * 0.864;
const STRED = (88 * 0.1136) / 2;

function pocetKruhu(velikost: number) {
  if (velikost >= 64) return 4;
  if (velikost >= 40) return 3;
  if (velikost >= 28) return 2;
  return 1;
}

export function Znacka({
  velikost = 34,
  tmave = false,
  trida = "",
}: {
  velikost?: number;
  /** Na tmavém podkladu: plocha je světlejší červená, kresba inkoustová. */
  tmave?: boolean;
  trida?: string;
}) {
  // Akcent bere token — ve světlém režimu je tmavší, aby text prošel kontrastem.
  const plocha = "var(--color-akcent)";
  const kresba = tmave ? "#14140f" : "#fffefb";
  const kruhy = pocetKruhu(velikost);
  const osy = velikost >= 28;
  const id = `paprsek-${tmave ? "tmavy" : "svetly"}-${velikost}`;

  return (
    <svg
      viewBox="0 0 88 88"
      width={velikost}
      height={velikost}
      className={`shrink-0 ${trida}`}
      role="img"
      aria-label="CzechPatrol"
    >
      <defs>
        {/* Paprsek: klín od 300° s ubývajícím krytím, jako stopa po přeletu. */}
        <radialGradient id={`${id}-mizeni`}>
          <stop offset="0%" stopColor={kresba} stopOpacity="0.55" />
          <stop offset="100%" stopColor={kresba} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-vyrez`}>
          <circle cx="44" cy="44" r={R} />
        </clipPath>
      </defs>

      <circle cx="44" cy="44" r={R} fill={plocha} />

      <g clipPath={`url(#${id}-vyrez)`}>
        <path d="M44 44 L44 0 A44 44 0 0 1 82.1 22 Z" fill={`url(#${id}-mizeni)`} />
        {KRUHY.slice(0, kruhy).map((k) => (
          <circle
            key={k.pomer}
            cx="44"
            cy="44"
            r={(88 * k.pomer) / 2}
            fill="none"
            stroke={kresba}
            strokeOpacity={k.kryti}
            strokeWidth={TAH}
          />
        ))}
        {osy && (
          <g stroke={kresba} strokeOpacity="0.3" strokeWidth={TAH}>
            <line x1={44 - OSA / 2} y1="44" x2={44 + OSA / 2} y2="44" />
            <line x1="44" y1={44 - OSA / 2} x2="44" y2={44 + OSA / 2} />
          </g>
        )}
      </g>

      <circle cx="44" cy="44" r={STRED} fill={kresba} />
    </svg>
  );
}

/** Značka a název vedle sebe. Wordmark se nikdy nelomí na dva řádky. */
export function Logo({
  velikost = 34,
  pismo = 19,
  tmave = false,
  beta = true,
}: {
  velikost?: number;
  pismo?: number;
  tmave?: boolean;
  /** Označení rozpracovanosti vedle názvu. */
  beta?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <Znacka velikost={velikost} tmave={tmave} />
      <span
        className="whitespace-nowrap font-bold leading-none tracking-[-0.03em]"
        /*
          Barvy berou tokeny, ne napevno zapsanou bílou. Ve světlém režimu byl
          bílý nápis „Czech" na světlé hlavičce neviditelný; token se přepíše
          podle režimu i podle toho, jestli logo stojí na tmavé desce.
        */
        style={{ fontSize: pismo, color: "var(--color-inkoust)" }}
      >
        Czech<span style={{ color: "var(--color-akcent)" }}>Patrol</span>
      </span>
      {/*
        BETA. Není to ozdoba: web je rozpracovaný a návštěvník to má vědět dřív,
        než podle něj něco udělá. Obrysová pilulka v barvě akcentu — drží se
        značky, nekřičí a nesoupeří s názvem.
      */}
      {beta && (
        <span
          className="shrink-0 rounded-full border border-akcent/60 px-[6px] py-[2px] font-mono font-semibold uppercase leading-none tracking-[0.12em] text-akcent"
          style={{ fontSize: Math.max(10, Math.round(pismo * 0.48)) }}
        >
          beta
        </span>
      )}
      {/* AI: web sbírá a shrnuje s pomocí AI. Stejná pilulka, tlumenější, ať nesoupeří s BETA. */}
      {beta && (
        <span
          className="shrink-0 rounded-full border border-tlum2/60 px-[6px] py-[2px] font-mono font-semibold uppercase leading-none tracking-[0.12em] text-tlum"
          style={{ fontSize: Math.max(10, Math.round(pismo * 0.48)) }}
          title="Projekt s pomocí AI: sběr, třídění a shrnutí"
        >
          AI
        </span>
      )}
    </span>
  );
}
