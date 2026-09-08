import { incidenty, nepotvrzene } from "./data";
import { PORADI_KATEGORII } from "./kategorie";
import { UROVNE } from "./skala";
import type { DruhZaznamu, Incident, Kategorie, Nepotvrzene, Puvodce, Uroven } from "./typy";
import type { SUkazkou } from "./data";

/*
  Jediný datový základ pro seznamy, souhrny, grafy a export.

  Pojmy:
  - případ      = jedna reálná událost (útok, průnik, operace),
  - aktualizace = nové zjištění k existujícímu případu (navazujeNa),
  - opatření    = oficiální krok státu nebo aliance,
  - reakce      = prohlášení, varování, analýza,
  - nepotvrzené / vyvrácené = prověřené a neprošlo.

  Každá funkce říká, z jaké množiny počítá. Stejná množina a filtr musí dát
  stejný výsledek všude — proto to není v komponentách.
*/

export type Zaznam = SUkazkou<Incident>;

export const DRUHY: Record<DruhZaznamu, { nazev: string; mnozne: string }> = {
  pripad: { nazev: "případ", mnozne: "případů" },
  aktualizace: { nazev: "aktualizace", mnozne: "aktualizací" },
  opatreni: { nazev: "opatření", mnozne: "opatření" },
  reakce: { nazev: "prohlášení a reakce", mnozne: "prohlášení a reakcí" },
};

export const druh = (i: Incident): DruhZaznamu => i.druh ?? (i.puvodce ? "pripad" : "reakce");

/** Rozhodné datum záznamu: kdy jsme se to dozvěděli (ne kdy se to stalo). */
export const kdyZjisteno = (i: Incident) => i.datumZjisteni ?? i.datumUdalosti;

/** Je záznam doložený odkazem na dohledatelný zdroj? Bez toho nesmí být „ověřený“. */
export const dolozeno = (i: Incident | Nepotvrzene) => i.zdroje.some((z) => Boolean(z.url));

/** Má záznam aspoň jeden úřední zdroj (orgán, který věc sám oznámil)? */
export const uredniZdroj = (i: Incident | Nepotvrzene) => i.zdroje.some((z) => z.typ === "primary" && Boolean(z.url));

/** Pachatel je potvrzený jen oficiálním závěrem nebo prokázaným domácím pachatelem. */
export const pachatelPotvrzen = (i: Incident) => i.atribuce === "oficialni" || i.atribuce === "domaci";

/**
 * Jistota informace, jak ji smíme ukázat: bez doložení odkazem nejvýš
 * „střední“. Vlastní archiv bez původního zdroje není ověření.
 */
export function jistotaZobrazena(i: Incident): Incident["jistota"] {
  if (dolozeno(i)) return i.jistota;
  return i.jistota === "potvrzeno" || i.jistota === "vysoka" ? "stredni" : i.jistota;
}

export interface Filtr {
  odRoku?: number;
  kodZeme?: string | null;
  kategorie?: Kategorie | null;
  druhy?: DruhZaznamu[];
  /** Jen záznamy s datem zjištění v posledních N dnech. */
  dni?: number | null;
  ted?: number;
}

export function vyber(vse: Zaznam[], f: Filtr = {}): Zaznam[] {
  const ted = f.ted ?? Date.now();
  return vse.filter((i) => {
    const kdy = new Date(kdyZjisteno(i));
    if (f.odRoku && kdy.getUTCFullYear() < f.odRoku) return false;
    if (f.kodZeme && i.kodZeme !== f.kodZeme) return false;
    if (f.kategorie && !i.kategorie.includes(f.kategorie)) return false;
    if (f.druhy && !f.druhy.includes(druh(i))) return false;
    if (f.dni && ted - kdy.getTime() > f.dni * 86_400_000) return false;
    return true;
  });
}

/** Případy = jedna reálná událost. Aktualizace se do počtu nepočítají. */
export const pripady = (vse: Zaznam[] = incidenty(), f: Filtr = {}) => vyber(vse, { ...f, druhy: ["pripad"] });

/** Aktualizace k případu (nové zjištění, atribuce, obvinění). */
export const aktualizaceK = (slug: string, vse: Zaznam[] = incidenty()) =>
  vse.filter((i) => druh(i) === "aktualizace" && i.navazujeNa === slug).sort((a, b) => kdyZjisteno(a).localeCompare(kdyZjisteno(b)));

/** Rodič aktualizace. */
export const pripadK = (i: Incident, vse: Zaznam[] = incidenty()) =>
  i.navazujeNa ? vse.find((x) => x.slug === i.navazujeNa) ?? null : null;

/**
 * Aktivní hrozby: případy z posledních 90 dnů, které nejsou vyvrácené.
 * Vyvrácené a nepotvrzené záznamy jsou dohledatelné jinde, tady nejsou nikdy.
 */
export function aktivniHrozby(vse: Zaznam[] = incidenty(), ted = Date.now()) {
  return pripady(vse, { dni: 90, ted });
}

export interface Pocty {
  mnozina: string;
  celkem: number;
  pripady: number;
  aktualizace: number;
  opatreni: number;
  reakce: number;
  pripadyPotvrzenyPachatel: number;
  pripadyNedolozene: number;
}

/** Počty s deklarovanou množinou — text množiny jde do rozhraní vedle čísla. */
export function pocty(vse: Zaznam[], mnozina: string): Pocty {
  const p = vse.filter((i) => druh(i) === "pripad");
  return {
    mnozina,
    celkem: vse.length,
    pripady: p.length,
    aktualizace: vse.filter((i) => druh(i) === "aktualizace").length,
    opatreni: vse.filter((i) => druh(i) === "opatreni").length,
    reakce: vse.filter((i) => druh(i) === "reakce").length,
    pripadyPotvrzenyPachatel: p.filter(pachatelPotvrzen).length,
    pripadyNedolozene: p.filter((i) => !dolozeno(i)).length,
  };
}

/** Rozpad případů podle původce. Aktualizace a reakce nevstupují. */
export function podlePuvodce(vse: Zaznam[]) {
  const p = vse.filter((i) => druh(i) === "pripad");
  const skupiny: { klic: Puvodce; nazev: string }[] = [
    { klic: "rusko", nazev: "Rusko" },
    { klic: "ukrajina", nazev: "Ukrajina" },
    { klic: "jiny-stat", nazev: "Jiný stát" },
    { klic: "domaci", nazev: "Domácí pachatel" },
    { klic: "neznamy", nazev: "Neznámý" },
  ];
  return {
    celkem: p.length,
    skupiny: skupiny.map((s) => {
      const z = p.filter((i) => (i.puvodce ?? "neznamy") === s.klic);
      return {
        ...s,
        pocet: z.length,
        potvrzeno: z.filter(pachatelPotvrzen).length,
        vysetruje: z.filter((i) => i.atribuce === "vysetrovana").length,
        podezreni: z.filter((i) => i.atribuce === "nepotvrzena").length,
      };
    }),
  };
}

/** Rozpad podle zemí; Česko vždy první. Případy, opatření a reakce zvlášť. */
export function podleZemi(vse: Zaznam[]) {
  const mapa = new Map<string, { kodZeme: string; zeme: string; zaznamy: Zaznam[] }>();
  for (const i of vse) {
    const z = mapa.get(i.kodZeme) ?? { kodZeme: i.kodZeme, zeme: i.kodZeme === "CZ" ? "Česko" : i.zeme, zaznamy: [] };
    z.zaznamy.push(i);
    mapa.set(i.kodZeme, z);
  }
  if (!mapa.has("CZ")) mapa.set("CZ", { kodZeme: "CZ", zeme: "Česko", zaznamy: [] });
  const radky = [...mapa.values()].map((z) => {
    const p = z.zaznamy.filter((i) => druh(i) === "pripad");
    const nej = [...z.zaznamy].sort((a, b) => UROVNE[b.zavaznost].poradi - UROVNE[a.zavaznost].poradi)[0] ?? null;
    const kategorie = new Set<Kategorie>();
    for (const i of z.zaznamy) for (const k of i.kategorie) kategorie.add(k);
    return {
      kodZeme: z.kodZeme,
      zeme: z.zeme,
      celkem: z.zaznamy.length,
      pripady: p.length,
      pripadyPotvrzenyPachatel: p.filter(pachatelPotvrzen).length,
      opatreni: z.zaznamy.filter((i) => druh(i) === "opatreni").length,
      reakce: z.zaznamy.filter((i) => druh(i) === "reakce" || druh(i) === "aktualizace").length,
      nejzavaznejsi: nej,
      nejvyssi: (nej?.zavaznost ?? null) as Uroven | null,
      kategorie: PORADI_KATEGORII.filter((k) => kategorie.has(k)),
      posledni: z.zaznamy.map(kdyZjisteno).sort().at(-1) ?? null,
    };
  });
  return radky.sort((a, b) => (a.kodZeme === "CZ" ? -1 : b.kodZeme === "CZ" ? 1 : b.celkem - a.celkem));
}

/**
 * Změny k zobrazení na přehledu: nejnovější případy, aktualizace a opatření
 * podle data zjištění. Reakce až po nich — jsou to slova, ne činy.
 */
/**
 * Nová zjištění: posuny ve vyšetřování starších případů.
 *
 * Sem patří samostatné aktualizace případu a případy, u kterých se pohnul
 * stav — padlo obvinění, vyšetřování se uzavřelo nebo se potvrdil pachatel.
 * Není to seznam nových událostí; je to odpověď na otázku „co se dozvědělo
 * o tom, co se stalo dřív“.
 */
export function novaZjisteni(vse: Zaznam[] = incidenty(), pocet = 8): { zaznam: Zaznam; duvod: string }[] {
  const duvodK = (i: Zaznam): string | null => {
    const d = druh(i);
    if (d === "aktualizace") return "nové zjištění k případu";
    // Prohlášení a opatření sem nepatří — nic nezjišťují, jen reagují.
    if (d !== "pripad") return null;
    if (i.stav === "obvineni") return "podáno obvinění";
    if (i.stav === "uzavreno") return "vyšetřování uzavřeno";
    if (i.atribuce === "oficialni") return "pachatel potvrzen úředně";
    if (i.atribuce === "domaci") return "prokázán domácí pachatel";
    return null;
  };
  return vse
    .map((i) => ({ zaznam: i, duvod: duvodK(i) }))
    .filter((x): x is { zaznam: Zaznam; duvod: string } => x.duvod !== null)
    .sort((a, b) => kdyZjisteno(b.zaznam).localeCompare(kdyZjisteno(a.zaznam)))
    .slice(0, pocet);
}

export function posledniZmeny(pocet = 5, vse: Zaznam[] = incidenty(), ted = Date.now()): Zaznam[] {
  const dulezite = vyber(vse, { druhy: ["pripad", "aktualizace", "opatreni"], dni: 30, ted });
  const serazene = [...dulezite].sort((a, b) => kdyZjisteno(b).localeCompare(kdyZjisteno(a)));
  if (serazene.length >= pocet) return serazene.slice(0, pocet);
  const zbytek = [...vyber(vse, { druhy: ["reakce"], dni: 30, ted })].sort((a, b) => kdyZjisteno(b).localeCompare(kdyZjisteno(a)));
  return [...serazene, ...zbytek].slice(0, pocet);
}

/** Vyvrácené a nepotvrzené — dohledatelné, nikdy v aktivních hrozbách. */
export const neprosle = (): Nepotvrzene[] => nepotvrzene();

/**
 * Jedinečné případy po měsících podle data zjištění. To je objem sledování,
 * ne závažnost — ta je zvlášť. Měsíce bez záznamu jsou 0 jen tam, kde
 * monitoring prokazatelně běžel (od 7/2026); dřív je hodnota null.
 */
export function pripadyPoMesicich(vse: Zaznam[] = incidenty(), odMesice = "2014-01", plnePokrytiOd = "2026-07") {
  const p = pripady(vse);
  const pocty = new Map<string, number>();
  for (const i of p) {
    const k = kdyZjisteno(i).slice(0, 7);
    pocty.set(k, (pocty.get(k) ?? 0) + 1);
  }
  const konec = new Date();
  const vysledek: { mesic: string; pripady: number | null; uplne: boolean }[] = [];
  let [y, m] = odMesice.split("-").map(Number);
  while (y < konec.getUTCFullYear() || (y === konec.getUTCFullYear() && m <= konec.getUTCMonth() + 1)) {
    const k = `${y}-${String(m).padStart(2, "0")}`;
    const uplne = k >= plnePokrytiOd;
    vysledek.push({ mesic: k, pripady: pocty.get(k) ?? (uplne ? 0 : null), uplne });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return vysledek;
}
