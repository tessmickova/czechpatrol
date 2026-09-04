/**
 * Jediné místo, kde se mění identita a nastavení webu.
 */

export const WEB = {
  /** Název záměrně nestojí na slově „válka“ — působilo by to poplašně. */
  nazev: "Kontext",
  podtitul: "Bezpečnostní přehled ČR",
  popis:
    "Ověřené bezpečnostní události z Česka a Evropy, jejich kontext a možné další kroky — bez zbytečného strašení.",
  /** Doplnit po nasazení na doménu. Používá se pro OpenGraph, sitemap a kanál. */
  url: "https://example.invalid",
  jazyk: "cs",
} as const;

/**
 * Podpora projektu. Dokud je prázdné, tlačítko se nikde nezobrazí.
 */
export const BUY_ME_A_COFFEE_URL = "";

/** Datum poslední revize metodiky. */
export const METODIKA_REVIDOVANA = "2026-09-04";

/**
 * Odběrové kanály.
 *
 * Prázdná adresa znamená, že kanál ještě neexistuje — web ho pak neukazuje
 * jako dostupný, ale výslovně jako připravovaný. Nabízet odběr, který nikam
 * nevede, by bylo horší než ho nenabízet vůbec.
 *
 * Kanál `rss` se generuje při buildu a je funkční vždy.
 */
export const KANALY: Record<string, string> = {
  telegram: "",
  whatsapp: "",
  signal: "",
  bluesky: "",
  /** Adresa, kam odesílá formulář e-mailového odběru (např. služba třetí strany). */
  email: "",
};

/**
 * Kdy se odesílá upozornění.
 *
 * Záměrně ne u každé události — od toho je web. Upozornění chodí jen tehdy,
 * když se změní něco, kvůli čemu by člověk mohl jednat jinak.
 */
export const KDY_UPOZORNENI = [
  "změna celkové úrovně",
  "změna právního stavu ČR (mobilizace, stav ohrožení, vycestování, hranice)",
  "aktivace článku 4 nebo 5 NATO",
  "narušení provozu, které se dotkne běžného života",
] as const;

/**
 * Komunita. Stejné pravidlo jako u kanálů: prázdná adresa = odkaz se
 * neukáže jako funkční.
 */
export const KOMUNITA: Record<string, string> = {
  /** Veřejný repozitář s daty i kódem. */
  github: "",
  /** Diskuse nad metodikou a hodnocením. */
  diskuse: "",
  /** Skupina, kde se dají posílat tipy. */
  skupina: "",
  /** Adresa pro poslání tipu nebo opravy. */
  tipy: "",
};

/**
 * Režim dat.
 *  - "ostry"  = jen lidsky ověřené záznamy z data/*.json
 *  - "ukazka" = přidají se ukázková data z data/ukazka/*.json, viditelně označená
 *
 * Produkční build je vždy „ostry“.
 */
export const REZIM: "ostry" | "ukazka" =
  process.env.NEXT_PUBLIC_REZIM === "ukazka" ? "ukazka" : "ostry";

export const JE_UKAZKA = REZIM === "ukazka";
