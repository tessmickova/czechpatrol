"use client";

import { useEffect, useState } from "react";

/*
  Obsah dlouhé stránky (revize 24. 9. 2026).

  Metodika, Soukromí a Podmínky mají 7–10 tisíc pixelů bez možnosti
  skočit na oddíl. Tohle po načtení posbírá nadpisy H2 v hlavním obsahu,
  doplní jim id a vykreslí je jako posuvný řádek odkazů přilepený pod
  hlavičkou. Bez JavaScriptu se nic nerozbije — jen tu nic nebude.
*/
function slug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function ObsahStranky({ vyber = "main h2" }: { vyber?: string }) {
  const [polozky, setPolozky] = useState<{ id: string; text: string }[]>([]);
  useEffect(() => {
    const nadpisy = [...document.querySelectorAll<HTMLElement>(vyber)].filter((h) => h.textContent?.trim());
    const pouzite = new Set<string>();
    const out = nadpisy.map((h) => {
      const text = h.textContent!.trim().replace(/\s+/g, " ");
      let id = h.id || slug(text) || "oddil";
      while (pouzite.has(id)) id += "-2";
      pouzite.add(id);
      if (!h.id) h.id = id;
      h.style.scrollMarginTop = "96px";
      return { id, text };
    });
    setPolozky(out);
  }, [vyber]);
  if (polozky.length < 3) return null;
  return (
    <div className="sticky top-[72px] z-30 mx-auto mt-6 max-w-[1280px] px-4 sm:px-6">
    <nav aria-label="Obsah stránky" className="-mx-4 border-y border-linka2 bg-papir/95 px-4 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-2">
      <ol className="pas-scroll flex items-center gap-1 overflow-x-auto py-1.5">
        {polozky.map((p, i) => (
          <li key={p.id} className="shrink-0">
            <a href={`#${p.id}`} className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-2.5 text-drobne text-tlum hover:bg-plocha2 hover:text-inkoust">
              <span className="cislice text-mikro text-tlum2">{String(i + 1).padStart(2, "0")}</span>
              {p.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
    </div>
  );
}
