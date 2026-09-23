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

/*
  Další dvě části dotazníku (23. 9. 2026): lékárnička a typy událostí.

  Stejné odpovědi mám / nemám / nevím, stejné úložiště v prohlížeči, nikam
  se neposílají. Nejsou to zdravotní ani bezpečnostní rady — jen otázky,
  na které si člověk odpoví sám. Složení lékárničky patří lékárníkovi
  nebo lékaři, postupy pro jednotlivé události úřadům; web na ně odkazuje.
*/
export interface OtazkaDotazniku {
  id: string;
  nazev: string;
  /** Upřesnění pod názvem, ne pokyn. */
  upresneni?: string;
}

export const LEKARNICKA: OtazkaDotazniku[] = [
  { id: "lek-poraneni", nazev: "Drobná poranění", upresneni: "náplasti, obvazy, sterilní krytí, nůžky" },
  { id: "lek-dezinfekce", nazev: "Dezinfekce ran" },
  { id: "lek-bolest-horecka", nazev: "Léky proti bolesti a horečce", upresneni: "vhodné pro členy domácnosti, podle doporučení lékárníka" },
  { id: "lek-pravidelne", nazev: "Pravidelně užívané léky a pomůcky na několik dní dopředu" },
  { id: "lek-teplomer", nazev: "Teploměr" },
  { id: "lek-rukavice", nazev: "Jednorázové rukavice a rouška" },
  { id: "lek-folie", nazev: "Izotermická (záchranná) fólie" },
  { id: "lek-seznam", nazev: "Seznam léků, alergií a kontaktů na lékaře", upresneni: "pro každého člena domácnosti, i na papíře" },
  { id: "lek-prvni-pomoc", nazev: "Základy první pomoci", upresneni: "kurz nebo aplikace Záchranka" },
];

export const UDALOSTI: OtazkaDotazniku[] = [
  { id: "udal-proud", nazev: "Výpadek elektřiny na několik hodin až dní" },
  { id: "udal-voda", nazev: "Výpadek pitné vody" },
  { id: "udal-site-platby", nazev: "Výpadek internetu, mobilní sítě nebo plateb kartou" },
  { id: "udal-povoden", nazev: "Povodeň nebo přívalový déšť" },
  { id: "udal-vedro", nazev: "Extrémní vedro" },
  { id: "udal-mraz", nazev: "Silný mráz nebo sněhová kalamita" },
  { id: "udal-pozar", nazev: "Požár v domě nebo v okolí" },
  { id: "udal-latka", nazev: "Únik nebezpečné látky", upresneni: "sirény, ukrytí v budově" },
  { id: "udal-evakuace", nazev: "Evakuace z domova", upresneni: "evakuační zavazadlo, kam jít" },
  { id: "udal-nehoda", nazev: "Dopravní nehoda", upresneni: "lékárnička a výstražné prostředky v autě" },
  { id: "udal-utocnik", nazev: "Útok ve veřejném prostoru", upresneni: "jak se zachovat a komu volat" },
];

/** Kolik otázek je zodpovězeno a kolik „mám". „Nevím" je odpověď, ale ne připravenost. */
export function souhrnOtazek(ids: string[], odpovedi: Odpovedi): { zodpovezeno: number; mam: number; celkem: number; hotovo: boolean } {
  const zodpovezeno = ids.filter((id) => odpovedi[id]).length;
  return { zodpovezeno, mam: ids.filter((id) => odpovedi[id] === "mam").length, celkem: ids.length, hotovo: ids.length > 0 && zodpovezeno === ids.length };
}
