/**
 * Jediné místo, kde se mění identita a nastavení webu.
 */

export const WEB = {
  /** Název záměrně nestojí na slově „válka“ — působilo by to poplašně. */
  nazev: "CzechPatrol",
  podtitul: "Bezpečnostní přehled ČR",
  popis:
    "Ověřené bezpečnostní události z Česka a Evropy, jejich kontext a možné další kroky — bez zbytečného strašení.",
  /** Doplnit po nasazení na doménu. Používá se pro OpenGraph, sitemap a kanál. */
  url: "https://czechpatrol.pages.dev",
  jazyk: "cs",
} as const;

/**
 * Podpora projektu. Dokud je prázdné, tlačítko se nikde nezobrazí.
 */
export const BUY_ME_A_COFFEE_URL = "";

/** Verze a datum poslední revize metodiky. Změna verze = zápis do /opravy/. */
export const METODIKA_VERZE = "2";
export const METODIKA_REVIDOVANA = "2026-09-06";

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
  telegram: "https://t.me/czechpatrol",
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
  /** Veřejný repozitář s daty i kódem. Odkazuje se na něj jen v O projektu a Opravách, ne v menu. */
  github: "https://github.com/tessmickova/czechpatrol",
  /** Diskuse nad metodikou a hodnocením. */
  diskuse: "https://github.com/tessmickova/czechpatrol/issues",
  /** Skupina, kde se dají posílat tipy. */
  skupina: "",
  /** Adresa pro poslání tipu nebo opravy. */
  tipy: "",
};

/**
 * Živá diskuze ke konkrétním tématům.
 *
 * Neběží pořád — otevírá se jen tam, kde to dává smysl, a přístup dostanou
 * odběratelé telegramového kanálu. Prázdná adresa znamená, že žádná diskuze
 * zrovna neběží; web pak nic nepředstírá.
 */
export const DISKUZE = {
  /** Adresa skupiny. Prázdné = diskuze zatím neběží. */
  url: "",
  /**
   * Kolik lidí kanál odebírá. Vyplňuje se ručně podle skutečného čísla
   * z Telegramu; nula znamená „nevíme“, ne „nikdo“. Číslo se nikdy nedopočítává.
   */
  odberatelu: 0,
} as const;

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

/**
 * Adresa API (účty, upozornění, IZS). Prázdná adresa = účty vypnuté;
 * web pak ukáže, že se připravují, a nic nepředstírá.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const UCTY_ZAPNUTE = API_URL !== "";

/**
 * Co je jen pro podporovatele.
 *
 * Přepínač je tu na přání. Doporučení projektu je ale jiné: informace, které
 * se dotýkají bezpečí (hranice, doprava), nechávat volně a placenou vrstvu
 * stavět na pohodlí — upozorněních, archivu, exportu. Zapnutí je jedna
 * hodnota; rozhodnutí zůstává na provozovateli.
 *
 * Pozn.: web je statický, takže omezení platí v prohlížeči. Kdo by chtěl
 * data doopravdy schovat, musel by je přesunout do API.
 */
export const PLACENE = {
  hraniceADoprava: false,
} as const;

/** Odkazy pro praktického pomocníka — jen úřední zdroje, žádné vlastní rady. */
export const POMOCNIK = [
  {
    nazev: "Portál občana",
    popis: "Úřední oznámení státu, doklady, datová schránka.",
    url: "https://obcan.portal.gov.cz/",
  },
  {
    nazev: "DROZD — registrace před cestou",
    popis: "Dobrovolná registrace u MZV pro cesty do zahraničí. Stát vás pak umí kontaktovat.",
    url: "https://drozd.mzv.cz/",
  },
  {
    nazev: "Hasičský záchranný sbor ČR",
    popis: "Ochrana obyvatelstva, varování, co dělat při mimořádné události.",
    url: "https://www.hzscr.cz/",
  },
  {
    nazev: "Ministerstvo vnitra",
    popis: "Bezpečnostní informace státu, hranice, občanské průkazy.",
    url: "https://www.mvcr.cz/",
  },
  {
    nazev: "NÚKIB",
    popis: "Kybernetická bezpečnost, aktuální varování a doporučení.",
    url: "https://nukib.gov.cz/",
  },
] as const;

/** Tísňová čísla. Jediné „doporučení“, které web dává. */
export const TISNOVA = [
  { cislo: "112", popis: "jednotné evropské číslo tísňového volání" },
  { cislo: "150", popis: "hasiči" },
  { cislo: "155", popis: "záchranná služba" },
  { cislo: "158", popis: "policie" },
] as const;

/**
 * Provozovatel — správce osobních údajů. Dokud je prázdné, stránky
 * o soukromí a podmínkách to řeknou na rovinu; nic se nevymýšlí.
 */
export const PROVOZOVATEL = {
  nazev: "",
  kontakt: "",
} as const;

/** Kam se hlásí složka IZS, která chce roli partnera. Prázdné = zatím nepřijímáme. */
export const IZS_KONTAKT = "";

/** Kraje pro cílení zpráv partnera IZS. */
export const KRAJE = [
  "Hlavní město Praha", "Středočeský", "Jihočeský", "Plzeňský", "Karlovarský", "Ústecký",
  "Liberecký", "Královéhradecký", "Pardubický", "Vysočina", "Jihomoravský", "Olomoucký",
  "Zlínský", "Moravskoslezský",
] as const;

/**
 * Kam chodí hlášení „chybí tu událost“. S API se ukládají do správy;
 * bez API se otevře e-mail na tuhle adresu. Prázdné = jen GitHub.
 */
export const TIPY_MAIL = "";

/**
 * Partneři sekce „Ve spolupráci s“. Tři místa. Dokud je pole prázdné,
 * ukazují se tři volné rámečky — žádné vymyšlené logo ani název.
 */
export const PARTNERI: { nazev: string; url: string; popis: string }[] = [];
