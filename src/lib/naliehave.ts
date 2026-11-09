import napadane from "../../data/napadane-redakce.json";
import { dostRedakci, nezavisleRedakce, potrebnychRedakci } from "../../nastroje/redakce-pravidla.mjs";
import type { DataNapadanych } from "../../nastroje/napadane-redakce.mjs";

/*
  Druhy naléhavých zpráv, které sběr označí „k okamžité kontrole“.

  Jedno místo pro názvy, které vidí čtenář v úvodu i v seznamu událostí.
  Dřív měl seznam událostí vlastní dvouhodnotový text a u narušení
  vzdušného prostoru psal „krizové vysílání“ — dva seznamy, dvě pravdy.
*/
export const NAZVY_NALIEHAVE = {
  "mobilizace-rusko": "vyhlášení mobilizace v Rusku",
  "priprava-mobilizace": "přípravy mobilizace v Rusku",
  "krizove-vysilani": "krizové vysílání Českého rozhlasu",
  "clanek-nato": "článek 4 nebo 5 NATO",
  "pravni-stav-cr": "mimořádný právní stav v ČR",
  "hranice-cr": "uzavření hranic ČR",
  "vzdusny-prostor-nato": "narušení vzdušného prostoru Aliance",
  "hranice-nato": "posílení hranice NATO s Ruskem nebo Běloruskem",
} as const;

export type DruhNaliehave = keyof typeof NAZVY_NALIEHAVE;

export const nazevNaliehave = (druh: string): string => (NAZVY_NALIEHAVE as Record<string, string>)[druh] ?? druh;

/*
  Jak dlouho naléhavost platí (9. 11. 2026, provozovatelka: naléhavá zpráva
  má zůstat nahoře, „jen tak dlouho, jak dlouho je nebezpečí relevantní“).

  Dřív platilo pro všechno 48 hodin. Jenže posílení hranice nebo příprava
  mobilizace trvají dny, kdežto jedno narušení vzdušného prostoru je za den
  minulostí. Lhůta běží od poslední zprávy daného druhu o téže události:
  dokud redakce píší dál, zůstává zpráva nahoře; když přestanou, po lhůtě
  se zařadí mezi ostatní. Jedno místo pro sloupec Signály z médií, Souhrn
  situace i Správu, ať tři části webu neříkají tři různé věci.
*/
const DEN = 24;
export const PLATNOST_HODIN: Record<DruhNaliehave, number> = {
  "mobilizace-rusko": 14 * DEN,
  "priprava-mobilizace": 7 * DEN,
  /* Krizové vysílání je pokyn „teď si pusť rádio“; za dva dny už je to zpráva o minulosti. */
  "krizove-vysilani": 2 * DEN,
  "clanek-nato": 14 * DEN,
  "pravni-stav-cr": 14 * DEN,
  "hranice-cr": 7 * DEN,
  "vzdusny-prostor-nato": 3 * DEN,
  "hranice-nato": 7 * DEN,
};

/*
  Stupeň naléhavosti určuje sběr (sber/udalosti.ts): 1 = hned do kanálu,
  2 = nahoru ve frontě. Starší zachycené zprávy ho nenesou, proto stejná
  tabulka i tady. Na webu z něj je tloušťka rámečku.
*/
const STUPEN: Record<DruhNaliehave, 1 | 2> = {
  "mobilizace-rusko": 1, "priprava-mobilizace": 2, "krizove-vysilani": 1, "clanek-nato": 1,
  "pravni-stav-cr": 1, "hranice-cr": 1, "vzdusny-prostor-nato": 2, "hranice-nato": 2,
};

type Naliehava = { druh: string; stupen?: number | null };
type SNaliehavosti = { naliehave?: Naliehava | null | unknown; publikovano?: string | null; zachyceno: string; zdroj?: { nazev?: string; url?: string } };

const NAPADANE = napadane as DataNapadanych;

const HODINA = 3_600_000;
const casZpravy = (k: { publikovano?: string | null; zachyceno: string }) => new Date(k.publikovano ?? k.zachyceno).getTime();
const naliehavaZ = (k: SNaliehavosti): Naliehava | null => (k.naliehave && typeof k.naliehave === "object" && "druh" in k.naliehave ? (k.naliehave as Naliehava) : null);

export const platnostHodin = (druh: string): number => (PLATNOST_HODIN as Record<string, number>)[druh] ?? 2 * DEN;

export function stupenNaliehave(n: Naliehava): 1 | 2 {
  if (n.stupen === 1 || n.stupen === 2) return n.stupen;
  return (STUPEN as Record<string, 1 | 2>)[n.druh] ?? 2;
}

/** Čas, do kdy zpráva drží naléhavost (ms), nebo null, když naléhavá není. */
export function naliehavaDo(k: SNaliehavosti): number | null {
  const n = naliehavaZ(k);
  const t = casZpravy(k);
  return n && !Number.isNaN(t) ? t + platnostHodin(n.druh) * HODINA : null;
}

export const platiNaliehave = (k: SNaliehavosti, ted: number): boolean => {
  const konec = naliehavaDo(k);
  return konec !== null && ted <= konec;
};

/**
 * Naléhaví kandidáti, kteří ještě platí, nejnovější první, nejvýš `max`.
 * Bez `hodin` platí lhůta podle druhu (PLATNOST_HODIN); s `hodin` pevné okno.
 */
export function naliehaveVOkne<K extends SNaliehavosti>(kandidati: K[], ted: number, hodin?: number, max = 5): K[] {
  return kandidati
    .filter((k) => naliehavaZ(k))
    .filter((k) => (hodin === undefined ? platiNaliehave(k, ted) : ted - casZpravy(k) <= hodin * HODINA))
    .sort((a, b) => casZpravy(b) - casZpravy(a))
    .slice(0, max);
}

export interface NaliehavostSkupiny {
  druh: string;
  stupen: 1 | 2;
  /** Do kdy zůstane nahoře (ISO): nejpozdější konec lhůty ze zpráv skupiny. */
  platiDo: string;
}

/*
  Zvýraznit jen s aspoň dvěma nezávislými redakcemi (9. 11. 2026,
  provozovatelka: „do zvýrazněných naléhavých vstupují pouze s min. 2 zdroji,
  ne s 1“). S napadenou redakcí mezi zdroji tři — stejné pravidlo jako
  u zveřejnění (nastroje/redakce-pravidla.mjs). Počítají se všechny zprávy
  o události, i ty, které síto naléhavými neoznačilo: druhý zdroj je druhý
  zdroj, ať ho síto chytilo, nebo ne.
*/
export function redakciUdalosti(polozky: readonly SNaliehavosti[], ted: number): { ma: number; potreba: 2 | 3 } {
  const zdroje = polozky.map((p) => p.zdroj).filter((z): z is { nazev?: string; url?: string } => Boolean(z));
  return { ma: nezavisleRedakce(zdroje, NAPADANE), potreba: potrebnychRedakci(zdroje, NAPADANE, ted) };
}

/**
 * Naléhavost události složené z více zpráv. Platí, dokud platí aspoň jedna
 * naléhavá zpráva a o události píší aspoň dvě nezávislé redakce (s napadenou
 * tři); nese nejvyšší stupeň (1 je víc než 2) a nejpozdější konec.
 */
export function naliehavostSkupiny(polozky: readonly SNaliehavosti[], ted: number): NaliehavostSkupiny | null {
  const platne = polozky.filter((p) => platiNaliehave(p, ted));
  if (!platne.length) return null;
  if (!dostRedakci(polozky.map((p) => p.zdroj).filter((z): z is { nazev?: string; url?: string } => Boolean(z)), NAPADANE, ted)) return null;
  const nejsilnejsi = [...platne].sort((a, b) => stupenNaliehave(naliehavaZ(a)!) - stupenNaliehave(naliehavaZ(b)!) || casZpravy(b) - casZpravy(a))[0];
  const n = naliehavaZ(nejsilnejsi)!;
  return { druh: n.druh, stupen: stupenNaliehave(n), platiDo: new Date(Math.max(...platne.map((p) => naliehavaDo(p)!))).toISOString() };
}

/** Naléhavá s běžící lhůtou, které chybí druhá redakce: do rozbalení řádku, ať je vidět, proč není zvýrazněná. */
export function naliehavaBezRedakci(polozky: readonly SNaliehavosti[], ted: number): { druh: string; ma: number; potreba: 2 | 3 } | null {
  const platna = polozky.find((p) => platiNaliehave(p, ted));
  if (!platna || naliehavostSkupiny(polozky, ted)) return null;
  return { druh: naliehavaZ(platna)!.druh, ...redakciUdalosti(polozky, ted) };
}

/**
 * Naléhavé nahoru, seřazené podle data; pod nimi ostatní podle data.
 * (9. 11. 2026, provozovatelka: „zbytek bude řazen normálně dle nejnovějšího data“.)
 */
export function naliehaveNahoru<T extends { naliehavost?: NaliehavostSkupiny | null; kdy: string | null }>(radky: readonly T[]): T[] {
  const podleData = (a: T, b: T) => (b.kdy ?? "").localeCompare(a.kdy ?? "");
  return [...radky.filter((r) => r.naliehavost).sort(podleData), ...radky.filter((r) => !r.naliehavost).sort(podleData)];
}
