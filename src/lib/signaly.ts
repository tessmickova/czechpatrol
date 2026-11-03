import { jeJenProjev } from "../../nastroje/zasady-textu.mjs";
import { jeCesky } from "./jazyk";

/*
  Které zachycené zprávy patří do sloupce „Signály z médií“ na úvodu.

  Jedno pravidlo pro celý web (3. 11. 2026, provozovatelka: „mělo by to být
  synchronizované napříč webem“). Do té doby sloupec bral jen česky psané
  titulky, zatímco Souhrn situace vpravo počítal naléhavé zprávy ve všech
  jazycích — ráno 3. 11. tak Souhrn hlásil zprávu z Lotyšska (anglicky),
  která ve sloupci vedle nebyla.

  Naléhavá zpráva (sítem označená k okamžité kontrole) jde do sloupce vždy,
  i v cizím jazyce. Ostatní cizojazyčné zůstávají jen ve frontě: na úvod patří
  to, co si čtenář přečte bez překladu.
*/
type Zachycena = { titulek: string; kodZeme: string | null; naliehave?: unknown };

export function jeSignal(k: Zachycena): boolean {
  if (k.naliehave) return true;
  if (!jeCesky(k.titulek) || jeJenProjev(k.titulek)) return false;
  /*
    Údery uvnitř Ukrajiny a Ruska bez doloženého následku pro sledované země
    jsou mimo rozsah (CLAUDE.md, rozsah války). Zbytek posoudí ověřovatel ve frontě.
  */
  return k.kodZeme !== "UA" && k.kodZeme !== "RU";
}

/** Cizojazyčné, které se do sloupce nedostaly — na úvodu jen jako počet s odkazem do fronty. */
export const jeCiziVeFronte = (k: Zachycena): boolean => !k.naliehave && !jeCesky(k.titulek);

/* ---------- jedna událost, víc zpráv ---------- */

import { kmenyTitulku } from "../../nastroje/podobna-udalost.mjs";

export interface ZdrojSignalu { nazev: string; url: string }

/*
  Odkud zpráva přichází (3. 11. 2026, provozovatelka: „vlaječky, ze kterých
  zemí varování přichází“). Země redakce, ne země události: nejdřív ze jména
  zdroje („SME (Slovensko)“), pak z národní domény, pak z krátkého seznamu
  známých redakcí bez národní domény. Co se nepozná, zůstane bez vlajky —
  hádat zemi podle jazyka by bylo horší než nic (Meduza píše rusky z Rigy).
*/
const ZEME_VE_JMENU: [string, string][] = [
  ["Slovensk", "SK"], ["Polsk", "PL"], ["Maďarsk", "HU"], ["Rakousk", "AT"], ["Německ", "DE"], ["Franci", "FR"], ["Itáli", "IT"],
  ["Litv", "LT"], ["Lotyšsk", "LV"], ["Estonsk", "EE"], ["Lucembursk", "LU"], ["Rumunsk", "RO"], ["Bulharsk", "BG"], ["Dánsk", "DK"],
  ["Finsk", "FI"], ["Švédsk", "SE"], ["Norsk", "NO"], ["Nizozemsk", "NL"], ["Belgi", "BE"], ["Ukrajin", "UA"], ["Britán", "GB"], ["Moldav", "MD"],
];
const ZNAME_HOSTY: [string, string][] = [
  ["ukrinform.net", "UA"], ["kyivindependent.com", "UA"], ["theguardian.com", "GB"], ["france24.com", "FR"], ["euronews.com", "EU"],
  ["politico.eu", "EU"], ["notesfrompoland.com", "PL"], ["tvpworld.com", "PL"], ["balkaninsight.com", "EU"],
];
const NARODNI_DOMENY = new Set(["cz", "sk", "pl", "lv", "lt", "ee", "de", "at", "hu", "ro", "md", "fr", "it", "bg", "dk", "fi", "se", "no", "nl", "be", "lu", "ua", "es", "pt", "ch", "ie", "gr", "hr", "si"]);

export function zemeZdroje(zdroj: ZdrojSignalu): string | null {
  const m = zdroj.nazev.match(/\(([^)]+)\)/);
  if (m) for (const [jmeno, kod] of ZEME_VE_JMENU) if (m[1].includes(jmeno)) return kod;
  let host: string;
  try { host = new URL(zdroj.url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
  for (const [h, kod] of ZNAME_HOSTY) if (host === h || host.endsWith(`.${h}`)) return kod;
  const tld = host.split(".").at(-1) ?? "";
  if (tld === "uk") return "GB";
  return NARODNI_DOMENY.has(tld) ? tld.toUpperCase() : null;
}

type ProSkupinu = Zachycena & { id: string; publikovano?: string | null; zachyceno: string; naliehave?: { druh: string } | null };

export interface SkupinaSignalu<K> {
  /** Zpráva, která skupinu zastupuje: nejnovější česky psaná nebo naléhavá. */
  hlavni: K;
  /** Všechny zprávy o téže události, nejnovější první. */
  polozky: K[];
}

const casZpravy = (k: { publikovano?: string | null; zachyceno: string }) => new Date(k.publikovano ?? k.zachyceno).getTime();
const OKNO_SKUPINY = 48 * 3_600_000;
const SPOLECNYCH_KMENU = 3;

/*
  Tatáž událost chodí z několika redakcí (nouzové přistání u Varšavy 3. 11.
  2026: Seznam, iDNES, Novinky, SME, Rzeczpospolita). Ve sloupci má být
  jednou, s počtem zdrojů. Dvě zprávy patří k sobě, když jsou o téže zemi,
  nejvýš dva dny od sebe, a buď je síto označilo stejným druhem naléhavosti
  (tak se potkají i různé jazyky), nebo mají aspoň tři společná vzácná slova
  v titulku — stejné pravidlo jako u zveřejněných záznamů
  (nastroje/podobna-udalost.mjs). Častá slova („dopadl“, „vesnice“) se
  nepočítají, jinak by se slily dva různé drony v Moldavsku z jednoho dne.
*/
export function seskupSignaly<K extends ProSkupinu>(kandidati: readonly K[]): SkupinaSignalu<K>[] {
  const kmeny = new Map<string, Set<string>>();
  const df = new Map<string, number>();
  for (const k of kandidati) {
    const s = kmenyTitulku(k.titulek) as Set<string>;
    kmeny.set(k.id, s);
    for (const x of s) df.set(x, (df.get(x) ?? 0) + 1);
  }
  /*
    Mez „častého“ slova je tu volnější než u zveřejněných záznamů: ve frontě
    je tatáž událost klidně z pěti redakcí, a její vlastní slova (Varšava,
    bombová, přistál) nesmí vyjít jako častá — pak by se neslilo nic.
  */
  const mez = Math.max(6, Math.floor(kandidati.length * 0.05));
  const vzacne = (id: string) => new Set([...(kmeny.get(id) ?? [])].filter((x) => (df.get(x) ?? 0) <= mez));
  const patriKSobe = (a: K, b: K) => {
    if (a.kodZeme !== b.kodZeme || Math.abs(casZpravy(a) - casZpravy(b)) > OKNO_SKUPINY) return false;
    if (a.naliehave && b.naliehave && a.naliehave.druh === b.naliehave.druh) return true;
    const moje = vzacne(a.id);
    let spolecne = 0;
    for (const x of vzacne(b.id)) if (moje.has(x)) spolecne += 1;
    return spolecne >= SPOLECNYCH_KMENU;
  };
  const skupiny: SkupinaSignalu<K>[] = [];
  for (const k of [...kandidati].sort((a, b) => casZpravy(b) - casZpravy(a))) {
    /*
      Zpráva může spojit dvě skupiny, které se samy nepotkaly: anglické
      zprávy o polské operaci u Kaliningradu se potkaly přes slova, české
      přes druh naléhavosti, a teprve zpráva, kterou síto označilo a která
      sdílí slova s anglickými, řekla, že je to jedna událost. Proto se
      berou všechny shody, ne jen první.
    */
    const shody = skupiny.filter((g) => g.polozky.some((p) => patriKSobe(p, k)));
    if (!shody.length) { skupiny.push({ hlavni: k, polozky: [k] }); continue; }
    const cil = shody[0];
    for (const dalsi of shody.slice(1)) { cil.polozky.push(...dalsi.polozky); skupiny.splice(skupiny.indexOf(dalsi), 1); }
    cil.polozky.push(k);
  }
  for (const g of skupiny) {
    g.polozky.sort((a, b) => casZpravy(b) - casZpravy(a));
    g.hlavni = g.polozky.find(jeSignal) ?? g.polozky[0];
  }
  return skupiny.sort((a, b) => casZpravy(b.polozky[0]) - casZpravy(a.polozky[0]));
}

/** Počet různých redakcí ve skupině (jedna redakce se dvěma aktualizacemi je jeden zdroj). */
export const pocetZdroju = (polozky: readonly { zdroj: ZdrojSignalu }[]): number => new Set(polozky.map((p) => p.zdroj.nazev)).size;
