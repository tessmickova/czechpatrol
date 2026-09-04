/**
 * Jediné místo, kde se mění identita a nastavení webu.
 */

export const WEB = {
  /** Název záměrně nestojí na slově „válka“ — působilo by to poplašně. */
  nazev: "Kontext",
  podtitul: "Bezpečnostní přehled ČR",
  popis:
    "Ověřené bezpečnostní události z Česka a Evropy, jejich kontext a možné další kroky — bez zbytečného strašení.",
  /** Doplnit po nasazení na doménu. Používá se pro OpenGraph a sitemap. */
  url: "https://example.invalid",
  jazyk: "cs",
} as const;

/**
 * Podpora projektu. Dokud je prázdné, tlačítko se nikde nezobrazí.
 * Stačí doplnit URL zde — objeví se v hlavičce i v patičce.
 */
export const BUY_ME_A_COFFEE_URL = "";

/** Datum poslední revize metodiky. Zobrazuje se v patičce a na /metodika. */
export const METODIKA_REVIDOVANA = "2026-09-04";

/**
 * Režim dat.
 *  - "ostry"  = zobrazují se jen lidsky ověřené záznamy z data/*.json
 *  - "ukazka" = přidají se ukázkové záznamy z data/ukazka/*.json, viditelně
 *               označené odznakem UKÁZKA a upozorněním v hlavičce
 *
 * Produkční build je vždy „ostry“. Ukázkový režim slouží k posouzení vizuálu.
 */
export const REZIM: "ostry" | "ukazka" =
  process.env.NEXT_PUBLIC_REZIM === "ukazka" ? "ukazka" : "ostry";

export const JE_UKAZKA = REZIM === "ukazka";
