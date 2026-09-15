import { rozsah } from "@/lib/format";
import { PASMA, tokeny, UROVNE } from "@/lib/skala";
import type { TydenniHodnoceni, Uroven } from "@/lib/typy";
import { Ikona } from "./ikony";
import { sklon } from "./zeme";
import { Jiskra } from "./mericky";
import { Karta, Napoveda, Prazdno, Tecka } from "./zaklad";

/*
  Vývoj v čase.

  Tři pohledy, jedna zásada: co nemáme doložené, necháváme prázdné.
  Týdny běží od začátku letošního roku, měsíce od roku 2013 — obojí
  s viditelnou mezerou tam, kde záznam chybí.
*/

const VYSVETLENI_POCTU = (
  <span className="block space-y-1.5">
    <span className="block">Počet samostatných bezpečnostních signálů v týdnu. Jedna událost se počítá jednou, i když o ní vyjde deset článků.</span>
    <span className="block opacity-80">Vykřičníky: 5 a víc signálů jeden, 10 a víc dva, 20 a víc tři.</span>
  </span>
);

function celkem(t: TydenniHodnoceni) {
  return t.pocty.zelena + t.pocty.zluta + t.pocty.oranzova + t.pocty.cervena;
}

/** Vykřičníky podle počtu signálů: 5 → !, 10 → !!, 20 → !!! */
export function Vykricniky({ n }: { n: number }) {
  const k = n >= 20 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0;
  if (!k) return null;
  return (
    <span aria-label={`${k === 3 ? "velmi vysoký" : k === 2 ? "vysoký" : "zvýšený"} počet signálů`} className="inline-flex items-center gap-[1px] text-akcent">
      {Array.from({ length: k }, (_, i) => <Ikona key={i} nazev="vykricnik" velikost={13} tah={2.6} />)}
    </span>
  );
}

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
    <Napoveda vpravo popis={<span className="block space-y-1">{casti.map((x) => <span key={x.klic} className="block">{PASMA[x.klic].nazev}: {x.n}</span>)}</span>}>
      <span aria-hidden className="flex h-[7px] w-[64px] overflow-hidden rounded-full bg-linka2">
        {casti.map((x) => <span key={x.klic} className={PASMA[x.klic].pruh} style={{ width: `${(x.n / c) * 100}%` }} />)}
      </span>
    </Napoveda>
  );
}

function ZnackaTrendu({ nyni, drive }: { nyni: Uroven; drive?: Uroven }) {
  if (!drive) return <span className="text-[12px] text-tlum2">—</span>;
  const r = UROVNE[nyni].poradi - UROVNE[drive].poradi;
  if (r === 0) return <span className="flex items-center gap-1 text-[12.5px] text-tlum"><Ikona nazev="minus" velikost={11} tah={2} /> stejně</span>;
  return (
    <span className={`flex items-center gap-1 text-[12.5px] font-semibold ${r > 0 ? "text-stari-text2" : "text-klid-text"}`}>
      <Ikona nazev={r > 0 ? "nahoru" : "dolu"} velikost={11} tah={2.2} /> {r > 0 ? "zhoršení" : "zlepšení"}
    </span>
  );
}

/** Kompaktní týdenní přehled: úroveň, počet signálů s vykřičníky, rozložení, trend. */
export function TabulkaTydnu({ tydny }: { tydny: TydenniHodnoceni[] }) {
  if (!tydny.length) {
    return <Prazdno nadpis="Týdenní přehled zatím nemá data" popis="Plní se od prvního týdne měření. Chybějící týdny nedopočítáváme." />;
  }
  const sestupne = [...tydny].reverse();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-linka">
            <th className="stitek py-2 pr-3 font-medium">Týden</th>
            <th className="stitek py-2 pr-3 font-medium">Úroveň</th>
            <th className="stitek py-2 pr-3 font-medium">
              <Napoveda popis={VYSVETLENI_POCTU}><span className="stitek underline decoration-dotted underline-offset-2">Signálů</span></Napoveda>
            </th>
            <th className="stitek py-2 pr-3 font-medium">Rozložení</th>
            <th className="stitek py-2 pr-3 font-medium">Vývoj</th>
            <th className="stitek py-2 font-medium">Proti minulému</th>
          </tr>
        </thead>
        <tbody>
          {sestupne.map((t, i) => {
            const drive = sestupne[i + 1];
            const n = celkem(t);
            const okno = sestupne.slice(i, i + 5).reverse();
            return (
              <tr key={t.zacatek} className="border-b border-linka2 last:border-0">
                <td className="cislice py-2 pr-3 text-[13px] text-inkoust">{rozsah(t.zacatek, t.konec)}</td>
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2 text-[13.5px] font-semibold">
                    <Tecka uroven={t.celkova} /> {UROVNE[t.celkova].nazev}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-1.5">
                    <span className="cislice text-[14px] font-bold text-inkoust">{t.uplnost === "castecne" && n > 0 ? "≥ " : ""}{n}</span>
                    <Vykricniky n={n} />
                    {t.uplnost === "castecne" && n === 0 && <span className="stitek !text-tlum2">neúplná data</span>}
                  </span>
                </td>
                <td className="py-2 pr-3"><Rozlozeni t={t} /></td>
                <td className="py-2 pr-3">
                  <Jiskra tydny={okno} klic="celkova" />
                </td>
                <td className="py-2"><ZnackaTrendu nyni={t.celkova} drive={drive?.celkova} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- graf po týdnech od začátku roku ---------------- */

const RADY: { klic: "celkova" | "hybridni" | "primyStret"; nazev: string; barva: string; silna: boolean }[] = [
  { klic: "celkova", nazev: "Celková úroveň", barva: "#fffefb", silna: true },
  { klic: "hybridni", nazev: "Hybridní tlak", barva: "#e8763f", silna: false },
  { klic: "primyStret", nazev: "Přímý střet", barva: "#5cbf8a", silna: false },
];

function tydenniSloty(tydny: TydenniHodnoceni[]) {
  const rok = new Date().getUTCFullYear();
  const start = Date.UTC(rok, 0, 1);
  const konec = Date.now();
  const sloty: { od: number; tyden: TydenniHodnoceni | null }[] = [];
  for (let od = start; od <= konec; od += 7 * 86_400_000) {
    const tyden = tydny.find((t) => {
      const z = new Date(t.zacatek).getTime();
      return z >= od && z < od + 7 * 86_400_000;
    }) ?? null;
    sloty.push({ od, tyden });
  }
  return sloty;
}

export function GrafTrendu({ tydny }: { tydny: TydenniHodnoceni[] }) {
  if (tydny.length < 2) {
    return <Prazdno nadpis="Na křivku je zatím brzy" popis="Objeví se, jakmile bude víc než jedno týdenní hodnocení." ikona="graf" />;
  }
  const sloty = tydenniSloty(tydny);
  const SIRKA = 1000, V = 180, LEVO = 150, PRAVO = 20, NAHORE = 14, DOLE = 36;
  const S = (SIRKA - LEVO - PRAVO) / Math.max(1, sloty.length - 1);
  const x = (i: number) => LEVO + i * S;
  const y = (u: Uroven) => NAHORE + V - ((UROVNE[u].poradi - 1) / 12) * V;
  const popisky = [
    { poradi: 1, text: "Nízká" }, { poradi: 5, text: "Střední" }, { poradi: 8, text: "Vysoká" }, { poradi: 11, text: "Vážná" },
  ];
  const prvniSData = sloty.findIndex((s) => s.tyden);
  const mesice = ["1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.", "10.", "11.", "12."];

  // Úseky křivky jen mezi sousedními týdny s daty — mezera zůstává mezerou.
  const useky = (klic: (typeof RADY)[number]["klic"]) => {
    const casti: string[] = [];
    let akt: string[] = [];
    sloty.forEach((s, i) => {
      if (s.tyden) akt.push(`${x(i)},${y(s.tyden[klic])}`);
      else if (akt.length) { casti.push(akt.join(" ")); akt = []; }
    });
    if (akt.length) casti.push(akt.join(" "));
    return casti;
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {RADY.map((r) => (
          <span key={r.klic} className="flex items-center gap-2 text-[12.5px] text-tlum">
            <span aria-hidden className="h-[2px] w-4 rounded-full" style={{ background: r.barva }} /> {r.nazev}
          </span>
        ))}
        <span className="flex items-center gap-2 text-[12.5px] text-tlum2"><span aria-hidden className="srafy h-[10px] w-4 text-tlum2" /> bez dat</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${SIRKA} ${NAHORE + V + DOLE}`} role="img" aria-label="Vývoj hodnocení po týdnech od začátku roku" className="h-[230px] w-full min-w-[560px]">
          <defs>
            <pattern id="srafy-bez-dat" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--color-tlum2)" strokeWidth="1" strokeOpacity="0.35" />
            </pattern>
            <linearGradient id="plocha-celkem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-inkoust)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--color-inkoust)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {prvniSData > 0 && (
            <>
              <rect x={x(0)} y={NAHORE} width={x(prvniSData) - x(0)} height={V} fill="url(#srafy-bez-dat)" />
              <text x={(x(0) + x(prvniSData)) / 2} y={NAHORE + V / 2} textAnchor="middle" fontSize="13" fontFamily="var(--font-mono)" fill="var(--color-tlum2)">bez doložených dat</text>
            </>
          )}
          {popisky.map((p) => {
            const yy = NAHORE + V - ((p.poradi - 1) / 12) * V;
            return (
              <g key={p.poradi}>
                <line x1={LEVO - 8} x2={SIRKA - PRAVO} y1={yy} y2={yy} stroke="#232320" strokeWidth="1" />
                <text x={LEVO - 14} y={yy + 4.5} textAnchor="end" fontSize="13" fontFamily="var(--font-mono)" fill="var(--color-tlum)">{p.text}</text>
              </g>
            );
          })}
          {RADY.map((r) => useky(r.klic).map((body, n) => (
            <polyline key={`${r.klic}-${n}`} fill="none" stroke={r.barva} strokeWidth={r.silna ? 2.2 : 1.4} strokeLinejoin="round" strokeLinecap="round" opacity={r.silna ? 1 : 0.85} points={body} />
          )))}
          {sloty.map((s, i) => {
            const d = new Date(s.od);
            const prvniVMesici = i === 0 || new Date(sloty[i - 1].od).getUTCMonth() !== d.getUTCMonth();
            return (
              <g key={s.od}>
                {prvniVMesici && (
                  <text x={x(i)} y={NAHORE + V + 20} textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fill="var(--color-tlum)">{mesice[d.getUTCMonth()]}</text>
                )}
                {s.tyden && (
                  <>
                    <rect x={x(i) - S / 2} y={NAHORE} width={S} height={V} fill="transparent">
                      <title>{`${rozsah(s.tyden.zacatek, s.tyden.konec)} — celkem: ${UROVNE[s.tyden.celkova].nazev}, hybridní: ${UROVNE[s.tyden.hybridni].nazev}, přímý střet: ${UROVNE[s.tyden.primyStret].nazev}, signálů: ${celkem(s.tyden)}`}</title>
                    </rect>
                    {RADY.map((r) => (
                      <circle key={r.klic} cx={x(i)} cy={y(s.tyden![r.klic])} r={r.silna ? 3 : 2.2} fill="#0d0d0a" stroke={r.barva} strokeWidth={r.silna ? 2 : 1.4} />
                    ))}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="stitek mt-2">Svislá osa je stupnice úrovní, ne procenta · letošní rok po týdnech</p>
    </div>
  );
}

/* ---------------- měsíce od roku 2013 ---------------- */

export function GrafMesicu({ mesice }: { mesice: { mesic: string; uroven: Uroven | null; zaznamu: number; nejvyssi: Uroven | null }[] }) {
  const SIRKA = 1000, V = 90, LEVO = 8, PRAVO = 8, NAHORE = 8, DOLE = 26;
  const S = (SIRKA - LEVO - PRAVO) / mesice.length;
  const sDaty = mesice.filter((m) => m.uroven).length;
  const prvni = mesice.find((m) => m.uroven)?.mesic;
  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${SIRKA} ${NAHORE + V + DOLE}`} role="img" aria-label="Měsíční úroveň od roku 2013" className="h-[124px] w-full min-w-[560px]">
          <defs>
            <pattern id="srafy-mesice" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-tlum2)" strokeWidth="1" strokeOpacity="0.3" />
            </pattern>
          </defs>
          {mesice.map((m, i) => {
            const [y, mm] = m.mesic.split("-").map(Number);
            const x0 = LEVO + i * S;
            const tecka = m.zaznamu > 0 && (
              <circle cx={x0 + S / 2} cy={NAHORE + V - 6 - Math.min(4, m.zaznamu) * 6} r={Math.min(4.5, 2 + m.zaznamu * 0.6)} fill={m.nejvyssi ? tokeny(m.nejvyssi).plna : "var(--color-tlum)"} stroke="#0d0d0a" strokeWidth="1">
                <title>{`${mm}/${y}: ${m.zaznamu} ${sklon(m.zaznamu, "záznam", "záznamy", "záznamů")}${m.nejvyssi ? `, nejvyšší ${UROVNE[m.nejvyssi].nazev}` : ""}`}</title>
              </circle>
            );
            if (!m.uroven) {
              return (
                <g key={m.mesic}>
                  <rect x={x0} y={NAHORE} width={S} height={V} fill="url(#srafy-mesice)" />
                  {tecka}
                  {mm === 1 && (y % 2 === 0) && <text x={x0 + 2} y={NAHORE + V + 18} fontSize="11" fontFamily="var(--font-mono)" fill="var(--color-tlum2)">{y}</text>}
                </g>
              );
            }
            const vyska = (UROVNE[m.uroven].poradi / 13) * V;
            return (
              <g key={m.mesic}>
                <rect x={x0 + 0.5} y={NAHORE + V - vyska} width={Math.max(1, S - 1)} height={vyska} fill={tokeny(m.uroven).plna} rx="1">
                  <title>{`${mm}/${y}: ${UROVNE[m.uroven].nazev}`}</title>
                </rect>
                {tecka}
                {mm === 1 && (y % 2 === 0) && <text x={x0 + 2} y={NAHORE + V + 18} fontSize="11" fontFamily="var(--font-mono)" fill="var(--color-tlum)">{y}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="stitek mt-2">
        hodnocení od {prvni?.split("-").reverse().join("/") ?? "—"} ({sDaty} měs.) · tečky = záznamy v měsíci, barva = nejvyšší závažnost · šrafovaně = bez hodnocení
      </p>
    </div>
  );
}
