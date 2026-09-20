/**
 * Zdroje pro automatický sběr událostí.
 *
 * Jde jen o kandidáty: každý nález se ukáže jako „automaticky zachyceno,
 * čeká na ověření“ a do žádného počtu nevstupuje, dokud ho nepřevezme člověk.
 *
 * Proč katalog, a ne seznam
 * -------------------------
 * Dokud tu byl jen seznam dotazů, přidávaly se podle toho, co zrovna uteklo.
 * Tak vznikla díra, kterou bylo vidět 15. 9. 2026: dotazy mířily na Polsko,
 * Pobaltí, Rumunsko a Moldavsko, takže o dronu spadlém u letiště Bundeswehru
 * sem nepřišla ani jedna zpráva — a Německo má přitom druhý nejvyšší počet
 * případů ze všech sledovaných zemí.
 *
 * Teď se dotazy skládají z matice TÉMATA × ZEMĚ. Díra je pak vidět předem:
 * chybí řádek nebo sloupec, ne „jeden dotaz, který nikoho nenapadl“.
 */

export interface ZdrojUdalosti {
  klic: string;
  nazev: string;
  url: string;
  jazyk: "cs" | "en";
  /** Úřad nebo instituce, která věc sama oznamuje. */
  primarni: boolean;
  /*
    `social` je profil na sociální síti. Nikdy není `primarni`: i pravý profil
    ministra je signál, ne doklad — a u podvrženého profilu není doložené
    ani to, kdo příspěvek napsal.
  */
  typ: "primary" | "wire" | "media" | "social";
}

const gn = (dotaz: string, cs: boolean) =>
  cs
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(dotaz)}&hl=cs&gl=CZ&ceid=CZ:cs`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(dotaz)}&hl=en-US&gl=US&ceid=US:en`;

/*
  Sledované země.

  `blizke` jsou ty, u kterých se ptáme i jednotlivě po tématech — Česko a jeho
  sousedé, východní křídlo Aliance a severské státy, kde je hybridní aktivita
  nejhustší. U ostatních stačí obecné dotazy: zpráva odtud se do nich chytí
  taky, jen o něco později.
*/
const ZEME = [
  { kod: "CZ", cs: "Česko", en: "Czech Republic", blizke: true },
  { kod: "SK", cs: "Slovensko", en: "Slovakia", blizke: true },
  { kod: "PL", cs: "Polsko", en: "Poland", blizke: true },
  { kod: "DE", cs: "Německo", en: "Germany", blizke: true },
  { kod: "AT", cs: "Rakousko", en: "Austria", blizke: true },
  { kod: "LT", cs: "Litva", en: "Lithuania", blizke: true },
  { kod: "LV", cs: "Lotyšsko", en: "Latvia", blizke: true },
  { kod: "EE", cs: "Estonsko", en: "Estonia", blizke: true },
  { kod: "FI", cs: "Finsko", en: "Finland", blizke: true },
  { kod: "NO", cs: "Norsko", en: "Norway", blizke: true },
  { kod: "SE", cs: "Švédsko", en: "Sweden", blizke: true },
  { kod: "DK", cs: "Dánsko", en: "Denmark", blizke: true },
  { kod: "RO", cs: "Rumunsko", en: "Romania", blizke: true },
  { kod: "MD", cs: "Moldavsko", en: "Moldova", blizke: true },
  { kod: "HU", cs: "Maďarsko", en: "Hungary", blizke: false },
  { kod: "NL", cs: "Nizozemsko", en: "Netherlands", blizke: false },
  { kod: "BE", cs: "Belgie", en: "Belgium", blizke: false },
  { kod: "FR", cs: "Francie", en: "France", blizke: false },
  { kod: "GB", cs: "Británie", en: "United Kingdom", blizke: false },
  { kod: "BG", cs: "Bulharsko", en: "Bulgaria", blizke: false },
] as const;

/*
  Témata.

  `poZemich` znamená, že se na téma ptáme i zvlášť u každé blízké země — je to
  ten druh události, u které na místě záleží a kterou by obecný dotaz snadno
  přehlušil zprávami odjinud.
*/
const TEMATA = [
  { klic: "drony", cs: "dron narušení vzdušného prostoru", en: "drone airspace incursion military", poZemich: true },
  { klic: "letiste", cs: "letiště uzavřeno kvůli dronu", en: "airport closed drone sighting", poZemich: false },
  { klic: "sabotaz", cs: "sabotáž vyšetřování", en: "sabotage investigation Russia-linked", poZemich: true },
  { klic: "zeleznice", cs: "sabotáž na železnici", en: "railway sabotage tracks", poZemich: false },
  { klic: "kabely", cs: "poškozený podmořský kabel", en: "undersea cable damage Baltic", poZemich: false },
  { klic: "energetika", cs: "útok na rozvodnu nebo elektrárnu", en: "attack on power grid substation", poZemich: false },
  { klic: "kyber", cs: "kybernetický útok NÚKIB", en: "cyberattack critical infrastructure", poZemich: false },
  { klic: "spionaz", cs: "zadržen za špionáž pro Rusko", en: "arrested spying for Russia", poZemich: true },
  { klic: "diplomate", cs: "vyhoštění ruských diplomatů", en: "expelled Russian diplomats", poZemich: false },
  { klic: "hranice", cs: "kontroly na hranicích zavedeny", en: "border checks reintroduced", poZemich: true },
  { klic: "vojsko", cs: "nasazení vojáků na hranici", en: "troops deployed border", poZemich: false },
  { klic: "nato", cs: "NATO článek 4 konzultace", en: "NATO article 4 consultations invoked", poZemich: false },
  { klic: "vzdusna-obrana", cs: "vzlétly stíhačky vzdušný prostor", en: "scrambled jets airspace NATO", poZemich: false },
  { klic: "gps", cs: "rušení signálu GPS letadla", en: "GPS jamming aircraft Baltic", poZemich: false },
  { klic: "flotila", cs: "stínová flotila zadržený tanker", en: "shadow fleet tanker detained", poZemich: false },
  { klic: "mobilizace", cs: "Rusko vyhlásilo mobilizaci", en: "Russia mobilisation ordered decree", poZemich: false },
  { klic: "branna", cs: "branná povinnost odvody změna zákona", en: "conscription law reservists call-up Russia", poZemich: false },
  { klic: "nouzovy-stav", cs: "vyhlášen nouzový stav", en: "state of emergency declared", poZemich: false },
  { klic: "krizove-vysilani", cs: "Český rozhlas mimořádné vysílání krizové", en: "emergency broadcast public radio", poZemich: false },
  { klic: "evakuace", cs: "evakuace personálu ambasády", en: "embassy staff evacuation ordered", poZemich: false },
  { klic: "manipulace", cs: "dezinformační kampaň podvržený dokument", en: "disinformation campaign forged document", poZemich: false },
] as const;

/*
  Kanály redakcí a úřadů. Tyhle se nepočítají z matice — buď existují, nebo ne,
  a to se pozná jen tím, že se zkusí: `npm run sber:kanaly`.
*/
/*
  Úřední kanály.

  Do 15. 9. 2026 tu stály čtyři adresy RSS a všechny vracely 404 nebo prázdno.
  Sběr běžel bez jediného primárního zdroje a nebylo to nikde vidět: „nula
  zpráv z úřadu" vypadá stejně jako klid. Od té doby tu jsou adresy, o kterých
  je ZMĚŘENO, že odpovídají (běh Ověření zdrojů); sběr je přečte jako stránku,
  když z nich nepřijde RSS.

  20. 9. 2026 se seznam rozšířil o zahraniční úřady. Důvod je měřitelný:
  z 25 návrhů čekajících ve Správě neměl ani jeden úřední zdroj, takže
  pravidlo pro automatické zveřejnění (dva nezávislé zdroje, aspoň jeden
  úřední) nemohlo projít ani jednou. Nešlo o přísnost pravidla — šlo o to,
  že úřední zdroj nebylo kde vzít. Zpráva o sabotáži na nizozemské železnici
  měla dvanáct doložených zdrojů a všechny byly média.

  Co sem patří: úřad, bezpečnostní služba, armáda, národní CERT, nebo
  provozovatel infrastruktury, která je předmětem události — ten oznamuje
  vlastní výpadek jako první ruka. Co sem nepatří: cokoli, co o věci
  referuje. Redakce jsou o kus níž a `primarni: false`.
*/
const URADY: ZdrojUdalosti[] = [
  /* Mezinárodní a evropské */
  { klic: "nato-news", nazev: "NATO — novinky", url: "https://www.nato.int/cps/en/natohq/news.htm", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "europol", nazev: "Europol — newsroom", url: "https://www.europol.europa.eu/newsroom", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "enisa", nazev: "ENISA — news", url: "https://www.enisa.europa.eu/news", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "eu-rada", nazev: "Rada EU — tiskové zprávy", url: "https://www.consilium.europa.eu/en/press/press-releases/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "eu-komise", nazev: "Evropská komise — presscorner", url: "https://ec.europa.eu/commission/presscorner/home/en", jazyk: "en", primarni: true, typ: "primary" },

  /* Česko */
  { klic: "policie-rss", nazev: "Policie ČR — aktuality", url: "https://www.policie.cz/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "nukib-rss", nazev: "NÚKIB — aktuality", url: "https://nukib.gov.cz/cs/infoservis/aktuality/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "vlada-rss", nazev: "Vláda ČR — tiskové zprávy", url: "https://vlada.gov.cz/cz/media-centrum/tiskove-zpravy/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "mvcr", nazev: "Ministerstvo vnitra — tiskové zprávy", url: "https://www.mvcr.cz/clanek/tiskove-zpravy.aspx", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "bis", nazev: "BIS — aktuality", url: "https://www.bis.cz/aktuality/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "hzscr", nazev: "Hasičský záchranný sbor — zpravodajství", url: "https://www.hzscr.cz/", jazyk: "cs", primarni: true, typ: "primary" },
  /*
    Provozovatelé sítí. Výpadek přenosové soustavy nebo zásah do železnice
    oznamuje jejich správce dřív a přesněji než kdokoli jiný.
  */
  { klic: "ceps", nazev: "ČEPS — tiskové zprávy", url: "https://www.ceps.cz/cs/tiskove-zpravy", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "sprava-zeleznic", nazev: "Správa železnic — pro média", url: "https://www.spravazeleznic.cz/o-nas/pro-media/tiskove-zpravy", jazyk: "cs", primarni: true, typ: "primary" },

  /* Německo */
  { klic: "bsi-de", nazev: "BSI — Presse", url: "https://www.bsi.bund.de/DE/Service-Navi/Presse/presse_node.html", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "bmi-de", nazev: "Spolkové ministerstvo vnitra — Pressemitteilungen", url: "https://www.bmi.bund.de/SharedDocs/pressemitteilungen/DE/pressemitteilungen-node.html", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "bundesregierung", nazev: "Spolková vláda — aktuality", url: "https://www.bundesregierung.de/breg-de/aktuelles", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "gba-de", nazev: "Spolkový generální prokurátor — tisk", url: "https://www.generalbundesanwalt.de/DE/Presse/Presse_node.html", jazyk: "en", primarni: true, typ: "primary" },

  /* Polsko */
  { klic: "cert-pl", nazev: "CERT Polska — aktuality", url: "https://cert.pl/posts/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "mon-pl", nazev: "Ministerstvo obrany Polska — zprávy", url: "https://www.gov.pl/web/obrona-narodowa/wiadomosci", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "abw-pl", nazev: "ABW — aktuality", url: "https://www.abw.gov.pl/pl/aktualnosci", jazyk: "en", primarni: true, typ: "primary" },

  /* Nizozemsko */
  { klic: "rijksoverheid", nazev: "Nizozemská vláda — nieuws", url: "https://www.rijksoverheid.nl/actueel/nieuws", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "politie-nl", nazev: "Nizozemská policie — nieuws", url: "https://www.politie.nl/nieuws", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "ncsc-nl", nazev: "NCSC Nizozemsko — actueel", url: "https://www.ncsc.nl/actueel/nieuws", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "nctv-nl", nazev: "NCTV — actueel", url: "https://www.nctv.nl/actueel/nieuws", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "prorail", nazev: "ProRail — nieuws", url: "https://www.prorail.nl/nieuws", jazyk: "en", primarni: true, typ: "primary" },

  /* Pobaltí */
  { klic: "cert-lv", nazev: "CERT.LV — aktuality", url: "https://cert.lv/lv/incidenti-un-bridinajumi", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "ria-ee", nazev: "RIA (Estonsko) — news", url: "https://www.ria.ee/en/news", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "politsei-ee", nazev: "Estonská policie — news", url: "https://www.politsei.ee/en/news", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "kapo-ee", nazev: "KAPO (Estonsko) — news", url: "https://kapo.ee/en", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "nksc-lt", nazev: "NKSC (Litva) — naujienos", url: "https://www.nksc.lt/naujienos.html", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "kam-lt", nazev: "Ministerstvo obrany Litvy — news", url: "https://kam.lt/en/news/", jazyk: "en", primarni: true, typ: "primary" },

  /* Severské státy */
  { klic: "msb-se", nazev: "MSB (Švédsko) — news", url: "https://www.msb.se/en/news/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "sapo-se", nazev: "Säkerhetspolisen — news", url: "https://sakerhetspolisen.se/en/news.html", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "kyber-fi", nazev: "Kyberturvallisuuskeskus (Finsko)", url: "https://www.kyberturvallisuuskeskus.fi/en/news", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "raja-fi", nazev: "Finská pohraniční stráž — current issues", url: "https://raja.fi/en/current-issues", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "nsm-no", nazev: "NSM (Norsko) — aktuelt", url: "https://nsm.no/aktuelt/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "pst-no", nazev: "PST (Norsko) — články", url: "https://pst.no/alle-artikler/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "pet-dk", nazev: "PET (Dánsko) — nyheder", url: "https://www.pet.dk/nyheder", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "forsvaret-dk", nazev: "Dánská armáda — nyheder", url: "https://www.forsvaret.dk/da/nyheder/", jazyk: "en", primarni: true, typ: "primary" },

  /* Rumunsko a Moldavsko */
  { klic: "dnsc-ro", nazev: "DNSC (Rumunsko)", url: "https://dnsc.ro/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "mapn-ro", nazev: "Ministerstvo obrany Rumunska — comunicate", url: "https://www.mapn.ro/comunicate/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "gov-md", nazev: "Vláda Moldavska — novinky", url: "https://gov.md/ro/rss", jazyk: "en", primarni: true, typ: "primary" },

  /* Slovensko, Rakousko */
  { klic: "sk-cert", nazev: "SK-CERT — aktuality", url: "https://www.sk-cert.sk/sk/aktuality/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "bmi-at", nazev: "Rakouské ministerstvo vnitra — news", url: "https://www.bmi.gv.at/news.aspx", jazyk: "en", primarni: true, typ: "primary" },

  /* Británie */
  { klic: "ncsc-uk", nazev: "NCSC UK — news", url: "https://www.ncsc.gov.uk/section/keep-up-to-date/all-reports", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "govuk", nazev: "GOV.UK — news and communications", url: "https://www.gov.uk/search/news-and-communications", jazyk: "en", primarni: true, typ: "primary" },
];

/* Redakce. Referují o věci, neoznamují ji — proto nikdy `primarni`. */
const REDAKCE: ZdrojUdalosti[] = [
  { klic: "cro-rss", nazev: "Český rozhlas — domácí zprávy", url: "https://www.irozhlas.cz/rss/irozhlas/zpravy-domov", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "irozhlas", nazev: "iROZHLAS — zprávy", url: "https://www.irozhlas.cz/rss/irozhlas", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "ct24", nazev: "ČT24 — hlavní zprávy", url: "https://ct24.ceskatelevize.cz/rss/hlavni-zpravy", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "bbc-europe", nazev: "BBC News — Europe", url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml", jazyk: "en", primarni: false, typ: "media" },
  { klic: "dw-europe", nazev: "Deutsche Welle — Europe", url: "https://rss.dw.com/rdf/rss-en-eu", jazyk: "en", primarni: false, typ: "media" },
  { klic: "yle-en", nazev: "Yle News (Finsko)", url: "https://yle.fi/rss/t/18-205950/en", jazyk: "en", primarni: false, typ: "media" },
  { klic: "err-en", nazev: "ERR News (Estonsko)", url: "https://news.err.ee/rss", jazyk: "en", primarni: false, typ: "media" },
  /* LRT i Kyiv Independent vracely 404; jejich adresy se zkusí jako stránky. */
  { klic: "lrt-en", nazev: "LRT English (Litva)", url: "https://www.lrt.lt/en/news-in-english", jazyk: "en", primarni: false, typ: "media" },
  { klic: "kyiv-independent", nazev: "The Kyiv Independent", url: "https://kyivindependent.com/", jazyk: "en", primarni: false, typ: "media" },
];

/** Obecné dotazy — jeden česky, jeden anglicky ke každému tématu. */
const OBECNE: ZdrojUdalosti[] = TEMATA.flatMap((t) => [
  { klic: `t-${t.klic}-cs`, nazev: `Téma: ${t.klic} (česky)`, url: gn(t.cs, true), jazyk: "cs" as const, primarni: false, typ: "media" as const },
  { klic: `t-${t.klic}-en`, nazev: `Téma: ${t.klic} (anglicky)`, url: gn(t.en, false), jazyk: "en" as const, primarni: false, typ: "media" as const },
]);

/** Blízké země × témata, u kterých na místě záleží. */
const PO_ZEMICH: ZdrojUdalosti[] = ZEME.filter((z) => z.blizke).flatMap((z) =>
  TEMATA.filter((t) => t.poZemich).map((t) => ({
    klic: `z-${z.kod.toLowerCase()}-${t.klic}`,
    nazev: `${z.cs} — ${t.klic}`,
    url: gn(`${z.en} ${t.en}`, false),
    jazyk: "en" as const,
    primarni: false,
    typ: "media" as const,
  })),
);

export const ZDROJE_UDALOSTI: ZdrojUdalosti[] = [...URADY, ...REDAKCE, ...OBECNE, ...PO_ZEMICH];

/** Pro ověřovací běh a testy: z čeho se katalog skládá. */
export const KATALOG = {
  ZEME,
  TEMATA,
  pocty: {
    urady: URADY.length,
    redakce: REDAKCE.length,
    obecne: OBECNE.length,
    poZemich: PO_ZEMICH.length,
    celkem: URADY.length + REDAKCE.length + OBECNE.length + PO_ZEMICH.length,
  },
};
