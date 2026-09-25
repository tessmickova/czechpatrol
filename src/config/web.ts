/**
 * Jediné místo, kde se mění identita a nastavení webu.
 */

export const WEB = {
  /** Název záměrně nestojí na slově „válka“ — působilo by to poplašně. */
  nazev: "CzechPatrol",
  podtitul: "Bezpečnostní přehled ČR",
  popis:
    "Ověřené bezpečnostní události z Česka a Evropy, jejich kontext a možné další kroky — bez zbytečného strašení.",
  /** Vlastní doména od září 2026; `czechpatrol.pages.dev` zůstává záložní vstup. Používá se pro OpenGraph, sitemap a kanál. */
  url: "https://czechpatrol.cz",
  jazyk: "cs",
} as const;

/**
 * Podpora projektu. Dokud je prázdné, tlačítko se nikde nezobrazí.
 */
export const BUY_ME_A_COFFEE_URL = "";
/** Herohero — prázdné = tlačítko se neukáže. */
export const HEROHERO_URL = "";

/** Verze a datum poslední revize metodiky. Změna verze = zápis do /opravy/. */
export const METODIKA_VERZE = "2";
export const METODIKA_REVIDOVANA = "2026-09-24";

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
 * Co která cesta doručování SKUTEČNĚ dělá.
 *
 * Tohle je jediné místo, odkud se berou věty o dostupnosti kanálů. Vzniklo
 * proto, že si stránky odporovaly: úvod nabízel Telegram a tvrdil „žádné denní
 * souhrny", workflow přitom denní souhrn má; /odber/ zmiňoval týdenní souhrn
 * a odhlášení v účtu, /ucet/ říkal, že účty neběží, a /o-projektu/ tvrdil,
 * že kanály nejsou spuštěné.
 *
 * Pravidlo: co tu není označené jako `bezi`, se nikde nesmí nabízet jako
 * dostupné. Funkci, která neběží, web představí jako připravovanou.
 */
export const DORUCOVANI = {
  telegram: {
    bezi: true,
    nazev: "Telegram",
    /** Co do kanálu opravdu chodí. Nesmí slibovat víc, než workflow dělá. */
    rozsah: "Mimořádná výstraha a vážné případy odcházejí hned. U pěti nejzávažnějších témat posíláme i neověřený signál — vždy označený, s odkazem na zdroj. Ostatní ověřené záznamy jednou denně v souhrnu; v den, kdy žádný není, přijde místo něj přehled toho, co sběr zachytil, a tipy k přípravě.",
    /** Podle .github/workflows/rozhlas.yml. Změna workflow = změna téhle věty. */
    kadence: "průběžně u vážných, denní souhrn v 19:00 (v zimě v 18:00)",
  },
  rss: {
    bezi: true,
    nazev: "RSS",
    rozsah: "Všechny ověřené záznamy ve čtečce.",
    kadence: "obnovuje se při každém sestavení webu",
  },
  ucty: {
    /** Účty běží jen s nasazeným API. Bez něj se nesmějí nabízet. */
    bezi: false,
    nazev: "Účet s vlastním výběrem",
    rozsah: "Výběr témat a oblastí, týdenní souhrn.",
    kadence: "zatím neběží",
  },
} as const;

/**
 * Kdy se odesílá upozornění.
 *
 * Záměrně ne u každé události — od toho je web. Upozornění chodí jen tehdy,
 * když se změní něco, kvůli čemu by člověk mohl jednat jinak.
 */
export const KDY_UPOZORNENI = [
  "vyhlášení mobilizace v Rusku",
  "spuštěné krizové vysílání Českého rozhlasu",
  "aktivace článku 4 nebo 5 NATO",
  "nouzový stav, stav ohrožení nebo válečný stav v ČR",
  "uzavření hranic ČR",
  "změna celkové úrovně",
  "změna právního stavu ČR (mobilizace, stav ohrožení, vycestování, hranice)",
  "narušení provozu, které se dotkne běžného života",
] as const;

/**
 * Témata, u kterých kanál pošle i NEOVĚŘENOU zprávu — hned, jak ji sběr
 * zachytí, a vždy označenou.
 *
 * Je to vědomá výjimka z pravidla „ven jde jen ověřené". Mezi zachycením
 * a lidským ověřením jsou hodiny a u těchhle pěti věcí je ta prodleva to
 * jediné, na čem záleží. Proto zpráva začíná slovem NEOVĚŘENO, nese odkaz na
 * zdroj a říká, že to nikdo nepotvrdil; do počtů na webu taková zpráva
 * nevstupuje.
 *
 * Co sem NEPATŘÍ: přípravy mobilizace a narušení vzdušného prostoru Aliance.
 * Stávají se opakovaně, samy o sobě nic nemění a v kanálu by z nich byl šum,
 * ve kterém by zapadlo to podstatné. Ty jdou jen nahoru ve frontě ke kontrole.
 */
export const NEOVERENE_SIGNALY = [
  "vyhlášení mobilizace v Rusku",
  "spuštěné krizové vysílání Českého rozhlasu",
  "aktivace článku 4 nebo 5 NATO",
  "nouzový stav, stav ohrožení nebo válečný stav v ČR",
  "uzavření hranic ČR",
] as const;

/**
 * Komunita. Stejné pravidlo jako u kanálů: prázdná adresa = odkaz se
 * neukáže jako funkční.
 */
export const KOMUNITA: Record<string, string> = {
  /*
    Repozitář a diskuse jsou schválně prázdné.

    Odkaz na repozitář vede na účet konkrétního člověka, a tím i na jméno,
    které za projektem stojí. Dokud to tak má zůstat, nesmí být odkaz nikde
    — ani v patičce, ani v podmínkách, ani ve formuláři hlášení. Prázdná
    hodnota znamená „neexistuje": web pak odkaz nevykreslí a nikde o něm
    nemluví.
  */
  github: "",
  diskuse: "",
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
export const API_URL = ((adresa: string) => {
  const a = adresa.trim().replace(/\/$/, "");
  if (a === "") return "";
  /*
    Bez schématu to není adresa, ale relativní cesta.

    „czechpatrol-api.neco.workers.dev" prohlížeč nepošle na worker — připojí
    si to k adrese webu a POST skončí na statickém hostingu, který odpoví 405.
    Vypadá to jako rozbité přihlašování, přitom je to chybějící https://.
    Kdo adresu opisuje z Cloudflare, schéma tam často nemá.
  */
  return /^https?:\/\//.test(a) ? a : `https://${a}`;
})(process.env.NEXT_PUBLIC_API_URL ?? "");
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
/*
  Co je spuštěné pro veřejnost (audit 23. 9. 2026, „launch web není roadmapa").

  Funkce, které nejsou hotové nebo nemají právní základ, se na webu
  nenabízejí. Kód zůstává, zapne se tady, až bude hotové:
  - premium:  platby a Premium — až budou obchodní podmínky, poučení
              o odstoupení a uvedený provozovatel (LEGAL REVIEW),
  - komunita: WhatsApp skupina, slevy, VIP — nic z toho zatím neexistuje,
  - izs:      zprávy partnerů IZS — žádný partner zatím není,
  - zebricek: srovnání s ostatními — připravenost není soutěž.
*/
/**
 * Úvod v2 (24. 9. 2026): pulz hlídky, deska stavu, karusel aktualit.
 * false = původní úvod (tři budíky vlevo, sloupec aktualit vpravo).
 * Návrat je jen tenhle přepínač; staré komponenty zůstávají v kódu.
 */
export const UVOD_V2 = true;

export const SPUSTENO = {
  premium: false,
  komunita: false,
  izs: false,
  zebricek: false,
} as const;

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
export const PROVOZOVATEL: { nazev: string; ico: string; kontakt: string } = {
  /* Doplněno 24. 9. 2026 podle provozovatelky. Kontakt zatím nedodán — nevymýšlí se. */
  nazev: "Vítězslav Miček",
  ico: "07347219",
  kontakt: "",
};

/** „Vítězslav Miček, IČO 07347219“ — jednotná podoba pro stránky. */
export const PROVOZOVATEL_TEXT = PROVOZOVATEL.nazev
  ? `${PROVOZOVATEL.nazev}${PROVOZOVATEL.ico ? `, IČO ${PROVOZOVATEL.ico}` : ""}`
  : "";

/**
 * Sběr e-mailů pro souhrn a pozvánky do komunity.
 *
 * Běží jen se dvěma věcmi: API (kam se adresa ukládá) a uvedeným
 * správcem údajů. Bez správce se adresy nesbírají — čl. 13 GDPR chce, aby
 * člověk věděl, komu adresu dává. Dokud je PROVOZOVATEL prázdný, web
 * formulář neukáže a řekne, že odběr připravuje.
 */
/**
 * Smí web přijímat e-maily, jména a telefony? Jen s uvedeným provozovatelem
 * (správce údajů podle GDPR). Server má vlastní pojistku OSOBNI_UDAJE,
 * tohle jen skryje pole, která by stejně skončila odmítnutím.
 */
/*
  Bez kontaktu na správce se údaje nesbírají: čl. 13 GDPR chce, aby člověk
  věděl, kam se obrátit kvůli výmazu nebo námitce. Jméno a IČO nestačí.
*/
export const KONTAKTY_PRIJIMAME = PROVOZOVATEL.nazev !== "" && PROVOZOVATEL.kontakt !== "";

export const EMAIL_ODBER_BEZI = UCTY_ZAPNUTE && KONTAKTY_PRIJIMAME;

/**
 * E-shop s výbavou (Čenich). Prázdná adresa = odkaz se nikde neukáže.
 * Až poběží naostro, odkazy z Odolnosti a Připravenosti povedou na konkrétní
 * funkci (voda, světlo…), ne na úvodní stránku; nikdy ne na „balíček",
 * který by nahradil úvahu o závislostech.
 */
export const ESHOP = "";

/**
 * Cizí obchody pro věci, které se nevyplatí mít v našem e-shopu (voda,
 * baterie, trvanlivé potraviny). Prázdná adresa = tlačítko se neukáže.
 * Odkaz vede na vyhledávání dané věci, ne na konkrétní produkt: web
 * nedoporučuje značky ani ceny. `{q}` se nahradí názvem věci.
 */
export const OBCHODY: { klic: string; nazev: string; hledani: string }[] = [
  { klic: "rohlik", nazev: "Rohlík", hledani: "" },
  { klic: "alza", nazev: "Alza", hledani: "" },
];

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

/*
  Analytika třetích stran (25. 9. 2026): Microsoft Clarity (teplotní mapy,
  záznamy relací) a PostHog (události, trychtýře). Obě nastavují cookies,
  proto běží JEN po výslovném souhlasu v liště souhlasu (souhlas-analytika).
  PostHog se zapne, až bude v prostředí nasazení NEXT_PUBLIC_POSTHOG_KEY.
*/
export const CLARITY_ID = "ynyq48l9eb";
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
