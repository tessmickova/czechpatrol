import { rozsah } from "@/lib/format";
import { PASMA, tokeny, UROVNE } from "@/lib/skala";
import type { TydenniHodnoceni, Uroven } from "@/lib/typy";
import { Jiskra } from "./mericky";
import { Karta, Napoveda, Prazdno, Tecka } from "./zaklad";

const VYSVETLENI_POCTU = (
  <span className="block space-y-1.5">
    <span className="block">
      Počet samostatných relevantních bezpečnostních signálů zachycených v daném týdnu.
    </span>
    <span className="block opacity-80">
      Jedna událost se počítá pouze jednou, i když o ní vyjde deset článků. Zásadní nový
      vyšetřovací průlom u starší události ale může tvořit nový signál.
    </span>
  </span>
);

function celkem(t: TydenniHodnoceni) {
  return t.pocty.zelena + t.pocty.zluta + t.pocty.oranzova + t.pocty.cervena;
}

/** Miniaturní skládaný proužek rozložení závažnosti. */
function Rozlozeni({ t }: { t: TydenniHodnoceni }) {
  const c = celkem(t);
  const casti = [
    { klic: "zelena" as const, n: t.pocty.zelena },
    { klic: "zluta" as const, n: t.pocty.zluta },
    { klic: "oranzova" as const, n: t.pocty.oranzova },
    { klic: "cervena" as const, n: t.pocty.cervena },
  ].filter((x) => x.n > 0);

  if (!c) return <span className="text-[12px] text-tlum2">—</span>;

  return (
    <Napoveda
      vpravo
      popis={
        <span className="block space-y-1">
          {casti.map((x) => (
            <span key={x.klic} className="block">
              {PASMA[x.klic].nazev}: {x.n}
            </span>
          ))}
        </span>
      }
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className="flex h-[7px] w-[68px] overflow-hidden rounded-[2px] bg-linka2">
          {casti.map((x) => (
            <span
              key={x.klic}
              className={PASMA[x.klic].pruh}
              style={{ width: `${(x.n / c) * 100}%` }}
            />
          ))}
        </span>
        <span className="cislice text-[11.5px] text-tlum2">
          {casti.map((x) => x.n).join(" · ")}
        </span>
      </span>
    </Napoveda>
  );
}

function ZnackaTrendu({ nyni, drive }: { nyni: Uroven; drive?: Uroven }) {
  if (!drive) return <span className="text-[12px] text-tlum2">—</span>;
  const r = UROVNE[nyni].poradi - UROVNE[drive].poradi;
  if (r === 0) return <span className="text-[12.5px] text-tlum">→ beze změny</span>;
  return (
    <span className={`text-[12.5px] font-medium ${r > 0 ? "text-[#94450f]" : "text-[#2f6f47]"}`}>
      {r > 0 ? "↑" : "↓"} {r > 0 ? "zhoršení" : "zlepšení"}
    </span>
  );
}

export function TabulkaTydnu({ tydny }: { tydny: TydenniHodnoceni[] }) {
  if (!tydny.length) {
    return (
      <Prazdno
        nadpis="Týdenní přehled zatím nemá data"
        popis="Tabulka se plní od prvního týdne měření. Chybějící týdny nedopočítáváme ani neodhadujeme."
      />
    );
  }

  const sestupne = [...tydny].reverse();

  return (
    <Karta className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-linka">
              {[
                ["Týden", ""],
                ["Celkem", ""],
                ["Hybridní", ""],
                ["Přímý střet", ""],
                ["Signálů", "pocet"],
                ["Rozložení", ""],
                ["Vývoj", ""],
                ["Proti minulému", ""],
              ].map(([nazev, klic]) => (
                <th key={nazev} className="stitek px-4 py-3 font-medium first:pl-5 last:pr-5">
                  {klic === "pocet" ? (
                    <Napoveda popis={VYSVETLENI_POCTU}>
                      <span className="stitek underline decoration-dotted underline-offset-2">
                        {nazev}
                      </span>
                    </Napoveda>
                  ) : (
                    nazev
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sestupne.map((t, i) => {
              const predchozi = sestupne[i + 1];
              const c = celkem(t);
              return (
                <tr key={t.zacatek} className="border-b border-linka2 last:border-0 hover:bg-papir">
                  <td className="cislice px-4 py-3.5 pl-5 text-[13px] font-medium">
                    {rozsah(t.zacatek, t.konec)}
                  </td>
                  {([t.celkova, t.hybridni, t.primyStret] as Uroven[]).map((u, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-2 text-[12.5px] font-medium ${tokeny(u).text}`}>
                        <Tecka uroven={u} />
                        {UROVNE[u].nazev}
                      </span>
                    </td>
                  ))}
                  <td className="px-4 py-3.5">
                    {t.uplnost === "castecne" ? (
                      <Napoveda
                        popis={
                          <span className="block">
                            Minimálně {c} ověřených událostí. Historický monitoring není
                            kompletní, proto neuvádíme přesné číslo.
                          </span>
                        }
                      >
                        <span className="cislice text-[13px] font-semibold underline decoration-dotted underline-offset-2">
                          ≥ {c}
                        </span>
                      </Napoveda>
                    ) : (
                      <span className="cislice text-[13px] font-semibold">{c}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Rozlozeni t={t} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Jiskra tydny={sestupne.slice(i).reverse()} klic="celkova" />
                  </td>
                  <td className="px-4 py-3.5 pr-5">
                    <ZnackaTrendu nyni={t.celkova} drive={predchozi?.celkova} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="stitek border-t border-linka px-5 py-4">
        ≥ N = monitoring v tom týdnu neběžel celý, uvádíme doložené minimum
      </p>
    </Karta>
  );
}

/* ---------------- graf ---------------- */

const RADY = [
  { klic: "celkova" as const, nazev: "Celková úroveň", barva: "#0c0c0c", silna: true },
  { klic: "hybridni" as const, nazev: "Hybridní tlak", barva: "#c25e18", silna: false },
  { klic: "primyStret" as const, nazev: "Přímý střet", barva: "#3f8f5c", silna: false },
];

/**
 * Graf vývoje po týdnech. Osa Y je diskrétní stupnice úrovní, ne procenta —
 * falešně přesnou pravděpodobnost web zásadně nezobrazuje.
 */
export function GrafTrendu({ tydny }: { tydny: TydenniHodnoceni[] }) {
  if (tydny.length < 2) {
    return (
      <Prazdno
        nadpis="Graf potřebuje aspoň dva týdny dat"
        popis="Vývojová křivka se objeví, jakmile bude k dispozici více než jedno týdenní hodnocení."
      />
    );
  }

  // Pevná souřadnicová soustava, kterou viewBox roztáhne na šířku karty.
  const SIRKA = 1000, V = 200, LEVO = 92, PRAVO = 20, NAHORE = 14, DOLE = 40;
  const sirka = SIRKA;
  const S = (SIRKA - LEVO - PRAVO) / Math.max(1, tydny.length - 1);
  const x = (i: number) => LEVO + i * S;
  const y = (u: Uroven) => NAHORE + V - ((UROVNE[u].poradi - 1) / 12) * V;

  const popisky: { poradi: number; text: string }[] = [
    { poradi: 1, text: "Nízká" },
    { poradi: 4, text: "Střední" },
    { poradi: 7, text: "Téměř oranžová" },
    { poradi: 9, text: "Vysoká" },
    { poradi: 11, text: "Kritická" },
  ];

  return (
    <Karta className="p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        {RADY.map((r) => (
          <span key={r.klic} className="flex items-center gap-2 text-[12px] text-tlum">
            <span
              aria-hidden
              className="h-[2px] w-4 rounded-full"
              style={{ background: r.barva, opacity: r.silna ? 1 : 0.85 }}
            />
            {r.nazev}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${sirka} ${NAHORE + V + DOLE}`}
          role="img"
          aria-label="Vývoj hodnocení po týdnech"
                    className="h-[254px] w-full min-w-[560px]"
        >
          {popisky.map((p) => {
            const yy = NAHORE + V - ((p.poradi - 1) / 12) * V;
            return (
              <g key={p.poradi}>
                <line x1={LEVO - 8} x2={sirka - PRAVO} y1={yy} y2={yy} stroke="#f0efeb" strokeWidth="1" />
                <text x={LEVO - 14} y={yy + 3.5} textAnchor="end" fontSize="10" fill="#93938f">
                  {p.text}
                </text>
              </g>
            );
          })}

          <defs>
            <linearGradient id="plocha-celkem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e131a" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#0e131a" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            fill="url(#plocha-celkem)"
            d={
              `M ${x(0)},${NAHORE + V} ` +
              tydny.map((t, i) => `L ${x(i)},${y(t.celkova)}`).join(" ") +
              ` L ${x(tydny.length - 1)},${NAHORE + V} Z`
            }
          />

          {RADY.map((r) => (
            <polyline
              key={r.klic}
              fill="none"
              stroke={r.barva}
              strokeWidth={r.silna ? 2 : 1.4}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={r.silna ? 1 : 0.8}
              points={tydny.map((t, i) => `${x(i)},${y(t[r.klic])}`).join(" ")}
            />
          ))}

          {tydny.map((t, i) => (
            <g key={t.zacatek} className="group">
              <rect
                x={x(i) - S / 2}
                y={NAHORE}
                width={S}
                height={V}
                fill="transparent"
                className="cursor-default"
              >
                <title>
                  {`${rozsah(t.zacatek, t.konec)} — celkem: ${UROVNE[t.celkova].nazev}, hybridní: ${
                    UROVNE[t.hybridni].nazev
                  }, přímý střet: ${UROVNE[t.primyStret].nazev}, signálů: ${
                    t.uplnost === "castecne" ? "≥ " : ""
                  }${celkem(t)}`}
                </title>
              </rect>
              {RADY.map((r) => (
                <circle
                  key={r.klic}
                  cx={x(i)}
                  cy={y(t[r.klic])}
                  r={r.silna ? 3 : 2.2}
                  fill="#fff"
                  stroke={r.barva}
                  strokeWidth={r.silna ? 2 : 1.4}
                />
              ))}
              {i === tydny.length - 1 && (
                <circle cx={x(i)} cy={y(t.celkova)} r="6" fill="none" stroke="#0e131a" strokeWidth="1" opacity="0.28" />
              )}
              {(i % 2 === 0 || tydny.length <= 8) && (
                <text
                  x={x(i)}
                  y={NAHORE + V + 20}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#93938f"
                >
                  {rozsah(t.zacatek, t.konec).split(" – ")[0]}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      <p className="stitek mt-4 border-t border-linka2 pt-4">
        Svislá osa je stupnice úrovní, ne procenta
      </p>
    </Karta>
  );
}
