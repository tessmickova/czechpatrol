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
} as const;

export type DruhNaliehave = keyof typeof NAZVY_NALIEHAVE;

export const nazevNaliehave = (druh: string): string => (NAZVY_NALIEHAVE as Record<string, string>)[druh] ?? druh;
