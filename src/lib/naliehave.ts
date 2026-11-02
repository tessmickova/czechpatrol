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

/** Naléhaví kandidáti v okně (výchozí 48 h), nejnovější první, nejvýš pět. Čistá funkce pro úvod i správu. */
export function naliehaveVOkne<K extends { naliehave?: unknown; publikovano?: string | null; zachyceno: string }>(kandidati: K[], ted: number, hodin = 48, max = 5): K[] {
  return kandidati
    .filter((k) => k.naliehave)
    .filter((k) => ted - new Date(k.publikovano ?? k.zachyceno).getTime() <= hodin * 3_600_000)
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, max);
}
