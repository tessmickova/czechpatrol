// Datový model celého webu.
//
// Dvě zásady, na kterých stojí důvěryhodnost projektu:
//  1. Závažnost a jistota jsou dva NEZÁVISLÉ údaje. Něco může být velmi závažné
//     a špatně potvrzené — a naopak. Nikdy je nespojujeme do jednoho čísla.
//  2. Fakt, odhad a scénář jsou oddělené typy obsahu, ne odstavce jednoho textu.

/** Jemná interní stupnice. Uživateli se ukazuje lidský název, ne tento kód. */
export type Uroven =
  | "G1" | "G2" | "G3"      // zelená
  | "Y1" | "Y2" | "Y3"      // žlutá
  | "YO"                    // přechod žlutá/oranžová
  | "O1" | "O2" | "O3"      // oranžová
  | "R1" | "R2" | "R3";     // červená

/** Hrubé pásmo — pro barvy, filtry a souhrnné počty. */
export type Pasmo = "zelena" | "zluta" | "prechod" | "oranzova" | "cervena";

/** Jistota informace. Záměrně kvalitativní, ne procento. */
export type Jistota = "nizka" | "stredni" | "vysoka" | "potvrzeno";

/** Jak je událost připsána původci. */
export type Atribuce =
  | "neznama"            // pachatel není znám
  | "vysetrovana"        // vyšetřuje se, bez závěru
  | "nepotvrzena"        // existuje tvrzení o původci, bez potvrzení
  | "oficialni"          // oficiální státní atribuce
  | "domaci";            // prokázán domácí pachatel bez státního řízení

export type Puvodce = "rusko" | "ukrajina" | "jiny-stat" | "domaci" | "neznamy";

export type StavVysetrovani =
  | "probiha"
  | "uzavreno"
  | "obvineni"
  | "bez-vysetrovani"
  | "neuvedeno";

export type Kategorie =
  | "cr"
  | "nato"
  | "hybridni"
  | "sabotaz"
  | "infrastruktura"
  | "drony"
  | "hranice"
  | "pravo"
  | "rusko"
  | "diplomacie"
  | "kyber"
  | "vysetrovani"
  | "zpravodajske";

export type TypZdroje = "primary" | "wire" | "media" | "local" | "analysis" | "social";

export interface Zdroj {
  nazev: string;
  url: string;
  typ: TypZdroje;
  /** ISO 8601 včetně času a zóny. Absolutní datum, nikdy „před 2 hodinami“. */
  publikovano: string;
  /** Primární = orgán, který věc sám oznámil (policie, vláda, NATO, EU). */
  primarni: boolean;
  jazyk: string;
}

export interface ZaznamAktualizace {
  /** ISO 8601. */
  kdy: string;
  text: string;
  /** Zda tato aktualizace vytvořila nový samostatný signál do týdenního počtu. */
  novySignal: boolean;
}

export interface Incident {
  id: string;
  slug: string;
  /** Titulek. Popisuje, co se stalo — ne co by z toho mohlo být. */
  titulek: string;
  kratkyTitulek: string;
  zeme: string;
  /** Dvoupísmenný kód pro odznak. */
  kodZeme: string;
  region?: string;
  kategorie: Kategorie[];
  /** Kdy se událost stala. */
  datumUdalosti: string;
  /** Kdy o ní vyšlo najevo / kdy přišlo nové vyšetřovací zjištění. */
  datumZjisteni?: string;
  aktualizovano: string;
  zavaznost: Uroven;
  jistota: Jistota;
  stav: StavVysetrovani;
  atribuce: Atribuce;
  /**
   * Kdo za činem stojí podle dostupných zjištění. Jen u fyzických incidentů;
   * prohlášení, varování a reakce států původce nemají. Potvrzení říká
   * `atribuce` (oficialni / domaci = potvrzeno).
   */
  puvodce?: Puvodce | null;
  /** Doplněno zpětně jako historický milník (2014–2025), ne z běžného monitoringu. */
  historicky?: boolean;
  /** Co doloženě víme. Každá položka musí být krytá zdrojem. */
  fakta: string[];
  /** Co potvrzeno nebylo. Stejně důležité jako fakta. */
  neznameho: string[];
  /** Analytická interpretace — výslovně označená jako odhad. */
  vyznam: string;
  /** Co by hodnocení posunulo nahoru. */
  eskalacniSpousteče: string[];
  /** Co by ho naopak uklidnilo. */
  deeskalacniSignaly: string[];
  zdroje: Zdroj[];
  souvisejici: SouvisejiciVazba[];
  historie: ZaznamAktualizace[];
  /** Nový od poslední aktualizace webu. */
  novy: boolean;
  /** Do kterého týdne se počítá. Jedna událost = jeden signál. */
  zapocitanoTyden: string;
  /** Zpracováno s pomocí AI. */
  aiZpracovano: boolean;
  /** Prošlo lidskou kontrolou. Bez toho se na produkci nezobrazuje. */
  lidskyOvereno: boolean;
  /**
   * Záznam přenesený z dřívějšího monitoringu. Odkaz na primární zdroj u něj
   * zatím není doplněný — web to musí přiznat, ne to zamlčet.
   */
  archivniZaznam?: boolean;
}

export interface SouvisejiciVazba {
  incidentId: string;
  /** Potvrzená souvislost se kreslí plnou čarou, vyšetřovaná přerušovanou. */
  potvrzena: boolean;
  popis: string;
}

export interface TydenniHodnoceni {
  zacatek: string;
  konec: string;
  celkova: Uroven;
  hybridni: Uroven;
  primyStret: Uroven;
  pocty: { zelena: number; zluta: number; oranzova: number; cervena: number };
  /** „uplne“ = monitoring běžel celý týden; „castecne“ = zpětná rekonstrukce. */
  uplnost: "uplne" | "castecne";
  shrnuti: string;
}

/** Jedna položka právního semaforu. */
export interface PravniPolozka {
  klic: string;
  nazev: string;
  /**
   * true  = opatření platí (zpravidla špatná zpráva)
   * false = neplatí — ověřeno tím, že v úřední sbírce žádné takové vyhlášení není
   * null  = zatím neověřeno; web to musí přiznat, ne dopočítat
   */
  plati: boolean | null;
  hodnota: string;
  vysvetleni: string;
  pravniZaklad?: string;
  /** Kdy sběrač naposledy ověřil. null = zatím nikdy. */
  overeno: string | null;
  zdroje: Zdroj[];
}

export interface PravniStav {
  overeno: string | null;
  polozky: PravniPolozka[];
}

export interface NatoPolozka {
  klic: string;
  nazev: string;
  /** null = zatím neověřeno. */
  aktivni: boolean | null;
  hodnota: string;
  vysvetleni: string;
  overeno: string | null;
  zdroje: Zdroj[];
}

export interface HybridniTlak {
  overeno: string | null;
  /** null = zatím nevyhodnoceno. */
  celkem: Uroven | null;
  podkategorie: { klic: string; nazev: string; uroven: Uroven | null; poznamka: string }[];
}

/** Provozní dostupnost běžných služeb — paliva, banky, bankomaty, síť, energetika. */
export type StavProvozu = "bezny" | "sledujeme" | "narusen" | "bez-zdroje";

export interface ProvozniPolozka {
  klic: string;
  nazev: string;
  ikona: string;
  stav: StavProvozu;
  /** Krátká věta, kterou člověk přečte za dvě sekundy. */
  hodnota: string;
  detail: string;
  /** Co by se muselo stát, aby se stav změnil. */
  coByZmenilo: string[];
  overeno: string | null;
  zdroje: Zdroj[];
}

export interface Provoz {
  overeno: string | null;
  polozky: ProvozniPolozka[];
}

export interface RuskoUkazatel {
  nazev: string;
  uroven: Uroven | null;
  poznamka: string;
}

export interface RuskoStav {
  overeno: string | null;
  casovyTlak: Uroven | null;
  dopadNaIndex: string;
  ukazatele: RuskoUkazatel[];
  /** termin zůstává prázdný, dokud není doložen primárním zdrojem */
  sledujemePo: { nadpis: string; termin: string; body: string[] };
  poznamkaZdravi: string;
}

export interface WatchPolozka {
  cislo: string;
  nazev: string;
  dopad: "vyznamny" | "vysoky" | "velmi-vysoky";
  smer: "nahoru" | "dolu";
  popis: string;
}

export interface Watchlist {
  overeno: string | null;
  eskalacni: WatchPolozka[];
  uklidnujici: string[];
}

/** Celkový stav zobrazený v hlavičce a v hero. */
export interface CelkovyStav {
  aktualizovano: string | null;
  /** null = hodnocení zatím nebylo stanoveno; web to musí přiznat. */
  uroven: Uroven | null;
  trend: "nahoru" | "dolu" | "beze-zmeny" | null;
  trendPopis: string;
  shrnuti: string;
  /** Kolik nových signálů přibylo od poslední aktualizace. */
  noveSignaly: { celkem: number; vysoke: number; stredni: number; kriticke: number };
}

/* ---------------- archiv v čase ---------------- */

/**
 * Snímek stavu k danému okamžiku.
 *
 * Archiv se nezapisuje každou hodinu, ale jen když se něco změnilo. Řada
 * shodných záznamů by budila dojem, že se pořád něco děje — a přitom by
 * znamenala pravý opak.
 */
export interface Snimek {
  kdy: string;
  uroven: Uroven | null;
  hybridni: Uroven | null;
  primyStret: Uroven | null;
  /** klíč právní položky → platí / neplatí / neověřeno */
  pravni: Record<string, boolean | null>;
  /** klíč položky NATO → aktivní / neaktivní / neověřeno */
  nato: Record<string, boolean | null>;
  provoz: Record<string, StavProvozu>;
  /** Kolik událostí bylo v tu chvíli zveřejněno. */
  udalosti: number;
  /** Co se oproti předchozímu snímku změnilo, lidsky. */
  zmeny: string[];
  /** Ukázkový záznam — nikdy se nemíchá s ostrým archivem. */
  ukazka?: boolean;
}

export interface Archiv {
  /** Odkdy archiv vede záznamy. Starší stav nedopočítáváme. */
  zacatek: string | null;
  snimky: Snimek[];
}

/* ---------------- odběr ---------------- */

export type DruhKanalu = "rss" | "telegram" | "whatsapp" | "signal" | "bluesky" | "email";

export interface Kanal {
  druh: DruhKanalu;
  nazev: string;
  popis: string;
  url: string;
  ikona: string;
}

/* ---------------- nepotvrzené a vyřazené ---------------- */

/**
 * Záznam, který se při ověřování nepotvrdil nebo byl vyvrácen.
 *
 * Vede se odděleně a do žádného počtu ani hodnocení nevstupuje. Je tu proto,
 * že bez něj by web ukazoval jen to, co vyšlo — a čtenář by neměl jak poznat,
 * kolik věcí neprošlo.
 */
export interface Nepotvrzene {
  id: string;
  nazev: string;
  zeme: string;
  kodZeme: string;
  datum: string;
  /** „vyvraceno“ = ověřením padlo. „nepotvrzeno“ = chybí doložení. */
  stav: "vyvraceno" | "nepotvrzeno";
  /** Co se původně zdálo. */
  puvodne: string;
  /** Co ověření ukázalo. */
  overeni: string;
  zdroje: Zdroj[];
}
