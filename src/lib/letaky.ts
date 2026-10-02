/*
  Letáky „Co dělat“ (3. 10. 2026, přání provozovatelky).

  Jen český oficiální postup — HZS ČR (sirény, všeobecná výstraha) a Policie
  ČR (nález munice). Polské a švédské letáky, které kolují po sítích, radí
  jinak (např. „jděte do úkrytu“), u nás platí „dovnitř, zavřít, rádio“.
  Texty se nemění bez zdroje; každý leták ho nese pod sebou.
*/

export interface Zdroj { nazev: string; url: string }

export const TONY_SIREN = [
  { klic: "zkouska", nazev: "Zkouška sirén", tvar: "rovny", popis: "nepřerušovaný tón, 140 sekund", co: "Nic nedělejte. Zkouška bývá první středu v měsíci ve 12:00." },
  { klic: "vystraha", nazev: "Všeobecná výstraha", tvar: "kolisavy", popis: "kolísavý tón, 140 sekund, může zaznít až 3× za sebou", co: "Jděte dovnitř, zavřete okna a dveře, zapněte rádio nebo televizi." },
  { klic: "pozar", nazev: "Požární poplach", tvar: "prerusovany", popis: "přerušovaný tón „HÓ-ŘÍ“, 60 sekund", co: "Svolává hasiče. Uvolněte cestu hasičským vozům." },
] as const;

export const VYSTRAHA_KROKY = [
  { nadpis: "Jděte dovnitř", text: "Zůstaňte doma, nebo se schovejte v nejbližší budově — obchod, úřad, obytný dům." },
  { nadpis: "Zavřete okna a dveře", text: "Vypněte větrání. Místnost vyberte spíš uprostřed budovy a ve vyšším patře, ne ve sklepě." },
  { nadpis: "Zapněte rádio nebo televizi", text: "Hned po siréně následují informace: Český rozhlas, Česká televize, obecní rozhlas." },
  { nadpis: "Řiďte se pokyny", text: "Neodcházejte, dokud to úřady neodvolají. Zbytečně nevolejte, ať nezahltíte linky." },
] as const;

export const NALEZ_KROKY = [
  { nadpis: "Nesahejte na to", text: "Munici, trosky dronu ani podezřelý předmět neberte do ruky a nepřenášejte — ani na policii." },
  { nadpis: "Označte místo a odejděte", text: "Místo označte (kapesník, čepice) a vzdalte se do bezpečné vzdálenosti." },
  { nadpis: "Volejte 158", text: "Policie ČR, zdarma. Při zranění nebo požáru 112." },
  { nadpis: "Nepouštějte nikoho blíž", text: "Hlídejte, ať se nikdo nepřibližuje, dokud nepřijede policie a pyrotechnik." },
] as const;

export const ZDROJE_LETAKU: Record<"sireny" | "vystraha" | "nalez", Zdroj[]> = {
  sireny: [{ nazev: "HZS ČR — Sirény (leták)", url: "https://hzscr.gov.cz/soubor/sireny-pdf.aspx" }],
  vystraha: [{ nazev: "HZS ČR — Varování obyvatelstva", url: "https://hzscr.gov.cz/soubor/14-varovani-obyvatelstva-pdf.aspx" }],
  nalez: [{ nazev: "Policie ČR — Jak se chovat při nálezu munice", url: "https://policie.gov.cz/clanek/jak-se-chovat-pri-nalezu-munice.aspx" }],
};

/** Oficiální příručky ke stažení. Jen originály od vydavatelů — neoficiální překlady na cizích discích neodkazujeme. */
export const PRIRUCKY: { nazev: string; kdo: string; jazyk: string; url: string; poznamka?: string }[] = [
  { nazev: "Pro případ ohrožení — příručka pro obyvatele", kdo: "HZS ČR", jazyk: "česky", url: "https://hzscr.gov.cz/soubor/prirucka-oo-pdf-1-pdf.aspx" },
  { nazev: "Varování obyvatelstva — leták A4", kdo: "HZS ČR", jazyk: "česky", url: "https://hzscr.gov.cz/soubor/letaky-a4-varovani-obyvatelstva.aspx" },
  { nazev: "72 hodin — jak se připravit na mimořádnou událost", kdo: "Ministerstvo vnitra ČR", jazyk: "česky", url: "https://www.72h.gov.cz/" },
  { nazev: "Poradnik bezpieczeństwa", kdo: "Polská vláda (MSWiA, MON, RCB)", jazyk: "polsky", url: "https://www.gov.pl/web/poradnikbezpieczenstwa", poznamka: "Polské pokyny — v Česku platí postup HZS ČR." },
  { nazev: "In case of crisis or war", kdo: "Švédská agentura pro civilní obranu (MCF, dříve MSB)", jazyk: "anglicky", url: "https://www.mcf.se/en/advice-for-individuals/the-brochure-in-case-of-crisis-or-war/download-and-order-the-brochure-in-case-of-crisis-or-war/", poznamka: "Švédské pokyny — v Česku platí postup HZS ČR." },
];

/** Kvíz „Vím to“ — tři otázky, správná odpověď je index. */
export const KVIZ = [
  { otazka: "Který tón sirény je všeobecná výstraha?", moznosti: ["Nepřerušovaný tón", "Kolísavý tón", "Přerušovaný „HÓ-ŘÍ“"], spravne: 1 },
  { otazka: "Co udělat, když zazní všeobecná výstraha?", moznosti: ["Jít do sklepa a čekat", "Jít dovnitř, zavřít okna, zapnout rádio", "Vyjet autem pro děti do školy"], spravne: 1 },
  { otazka: "Najdete trosky dronu nebo munici. Co dál?", moznosti: ["Vyfotit zblízka a odnést na policii", "Nesahat, označit místo, odejít a volat 158", "Zakopat je, ať se nikdo nezraní"], spravne: 1 },
] as const;
