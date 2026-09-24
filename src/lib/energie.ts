/*
  Rozpočet energie a solár — deterministicky, s viditelnými předpoklady.

  Člověk nevybírá watthodiny, ale spotřebiče: co bude za den potřebovat a
  bez čeho to nepůjde. Každý spotřebič má typický příkon a typickou dobu
  provozu za den jako předvolbu, kterou jde přepsat podle štítku. Z toho
  se sečtou tři režimy (jen kritické · nutné · vše) a proti kapacitě
  zdroje vyjde vydrž. Solár: kolik Wp panelů pokryje denní potřebu při
  daných slunečných hodinách a ztrátách.

  Předvolby jsou orientační hodnoty běžných domácích spotřebičů, ne
  měření. Slunečné hodiny za den jsou orientační pro střední Evropu;
  přesné hodnoty pro konkrétní místo a sklon dává veřejný nástroj PVGIS
  Evropské komise. Nic z toho není laboratorní přesnost a web to říká.
*/

export type Priorita = "kriticke" | "nutne" | "pohodli";
export type Rezim = "jen-kriticke" | "nutne" | "vse";

export interface Spotrebic {
  klic: string;
  nazev: string;
  /** Typický příkon ve W (u lednice průměr přes den, ne špička). */
  w: number;
  /** Typické hodiny provozu za den. */
  hodin: number;
  priorita: Priorita;
  poznamka?: string;
}

export const PRIORITY: Record<Priorita, string> = { kriticke: "bez toho to nejde", nutne: "potřebuji denně", pohodli: "pohodlí" };
export const REZIMY: Record<Rezim, string> = { "jen-kriticke": "jen kritické", nutne: "kritické a nutné", vse: "vše, co jste vybrali" };

/** Předvolby. Příkon a hodiny jsou orientační a jdou přepsat. */
export const SPOTREBICE: Spotrebic[] = [
  { klic: "telefony", nazev: "Nabíjení telefonů", w: 10, hodin: 3, priorita: "kriticke" },
  { klic: "router", nazev: "Router a modem", w: 12, hodin: 24, priorita: "nutne", poznamka: "Bez sítě operátora nepomůže; má smysl u pevného internetu, který běží." },
  { klic: "radio", nazev: "Rádio", w: 5, hodin: 6, priorita: "kriticke" },
  { klic: "svetlo", nazev: "LED světla", w: 15, hodin: 5, priorita: "nutne" },
  { klic: "lednice", nazev: "Lednice s mrazákem", w: 45, hodin: 24, priorita: "nutne", poznamka: "Průměr přes den; při startu bere víc. V zimě jde část jídla ven." },
  { klic: "mrazak", nazev: "Samostatný mrazák", w: 35, hodin: 24, priorita: "nutne" },
  { klic: "notebook", nazev: "Notebook", w: 50, hodin: 4, priorita: "pohodli" },
  { klic: "zdravotnicky", nazev: "Zdravotnický přístroj (např. přístroj na spaní)", w: 40, hodin: 8, priorita: "kriticke", poznamka: "Příkon vezměte ze štítku nebo od výrobce; tady je jen zástupná hodnota." },
  { klic: "cerpadlo-studna", nazev: "Čerpadlo studny", w: 800, hodin: 0.5, priorita: "kriticke", poznamka: "Špička při startu bývá vyšší; zdroj musí zvládnout rozběh." },
  { klic: "cerpadlo-kanalizace", nazev: "Čerpadlo domovní kanalizační šachty", w: 600, hodin: 0.3, priorita: "kriticke", poznamka: "Bez něj se v domě s tlakovou kanalizací nesmí splachovat; špička při rozběhu." },
  { klic: "kotel", nazev: "Plynový kotel (řízení a oběhové čerpadlo)", w: 100, hodin: 8, priorita: "kriticke", poznamka: "Samotný kotel; bez elektřiny většina kotlů nespustí." },
  { klic: "obehove-cerpadlo", nazev: "Oběhové čerpadlo topení (kamna, krb s výměníkem)", w: 60, hodin: 10, priorita: "kriticke" },
  { klic: "konvice", nazev: "Rychlovarná konvice", w: 2000, hodin: 0.25, priorita: "pohodli", poznamka: "Velký příkon na krátko; ne každý zdroj ho utáhne." },
  { klic: "varic", nazev: "Elektrický vařič nebo deska (jedna plotýnka)", w: 1500, hodin: 0.5, priorita: "nutne", poznamka: "Na vaření je plynový vařič úspornější než powerstation." },
  { klic: "mikrovlnka", nazev: "Mikrovlnná trouba", w: 1000, hodin: 0.25, priorita: "pohodli" },
  { klic: "tv", nazev: "Televize", w: 80, hodin: 3, priorita: "pohodli" },
  { klic: "ventilator", nazev: "Ventilátor", w: 40, hodin: 8, priorita: "pohodli", poznamka: "V létě levná ochrana před vedrem; klimatizace je mimo možnosti přenosného zdroje." },
  { klic: "kamera", nazev: "Kamera nebo alarm", w: 10, hodin: 24, priorita: "pohodli" },
  { klic: "primotop", nazev: "Elektrický přímotop", w: 1500, hodin: 4, priorita: "pohodli", poznamka: "Na topení powerstation obvykle nestačí; počítejte s ní jen krátce." },
  { klic: "elektricka-deka", nazev: "Elektrická deka nebo vyhřívaná podložka", w: 60, hodin: 8, priorita: "nutne", poznamka: "Ohřívá člověka, ne místnost: zlomek spotřeby přímotopu, a ten zlomek zdroj utáhne." },
  { klic: "tepelne-cerpadlo", nazev: "Tepelné čerpadlo", w: 2000, hodin: 8, priorita: "nutne", poznamka: "Obvykle mimo možnosti přenosného zdroje; spíš důvod pro jinou cestu k teplu." },
  { klic: "bojler", nazev: "Elektrický bojler nebo průtokový ohřívač", w: 2000, hodin: 1, priorita: "pohodli", poznamka: "Obvykle mimo možnosti přenosného zdroje; teplou vodu na mytí ohřejte na vařiči nebo kamnech." },
];

/** Uložený výběr: klíč předvolby (nebo vlastní) a přepsané hodnoty. */
export interface VybranySpotrebic {
  klic: string;
  nazev: string;
  w: number;
  hodin: number;
  priorita: Priorita;
}

export const zPredvolby = (s: Spotrebic): VybranySpotrebic => ({ klic: s.klic, nazev: s.nazev, w: s.w, hodin: s.hodin, priorita: s.priorita });

const whDen = (s: VybranySpotrebic) => Math.max(0, s.w) * Math.max(0, s.hodin);

/** Denní potřeba ve Wh pro každý režim. */
export function spotrebaPoRezimech(vybrane: VybranySpotrebic[]): Record<Rezim, number> {
  const kriticke = vybrane.filter((s) => s.priorita === "kriticke");
  const nutne = vybrane.filter((s) => s.priorita !== "pohodli");
  const soucet = (a: VybranySpotrebic[]) => Math.round(a.reduce((x, s) => x + whDen(s), 0));
  return { "jen-kriticke": soucet(kriticke), nutne: soucet(nutne), vse: soucet(vybrane) };
}

/** Největší spotřebitelé, seřazení; k vysvětlení, kde ubrat. */
export function nejvetsiSpotrebitele(vybrane: VybranySpotrebic[], n = 3): { nazev: string; wh: number }[] {
  return [...vybrane].map((s) => ({ nazev: s.nazev, wh: Math.round(whDen(s)) })).sort((a, b) => b.wh - a.wh).slice(0, n);
}

/** Špičkový příkon: co musí zdroj utáhnout naráz (součet W ve vybraném režimu). */
export function spickaW(vybrane: VybranySpotrebic[], rezim: Rezim): number {
  const v = rezim === "jen-kriticke" ? vybrane.filter((s) => s.priorita === "kriticke") : rezim === "nutne" ? vybrane.filter((s) => s.priorita !== "pohodli") : vybrane;
  return Math.round(v.reduce((x, s) => x + Math.max(0, s.w), 0));
}

/** Předpoklad ztrát mezi baterií a spotřebičem (střídač, kabely). Jde přepsat. */
export const ZTRATY_VYCHOZI = 0.15;

/** Vydrž zdroje v hodinách pro každý režim; null, když v režimu není co napájet. */
export function vydrzHodin(kapacitaWh: number, spotreba: Record<Rezim, number>, ztraty = ZTRATY_VYCHOZI): Record<Rezim, number | null> {
  const vyuzitelne = Math.max(0, kapacitaWh) * (1 - Math.min(0.9, Math.max(0, ztraty)));
  const h = (whDen: number) => (whDen <= 0 ? null : Math.round((vyuzitelne / whDen) * 24 * 10) / 10);
  return { "jen-kriticke": h(spotreba["jen-kriticke"]), nutne: h(spotreba.nutne), vse: h(spotreba.vse) };
}

/* ---------- solár ---------- */

export type Sezona = "leto" | "prechod" | "zima";

/**
 * Orientační slunečné hodiny za den (ekvivalent plného výkonu panelu) pro
 * střední Evropu. Nejsou to naměřené hodnoty pro vaše místo; ty dává
 * PVGIS (Evropská komise, JRC) podle souřadnic, sklonu a orientace.
 */
export const SLUNECNE_HODINY: Record<Sezona, { nazev: string; hodin: number }> = {
  leto: { nazev: "léto", hodin: 4.5 },
  prechod: { nazev: "jaro a podzim", hodin: 2.5 },
  zima: { nazev: "zima", hodin: 1 },
};

/** Účinnost solární cesty: úhel, teplota, kabely, regulátor. Předpoklad, jde přepsat. */
export const UCINNOST_SOLARU_VYCHOZI = 0.7;

/** Kolik Wp panelů pokryje denní potřebu při daných slunečných hodinách. */
export function panelyWp(potrebaWhDen: number, slunecneHodiny: number, ucinnost = UCINNOST_SOLARU_VYCHOZI): number | null {
  if (potrebaWhDen <= 0) return null;
  if (slunecneHodiny <= 0 || ucinnost <= 0) return null;
  return Math.ceil(potrebaWhDen / (slunecneHodiny * ucinnost) / 10) * 10;
}

/** Kapacita baterie pro N dní bez slunce při daném režimu (s rezervou ztrát). */
export function bateriePro(dniBezSlunce: number, potrebaWhDen: number, ztraty = ZTRATY_VYCHOZI): number | null {
  if (potrebaWhDen <= 0 || dniBezSlunce <= 0) return null;
  return Math.ceil((dniBezSlunce * potrebaWhDen) / (1 - ztraty) / 100) * 100;
}

export const PVGIS_URL = "https://re.jrc.ec.europa.eu/pvg_tools/";
