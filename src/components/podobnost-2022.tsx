"use client";

import { useRef, useState } from "react";
import { PODOBNOST_OVERENA, SROVNANI_VYROKU, type SrovnaniVyroku, type VyrokSrovnani } from "@/lib/podobnost-2022";
import { VEN } from "@/config/odkazy-ven";

function datum(iso: string) {
  const [rok, mesic, den] = iso.split("-");
  return `${Number(den)}. ${Number(mesic)}. ${rok}`;
}

const KRATCE: Record<string, readonly [string, string]> = {
  "valku-nechceme": ["Putin: válku nechceme", "Kreml: bez plánů agrese"],
  "stazeni-vojsk": ["Putin: stahujeme vojska", "Protějšek nedoložen"],
  "diplomacie": ["Putin: otevřeni dialogu", "Putin: šance na dohodu"],
  "nezautocime": ["Rjabkov: nezaútočíme", "Peskov: neohrožujeme"],
  "zadne-plany": ["Antonov: bez plánů invaze", "Kreml: bez plánů agrese"],
};

const STAVY = {
  podobny: { znak: "✓", text: "Podobný výrok doložen" },
  castecny: { znak: "≈", text: "Částečná podobnost" },
  nedolozeno: { znak: "□", text: "Protějšek nedoložen" },
} as const;

function Vyrok({ rok, vyrok }: { rok: 2022 | 2026; vyrok: VyrokSrovnani | null }) {
  return (
    <div className="space-y-2">
      <h4 className={`text-sm font-bold ${rok === 2026 ? "text-akcent" : "text-tlum"}`}>{rok}{vyrok && <> · <time dateTime={vyrok.datum}>{datum(vyrok.datum)}</time></>}</h4>
      {vyrok ? <>
        <p className="text-sm text-tlum">{vyrok.autor}</p>
        <p className="text-base leading-relaxed">{vyrok.citace ? `„${vyrok.text}“` : vyrok.text}</p>
        <p className="text-sm text-tlum">{vyrok.citace ? "Překlad citace" : "Parafráze"} · <a href={vyrok.zdroj.url} target="_blank" rel={VEN} className="odkaz">{vyrok.zdroj.nazev} ↗</a></p>
      </> : <p className="text-sm text-tlum">Srovnatelný výrok zatím nemáme doložený.</p>}
    </div>
  );
}

export function Podobnost2022() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [vybrane, setVybrane] = useState<SrovnaniVyroku | null>(null);

  return (
    <section lang="cs" aria-labelledby="podobnost-2022-nadpis" className="min-w-0 rounded-[22px] bg-plocha p-3">
      {/* 26. 9. 2026: přesně 12 viditelných řádků; detail v dialogu nezvětšuje sidebar. */}
      <h3 id="podobnost-2022-nadpis" className="truncate text-sm font-bold leading-5">Podobnost s únorem 2022</h3>
      <ol className="my-2 space-y-1">
        {SROVNANI_VYROKU.map((p) => {
          const stav = STAVY[p.stav];
          const kratce = KRATCE[p.id];
          return (
            <li key={p.id}>
              <button type="button" aria-haspopup="dialog" aria-label={`${p.nazev}: ${stav.text}. Otevřít výroky, kontext a zdroje.`}
                onClick={() => { setVybrane(p); dialog.current?.showModal(); }}
                className="block w-full min-w-0 rounded text-left text-sm leading-5 hover:bg-plocha2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-akcent">
                <span className="grid grid-cols-[2.5rem_1rem_minmax(0,1fr)] items-baseline text-tlum">
                  <span className="cislice text-xs">2022</span><span aria-hidden="true" /><span className="truncate">{kratce[0]}</span>
                </span>
                <span className="grid grid-cols-[2.5rem_1rem_minmax(0,1fr)] items-baseline">
                  <span className="cislice text-xs font-semibold text-akcent">2026</span><span aria-hidden="true" className="text-akcent">{stav.znak}</span><span className="truncate underline decoration-dotted decoration-linka underline-offset-4">{kratce[1]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="truncate text-xs leading-4 text-tlum2">Podobnost slov ≠ předpověď útoku</p>
      <dialog ref={dialog} aria-labelledby="podobnost-detail-nadpis" className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl bg-plocha p-5 text-inkoust shadow-xl backdrop:bg-black/50">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 id="podobnost-detail-nadpis" className="text-base font-bold">{vybrane?.nazev}</h3>
          <button type="button" autoFocus onClick={() => dialog.current?.close()} className="shrink-0 rounded px-2 py-1 text-sm underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-akcent">Zavřít</button>
        </div>
        {vybrane && <div className="space-y-5">
          <p className="text-sm font-semibold">{STAVY[vybrane.stav].znak} {STAVY[vybrane.stav].text}</p>
          <Vyrok rok={2022} vyrok={vybrane.drive} />
          <Vyrok rok={2026} vyrok={vybrane.nyni} />
          <p className="text-sm leading-relaxed text-tlum">{vybrane.kontext}</p>
          <p className="text-sm leading-relaxed text-tlum">✓ podobný výrok · ≈ částečná podobnost · □ nedoložený protějšek. Značky srovnávají slova, nepředpovídají útok.</p>
          <p className="text-xs leading-relaxed text-tlum2">Zkrácené popisky v přehledu jsou parafráze. Srovnání připravené s AI · zdroje ověřeny {datum(PODOBNOST_OVERENA)}. Výběr není úplný. Zdroje dokládají pronesené výroky, ne pravdivost jejich obsahu.</p>
        </div>}
      </dialog>
    </section>
  );
}
