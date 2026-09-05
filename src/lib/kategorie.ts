import type { Atribuce, Kategorie, StavVysetrovani, TypZdroje } from "./typy";

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

export const TYPY_ZDROJU: Record<TypZdroje, { znacka: string; popis: string; tridy: string }> = {
  primary: {
    znacka: "PRIMARY", popis: "Orgán, který věc sám oznámil — policie, vláda, NATO, EU.",
    tridy: "border-inkoust bg-inkoust text-white",
  },
  wire: {
    znacka: "WIRE", popis: "Mezinárodní agentura — Reuters, AP, AFP.",
    tridy: "border-linka bg-plocha text-inkoust",
  },
  media: {
    znacka: "MEDIA", popis: "Zpravodajské médium.",
    tridy: "border-linka bg-plocha text-tlum",
  },
  local: {
    znacka: "LOCAL", popis: "Regionální nebo místní médium.",
    tridy: "border-linka bg-plocha text-tlum",
  },
  analysis: {
    znacka: "ANALYSIS", popis: "Analytický zdroj — think tank, výzkumné pracoviště.",
    tridy: "border-[#2b2a4a] bg-[#141428] text-[#9db1cc]",
  },
  social: {
    znacka: "NEOVĚŘENÝ", popis: "Sociální síť. Nízká důvěryhodnost — sám o sobě nikdy nezvyšuje stupeň hrozby.",
    tridy: "border-[#5e5124] bg-[#2a2410] text-[#f0d47e]",
  },
};
