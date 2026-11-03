import data from "../../data/typy-utoku.json";
import type { DruhKyber } from "./kyber";

/*
  Typy útoků a co s nimi může udělat občan (3. 11. 2026, zadání provozovatelky:
  „ke každému případu dát najížděcí info, jak se na to připravit dopředu
  a jak si s tím poradit jako občan“).

  Obsah je v data/typy-utoku.json: ke každému typu jedna věta, co to je,
  pár bodů předem a pár bodů, když nastane, a odkazy jen na úřady, které
  web už jinde používá. Rady jsou obecné a krátké; závazný postup vydává
  úřad, na který se odkazuje. Nic tu nepředepisuje dávky léků, úpravu vody
  ani zásahy do elektřiny — to je mimo to, co smí web radit (docs/BEZPECNOST-OBSAHU.md).

  Tenhle modul je lehký (jen malý JSON), takže ho smí číst i klientské
  komponenty — řádky aktualit a banner o internetu.
*/
export interface TypUtoku {
  klic: string;
  nazev: string;
  /** Do řádku seznamu, nejvýš deset slov. */
  kratce: string;
  /** Které kategorie záznamů sem spadají. */
  kategorie: string[];
  /** Které druhy zpráv z banneru o internetu sem spadají. */
  druhyKyber: DruhKyber[];
  coToJe: string;
  proObcana: string;
  predem: string[];
  kdyzNastane: string[];
  /** Úřad nebo stránka webu (relativní adresa). */
  odkazy: { nazev: string; url: string }[];
}

export const TYPY_UTOKU = data as TypUtoku[];

/*
  Záznam má víc kategorií; o typu rozhoduje ta, která říká, co se stalo.
  „Drony, infrastruktura“ je dron nad letištěm (dron), „sabotáž,
  infrastruktura“ je žhářství u rozvodny (sabotáž), „kyber, infrastruktura“
  je kyberútok. Hranice a špionáž jsou až nakonec: bývají souvislost,
  ne skutek.
*/
export const PRIORITA_TYPU = ["kyber", "sabotaz", "drony", "infrastruktura", "hybridni", "zpravodajske", "hranice"] as const;

export function typProKategorie(kategorie: readonly string[]): TypUtoku | null {
  for (const klic of PRIORITA_TYPU) {
    const t = TYPY_UTOKU.find((x) => x.klic === klic);
    if (t && t.kategorie.some((k) => kategorie.includes(k))) return t;
  }
  return null;
}

export function typProKyber(druh: DruhKyber): TypUtoku | null {
  return TYPY_UTOKU.find((t) => t.druhyKyber.includes(druh)) ?? null;
}

export const typPodleKlice = (klic: string): TypUtoku | null => TYPY_UTOKU.find((t) => t.klic === klic) ?? null;

/* ---------- pořadí podle evidence ---------- */

export interface PrikladTypu {
  klic: string;
  kdy: string;
  titulek: string;
  kam: string;
  ven: boolean;
  kodZeme: string | null;
  zeme: string | null;
  zdroj: string | null;
  /** Doložený záznam webu, nebo zpráva z médií o internetu v Česku (neověřená). */
  doklad: "zaznam" | "media";
}

export interface PrehledTypu {
  typ: TypUtoku;
  zaznamu: number;
  zprav: number;
  posledni: string | null;
  /** Nejnovější doložené záznamy webu. */
  prikladyZaznamu: PrikladTypu[];
  /** Nejnovější zprávy z médií; z jednoho dne jen jedna, aby tři řádky nebyly jedna událost třikrát. */
  prikladyMedii: PrikladTypu[];
}

type ZaznamProPrehled = {
  slug: string; titulek: string; kratkyTitulek?: string | null; kategorie: readonly string[];
  datumUdalosti: string; datumZjisteni?: string | null; kodZeme: string; zeme: string;
  zdroje: readonly { nazev: string }[]; druh?: string;
};
type ZpravaProPrehled = { id: string; druh: DruhKyber; titulek: string; odkaz: string; vydavatel: string | null; kdy: string };

/*
  Pořadí typů podle toho, co web skutečně eviduje: doložené záznamy
  (jen případy, ne reakce a opatření) a zprávy z banneru o internetu.
  Není to evropská statistika — je to počet toho, co prošlo naší kontrolou.
  Stránka to u čísel říká.
*/
export function sestavPrehledTypu(zaznamy: readonly ZaznamProPrehled[], zpravy: readonly ZpravaProPrehled[], max = 3): PrehledTypu[] {
  const mapa = new Map<string, PrehledTypu>(TYPY_UTOKU.map((t) => [t.klic, { typ: t, zaznamu: 0, zprav: 0, posledni: null, prikladyZaznamu: [], prikladyMedii: [] }]));
  const videno = new Set<string>();
  for (const z of zaznamy) {
    if ((z.druh ?? "pripad") !== "pripad") continue;
    const t = typProKategorie(z.kategorie);
    if (!t) continue;
    const p = mapa.get(t.klic)!;
    p.zaznamu += 1;
    p.prikladyZaznamu.push({ klic: `z-${z.slug}`, kdy: z.datumUdalosti, titulek: z.kratkyTitulek || z.titulek, kam: `/incident/${z.slug}/`, ven: false, kodZeme: z.kodZeme, zeme: z.zeme, zdroj: z.zdroje[0]?.nazev ?? null, doklad: "zaznam" });
  }
  for (const z of zpravy) {
    if (videno.has(z.id)) continue;
    videno.add(z.id);
    const t = typProKyber(z.druh);
    if (!t) continue;
    const p = mapa.get(t.klic)!;
    p.zprav += 1;
    p.prikladyMedii.push({ klic: `m-${z.id}`, kdy: z.kdy, titulek: z.titulek, kam: z.odkaz, ven: true, kodZeme: null, zeme: null, zdroj: z.vydavatel, doklad: "media" });
  }
  const podleData = (a: PrikladTypu, b: PrikladTypu) => b.kdy.localeCompare(a.kdy);
  for (const p of mapa.values()) {
    p.prikladyZaznamu.sort(podleData);
    p.prikladyMedii.sort(podleData);
    p.posledni = [p.prikladyZaznamu[0]?.kdy, p.prikladyMedii[0]?.kdy].filter((x): x is string => Boolean(x)).sort().at(-1) ?? null;
    p.prikladyZaznamu = p.prikladyZaznamu.slice(0, max);
    const dny = new Set<string>();
    p.prikladyMedii = p.prikladyMedii.filter((x) => { const d = x.kdy.slice(0, 10); if (dny.has(d)) return false; dny.add(d); return true; }).slice(0, max);
  }
  return [...mapa.values()].sort((a, b) => b.zaznamu - a.zaznamu || b.zprav - a.zprav || a.typ.nazev.localeCompare(b.typ.nazev, "cs"));
}
