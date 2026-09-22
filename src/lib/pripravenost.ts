import type { OficialniNastroj } from "./typy";

/*
  Skóre digitální připravenosti.

  Počítá se jen z odpovědí, které dal člověk sám (mám / nemám / nevím),
  a jen nad doporučenými položkami. Web nevidí do telefonu a nepředstírá
  to. „Nevím" se nepočítá jako „mám": nejistota není připravenost.
*/

export type Odpoved = "mam" | "nemam" | "nevim";
export type Odpovedi = Record<string, Odpoved>;

export const KLIC_ULOZISTE = "czechpatrol:pripravenost:v1";

export const NAZVY_KATEGORII: Record<OficialniNastroj["kategorie"], string> = {
  tisen: "Tísňová pomoc",
  pocasi: "Počasí",
  cestovani: "Cestování",
  "mistni-varovani": "Místní varování",
  zdravi: "Zdraví",
  "krizove-informace": "Krizové informace",
};

export const PORADI_KATEGORII: OficialniNastroj["kategorie"][] = ["tisen", "mistni-varovani", "krizove-informace", "pocasi", "cestovani", "zdravi"];

export function skorePripravenosti(nastroje: OficialniNastroj[], odpovedi: Odpovedi): { mam: number; celkem: number; chybi: string[]; nevim: string[] } {
  const doporucene = nastroje.filter((n) => n.doporuceno);
  const mam = doporucene.filter((n) => odpovedi[n.id] === "mam");
  return {
    mam: mam.length,
    celkem: doporucene.length,
    chybi: doporucene.filter((n) => odpovedi[n.id] === "nemam").map((n) => n.id),
    nevim: doporucene.filter((n) => !odpovedi[n.id] || odpovedi[n.id] === "nevim").map((n) => n.id),
  };
}

/** Věta pod skóre. Bez hodnocení člověka — jen co chybí. */
export function vetaKeSkore(s: ReturnType<typeof skorePripravenosti>): string {
  if (!s.celkem) return "Zatím žádná doporučená položka.";
  if (s.mam === s.celkem) return "Máte všechny doporučené služby.";
  const chybi = s.chybi.length;
  const nevim = s.nevim.length;
  const casti: string[] = [];
  if (chybi) casti.push(`${chybi === 1 ? "Chybí vám jedna doporučená služba" : chybi < 5 ? `Chybí vám ${chybi} doporučené služby` : `Chybí vám ${chybi} doporučených služeb`}`);
  if (nevim) casti.push(`${nevim === 1 ? "u jedné nevíte" : `u ${nevim} nevíte`}`);
  return `${casti.join(", ")}.`;
}

/** Načtení odpovědí z prohlížeče. Když úložiště nefunguje, začíná se od nuly — bez chyby. */
export function nactiOdpovedi(): Odpovedi {
  try {
    const s = localStorage.getItem(KLIC_ULOZISTE);
    if (!s) return {};
    const o = JSON.parse(s) as Record<string, unknown>;
    const out: Odpovedi = {};
    for (const [k, v] of Object.entries(o)) if (v === "mam" || v === "nemam" || v === "nevim") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export function ulozOdpovedi(o: Odpovedi): boolean {
  try {
    localStorage.setItem(KLIC_ULOZISTE, JSON.stringify(o));
    return true;
  } catch {
    return false;
  }
}
