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
  /* Jazyk kanálu. Síto zná slova česky a anglicky; u ostatních jazyků chytí jen to, co se píše stejně (dron, sabotaż, NATO). */
  jazyk: "cs" | "en" | "sk" | "pl" | "de" | "fr" | "it" | "es" | "ro" | "hu" | "nl" | "sv" | "no" | "fi";
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
  /* Doplněno 23. 9. 2026: drony zastavily 18. 9. lucemburské letiště a sběr o tom nevěděl. */
  { kod: "LU", cs: "Lucembursko", en: "Luxembourg", blizke: false },
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
  { klic: "vypadek", cs: "plošný výpadek sítě internet mobilní operátor", en: "nationwide outage mobile network internet", poZemich: false },
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
  /*
    Doplněno 23. 9. 2026 podle toho, co v září propadlo (přehled 1.–20. 9.):
    trosky dronů v Rumunsku a Polsku, přerušený provoz letišť Lublin, Rzeszów
    a Lucemburk, požár muniční továrny ve Snině, ruská fregata a světlice
    u Dánska. Trosky a letiště po zemích — u nich na místě záleží nejvíc.
  */
  { klic: "trosky", cs: "nalezeny trosky dronu", en: "drone debris found", poZemich: true },
  { klic: "letiste-dron", cs: "letiště přerušilo provoz kvůli dronům", en: "airport suspends flights drones", poZemich: true },
  { klic: "zbrojovka", cs: "požár výbuch muniční továrna zbrojovka", en: "fire explosion ammunition factory", poZemich: false },
  { klic: "valecna-lod", cs: "ruská válečná loď incident vrtulník", en: "Russian warship incident navy helicopter", poZemich: false },
  /* Doplněno 24. 9. 2026: dron, který se zřítil a explodoval (Rumunsko), a varování před útoky dronů z lodí. */
  { klic: "dron-exploze", cs: "dron se zřítil explodoval", en: "drone crashed exploded", poZemich: true },
  { klic: "drony-lode", cs: "Rusko připravuje útoky drony z lodí kontejner", en: "Russia drones containers ships attack Europe warning", poZemich: false },
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

  Seznam je pročištěný podle měření, ne podle toho, jak vypadá. Ze 46
  kandidátů jich napoprvé odpovědělo 25; adresy, které vracely 404 nebo
  prázdno, se zkusily jinudy (kořen webu, doložený kanál RSS) a ty, které
  drží robota od dveří natvrdo (403), ze seznamu odešly — stejně jako ty,
  které nevrátily nic ani napodruhé z jiné adresy. Mrtvý zdroj v seznamu je
  horší než žádný: „z toho úřadu nic nepřišlo" pak znamená „ten úřad mlčí",
  a přitom se tam nikdy nikdo nedostal.

  Čtyři nizozemské úřady tu zůstávají s výhradou: odpovídají, ale vyčte se
  z nich jediná položka — stránky se skládají až v prohlížeči. Doložené
  kanály RSS na nich nejsou, zkoušely se a vracely prázdno. Nizozemsko drží
  hlavně ProRail, což u zásahu do železnice stejně není náhradní řešení,
  ale ten správný zdroj.
*/
const URADY: ZdrojUdalosti[] = [
  /* Mezinárodní a evropské */
  { klic: "nato-news", nazev: "NATO — novinky", url: "https://www.nato.int/cps/en/natohq/news.htm", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "enisa", nazev: "ENISA — news", url: "https://www.enisa.europa.eu/news", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "eu-komise", nazev: "Evropská komise — presscorner", url: "https://ec.europa.eu/commission/presscorner/api/rss?language=en", jazyk: "en", primarni: true, typ: "primary" },

  /* Česko */
  { klic: "policie-rss", nazev: "Policie ČR — aktuality", url: "https://www.policie.cz/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "nukib-rss", nazev: "NÚKIB — aktuality", url: "https://nukib.gov.cz/cs/infoservis/aktuality/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "vlada-rss", nazev: "Vláda ČR — tiskové zprávy", url: "https://vlada.gov.cz/cz/media-centrum/tiskove-zpravy/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "mvcr", nazev: "Ministerstvo vnitra — tiskové zprávy", url: "https://www.mvcr.cz/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "bis", nazev: "BIS — aktuality", url: "https://www.bis.cz/aktuality/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "hzscr", nazev: "Hasičský záchranný sbor — zpravodajství", url: "https://www.hzscr.cz/", jazyk: "cs", primarni: true, typ: "primary" },
  /*
    Provozovatelé sítí. Výpadek přenosové soustavy nebo zásah do železnice
    oznamuje jejich správce dřív a přesněji než kdokoli jiný.
  */
  { klic: "ceps", nazev: "ČEPS — tiskové zprávy", url: "https://www.ceps.cz/cs/tiskove-zpravy", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "sprava-zeleznic", nazev: "Správa železnic — pro média", url: "https://www.spravazeleznic.cz/", jazyk: "cs", primarni: true, typ: "primary" },

  /* Německo */
  { klic: "bsi-de", nazev: "BSI — Presse", url: "https://www.bsi.bund.de/DE/Service-Navi/Presse/presse_node.html", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "bundesregierung", nazev: "Spolková vláda — aktuality", url: "https://www.bundesregierung.de/breg-de/aktuelles", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "gba-de", nazev: "Spolkový generální prokurátor — tisk", url: "https://www.generalbundesanwalt.de/", jazyk: "en", primarni: true, typ: "primary" },

  /* Polsko */
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
  { klic: "ria-ee", nazev: "RIA (Estonsko) — news", url: "https://www.ria.ee/en", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "politsei-ee", nazev: "Estonská policie — news", url: "https://www.politsei.ee/en/news", jazyk: "en", primarni: true, typ: "primary" },

  /* Severské státy */
  { klic: "msb-se", nazev: "MSB (Švédsko) — news", url: "https://www.msb.se/en/news/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "kyber-fi", nazev: "Kyberturvallisuuskeskus (Finsko)", url: "https://www.kyberturvallisuuskeskus.fi/en", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "raja-fi", nazev: "Finská pohraniční stráž — current issues", url: "https://raja.fi/en", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "nsm-no", nazev: "NSM (Norsko) — aktuelt", url: "https://nsm.no/aktuelt/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "pst-no", nazev: "PST (Norsko) — články", url: "https://pst.no/alle-artikler/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "pet-dk", nazev: "PET (Dánsko) — nyheder", url: "https://www.pet.dk/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "forsvaret-dk", nazev: "Dánská armáda — nyheder", url: "https://www.forsvaret.dk/da/nyheder/", jazyk: "en", primarni: true, typ: "primary" },

  /* Rumunsko a Moldavsko */
  { klic: "mapn-ro", nazev: "Ministerstvo obrany Rumunska — comunicate", url: "https://www.mapn.ro/", jazyk: "en", primarni: true, typ: "primary" },

  /* Slovensko, Rakousko */
  { klic: "sk-cert", nazev: "SK-CERT — aktuality", url: "https://www.sk-cert.sk/sk/aktuality/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "bmi-at", nazev: "Rakouské ministerstvo vnitra — news", url: "https://www.bmi.gv.at/news.aspx", jazyk: "en", primarni: true, typ: "primary" },

  /*
    Doplněno 23. 9. 2026. Moldavsko, Rumunsko, Lucembursko a Slovensko neměly
    žádný úřední kanál (nebo jen titulní stránku ministerstva obrany) — proto
    z nich v září nepřišla ani jedna úřední zpráva o dronech nad Moldavskem,
    troskách v Rumunsku či lucemburském letišti. Adresy jsou kořeny webů
    úřadů, které se o těch událostech doloženě vyjadřovaly; zda odpovídají
    a co z nich jde přečíst, změří běh Ověření zdrojů. Všechny se stahují
    jen se svolením robots.txt (sber/robots.ts).
  */
  /* Moldavsko */
  { klic: "army-md", nazev: "Ministerstvo obrany Moldavska", url: "https://www.army.md/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "politia-frontiera-md", nazev: "Pohraniční policie Moldavska", url: "https://www.border.gov.md/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "igp-md", nazev: "Generální inspektorát policie Moldavska", url: "https://www.igp.gov.md/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "mae-md", nazev: "Ministerstvo zahraničí Moldavska", url: "https://www.mae.gov.md/", jazyk: "en", primarni: true, typ: "primary" },
  /* Rumunsko — námořnictvo a pohraniční policie hlásí nálezy trosek první */
  { klic: "navy-ro", nazev: "Námořnictvo Rumunska", url: "https://www.navy.ro/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "politia-frontiera-ro", nazev: "Pohraniční policie Rumunska", url: "https://www.politiadefrontiera.ro/", jazyk: "en", primarni: true, typ: "primary" },
  /* Polsko — přerušení provozu letišť oznamuje řízení letového provozu */
  { klic: "pansa-pl", nazev: "PAŻP — polské řízení letového provozu", url: "https://www.pansa.pl/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "sg-pl", nazev: "Polská pohraniční stráž", url: "https://www.strazgraniczna.pl/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "premier-pl", nazev: "Kancelář předsedy vlády Polska", url: "https://www.gov.pl/web/premier", jazyk: "en", primarni: true, typ: "primary" },
  /*
    Německo — policie a zemské kriminální úřady vydávají zprávy přes
    Presseportal. Je to distribuce jako mynewsdesk.com, proto ne `primarni`:
    úřední zdroj je až stránka policie samotné (polizei-nds.de apod.).
  */
  { klic: "presseportal-policie", nazev: "Presseportal — zprávy policie (Blaulicht)", url: "https://www.presseportal.de/rss/polizei.rss2", jazyk: "en", primarni: false, typ: "wire" },
  /* Dánsko, Lucembursko, Slovensko, Bulharsko */
  { klic: "politi-kbh", nazev: "Kodaňská policie", url: "https://politi.dk/koebenhavns-politi", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "police-lu", nazev: "Lucemburská policie", url: "https://police.public.lu/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "letiste-lu", nazev: "Letiště Lucemburk (provozovatel)", url: "https://www.lux-airport.lu/", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "minv-sk", nazev: "Ministerstvo vnitra SR — tiskové zprávy", url: "https://www.minv.sk/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "mosr-sk", nazev: "Ministerstvo obrany SR", url: "https://www.mosr.sk/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "mvr-bg", nazev: "Ministerstvo vnitra Bulharska", url: "https://www.mvr.bg/", jazyk: "en", primarni: true, typ: "primary" },

  /* Británie */
  { klic: "ncsc-uk", nazev: "NCSC UK — news", url: "https://www.ncsc.gov.uk/news", jazyk: "en", primarni: true, typ: "primary" },
];

/* Redakce. Referují o věci, neoznamují ji — proto nikdy `primarni`. */
const REDAKCE: ZdrojUdalosti[] = [
  { klic: "cro-rss", nazev: "Český rozhlas — domácí zprávy", url: "https://www.irozhlas.cz/rss/irozhlas/zpravy-domov", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "irozhlas", nazev: "iROZHLAS — zprávy", url: "https://www.irozhlas.cz/rss/irozhlas", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "ct24", nazev: "ČT24 — hlavní zprávy", url: "https://ct24.ceskatelevize.cz/rss/hlavni-zpravy", jazyk: "cs", primarni: false, typ: "media" },
  /*
    Doplněno 24. 9. 2026: dvě zprávy z Novinek (dron v Rumunsku, plán útoků
    dronů z kontejnerů podle španělského listu) sběr neměl. České redakce
    s vlastním kanálem RSS; co nevrátí RSS, přečte se jako stránka.
  */
  { klic: "novinky", nazev: "Novinky.cz", url: "https://www.novinky.cz/rss", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "seznam-zpravy", nazev: "Seznam Zprávy", url: "https://www.seznamzpravy.cz/rss", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "idnes", nazev: "iDNES.cz — zpravodajství", url: "https://servis.idnes.cz/rss.aspx?c=zpravodaj", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "ctk", nazev: "ČTK — České noviny", url: "https://www.ceskenoviny.cz/sluzby/rss/zpravy.php", jazyk: "cs", primarni: false, typ: "wire" },
  { klic: "aktualne", nazev: "Aktuálně.cz", url: "https://www.aktualne.cz/rss/", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "denikn", nazev: "Deník N", url: "https://denikn.cz/feed/", jazyk: "cs", primarni: false, typ: "media" },
  /*
    Doplněno 26. 9. 2026 na přání provozovatelky: jeden menší, nezávislý
    zdroj mimo velké redakce. CZ Defence je odborný magazín o armádě,
    obraně a bezpečnosti — píše o našich tématech, ne o domácích
    politických šarvátkách. Kanál RSS se z vývojového prostředí ověřit
    nedal (blokovaná síť), proto titulní stránka: sběr ji čte jako stránku.
  */
  { klic: "czdefence", nazev: "CZ Defence", url: "https://www.czdefence.cz/", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "bbc-europe", nazev: "BBC News — Europe", url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml", jazyk: "en", primarni: false, typ: "media" },
  { klic: "dw-europe", nazev: "Deutsche Welle — Europe", url: "https://rss.dw.com/rdf/rss-en-eu", jazyk: "en", primarni: false, typ: "media" },
  { klic: "yle-en", nazev: "Yle News (Finsko)", url: "https://yle.fi/rss/t/18-205950/en", jazyk: "en", primarni: false, typ: "media" },
  { klic: "err-en", nazev: "ERR News (Estonsko)", url: "https://news.err.ee/rss", jazyk: "en", primarni: false, typ: "media" },
  /* LRT i Kyiv Independent vracely 404; jejich adresy se zkusí jako stránky. */
  { klic: "lrt-en", nazev: "LRT English (Litva)", url: "https://www.lrt.lt/en/news-in-english", jazyk: "en", primarni: false, typ: "media" },
  { klic: "kyiv-independent", nazev: "The Kyiv Independent", url: "https://kyivindependent.com/", jazyk: "en", primarni: false, typ: "media" },
  /* Doplněno 23. 9. 2026: národní redakce a agentury zemí, odkud v září zprávy chyběly. */
  { klic: "moldpres", nazev: "Moldpres (státní agentura Moldavska)", url: "https://www.moldpres.md/", jazyk: "en", primarni: false, typ: "wire" },
  { klic: "radio-moldova", nazev: "Radio Moldova", url: "https://radiomoldova.md/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "agerpres", nazev: "AGERPRES (státní agentura Rumunska)", url: "https://agerpres.ro/english", jazyk: "en", primarni: false, typ: "wire" },
  { klic: "notes-from-poland", nazev: "Notes from Poland", url: "https://notesfrompoland.com/feed/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "tvp-world", nazev: "TVP World (Polsko)", url: "https://tvpworld.com/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "dr-dk", nazev: "DR Nyheder (Dánsko)", url: "https://www.dr.dk/nyheder", jazyk: "en", primarni: false, typ: "media" },
  { klic: "rtl-today", nazev: "RTL Today (Lucembursko)", url: "https://today.rtl.lu/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "tasr", nazev: "TASR (Slovensko)", url: "https://www.tasr.sk/", jazyk: "cs", primarni: false, typ: "wire" },
  { klic: "bta", nazev: "BTA (státní agentura Bulharska)", url: "https://www.bta.bg/en", jazyk: "en", primarni: false, typ: "wire" },
  /*
    Doplněno 24. 9. 2026 (zadání provozovatelky): deníky zemí Evropy a
    relevantního okolí. Přednost mají anglické mutace a jazyky, ve kterých
    síto pozná slova (slovenština, polština); u němčiny, francouzštiny a
    dalších chytí jen mezinárodní výrazy. Kanál, který nevrátí RSS, se
    přečte jako stránka; kanál, který neodpovídá, ukáže kontrola zdrojů.
  */
  /* celoevropské a světové redakce */
  { klic: "guardian-world", nazev: "The Guardian — World", url: "https://www.theguardian.com/world/rss", jazyk: "en", primarni: false, typ: "media" },
  { klic: "politico-eu", nazev: "Politico Europe", url: "https://www.politico.eu/feed/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "euractiv", nazev: "Euractiv", url: "https://www.euractiv.com/feed/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "france24-en", nazev: "France 24 (anglicky)", url: "https://www.france24.com/en/rss", jazyk: "en", primarni: false, typ: "media" },
  { klic: "euronews", nazev: "Euronews", url: "https://www.euronews.com/rss", jazyk: "en", primarni: false, typ: "media" },
  /* Německo, Rakousko, Švýcarsko */
  { klic: "tagesschau", nazev: "Tagesschau (Německo)", url: "https://www.tagesschau.de/index~rss2.xml", jazyk: "de", primarni: false, typ: "media" },
  { klic: "spiegel-int", nazev: "Der Spiegel International", url: "https://www.spiegel.de/international/index.rss", jazyk: "en", primarni: false, typ: "media" },
  { klic: "orf", nazev: "ORF News (Rakousko)", url: "https://rss.orf.at/news.xml", jazyk: "de", primarni: false, typ: "media" },
  { klic: "derstandard", nazev: "Der Standard (Rakousko)", url: "https://www.derstandard.at/rss", jazyk: "de", primarni: false, typ: "media" },
  { klic: "nzz", nazev: "NZZ (Švýcarsko)", url: "https://www.nzz.ch/recent.rss", jazyk: "de", primarni: false, typ: "media" },
  /* Slovensko, Polsko, Maďarsko */
  { klic: "sme", nazev: "SME (Slovensko)", url: "https://www.sme.sk/rss", jazyk: "sk", primarni: false, typ: "media" },
  { klic: "dennikn-sk", nazev: "Denník N (Slovensko)", url: "https://dennikn.sk/feed", jazyk: "sk", primarni: false, typ: "media" },
  { klic: "aktuality-sk", nazev: "Aktuality.sk", url: "https://www.aktuality.sk/rss/", jazyk: "sk", primarni: false, typ: "media" },
  { klic: "tvn24", nazev: "TVN24 (Polsko)", url: "https://tvn24.pl/najnowsze.xml", jazyk: "pl", primarni: false, typ: "media" },
  { klic: "rp-pl", nazev: "Rzeczpospolita (Polsko)", url: "https://www.rp.pl/rss_main", jazyk: "pl", primarni: false, typ: "media" },
  { klic: "telex", nazev: "Telex (Maďarsko)", url: "https://telex.hu/rss", jazyk: "hu", primarni: false, typ: "media" },
  { klic: "hvg", nazev: "HVG (Maďarsko)", url: "https://hvg.hu/rss", jazyk: "hu", primarni: false, typ: "media" },
  /* Pobaltí a sever */
  { klic: "postimees-en", nazev: "Postimees (Estonsko, anglicky)", url: "https://news.postimees.ee/rss", jazyk: "en", primarni: false, typ: "media" },
  { klic: "lsm-en", nazev: "LSM (Lotyšsko, anglicky)", url: "https://eng.lsm.lv/rss/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "hs-fi", nazev: "Helsingin Sanomat (Finsko)", url: "https://www.hs.fi/rss/tuoreimmat.xml", jazyk: "fi", primarni: false, typ: "media" },
  { klic: "svt", nazev: "SVT Nyheter (Švédsko)", url: "https://www.svt.se/nyheter/rss.xml", jazyk: "sv", primarni: false, typ: "media" },
  { klic: "nrk", nazev: "NRK (Norsko)", url: "https://www.nrk.no/toppsaker.rss", jazyk: "no", primarni: false, typ: "media" },
  /* Benelux, Francie, jih */
  { klic: "nos", nazev: "NOS Nieuws (Nizozemsko)", url: "https://feeds.nos.nl/nosnieuwsalgemeen", jazyk: "nl", primarni: false, typ: "media" },
  { klic: "vrt", nazev: "VRT NWS (Belgie)", url: "https://www.vrt.be/vrtnws/nl.rss.articles.xml", jazyk: "nl", primarni: false, typ: "media" },
  { klic: "lemonde", nazev: "Le Monde (Francie)", url: "https://www.lemonde.fr/rss/une.xml", jazyk: "fr", primarni: false, typ: "media" },
  { klic: "ansa-en", nazev: "ANSA (Itálie, anglicky)", url: "https://www.ansa.it/english/news/english_nr_rss.xml", jazyk: "en", primarni: false, typ: "wire" },
  { klic: "repubblica", nazev: "la Repubblica (Itálie)", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml", jazyk: "it", primarni: false, typ: "media" },
  { klic: "elpais-en", nazev: "El País (Španělsko, anglicky)", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada", jazyk: "en", primarni: false, typ: "media" },
  { klic: "elmundo", nazev: "El Mundo (Španělsko)", url: "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml", jazyk: "es", primarni: false, typ: "media" },
  { klic: "kathimerini-en", nazev: "Kathimerini (Řecko, anglicky)", url: "https://www.ekathimerini.com/feed/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "balkan-insight", nazev: "Balkan Insight", url: "https://balkaninsight.com/feed/", jazyk: "en", primarni: false, typ: "media" },
  /* Rumunsko, Moldavsko, Ukrajina, ruská nezávislá média */
  { klic: "digi24", nazev: "Digi24 (Rumunsko)", url: "https://www.digi24.ro/rss", jazyk: "ro", primarni: false, typ: "media" },
  { klic: "g4media", nazev: "G4Media (Rumunsko)", url: "https://www.g4media.ro/feed", jazyk: "ro", primarni: false, typ: "media" },
  { klic: "romania-insider", nazev: "Romania Insider", url: "https://www.romania-insider.com/rss", jazyk: "en", primarni: false, typ: "media" },
  { klic: "newsmaker-md", nazev: "NewsMaker (Moldavsko)", url: "https://newsmaker.md/feed", jazyk: "ro", primarni: false, typ: "media" },
  { klic: "ukrinform-en", nazev: "Ukrinform (anglicky)", url: "https://www.ukrinform.net/rss/block-lastnews", jazyk: "en", primarni: false, typ: "wire" },
  { klic: "pravda-ua-en", nazev: "Ukrainska Pravda (anglicky)", url: "https://www.pravda.com.ua/eng/rss/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "meduza-en", nazev: "Meduza (anglicky)", url: "https://meduza.io/rss/en/all", jazyk: "en", primarni: false, typ: "media" },
  { klic: "moscow-times", nazev: "The Moscow Times", url: "https://www.themoscowtimes.com/rss/news", jazyk: "en", primarni: false, typ: "media" },
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
