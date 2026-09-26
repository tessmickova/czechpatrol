/*
  Odkazy ven, které web doporučuje (26. 9. 2026).

  Vždy rel="nofollow noopener noreferrer": web neručí za cizí stránky
  a nepředává jim pořadí ve vyhledávačích. Adresy hlídá týdenní „Ověření
  zdrojů“ (sber/test-zdroju.ts) — přestěhovaná adresa se pozná dřív,
  než na ní odkaz mlčky přestane vést.
*/

export const VEN = "nofollow noopener noreferrer";

export interface OfflineMapa {
  nazev: string;
  /** Proč právě tahle — ukáže se po najetí nebo klepnutí. */
  proc: string;
  android: string;
  ios: string;
  alternativa?: boolean;
}

export const OFFLINE_MAPY: OfflineMapa[] = [
  {
    nazev: "Mapy.com",
    proc: "Podrobné a spolehlivé mapy optimalizované pro Česko: turistické trasy, cyklostezky i menší obce. Oblast si stáhnete předem a mapa i vyhledávání fungují bez signálu.",
    android: "https://play.google.com/store/apps/details?id=cz.seznam.mapy&hl=cs",
    ios: "https://apps.apple.com/us/app/mapy-com-maps-offline-gps/id411411020",
  },
  {
    nazev: "Organic Maps",
    proc: "Alternativa bez šmírování: nesleduje váš pohyb, neodesílá data o poloze ani používání, bez reklam. Mapy tvoří komunita (OpenStreetMap) a po stažení fungují úplně offline.",
    android: "https://play.google.com/store/apps/details?id=app.organicmaps&hl=cs",
    ios: "https://apps.apple.com/us/app/organic-maps-offline-maps-gps/id1567437057",
    alternativa: true,
  },
];

/**
 * Pizza index (Pentagon Pizza Index). Adresa ověřena ze sítě sběru —
 * viz commit, který ji přidal.
 */
export const PIZZA_INDEX = {
  url: "https://www.pizzint.watch/",
  popis:
    "Neoficiální ukazatel z otevřených zdrojů: sleduje veřejně viditelnou vytíženost pizzerií v okolí Pentagonu (USA). Nečekaný noční nárůst se v minulosti občas objevil před velkými událostmi. Je to kuriozita, ne měření ani předpověď — nic nedokládá a do našeho hodnocení nevstupuje.",
};
