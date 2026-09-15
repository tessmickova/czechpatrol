import type { Atribuce, Kategorie, Puvodce, StavVysetrovani, TypZdroje } from "./typy";

export const KATEGORIE: Record<Kategorie, { nazev: string; znak: string }> = {
  cr: { nazev: "ČR", znak: "CZ" },
  nato: { nazev: "NATO", znak: "N" },
  hybridni: { nazev: "Hybridní operace", znak: "H" },
  sabotaz: { nazev: "Sabotáže", znak: "S" },
  infrastruktura: { nazev: "Kritická infrastruktura", znak: "I" },
  drony: { nazev: "Drony / vzdušný prostor", znak: "D" },
  hranice: { nazev: "Hranice", znak: "B" },
  pravo: { nazev: "Právo / mobilizace", znak: "P" },
  rusko: { nazev: "Rusko", znak: "R" },
  diplomacie: { nazev: "Diplomacie", znak: "Dp" },
  kyber: { nazev: "Kybernetika", znak: "K" },
  vysetrovani: { nazev: "Vyšetřování", znak: "V" },
  zpravodajske: { nazev: "Zpravodajské služby", znak: "Z" },
};

export const PORADI_KATEGORII: Kategorie[] = [
  "cr", "nato", "hybridni", "sabotaz", "infrastruktura", "drony",
  "hranice", "pravo", "rusko", "diplomacie", "kyber", "vysetrovani", "zpravodajske",
];

/*
  Kdo za činem stojí. Velké písmeno je záměr: v datech je klíč „rusko",
  ale čtenáři se jméno státu píše, jak se píše.
*/
export const PUVODCI: Record<Puvodce, string> = {
  rusko: "Rusko",
  ukrajina: "Ukrajina",
  "jiny-stat": "jiný stát",
  "neni-stat": "nestátní skupina",
  domaci: "domácí pachatel",
  neznamy: "neznámý",
};

export const ATRIBUCE: Record<Atribuce, { nazev: string; popis: string }> = {
  neznama: { nazev: "Neznámá", popis: "Pachatel není znám." },
  vysetrovana: { nazev: "Vyšetřovaná", popis: "Vyšetřování probíhá, závěr zatím není." },
  nepotvrzena: { nazev: "Nepotvrzená", popis: "Existuje tvrzení o původci, chybí potvrzení." },
  oficialni: { nazev: "Oficiální", popis: "Původce byl určen oficiálním závěrem příslušného orgánu." },
  domaci: { nazev: "Domácí pachatel", popis: "Prokázán domácí pachatel bez zjištěného státního řízení." },
};

export const STAVY: Record<StavVysetrovani, string> = {
  probiha: "Vyšetřování pokračuje",
  uzavreno: "Vyšetřování uzavřeno",
  obvineni: "Podáno obvinění",
  "bez-vysetrovani": "Bez vyšetřování",
  neuvedeno: "Neuvedeno",
};

/*
  Typy zdrojů. Značky byly anglické velkými písmeny (PRIMARY, WIRE, MEDIA) —
  interní kód vystavený čtenáři, který ho musel luštit. Teď je to česky
  a normálním písmem; přesné jméno vydavatele stojí vedle.
*/
export const TYPY_ZDROJU: Record<TypZdroje, { znacka: string; popis: string; tridy: string }> = {
  primary: {
    znacka: "Úřední zdroj", popis: "Orgán, který věc sám oznámil — policie, vláda, NATO, EU.",
    tridy: "border-akcent/50 bg-akcent/15 text-akcent-svetla",
  },
  wire: {
    znacka: "Agentura", popis: "Mezinárodní agentura — Reuters, AP, AFP.",
    tridy: "border-linka bg-noc/60 text-inkoust",
  },
  media: {
    znacka: "Médium", popis: "Zpravodajské médium.",
    tridy: "border-linka bg-noc/60 text-tlum",
  },
  local: {
    znacka: "Místní médium", popis: "Regionální nebo místní médium.",
    tridy: "border-linka bg-noc/60 text-tlum",
  },
  analysis: {
    znacka: "Analýza", popis: "Analytický zdroj — think tank, výzkumné pracoviště.",
    tridy: "border-fialova/40 bg-fialova/10 text-fialova-text",
  },
  social: {
    znacka: "NEOVĚŘENÝ", popis: "Sociální síť. Nízká důvěryhodnost — sám o sobě nikdy nezvyšuje stupeň hrozby.",
    tridy: "border-jantar/40 bg-jantar/10 text-jantar",
  },
};
