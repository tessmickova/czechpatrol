/*
  Strojový překlad zachycených zpráv (20. 11. 2026): názvy jazyků pro větu
  „přeloženo z angličtiny“. Kódy jsou ty, které vrací nastroje/preklad/preloz.py.
*/
const Z_JAZYKA: Record<string, string> = {
  en: "angličtiny", sk: "slovenštiny", pl: "polštiny", de: "němčiny", et: "estonštiny", lv: "lotyštiny",
  lt: "litevštiny", fi: "finštiny", ro: "rumunštiny", uk: "ukrajinštiny", ru: "ruštiny", sv: "švédštiny",
  nb: "norštiny", no: "norštiny", da: "dánštiny", bg: "bulharštiny", hu: "maďarštiny", fr: "francouzštiny", nl: "nizozemštiny",
  it: "italštiny", es: "španělštiny",
};

export const zJazyka = (kod: string | null | undefined): string => (kod && Z_JAZYKA[kod]) || "cizího jazyka";

/** Věta pod přeloženým titulkem. */
export const vetaPrekladu = (kod: string | null | undefined): string => `Přeloženo strojově z ${zJazyka(kod)} — překlad může být nepřesný; rozhoduje původní znění.`;
