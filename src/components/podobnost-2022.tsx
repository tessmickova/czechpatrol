import { PODOBNOST_OVERENA, SROVNANI_VYROKU, type VyrokSrovnani } from "@/lib/podobnost-2022";
import { VEN } from "@/config/odkazy-ven";
import { IkonaKruh } from "./widgety";

function datum(iso: string) {
  const [rok, mesic, den] = iso.split("-");
  return `${Number(den)}. ${Number(mesic)}. ${rok}`;
}

function Vyrok({ rok, vyrok }: { rok: 2022 | 2026; vyrok: VyrokSrovnani | null }) {
  return (
    <div className={`min-w-0 rounded-[14px] p-3 ${rok === 2022 ? "bg-plocha2/70" : "border border-akcent/30 bg-akcent/[0.04]"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className={`cislice text-sm font-bold ${rok === 2026 ? "text-akcent" : "text-tlum"}`}>{rok} · {rok === 2022 ? "před invazí" : "srovnání"}</span>
        {vyrok && <time dateTime={vyrok.datum} className="text-xs text-tlum2">{datum(vyrok.datum)}</time>}
      </div>
      {vyrok ? <>
        <p className="mt-1 text-xs leading-relaxed text-tlum">{vyrok.autor}</p>
        <p className="mt-2 text-sm leading-relaxed text-inkoust">{vyrok.citace ? `„${vyrok.text}“` : vyrok.text}</p>
        <p className="mt-2 text-xs text-tlum2">
          {vyrok.citace ? "Překlad citace" : "Parafráze"} · <a href={vyrok.zdroj.url} target="_blank" rel={VEN} className="odkaz" aria-label={`Zdroj výroku z ${datum(vyrok.datum)}: ${vyrok.zdroj.nazev}`}>{vyrok.zdroj.nazev} ↗</a>
        </p>
      </> : <p className="mt-2 text-sm leading-relaxed text-tlum">Srovnatelný výrok zatím nemáme doložený.</p>}
    </div>
  );
}

const STAVY = {
  podobny: { znak: "✓", text: "Podobný výrok doložen", trida: "text-akcent" },
  castecny: { znak: "≈", text: "Částečná podobnost", trida: "text-tlum" },
  nedolozeno: { znak: "□", text: "Protějšek nedoložen", trida: "text-tlum" },
} as const;

export function Podobnost2022() {
  return (
    <section lang="cs" aria-labelledby="podobnost-2022-nadpis" className="overflow-hidden rounded-[22px] bg-plocha">
      <div className="px-4 pb-3 pt-3">
        <div className="flex items-start gap-2">
          <IkonaKruh ikona="info" velikost="s" />
          <h3 id="podobnost-2022-nadpis" className="nadpis-boxu min-w-0 leading-snug">Podobnost s únorem 2022</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-tlum">Srovnání výroků před invazí 24. 2. 2022 s výroky z roku 2026.</p>
        <p className="mt-2 text-sm leading-relaxed text-inkoust">Fajfka značí podobnost slov, nikoli pravděpodobnost útoku.</p>
        <p className="mt-2 text-xs text-tlum2">Srovnání připravené s AI · ověření zdrojů <time dateTime={PODOBNOST_OVERENA}>{datum(PODOBNOST_OVERENA)}</time></p>
      </div>
      <ol className="space-y-5 px-4 pb-4">
        {SROVNANI_VYROKU.map((p) => {
          const stav = STAVY[p.stav];
          return (
            <li key={p.id}>
              <h4 className="text-sm font-bold leading-snug text-inkoust">{p.nazev}</h4>
              <p className={`mb-2 mt-1 flex items-center gap-1.5 text-sm font-semibold ${stav.trida}`}><span aria-hidden="true">{stav.znak}</span>{stav.text}</p>
              <div className="space-y-2"><Vyrok rok={2022} vyrok={p.drive} /><Vyrok rok={2026} vyrok={p.nyni} /></div>
              <details className="mt-2 text-sm leading-relaxed text-tlum">
                <summary className="cursor-pointer rounded py-1 underline decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-akcent">Kontext a rozdíly</summary>
                <p className="mt-2">{p.kontext}</p>
              </details>
            </li>
          );
        })}
      </ol>
      <p className="px-4 pb-4 text-xs leading-relaxed text-tlum2">Výběr není úplným seznamem prohlášení. Chybějící protějšek neznamená, že výrok neexistuje. Zdroje dokládají pronesené výroky, ne pravdivost jejich obsahu; kde není přímý přepis, uvádíme zprostředkující zdroj.</p>
    </section>
  );
}
