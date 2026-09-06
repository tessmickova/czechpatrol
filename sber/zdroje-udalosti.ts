/**
 * Zdroje pro automatický sběr událostí. RSS kanály zpravodajství a úřadů
 * plus vyhledávací kanály Google News na sledovaná témata.
 *
 * Jde jen o kandidáty: každý nález se ukáže jako „automaticky zachyceno,
 * čeká na ověření“ a do žádného počtu nevstupuje, dokud ho nepřevezme člověk.
 */

export interface ZdrojUdalosti {
  klic: string;
  nazev: string;
  url: string;
  jazyk: "cs" | "en";
  /** Úřad nebo instituce, která věc sama oznamuje. */
  primarni: boolean;
  typ: "primary" | "wire" | "media";
}

const gn = (dotaz: string, cs: boolean) =>
  cs
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(dotaz)}&hl=cs&gl=CZ&ceid=CZ:cs`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(dotaz)}&hl=en-US&gl=US&ceid=US:en`;

export const ZDROJE_UDALOSTI: ZdrojUdalosti[] = [
  // úřady a instituce
  { klic: "nato-news", nazev: "NATO — novinky", url: "https://www.nato.int/cps/rss/en/natohq/rssFeed.xsl/rssFeed.xml", jazyk: "en", primarni: true, typ: "primary" },
  { klic: "policie-rss", nazev: "Policie ČR — aktuality", url: "https://www.policie.cz/rss/aktuality.aspx", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "nukib-rss", nazev: "NÚKIB — aktuality", url: "https://nukib.gov.cz/cs/rss/", jazyk: "cs", primarni: true, typ: "primary" },
  { klic: "vlada-rss", nazev: "Vláda ČR — tiskové zprávy", url: "https://vlada.gov.cz/cz/media-centrum/rss/", jazyk: "cs", primarni: true, typ: "primary" },
  // zpravodajství s vlastní redakcí v regionu
  { klic: "bbc-europe", nazev: "BBC News — Europe", url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml", jazyk: "en", primarni: false, typ: "media" },
  { klic: "dw-europe", nazev: "Deutsche Welle — Europe", url: "https://rss.dw.com/rdf/rss-en-eu", jazyk: "en", primarni: false, typ: "media" },
  { klic: "yle-en", nazev: "Yle News (Finsko)", url: "https://yle.fi/rss/t/18-205950/en", jazyk: "en", primarni: false, typ: "media" },
  { klic: "err-en", nazev: "ERR News (Estonsko)", url: "https://news.err.ee/rss", jazyk: "en", primarni: false, typ: "media" },
  { klic: "lrt-en", nazev: "LRT English (Litva)", url: "https://www.lrt.lt/en/rss", jazyk: "en", primarni: false, typ: "media" },
  { klic: "kyiv-independent", nazev: "The Kyiv Independent", url: "https://kyivindependent.com/feed/", jazyk: "en", primarni: false, typ: "media" },
  { klic: "irozhlas", nazev: "iROZHLAS — zprávy", url: "https://www.irozhlas.cz/rss/irozhlas", jazyk: "cs", primarni: false, typ: "media" },
  { klic: "ct24", nazev: "ČT24 — hlavní zprávy", url: "https://ct24.ceskatelevize.cz/rss/hlavni-zpravy", jazyk: "cs", primarni: false, typ: "media" },
  // vyhledávací kanály — sledovaná témata
  { klic: "gn-sabotage", nazev: "Google News — sabotage Europe", url: gn("sabotage Europe Russia", false), jazyk: "en", primarni: false, typ: "media" },
  { klic: "gn-drones", nazev: "Google News — drones airspace NATO", url: gn("drone airspace violation NATO", false), jazyk: "en", primarni: false, typ: "media" },
  { klic: "gn-cable", nazev: "Google News — undersea cable Baltic", url: gn("undersea cable damage Baltic", false), jazyk: "en", primarni: false, typ: "media" },
  { klic: "gn-cyber", nazev: "Google News — cyberattack infrastructure Europe", url: gn("cyberattack critical infrastructure Europe", false), jazyk: "en", primarni: false, typ: "media" },
  { klic: "gn-arson", nazev: "Google News — arson Russia-linked", url: gn("arson Russia-linked Europe", false), jazyk: "en", primarni: false, typ: "media" },
  { klic: "gn-sabotaz", nazev: "Google News — sabotáž", url: gn("sabotáž Rusko", true), jazyk: "cs", primarni: false, typ: "media" },
  { klic: "gn-dron-cz", nazev: "Google News — dron vzdušný prostor", url: gn("dron narušení vzdušného prostoru", true), jazyk: "cs", primarni: false, typ: "media" },
  { klic: "gn-kyber-cz", nazev: "Google News — kybernetický útok", url: gn("kybernetický útok NÚKIB", true), jazyk: "cs", primarni: false, typ: "media" },
  { klic: "gn-bis", nazev: "Google News — BIS špionáž", url: gn("BIS ruská špionáž zadržen", true), jazyk: "cs", primarni: false, typ: "media" },
];
