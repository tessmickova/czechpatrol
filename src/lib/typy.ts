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

/**
 * Kdo za činem stojí.
 *
 * `neni-stat` je pro ozbrojené skupiny bez státu (teroristická organizace).
 * Nacpat je pod „jiný stát“ nebo „domácí pachatel“ by bylo věcně špatně
 * a rozbilo by to přehled Kdo za tím stojí.
 */
export type Puvodce = "rusko" | "ukrajina" | "jiny-stat" | "neni-stat" | "domaci" | "neznamy";

export type DruhZaznamu = "pripad" | "aktualizace" | "opatreni" | "reakce";

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
  /**
   * Druh záznamu. „pripad“ = reálná událost (útok, průnik, operace);
   * „aktualizace“ = nové zjištění k existujícímu případu (navazujeNa);
   * „opatreni“ = oficiální krok státu nebo aliance; „reakce“ = prohlášení,
   * varování, analýza. Do počtu případů vstupují jen případy.
   */
  druh?: DruhZaznamu;
  /**
   * Kdo opatření provedl — orgán nebo instituce (Policie ČR, Armáda ČR,
   * ČEZ Distribuce), nikdy jméno osoby. Jen u druhu „opatreni“; vyplňuje
   * ověřovatel ze zdroje, nikdy odhadem. Web ho uvádí, protože zlepšení
   * má mít jméno stejně jako zhoršení.
   */
  vykonal?: string;
  /** Slug případu, ke kterému aktualizace patří. */
  navazujeNa?: string;
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
  /** Jen vyplněné. Viz PraktickyDopad. */
  praktickyDopad?: PraktickyDopad | null;
  /** U událostí mimo ČR. Viz DopadNaCr. */
  dopadNaCr?: DopadNaCr | null;
  /** Nový od poslední aktualizace webu. */
  novy: boolean;
  /** Do kterého týdne se počítá. Jedna událost = jeden signál. */
  zapocitanoTyden: string;
  /** Zpracováno s pomocí AI. */
  aiZpracovano: boolean;
  /** Prošlo lidskou kontrolou. Bez toho se na produkci nezobrazuje. */
  lidskyOvereno: boolean;
  /**
   * Jak záznam prošel kontrolou, než se zveřejnil.
   *
   * `lidske` — přečetl a schválil člověk.
   * `automaticke` — zveřejnilo se samo, protože stojí na dvou nezávislých
   *   zdrojích a aspoň jeden z nich je úřední. Nikdo to nečetl.
   *
   * Musí to být u záznamu VIDĚT. Web dlouho sliboval, že všechno na něm
   * prošlo člověkem; jakmile to přestane platit, je jediná poctivá cesta
   * napsat u každého záznamu, jak to u něj je.
   */
  overeni?: "lidske" | "automaticke";
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
/**
 * Jak spolehlivě byla položka v posledním běhu pokrytá zdroji.
 *
 * `autoritativni` je jediná hodnota, ze které smí plynout „neplatí“. Potřebuje
 * úplný seznam pro dané území a typ opatření — tisková stránka úřadu, na které
 * hledané slovo není, takový seznam není.
 */
export type Pokryti = "nedostupne" | "orientacni" | "autoritativni";

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
  /**
   * Kdy byl stav naposledy VĚCNĚ ověřen — tedy doložen, ne jen prohlédnut.
   * null = nikdy. Absence klíčového slova v tiskové zprávě ověření není.
   */
  overeno: string | null;
  /** Kdy se sběr naposledy díval na zdroje. Není totéž co věcné ověření. */
  zkontrolovano?: string | null;
  /** Jak spolehlivě byla položka v posledním běhu pokrytá. */
  pokryti?: Pokryti;
  /** Proč zrovna takové pokrytí. Do nápovědy i do provozního hlášení. */
  pokrytiDuvod?: string;
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
  zkontrolovano?: string | null;
  pokryti?: Pokryti;
  pokrytiDuvod?: string;
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
  zkontrolovano?: string | null;
  pokryti?: Pokryti;
  pokrytiDuvod?: string;
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

/* ---------------- opravy ---------------- */

/**
 * Veřejný záznam opravy. Oprava se nikdy nedělá potichu: co bylo špatně,
 * proč, a od kdy platí nová verze. Vazba na záznam je přes slug.
 */
export interface Oprava {
  id: string;
  /** Datum zveřejnění opravy (kalendářní den). */
  datum: string;
  /** Slug záznamu, „nepotvrzeno/<id>“, nebo „metodika“ / „historicke-zaznamy“. */
  tykaSe: string;
  druh: "oprava-dat" | "doplneni-zdroju" | "metodika" | "oprava-textu";
  co: string;
  proc: string;
}

/* ---------- automaticky zachycení kandidáti ---------- */

/**
 * Zpráva zachycená hodinovým sběrem. Ukazuje se hned, výslovně jako
 * neověřená; do počtů, hodnocení ani RSS nevstupuje. Člověk ji buď
 * převezme do záznamů, nebo ji sběr po třech týdnech sám odloží.
 */
export interface Kandidat {
  id: string;
  zachyceno: string;
  publikovano: string | null;
  zdroj: { nazev: string; url: string; typ: TypZdroje; primarni: boolean };
  titulek: string;
  titulekPuvodni: string;
  shrnuti: string;
  kodZeme: string | null;
  zeme: string | null;
  kategorie: string[];
  druhOdhad: "pripad" | "opatreni" | "reakce" | "neurceno";
  /** „pravidla“ = jen klíčová slova; „model“ = přečteno a přeloženo jazykovým modelem. */
  /** „clovek“ = vytáhl to člověk z odmítnutých, proti sítu. */
  klasifikace: "pravidla" | "model" | "clovek";
  /**
   * Kandidát z profilu na sociální síti. Signál, ne doklad: do počtů
   * nevstupuje a závažnost nezvyšuje. null = přišel ze zpravodajství.
   */
  zeSite?: { kdo: string; role: string; sit: string } | null;
  shody: string[];
  /**
   * Zpráva, kterou má člověk vidět první — vyhlášená mobilizace v Rusku nebo
   * spuštěné krizové vysílání. Je to jen pořadí ve frontě: kandidát zůstává
   * neověřený, do počtů nevstupuje a mimořádnou výstrahu nezapíná.
   */
  naliehave?: { druh: "mobilizace-rusko" | "krizove-vysilani"; proc: string } | null;
  /**
   * Kde kandidát je.
   *
   * `ceka` — nikdo ho ještě neposoudil.
   * `vyrizen` — posouzení proběhlo a dál se o něm nerozhoduje.
   *
   * Proč to přibylo: fronta měla 300 položek, z nichž 57 už audit posoudil
   * a přesto v ní pořád stály. Zachycený článek NENÍ událost — je to jeden
   * doklad. Jakmile se ví, ke které události patří (nebo že k žádné),
   * nemá se tvářit, že na něco čeká.
   */
  stav: "ceka" | "vyrizen";
  /** Proč je vyřízený a kam se to propsalo. U čekajících chybí. */
  vyrizeni?: {
    kdy: string;
    duvod: "neudalost" | "pokracovani" | "navrh" | "jeden-zdroj" | "zdroj-navrhu";
    /** Slug záznamu nebo id návrhu, ke kterému kandidát patří. */
    patriK?: string | null;
    poznamka?: string | null;
  } | null;
}

/* ---------- svět: cíle mocností ---------- */

export interface SvetZdroj { nazev: string; url: string; typ: TypZdroje; publikovano: string }
export interface SvetTvrzeni { text: string; zdroje: number[]; odhad?: boolean }
export interface SvetAktor {
  klic: string;
  nazev: string;
  /** Kód země pro vlajku; null = seskupení bez vlajky (NATO). */
  kod: string | null;
  role: string;
  deklarovane: SvetTvrzeni[];
  postup: SvetTvrzeni[];
  /** Hodnocení projektu: stupeň 0–4 na stupnici `stupne`. */
  priblizeni: { stupen: number; odhad: string };
  coByZmenilo: string[];
  zdroje: SvetZdroj[];
}
export interface Svet {
  aktualizovano: string;
  verze: number;
  uvod: string;
  stupne: string[];
  aktori: SvetAktor[];
  stret: { otazky: string[]; postoje: Record<string, string[]> };
  sledovat: { text: string; smer: "nahoru" | "dolu" | "obojí" }[];
}

/* ---------- manipulační kampaně ---------- */

/**
 * Zdroj u kampaně.
 *
 * Oproti zdroji u incidentu smí mít datum jen na měsíc (`2026-08`), když
 * není doložený den. Domýšlet si první srpna jen proto, aby datum vypadalo
 * přesně, by bylo horší než přiznat, že přesný den nemáme.
 */
export interface KampanZdroj {
  nazev: string;
  url: string;
  typ: TypZdroje;
  /** `2026-08-17`, `2026-08` nebo `2026`. Přesnost se nikdy nedoplňuje odhadem. */
  publikovano: string;
  primarni: boolean;
  jazyk: string;
}

/**
 * Kdo kampaň vede.
 *
 * Úmyslně samostatná struktura s vlastní jistotou. Že je něco prokazatelně
 * manipulace, neříká vůbec nic o tom, kdo za ní stojí — a naopak. Slévat
 * obojí do jednoho hodnocení je nejčastější chyba, kterou v téhle oblasti
 * dělají i velká média.
 */
export interface KampanPuvodce {
  /** Komu se kampaň připisuje. Prázdné = nikomu; „neznámý“ je platná odpověď. */
  koho: string;
  jistota: Jistota;
  /** Proč právě takhle. Bez toho je štítek jen tvrzení. */
  duvod: string;
}

/**
 * Kampaň = připravená operace mířená na veřejnost, ne jeden nepovedený článek.
 *
 * Není to incident: nemá jedno místo ani jeden okamžik a obvykle míří na víc
 * zemí najednou. Proto se vede zvlášť a do počtu případů nevstupuje.
 */
/** Kdo byl zasažen nebo čí jméno bylo zneužito. */
export interface ZasazenySubjekt {
  nazev: string;
  druh: "medium" | "urad" | "osoba" | "platforma" | "verejnost";
  /** Jak konkrétně. Bez toho je jméno jen nálepka. */
  jak: string;
}

export interface Kampan {
  id: string;
  slug: string;
  /**
   * Název je CÍL operace, ne její krycí jméno.
   *
   * „Těšínsko“ čtenáři neřekne nic; „Rozeštvat Čechy a Poláky územním
   * sporem“ řekne všechno podstatné dřív, než klikne.
   */
  nazev: string;
  /** Krátké označení, pod kterým se o věci mluví jinde (Těšínsko, PAP). */
  oznaceni: string;
  /**
   * Závažnost na téže stupnici jako incidenty.
   *
   * Kampaň se počítá mezi incidenty: útok na to, čemu lidé věří, je útok.
   * Bez závažnosti by se nedala zařadit do budíků ani do počtů.
   */
  zavaznost: Uroven;
  /** Metody z pevného číselníku — podle nich se porovnává napříč zeměmi. */
  metody: string[];
  /** Koho to zasáhlo nebo čí jméno bylo zneužito. */
  zasazeni: ZasazenySubjekt[];
  /** Celá věta: co se dělo. */
  titulek: string;
  /** Země, na které kampaň mířila. Jedna kampaň jich může mít víc. */
  kodyZemi: string[];
  /** Kdy kampaň vyšla najevo. */
  odhaleno: string;
  /** Kdo ji popsal jako první. */
  kdoOdhalil: string;
  /** Běží dál, nebo utichla. */
  probiha: boolean;
  /** 1 — co se tvrdilo. */
  tvrzeni: string[];
  /** 2 — jak se to šířilo. */
  kanaly: string[];
  /** 3 — jak to je doloženo. */
  skutecnost: string[];
  /** 4 — kdo na to reagoval. */
  reakce: string[];
  /** 5 — čemu to mělo posloužit. Výslovně odhad projektu, ne doložený fakt. */
  ucel: string;
  /** 6 — co by otázku po původci uzavřelo. */
  coByPotvrdilo: string[];
  /** Je doložené, že šlo o zásah? Nezávisle na tom, kdo za ním stojí. */
  jistotaManipulace: Jistota;
  duvodManipulace: string;
  puvodce: KampanPuvodce;
  zdroje: KampanZdroj[];
  /** Bez lidské kontroly se kampaň nezobrazuje a do žádného počtu nevstupuje. */
  lidskyOvereno: boolean;
  aktualizovano: string;
}

/* ---------- právě ověřované zprávy ---------- */

/**
 * Zpráva, která se šíří, může být důležitá — a zatím není ověřená.
 *
 * Web o ní **netvrdí, že platí**. Tvrdí jen to, co si sám ověřil: že ji
 * vydaly jmenované redakce, že ji projekt nemá potvrzenou a co k tomu
 * říkají (nebo neříkají) úřady. Každá z těch tří vět je pravdivá
 * a doložitelná — a právě proto se smí zveřejnit, aniž by šlo o šíření
 * poplašné zprávy podle § 357 trestního zákoníku.
 *
 * Do žádného počtu, budíku ani průměru nevstupuje. Do kanálů se
 * neodesílá. A nikdy nezmizí potichu: musí skončit v jednom ze tří
 * stavů, jinak by se z přehledu stal generátor fám.
 */
export interface Overovana {
  id: string;
  slug: string;
  /** Co se hlásí. Vždy s uvedením, že jde o tvrzení někoho jiného. */
  coSeHlasi: string;
  kodZeme: string;
  zeme: string;
  /** Kdy jsme to zařadili mezi ověřované. */
  zacalo: string;
  /** Kdy se na to člověk naposledy díval. */
  overenoNaposledy: string;
  /** Nejzazší termín uzavření. Po něm se položka z přehledu stáhne. */
  uzavritDo: string;
  /** Kdo to hlásí. Jmenovitě a s odkazem — anonymní „zdroje“ sem nestačí. */
  kdoHlasi: { nazev: string; url: string; typ: TypZdroje; primarni: boolean }[];
  /** Co jsme ověřili sami. Typicky „zatím nic“ — a napíše se to. */
  coJsmeOverili: string[];
  /**
   * Co k tomu říkají úřady.
   *
   * Stojí na kartě jako první, ne jako dovětek. Ověřená nepřítomnost
   * úředního kroku je to podstatné sdělení; tvrzení médií je až druhé.
   */
  coRikajiUrady: string[];
  /** Co by to znamenalo, kdyby to platilo. Výslovně podmíněné. */
  kdybyPlatilo: string;
  /** Co má člověk dělat teď. Skoro vždy: nic měnit nemusí. */
  coDelatTed: string;
  stav: "overujeme" | "potvrzeno" | "vyvraceno" | "nikdo-nepotvrdil";
  /** Slug vzniklého záznamu, nebo id zápisu mezi neprošlými. */
  vyustilo?: string;
  /** Jak to dopadlo. Povinné, jakmile stav není „overujeme“. */
  jakDopadlo?: string;
  /** Bez lidské kontroly se nezobrazí. Automat sem nic nedává. */
  lidskyOvereno: boolean;
}

/*
  Zpráva, kterou automatické síto nepustilo.

  Není to záznam ani kandidát: je to pracovní materiál pro člověka ve správě.
  Do počtů, hodnocení ani na veřejné stránky nevstupuje nikdy — jediná cesta
  dál vede přes ruční převzetí mezi kandidáty.
*/
export interface Odmitnuty {
  id: string;
  zachyceno: string;
  publikovano: string | null;
  zdroj: { nazev: string; url: string; typ: TypZdroje; primarni: boolean };
  titulek: string;
  shrnuti: string;
  duvod: "vylouceno-tematem" | "bez-skutku" | "bez-mista";
  kategorie: string[];
  /** null = neposouzeno. Neposouzeno není totéž co „nic vážného“. */
  posouzeni: { podezreni: "vysoke" | "stredni" | "zadne"; duvod: string; kdy: string } | null;
}

/* ---------------- mimořádná výstraha ---------------- */

/**
 * Mimořádná výstraha — pruh přes celou šířku na každé stránce.
 *
 * Používá se výjimečně a jen na to, kvůli čemu by člověk měl vědět hned:
 * vyhlášená mobilizace v Rusku, spuštěné krizové vysílání Českého rozhlasu.
 * Ne na „zvýšené napětí“ a ne na zprávu, kterou zatím nikdo nepotvrdil.
 *
 * Zapnout ji smí jen člověk, a to zápisem do data/vystraha.json
 * (`node nastroje/vystraha.mjs`). Automatický sběr ji zapnout nemůže — sběr
 * umí jen označit kandidáta jako naléhavého, aby ho člověk viděl první.
 * Kdyby mohl sběr, stačila by jedna podvržená zpráva k tomu, aby web sám
 * vyhlásil mobilizaci; a přesně tenhle druh manipulace tenhle web dokumentuje.
 */
export interface Vystraha {
  /** Klíč běhu. Podle něj se pozná, že už se zpráva do kanálu poslala. */
  klic: string;
  druh: "mobilizace-rusko" | "krizove-vysilani" | "jine";
  /** Co se stalo. Oznamovací věta, ne heslo a ne otázka. */
  nadpis: string;
  /** Dvě až čtyři věty. Co se stalo a co se ví — nic, co se neví. */
  text: string;
  /** Kdy se to stalo. Ne kdy jsme to zjistili. */
  kdy: string;
  /** Kdy to ověřil člověk. Bez tohohle se výstraha nezobrazí. */
  overeno: string;
  /** Kdo ověřil. Za výstrahu je vždycky někdo podepsaný. */
  overil: string;
  uroven: Uroven;
  /** Aspoň dva nezávislé zdroje, každý s adresou. Jeden zdroj nestačí. */
  zdroje: Zdroj[];
  /** Co z toho plyne pro lidi v Česku. Jen doložitelné věci. */
  coToZnamena: string[];
  /** Co z toho NEplyne. Bez téhle části je z výstrahy poplach. */
  coToNeznamena: string[];
  /** Kdy výstrahu sundat, pokud se nic nezmění. null = do rozhodnutí člověka. */
  platiDo: string | null;
}

export interface VystrahaSoubor {
  /** null = žádná výstraha neplatí a na webu není žádný pruh. */
  aktivni: Vystraha | null;
  /** Co kdy platilo. Výstraha nikdy nezmizí beze stopy. */
  archiv: (Vystraha & { sundano: string; procSundano: string })[];
}

/* ---------------- tipy k přípravě ---------------- */

/**
 * Praktický tip k přípravě. Krátce a k věci: co se změnilo a co s tím může
 * člověk udělat dnes.
 *
 * Není to rada, co dělat v krizi — od toho jsou úřady. Je to popis něčeho,
 * co existuje a co se vyplatí vědět dřív, než to bude potřeba: že rozhlas
 * zkoušel varovný systém, že se v paneláku hodí vědět, kde je uzávěr vody.
 *
 * Každý tip stojí na doloženém zdroji. Bez zdroje se nezobrazí — tip bez
 * doložení je fáma s ikonou.
 */
/*
  Katalog oficiálních nástrojů (READY).

  Co má člověk mít nainstalované nebo nastavené DŘÍV, než se něco stane:
  Záchranka, tísňové linky, varování na mobil, výstrahy ČHMÚ, DROZD, sirény,
  krizové vysílání, kanál obce. Každá položka říká, kdo ji provozuje, k čemu
  je a co si nastavit — a kdy jsme informaci naposledy ověřili.

  Co tu NENÍ: nic, co neexistuje, a nic, co CzechPatrol neumí zjistit.
  Web nevidí, co má kdo v telefonu; odpověď „mám / nemám / nevím" dává
  člověk sám a zůstává jen v jeho prohlížeči.
*/
export type KategorieNastroje = "tisen" | "pocasi" | "cestovani" | "mistni-varovani" | "zdravi" | "krizove-informace";
export type DostupnostNastroje = "aplikace" | "sluzba" | "system";
/** k-overeni = existence a provozovatel se ověřují; overeno = ověřeno k datu `overeno`; obecne = rada bez vnějšího tvrzení. */
export type StavNastroje = "k-overeni" | "overeno" | "obecne" | "neaktivni";

export interface OficialniNastroj {
  id: string;
  nazev: string;
  /** Ikona z vlastní sady (docs/ZNACKA.md) — doprovod názvu, nikdy sama. */
  ikona: string;
  /** Účel v nejvýš deseti slovech. Do karty na úvodu a do řádku seznamu. */
  kratce: string;
  provozovatel: string;
  kategorie: KategorieNastroje;
  /** Co to je. Jedna dvě věty, bez hodnocení. */
  popis: string;
  kCemu: string;
  kdyPomuze: string;
  procMit: string;
  iosUrl: string | null;
  androidUrl: string | null;
  webUrl: string | null;
  /** Odkaz na provozovatele nebo úřad, ze kterého informace pochází. */
  oficialniZdroj: string | null;
  /** Kdy jsme informaci naposledy ověřili proti zdroji. null = zatím ne. */
  overeno: string | null;
  /** Kdy naposledy odpověděla adresa provozovatele (běh „Ověření zdrojů"). Není to ověření obsahu. */
  adresaOverena: string | null;
  dostupnost: DostupnostNastroje;
  coNastavit: string[];
  proKoho: string[];
  stav: StavNastroje;
  /** Počítá se do skóre připravenosti. Obecné rady ne. */
  doporuceno: boolean;
  /** Co u položky ještě není jisté. Zobrazuje se, aby to nevypadalo jako hotová věc. */
  poznamka?: string;
}

/*
  Praktický dopad události pro občana.

  Nechceme jen „došlo k výpadku". Chceme: co je potvrzené, kde, od kdy,
  co může být ovlivněné, co funguje a co ne, co doporučuje úřad, co udělat
  a co nedělat, kde je další informace a kdy jsme to naposledy ověřili.
  Pole je volitelné a ukazuje se JEN vyplněné — prázdná šablona by tvrdila,
  že jsme se dívali, i když ne. Každý bod musí mít oporu ve zdrojích záznamu.
*/
export interface PraktickyDopad {
  coJePotvrzeno: string[];
  kde: string | null;
  odKdy: string | null;
  coMuzeBytOvlivneno: string[];
  coFunguje: string[];
  coNefunguje: string[];
  /** Doporučení úřadu, obce nebo provozovatele — s tím, kdo to říká. */
  coDoporucujeUrad: { kdo: string; text: string; url: string }[];
  coUdelat: string[];
  coNedelat: string[];
  dalsiInfo: { nazev: string; url: string }[];
  /** Kdy byl tenhle blok naposledy ověřen proti zdrojům. */
  overeno: string;
}

/*
  Dopad zahraniční události na Česko.

  Zahraniční zpráva se nezveřejňuje proto, že je dramatická, ale proto, že
  odpovídá: proč je to relevantní pro ČR, má to teď praktický dopad a co
  sledujeme dál. Tři stupně, žádný odhad: „žádný" znamená, že v den
  ověření nic doloženého neplatilo — ne že nikdy nebude.
*/
export interface DopadNaCr {
  stav: "zadny" | "mozny" | "potvrzeny";
  procRelevantni: string;
  /** Co konkrétně teď platí pro lidi v Česku. U „žádný" věta, že nic. */
  dopad: string;
  sledujeme: string;
  overeno: string;
}

export interface Tip {
  klic: string;
  /** Co se stalo nebo co existuje. Jedna věta. */
  nadpis: string;
  /** Dvě až čtyři věty. Co to je a co s tím člověk může udělat. */
  text: string;
  /** Kdy to začalo platit. Absolutní datum. */
  kdy: string;
  zdroje: Zdroj[];
  /** Kdy tip zmizí z přehledu. null = platí, dokud ho někdo nesundá. */
  platiDo: string | null;
}
