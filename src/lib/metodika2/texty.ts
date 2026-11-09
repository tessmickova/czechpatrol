import type { Pasmo } from "./typy";

/*
  Hotové texty metodiky v2 (pilot). Jedno místo pro web, porovnání
  i metodiku; texty odpovídají tomu, co výpočet skutečně dělá
  (docs/metodika-v2/03-TEXTY.md). Bez „jste v bezpečí“, bez „spočítala AI“.
*/
export const CO_HODNOTIME =
  "Hodnotíme doložené bezpečnostní události podle jejich významu pro Česko. Zvlášť ukazujeme skutečný dopad na obyvatele a úřední výstrahy. Nejde o předpověď útoku ani o úřední stupeň ohrožení.";

export const NAZVY_VRSTEV = {
  a: "Bezpečnostní vývoj pro Česko",
  b: "Dopad na obyvatele a chod země",
  c: "Úřední výstrahy a stavy",
} as const;

/** Co pásmo znamená — jedna věta, stejná vlastnost u všech čtyř. */
export const VYZNAM_PASEM: Record<Pasmo, string> = {
  omezeny: "Žádná aktivní doložená událost nemá podle našich pravidel větší význam pro bezpečnost Česka nebo spojenců.",
  zvyseny: "Aktivní událost má význam pro bezpečnost Česka nebo spojenců, ale nesplňuje podmínky vysokého pásma (rozsah, doložení nebo zásah do funkcí státu).",
  vysoky: "Aktivní doložená závažná událost zasahuje Česko ve větším rozsahu, zásadní funkce státu nebo obrany, nebo jde o doloženě koordinovanou sérii.",
  mimoradny: "Aktivní doložená velmi závažná událost zasahuje Česko nebo spojence, nebo úředně platí stav ohrožení státu či válečný stav.",
};

export const NENI_K_DISPOZICI = "Aktuální hodnocení není k dispozici";
export const BEZ_DOPORUCENI_Z_PASMA = "Pásmo samo není výzvou k jednání. Pokyny pro obyvatele vydávají úřady; když nějaký platí, je uvedený u úředních výstrah s vydavatelem a územím.";
export const OBECNA_PRIPRAVENOST = "Obecnou připravenost domácnosti popisuje průvodce připraveností; s aktuálním pásmem nesouvisí.";

export const ODKAZ_STUPNE_TERORISMU = { nazev: "Ministerstvo vnitra — stupně ohrožení terorismem", url: "https://mv.gov.cz/stupne-ohrozeni-terorismem" };
