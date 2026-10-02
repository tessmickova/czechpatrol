"use client";

import { useEffect, useState } from "react";
import { KVIZ } from "@/lib/letaky";

/*
  „Vím to“ — tři otázky ke všeobecné výstraze a nálezu trosek. Výsledek
  zůstává jen v prohlížeči (localStorage), nikam se neposílá.
*/
const KLIC = "cp:kviz-zaklady";

export function KvizZaklady() {
  const [odpovedi, setOdpovedi] = useState<(number | null)[]>(KVIZ.map(() => null));
  const [hotovo, setHotovo] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(KLIC) === "ok") setHotovo(true); } catch { /* bez úložiště jen nepamatuje */ }
  }, []);

  const vse = odpovedi.every((o, i) => o === KVIZ[i].spravne);
  useEffect(() => {
    if (!vse) return;
    setHotovo(true);
    try { localStorage.setItem(KLIC, "ok"); } catch { /* nevadí */ }
  }, [vse]);

  if (hotovo && !vse) {
    return (
      <div className="rounded-[18px] border border-klid/40 bg-klid/10 p-4 text-zaklad text-inkoust">
        ✓ <b>Základy znáte.</b> <button type="button" className="odkaz text-male" onClick={() => setHotovo(false)}>Projít znovu</button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-linka p-4">
      <div className="stitek mb-3">Vím to? Tři otázky</div>
      <ol className="space-y-4">
        {KVIZ.map((q, i) => (
          <li key={q.otazka}>
            <p className="text-zaklad font-semibold text-inkoust">{i + 1}. {q.otazka}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {q.moznosti.map((m, j) => {
                const zvoleno = odpovedi[i] === j;
                const spravne = j === q.spravne;
                return (
                  <button key={m} type="button" onClick={() => setOdpovedi((o) => o.map((x, k) => (k === i ? j : x)))}
                    className={`min-h-[44px] rounded-full border px-4 text-male transition-colors ${zvoleno ? (spravne ? "border-klid bg-klid/15 text-inkoust" : "border-akcent bg-akcent/10 text-inkoust") : "border-linka text-tlum hover:border-akcent/60"}`}>
                    {zvoleno && (spravne ? "✓ " : "✗ ")}{m}
                  </button>
                );
              })}
            </div>
            {odpovedi[i] !== null && odpovedi[i] !== q.spravne && <p className="mt-1 text-drobne text-akcent-svetla">Zkuste to znovu.</p>}
          </li>
        ))}
      </ol>
      {vse && <p className="mt-4 rounded-[14px] bg-klid/10 p-3 text-zaklad text-inkoust">✓ <b>Výborně, základy znáte.</b> Letáky si můžete vytisknout pro rodinu.</p>}
    </div>
  );
}
