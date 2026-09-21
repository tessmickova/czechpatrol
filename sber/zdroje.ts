import type { RegistrZdroj } from "./typy";

/**
 * Registr veřejných zdrojů.
 *
 * Přidání zdroje = jeden záznam v tomhle poli. Nic jiného se nemění.
 * Nový záznam vždy s `overenaAdresa: false`; `npm run sber:zdroje` vypíše,
 * které adresy skutečně odpovídají, a teprve pak se příznak přepne.
 */

/**
 * Fráze o vyhlášení. Sloveso s předmětem, ne téma.
 *
 * Kdyby tu stálo jen „mobilizace“, trefila by se každá stránka, která to slovo
 * někde v archivu nebo v menu má — a zápor by se nepotvrdil nikdy.
 */
const PRAVNI_VYHLASENI = [
  "vyhlasil stav ohrozeni statu",
  "vyhlasila stav ohrozeni statu",
  "vyhlaseni stavu ohrozeni statu",
  "vyhlasil valecny stav",
  "vyhlaseni valecneho stavu",
  "narizuje mobilizaci",
  "naridil mobilizaci",
  "vyhlaseni mobilizace",
  "vyhlasila nouzovy stav",
  "vyhlasil nouzovy stav",
  "vyhlaseni nouzoveho stavu",
  "zakaz vycestovani",
  "zakazuje vycestovani",
  "znovuzavedeni ochrany vnitrnich hranic",
  "obnovuje hranicni kontroly",
  "uzavira hranicni prechody",
];

/** Tematická slova — jen ke kontrole, zápor neblokují. */
const PRAVNI_TEMATA = [
  "stav ohrozeni statu",
  "mobilizace",
  "nouzovy stav",
  "hranicni kontroly",
  "omezeni vycestovani",
];

const PROVOZNI_VYHLASENI = [
  "vyhlasil stav nouze",
  "vyhlasila stav nouze",
  "vyhlaseni stavu nouze",
  "vyhlasen stav nouze",
  "omezeni odberu",
  "regulacni stupen",
  "vyhlasil stav kyberneticke",
  "vyhlaseni stavu kyberneticke",
  "stav kybernetickeho nebezpeci",
];

const PROVOZNI_TEMATA = ["stav nouze", "rozsahly vypadek", "krizove opatreni"];

/*
  Kybernetické nebezpečí. Vyhlašuje ho NÚKIB, ale opatření se zveřejňuje
  i ve Sbírce — proto stejné fráze hlídá víc míst.
*/
const KYBER_VYHLASENI = [
  "vyhlasil stav kyberneticke nouze",
  "vyhlaseni stavu kyberneticke nouze",
  "vyhlasil stav kybernetickeho nebezpeci",
  "stav kybernetickeho nebezpeci",
];

/* Omezení plateb a výběrů hotovosti. */
const PENIZE_VYHLASENI = [
  "omezeni platebniho styku",
  "omezeni vyberu hotovosti",
  "pozastaveni vyberu hotovosti",
  "vypadek platebniho systemu",
];

/* Uvolnění nouzových zásob a regulace prodeje paliva. */
const PALIVO_VYHLASENI = [
  "uvolneni nouzovych zasob",
  "uvolnila nouzove zasoby",
  "regulace prodeje pohonnych",
  "prideleni pohonnych hmot",
];

/* Aktivace konzultací a závazku podle Washingtonské smlouvy — česky. */
const NATO_CLANKY_CS = [
  "aktivace clanku 4",
  "aktivovala clanek 4",
  "konzultace podle clanku 4",
  "aktivace clanku 5",
  "aktivovala clanek 5",
];

export const ZDROJE: RegistrZdroj[] = [
  /* ---------- právní stav ČR ---------- */
  {
    klic: "e-sbirka",
    nazev: "e-Sbírka — úřední sbírka právních předpisů",
    druh: "pravni",
    url: "https://www.e-sbirka.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: [...PRAVNI_VYHLASENI, ...KYBER_VYHLASENI, ...PENIZE_VYHLASENI],
    sledovana: PRAVNI_TEMATA,
    /* Opatření k platbám i kybernetickému nebezpečí se vyhlašují právním předpisem. */
    tyka: ["stav-ohrozeni", "valecny-stav", "mobilizace", "nouzovy-stav", "kyber", "banky"],
    /*
      Měřeno 15. 9. 2026: hlavní adresa vrací 8 znaků textu, zbytek dokresluje
      JavaScript, který sběr nespouští. Tři jiné adresy Sbírky vrátily totéž.
      Do pokrytí se e-Sbírka proto nepočítá, dokud se nenajde adresa, ze které
      jde číst — položky, které měla krýt, stojí na jiných zdrojích.
    */
    ocekavaneBlokovani: "javascript",
    overenaAdresa: false,
  },
  {
    klic: "vlada",
    nazev: "Vláda ČR — tiskové zprávy",
    druh: "pravni",
    url: "https://vlada.gov.cz/cz/media-centrum/tiskove-zpravy/",
    odkaz: "https://vlada.gov.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: [...PRAVNI_VYHLASENI, ...PALIVO_VYHLASENI, ...PENIZE_VYHLASENI, ...KYBER_VYHLASENI, "evakuace obcanu cr", "evakuacni let"],
    sledovana: [...PRAVNI_TEMATA, "nouzove zasoby", "evakuace", "kyberneticke nebezpeci"],
    /*
      Vláda nouzový stav vyhlašuje, mobilizaci navrhuje prezidentovi a o
      uvolnění státních hmotných rezerv rozhoduje. Po vyřazení e-Sbírky
      (nejde z ní číst) je u některých těchhle položek jediným úředním
      zdrojem, který skutečně odpovídá.
    */
    tyka: ["stav-ohrozeni", "nouzovy-stav", "mobilizace", "hranice", "bezny-zivot", "palivo", "banky", "evakuace", "kyber"],
    overenaAdresa: false,
  },
  {
    klic: "psp",
    nazev: "Poslanecká sněmovna Parlamentu ČR",
    druh: "pravni",
    url: "https://www.psp.cz/sqw/hp.sqw",
    odkaz: "https://www.psp.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: [...PRAVNI_VYHLASENI, "mimoradna schuze k bezpecnostni"],
    sledovana: [...PRAVNI_TEMATA, "mimoradna schuze"],
    /* Prodloužení nouzového stavu nad 30 dnů schvaluje Sněmovna. */
    tyka: ["stav-ohrozeni", "valecny-stav", "nouzovy-stav", "schuze-parlamentu"],
    overenaAdresa: false,
  },
  {
    klic: "senat",
    nazev: "Senát Parlamentu ČR",
    druh: "pravni",
    /*
      Stav ohrožení státu i válečný stav schvaluje Parlament — obě komory.
      Sněmovna tu byla od začátku, Senát chyběl: kdyby Sněmovna měla výpadek
      webu, nezůstal by k těmhle stavům žádný parlamentní zdroj.
    */
    url: "https://www.senat.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: [...PRAVNI_VYHLASENI, "mimoradna schuze k bezpecnostni"],
    sledovana: [...PRAVNI_TEMATA, "mimoradna schuze"],
    tyka: ["stav-ohrozeni", "valecny-stav", "schuze-parlamentu"],
    overenaAdresa: false,
  },
  {
    klic: "hrad",
    nazev: "Prezident republiky — tiskové zprávy",
    druh: "pravni",
    url: "https://www.hrad.cz/cs/pro-media/tiskove-zpravy",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["narizuje mobilizaci", "naridil mobilizaci", "vyhlasil valecny stav"],
    sledovana: ["mobilizace"],
    tyka: ["mobilizace"],
    ocekavaneBlokovani: "blokuje",
    overenaAdresa: false,
  },
  {
    klic: "mvcr",
    nazev: "Ministerstvo vnitra ČR",
    druh: "pravni",
    url: "https://www.mvcr.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: PRAVNI_VYHLASENI,
    sledovana: [...PRAVNI_TEMATA, "hranicni kontroly"],
    /* Krizová opatření za nouzového stavu vyhlašuje a zveřejňuje i vnitro. */
    tyka: ["hranice", "vycestovani", "nouzovy-stav"],
    overenaAdresa: false,
  },
  {
    klic: "mzv",
    nazev: "Ministerstvo zahraničních věcí — cestování",
    druh: "instituce",
    url: "https://mzv.gov.cz/jnp/cz/cestujeme/index.html",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["opustte zemi", "okamzite opustte", "evakuace obcanu cr"],
    sledovana: ["nedoporucuje cestovat", "evakuace"],
    tyka: ["vycestovani", "evakuace"],
    overenaAdresa: false,
  },

  /* ---------- NATO a spojenci ---------- */
  {
    klic: "nato",
    nazev: "NATO — Newsroom",
    druh: "instituce",
    url: "https://www.nato.int/cps/en/natohq/news.htm",
    format: "html",
    jazyk: "en",
    primarni: true,
    klicova: [
      "invoked article 4", "invoke article 4", "invoked article 5", "invoke article 5",
      "invoking article 4", "invoking article 5",
      "requested consultations under article 4", "consultations under article 4 of",
      "has been invoked",
    ],
    sledovana: ["article 4 consultations", "north atlantic council will meet"],
    tyka: ["clanek-4", "clanek-5", "readiness"],
    overenaAdresa: false,
  },
  {
    klic: "army",
    nazev: "Ministerstvo obrany ČR",
    druh: "instituce",
    url: "https://mo.gov.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["narizuje mobilizaci", "naridil mobilizaci", "vyhlasena bojova pohotovost", ...NATO_CLANKY_CS],
    sledovana: ["mobilizace", "zvysena pohotovost", "clanek 4", "clanek 5"],
    tyka: ["mobilizace", "readiness", "clanek-4", "clanek-5"],
    overenaAdresa: false,
  },

  /* ---------- provoz: energetika ---------- */
  {
    klic: "ceps",
    nazev: "ČEPS — přenosová soustava",
    druh: "provoz",
    url: "https://www.ceps.cz/cs/aktuality",
    odkaz: "https://www.ceps.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: PROVOZNI_VYHLASENI,
    sledovana: PROVOZNI_TEMATA,
    tyka: ["elektrina"],
    overenaAdresa: false,
  },
  {
    klic: "eru",
    nazev: "Energetický regulační úřad",
    druh: "provoz",
    url: "https://www.eru.gov.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: PROVOZNI_VYHLASENI,
    sledovana: PROVOZNI_TEMATA,
    tyka: ["elektrina", "plyn"],
    overenaAdresa: false,
  },
  {
    klic: "ote",
    nazev: "OTE — operátor trhu",
    druh: "provoz",
    url: "https://www.ote-cr.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: PROVOZNI_VYHLASENI,
    sledovana: PROVOZNI_TEMATA,
    tyka: ["plyn", "elektrina"],
    overenaAdresa: false,
  },

  /* ---------- provoz: palivo, peníze, sítě ---------- */
  {
    klic: "sshr",
    nazev: "Správa státních hmotných rezerv",
    druh: "provoz",
    url: "https://www.sshr.gov.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["uvolneni nouzovych zasob", "regulace prodeje pohonnych", "vyhlasil stav nouze"],
    sledovana: ["nouzove zasoby"],
    tyka: ["palivo"],
    ocekavaneBlokovani: "blokuje",
    overenaAdresa: false,
  },
  {
    klic: "mpo",
    nazev: "Ministerstvo průmyslu a obchodu",
    druh: "provoz",
    url: "https://mpo.gov.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: PROVOZNI_VYHLASENI,
    sledovana: [...PROVOZNI_TEMATA, "pohonne hmoty"],
    tyka: ["palivo", "elektrina", "plyn"],
    overenaAdresa: false,
  },
  {
    klic: "cnb",
    nazev: "Česká národní banka — tiskové zprávy",
    druh: "provoz",
    url: "https://www.cnb.cz/cs/cnb-news/tiskove-zpravy/",
    odkaz: "https://www.cnb.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["omezeni platebniho styku", "vypadek platebniho systemu", "omezeni vyberu hotovosti"],
    sledovana: ["platebni styk"],
    tyka: ["banky"],
    overenaAdresa: false,
  },
  {
    klic: "ctu",
    nazev: "Český telekomunikační úřad",
    druh: "provoz",
    url: "https://ctu.gov.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["rozsahly vypadek site", "celostatni vypadek", "vyhlasil stav nouze", ...KYBER_VYHLASENI],
    sledovana: ["vypadek site", "kyberneticke nebezpeci"],
    tyka: ["komunikace", "kyber"],
    overenaAdresa: false,
  },
  {
    klic: "nukib",
    nazev: "NÚKIB — Národní úřad pro kybernetickou a informační bezpečnost",
    druh: "provoz",
    url: "https://nukib.gov.cz/cs/infoservis/aktuality/",
    odkaz: "https://nukib.gov.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["vyhlasil stav kyberneticke", "stav kybernetickeho nebezpeci", "vyhlaseni stavu kyberneticke"],
    sledovana: ["zavazny kyberneticky incident"],
    tyka: ["komunikace", "kyber"],
    overenaAdresa: false,
  },
  {
    klic: "hzs",
    nazev: "Hasičský záchranný sbor ČR",
    druh: "provoz",
    url: "https://www.hzscr.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["vyhlasen stav nebezpeci", "vyhlasil stav nebezpeci", "vyhlasen nouzovy stav"],
    sledovana: ["krizove opatreni"],
    tyka: ["bezny-zivot"],
    overenaAdresa: false,
  },
  {
    klic: "dopravni-info",
    nazev: "Dopravní info (NDIC)",
    druh: "provoz",
    // Web se stěhoval a jednotlivé adresy odpadají. Zkoušíme je po řadě.
    url: "https://dopravniinfo.gov.cz/",
    zalozniUrl: [
      "https://www.dopravniinfo.gov.cz/",
      "https://portal.dopravniinfo.cz/",
      "https://registr.dopravniinfo.cz/cs/sources/cz-ndic_d2-common/",
    ],
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["uzavreni hranicniho prechodu", "uzavreny hranicni prechod"],
    sledovana: ["hranicni kontroly", "omezeni nakladni dopravy"],
    tyka: ["hranice"],
    /* Měřeno 15. 9. 2026: neodpovídá hlavní adresa ani žádná ze tří záložních. */
    ocekavaneBlokovani: "neodpovida",
    overenaAdresa: false,
  },
  {
    klic: "policie",
    nazev: "Policie ČR",
    druh: "instituce",
    url: "https://www.policie.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["obnoveni hranicnich kontrol", "zavedeni hranicnich kontrol"],
    sledovana: ["sabotaz", "kriticka infrastruktura"],
    tyka: ["hranice"],
    overenaAdresa: false,
  },

  /* ---------- Co se změnilo: doprava, hranice, sousedé ----------
     Sloupec „Co se změnilo" na úvodní straně mluví o životě v Česku a na
     hranicích. Zdroje níž kryjí to, co se ho dotkne, i když to není
     vyhlášení právního stavu: zastavení dopravy, uzavření letiště nebo
     přechodu, radiační či meteorologická mimořádnost, plošné zdravotní
     opatření — a totéž z druhé strany hranice, protože kontroly zavádí
     soused, ne my. Adresy ověřil běh sběru na Actions 21. 9. 2026
     (HTTP 200 s obsahem); jediné BMI Německa vrací 400 — viz u něj. */
  {
    klic: "md",
    nazev: "Ministerstvo dopravy ČR",
    druh: "instituce",
    url: "https://md.gov.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["uzavreni vzdusneho prostoru", "zastaveni provozu na", "omezeni nakladni dopravy"],
    sledovana: ["mimoradna udalost v doprave"],
    tyka: ["hranice", "bezny-zivot"],
    overenaAdresa: true,
  },
  {
    klic: "sprava-zeleznic",
    nazev: "Správa železnic — mimořádnosti v provozu",
    druh: "provoz",
    url: "https://www.spravazeleznic.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["zastaveni provozu na trati", "prerusen provoz na", "zastaven provoz na"],
    sledovana: ["mimoradna udalost"],
    tyka: ["bezny-zivot"],
    overenaAdresa: true,
  },
  {
    klic: "letiste-praha",
    nazev: "Letiště Praha",
    druh: "provoz",
    url: "https://www.prg.aero/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["uzavreni letiste", "pozastaveni provozu letiste", "uzavreni vzdusneho prostoru"],
    sledovana: ["omezeni provozu letiste"],
    tyka: ["vycestovani", "bezny-zivot"],
    overenaAdresa: true,
  },
  {
    klic: "celni-sprava",
    nazev: "Celní správa ČR",
    druh: "instituce",
    url: "https://www.celnisprava.gov.cz/",
    zalozniUrl: ["https://www.celnisprava.cz/"],
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["uzavreni hranicniho prechodu", "obnoveni hranicnich kontrol"],
    sledovana: ["hranicni kontroly"],
    tyka: ["hranice"],
    overenaAdresa: true,
  },
  {
    klic: "sujb",
    nazev: "SÚJB — Státní úřad pro jadernou bezpečnost",
    druh: "provoz",
    url: "https://sujb.gov.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["radiacni mimoradna udalost", "vyhlaseni radiacni havarie", "radiacni havarie"],
    sledovana: ["radiacni situace"],
    tyka: ["elektrina", "bezny-zivot"],
    overenaAdresa: true,
  },
  {
    klic: "chmi",
    nazev: "ČHMÚ — výstrahy",
    druh: "provoz",
    url: "https://www.chmi.cz/",
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["extremni nebezpeci", "vystraha nejvyssiho stupne"],
    sledovana: ["vysoke nebezpeci"],
    tyka: ["bezny-zivot"],
    overenaAdresa: true,
  },
  {
    klic: "mzd",
    nazev: "Ministerstvo zdravotnictví ČR",
    druh: "instituce",
    url: "https://mzd.gov.cz/",
    zalozniUrl: ["https://www.mzcr.cz/"],
    format: "html",
    jazyk: "cs",
    primarni: true,
    klicova: ["vyhlaseni mimoradneho opatreni", "plosna karantena", "vyhlasilo mimoradne opatreni"],
    sledovana: ["mimoradne opatreni"],
    tyka: ["bezny-zivot"],
    overenaAdresa: true,
  },
  {
    klic: "bundespolizei",
    nazev: "Bundespolizei (Německo) — hraniční kontroly",
    druh: "instituce",
    url: "https://www.bundespolizei.de/",
    format: "html",
    jazyk: "de",
    primarni: true,
    klicova: ["wiedereinfuhrung von grenzkontrollen", "grenzkontrollen an der grenze zu", "grenzkontrollen zur tschechischen"],
    sledovana: ["grenzkontrollen"],
    tyka: ["hranice", "vycestovani"],
    overenaAdresa: true,
  },
  {
    klic: "bmi-de",
    nazev: "Spolkové ministerstvo vnitra (Německo)",
    druh: "instituce",
    url: "https://www.bmi.bund.de/",
    format: "html",
    jazyk: "de",
    primarni: true,
    klicova: ["grenzkontrollen angeordnet", "wiedereinfuhrung von grenzkontrollen", "grenzkontrollen verlangert"],
    sledovana: ["binnengrenzkontrollen"],
    tyka: ["hranice", "vycestovani"],
    /* Měřeno 21. 9. 2026 z Actions: hlavní adresa vrací HTTP 400 automatizovanému dotazu. */
    ocekavaneBlokovani: "blokuje",
    overenaAdresa: false,
  },
  {
    klic: "bmi-at",
    nazev: "Spolkové ministerstvo vnitra (Rakousko)",
    druh: "instituce",
    url: "https://www.bmi.gv.at/",
    format: "html",
    jazyk: "de",
    primarni: true,
    klicova: ["grenzkontrollen verlangert", "grenzkontrollen zu tschechien", "einfuhrung von grenzkontrollen"],
    sledovana: ["grenzkontrollen"],
    tyka: ["hranice", "vycestovani"],
    overenaAdresa: true,
  },
  {
    klic: "straz-graniczna",
    nazev: "Straż Graniczna (Polsko)",
    druh: "instituce",
    url: "https://www.strazgraniczna.pl/",
    format: "html",
    jazyk: "pl",
    primarni: true,
    klicova: ["przywrocenie kontroli granicznej", "kontrola graniczna na granicy z", "tymczasowe przywrocenie kontroli"],
    sledovana: ["kontrola graniczna"],
    tyka: ["hranice", "vycestovani"],
    overenaAdresa: true,
  },
  {
    klic: "minv-sk",
    nazev: "Ministerstvo vnútra SR",
    druh: "instituce",
    url: "https://www.minv.sk/",
    format: "html",
    jazyk: "sk",
    primarni: true,
    klicova: ["obnovenie kontrol na hraniciach", "docasne kontroly na hraniciach", "kontroly na hranici s ceskou"],
    sledovana: ["hranicne kontroly"],
    tyka: ["hranice", "vycestovani"],
    overenaAdresa: true,
  },
];

export function zdroj(klic: string): RegistrZdroj | undefined {
  return ZDROJE.find((z) => z.klic === klic);
}
