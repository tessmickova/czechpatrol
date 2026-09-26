"use client";

import { useEffect, useState } from "react";
import { FUNKCE } from "@/lib/odolnost";
import { NAZVY_HROZEB, seznamy, VERZE_SEZNAMU, type KlicSeznamu } from "@/lib/priprava";
import { Ikona } from "./ikony";
import { Sdeleni } from "./ui";

/*
  Seznamy zásob s odškrtáváním (24. 9. 2026): 72 hodin, rozšířený, AI tipy.
  Co je zaškrtnuté, zůstává v tomhle zařízení (localStorage), nikam se
  neposílá. Položka z karty „Připravit teď“ se zvýrazní a přiroluje.
*/
const KLIC = "czechpatrol:seznamy:v1";

function nacti(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(KLIC) ?? "{}") as Record<string, boolean>; } catch { return {}; }
}

export function SeznamyZasob({ seznam, zvyrazni }: { seznam: KlicSeznamu; zvyrazni: string | null }) {
  const [mam, setMam] = useState<Record<string, boolean>>({});
  useEffect(() => { setMam(nacti()); }, []);
  useEffect(() => {
    if (!zvyrazni) return;
    const el = document.getElementById(`polozka-${zvyrazni}`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [zvyrazni, seznam]);
  const prepni = (klic: string) => {
    const nove = { ...mam, [klic]: !mam[klic] };
    setMam(nove);
    try { localStorage.setItem(KLIC, JSON.stringify(nove)); } catch { /* bez úložiště jen pro tuhle stránku */ }
  };
  const s = seznamy().find((x) => x.klic === seznam)!;
  const hotovo = s.polozky.filter((p) => mam[p.klic]).length;
  const nazevFunkce = (k: string | null) => (k ? FUNKCE.find((f) => f.klic === k)?.nazev ?? null : null);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[60ch]">
          <h2 className="podnadpis text-velke">{s.nazev}</h2>
          <p className="mt-1 text-zaklad leading-relaxed text-tlum">{s.popis}{s.zdroj && <> Podle <a href={s.zdroj.url} target="_blank" rel="noopener noreferrer" className="odkaz">{s.zdroj.nazev}</a>.</>}</p>
        </div>
        <p className="cislice text-male text-tlum"><b className="text-inkoust">{hotovo}</b> z {s.polozky.length} máte</p>
      </div>
      {seznam === "ai" && (
        <Sdeleni ton="neutral" ikona="info" trida="mt-4">Tipy projektu sepsané s pomocí AI, ne úřední doporučení. Když si nejste jistí, platí pokyny úřadů a zdravý rozum.</Sdeleni>
      )}
      <ol className="mt-4 overflow-hidden rounded-[22px] bg-plocha">
        {s.polozky.map((p) => {
          const je = Boolean(mam[p.klic]);
          const zv = zvyrazni === p.klic;
          return (
            <li key={p.klic} id={`polozka-${p.klic}`} className={`scroll-mt-[96px] ${zv ? "bg-akcent/[0.08] ring-1 ring-inset ring-akcent/50" : ""}`}>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-plocha2">
                <input type="checkbox" checked={je} onChange={() => prepni(p.klic)} className="mt-1 h-[18px] w-[18px] shrink-0 accent-[var(--color-klid)]" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-zaklad font-bold leading-snug ${je ? "text-tlum line-through decoration-tlum2/50" : "text-inkoust"}`}>{p.nazev}{p.mnozstvi && <span className="ml-1.5 font-normal text-tlum">· {p.mnozstvi}</span>}</span>
                  <span className="mt-0.5 block text-male leading-relaxed text-tlum">{p.popis}</span>
                  {p.zdroj && <a href={p.zdroj.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz mt-0.5 inline-block text-drobne text-tlum2">Zdroj: {p.zdroj.nazev} ↗</a>}
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-mikro text-tlum2">
                    {p.hrozby.map((h) => <span key={h} className="rounded-full border border-linka2 px-2 py-[2px]">{NAZVY_HROZEB[h]}</span>)}
                    {nazevFunkce(p.funkce) && <span className="flex items-center gap-1"><Ikona nazev="terc" velikost={11} tah={2} /> v kalkulačce: {nazevFunkce(p.funkce)}</span>}
                    {zv && <span className="font-semibold text-akcent-svetla">z karty „Připravit teď“</span>}
                  </span>
                </span>
                {je && <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-klid/20 text-klid-text"><Ikona nazev="fajfka" velikost={12} tah={2.4} /></span>}
              </label>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-drobne text-tlum2">Zaškrtnutí zůstává jen v tomhle zařízení. Seznamy verze {VERZE_SEZNAMU}.</p>
    </div>
  );
}
