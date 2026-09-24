/**
 * Odkud zpráva pochází — politické spektrum zdrojů.
 *
 * Proč to existuje
 * ----------------
 * 24. 9. 2026 přání provozovatelky: u každé zprávy v kanálu drobně napsat,
 * jestli ji nesou spíš proruská, nebo spíš prozápadní média. Čtenář tak
 * pozná, že „Rusko zavedlo zákaz vycházení“ stojí na ukrajinských webech a
 * úřední ruské oznámení mluví o nočním zákazu pohybu v pětikilometrovém
 * pásmu — a že obojí je pravda jen z půlky.
 *
 * Zařazení je podle ADRESY, ne podle obsahu článku. Stejně jako u úředních
 * zdrojů (uredni-zdroj.mjs) platí: seznam roste jen tím, že sem někdo
 * vědomě dopíše řádek. Co v seznamu není, je „ostatní“ — nehádá se.
 *
 * Skupiny popisují VAZBU média, ne kvalitu jednotlivého článku:
 *   - ruska-statni: vlastní nebo řídí ruský stát, nebo otevřeně prokremelské,
 *   - ruska-nezavisla: ruská média v exilu nebo mimo kontrolu Kremlu,
 *   - ukrajinska: ukrajinská média (ve válce jedna ze stran),
 *   - zapadni: evropská a americká média, veřejnoprávní i soukromá,
 *   - uredni: úřad (podle uredni-zdroj.mjs), bez ohledu na stát.
 */
import { jeUredniZdroj } from "./uredni-zdroj.mjs";

const SKUPINY = {
  "ruska-statni": [
    "tass.com", "tass.ru", "ria.ru", "rt.com", "sputniknews.com", "sputnikglobe.com", "iz.ru", "rg.ru",
    "tvzvezda.ru", "1tv.ru", "vesti.ru", "smotrim.ru", "lenta.ru", "kp.ru", "russian.rt.com", "ren.tv",
    "interfax.ru", "ntv.ru", "regnum.ru", "aif.ru", "mk.ru", "gazeta.ru", "tsargrad.tv", "news-front.su",
    "belta.by", "sb.by",
  ],
  "ruska-nezavisla": [
    "meduza.io", "themoscowtimes.com", "ru.themoscowtimes.com", "novayagazeta.eu", "istories.media",
    "tvrain.tv", "currenttime.tv", "svoboda.org", "theins.ru", "zona.media", "mediazona.ca", "verstka.media",
  ],
  ukrajinska: [
    "ukrinform.ua", "ukrinform.net", "unian.ua", "unian.net", "pravda.com.ua", "eurointegration.com.ua",
    "kyivindependent.com", "nv.ua", "english.nv.ua", "liga.net", "news.liga.net", "rbc.ua", "newsukraine.rbc.ua",
    "unn.ua", "112.ua", "obozrevatel.com", "dialog.ua", "united24media.com", "suspilne.media", "kyivpost.com",
    "censor.net", "tsn.ua", "focus.ua", "zn.ua", "donpress.com", "daycom.com.ua",
  ],
  zapadni: [
    // agentury a světová média
    "reuters.com", "apnews.com", "afp.com", "bbc.com", "bbc.co.uk", "cnn.com", "nbcnews.com", "nytimes.com",
    "washingtonpost.com", "theguardian.com", "ft.com", "politico.eu", "politico.com", "bloomberg.com",
    "dw.com", "euronews.com", "rferl.org", "economist.com", "wsj.com", "france24.com", "lemonde.fr",
    // Pobaltí, sever, střední Evropa
    "err.ee", "news.err.ee", "postimees.ee", "delfi.lt", "lrt.lt", "lsm.lv", "yle.fi", "hs.fi", "svt.se",
    "nrk.no", "dr.dk", "tagesschau.de", "spiegel.de", "zeit.de", "faz.net", "sueddeutsche.de",
    "notesfrompoland.com", "tvn24.pl", "polsatnews.pl", "rp.pl", "pap.pl", "wyborcza.pl",
    // Česko a Slovensko
    "ct24.ceskatelevize.cz", "ceskatelevize.cz", "irozhlas.cz", "rozhlas.cz", "novinky.cz", "seznamzpravy.cz",
    "idnes.cz", "aktualne.cz", "denikn.cz", "echo24.cz", "lidovky.cz", "ihned.cz", "e15.cz", "ceskenoviny.cz",
    "sme.sk", "dennikn.sk", "aktuality.sk", "pravda.sk", "ta3.com",
    // analytická pracoviště
    "understandingwar.org", "defencematters.eu", "balticflank.substack.com",
  ],
};

export const NAZVY_SPEKTRA = {
  uredni: "úřad",
  "ruska-statni": "ruská státní / prokremelská",
  "ruska-nezavisla": "ruská nezávislá (exil)",
  ukrajinska: "ukrajinská",
  zapadni: "západní",
  ostatni: "ostatní",
};

const PORADI = ["uredni", "zapadni", "ruska-nezavisla", "ukrajinska", "ruska-statni", "ostatni"];

const MAPA = new Map(Object.entries(SKUPINY).flatMap(([sk, domeny]) => domeny.map((d) => [d, sk])));

function hostitel(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

/** Do které skupiny patří jeden odkaz. Nejdelší shodná doména vyhrává (ru.themoscowtimes.com před themoscowtimes.com). */
export function spektrumZdroje(url) {
  if (jeUredniZdroj(url)) return "uredni";
  const h = hostitel(url);
  if (!h) return "ostatni";
  const casti = h.split(".");
  for (let i = 0; i < casti.length - 1; i++) {
    const sk = MAPA.get(casti.slice(i).join("."));
    if (sk) return sk;
  }
  return "ostatni";
}

/*
  Google News jen přeposílá: adresa je news.google.com a skutečné médium je
  jen za poslední pomlčkou v titulku („… - Reuters“). Jména médií se proto
  poznávají i podle toho — ale jen v té koncovce, nikdy v textu zprávy,
  jinak by „TASS uvedl…“ v článku Reuters udělalo z Reuters ruské médium.
*/
const JMENA = [
  ["ruska-statni", ["tass", "ria novosti", "ria.ru", "rt", "russia today", "sputnik", "izvestia", "rossiyskaya gazeta", "lenta.ru", "komsomolskaya pravda", "interfax", "zvezda", "belta"]],
  ["ruska-nezavisla", ["meduza", "the moscow times", "moscow times", "novaya gazeta", "novaya gazeta europe", "the insider", "mediazona", "tv rain", "dozhd", "current time"]],
  ["ukrajinska", ["ukrinform", "unian", "ukrainska pravda", "ukrainian pravda", "european pravda", "kyiv independent", "the kyiv independent", "kyiv post", "nv", "new voice of ukraine", "liga.net", "rbc-ukraine", "unn", "united24 media", "suspilne", "ukrmedia news", "obozrevatel", "censor.net", "tsn"]],
  ["zapadni", ["reuters", "associated press", "ap news", "afp", "bbc", "bbc news", "cnn", "nbc news", "the new york times", "the washington post", "the guardian", "financial times", "politico", "politico europe", "bloomberg", "dw", "deutsche welle", "euronews", "radio free europe/radio liberty", "rfe/rl", "the economist", "france 24", "le monde", "err", "err news", "yle", "lrt", "lsm", "svt", "nrk", "notes from poland", "tvn24", "pap", "ct24", "irozhlas", "český rozhlas", "novinky.cz", "seznam zprávy", "idnes.cz", "aktuálně.cz", "deník n", "kyiv school of economics"]],
];
const PODLE_JMENA = new Map(JMENA.flatMap(([sk, jmena]) => jmena.map((j) => [j, sk])));

/** Spektrum zachycené zprávy: adresa, a když je to Google News, jméno média za poslední pomlčkou. */
export function spektrumKandidata(k) {
  const podleAdresy = spektrumZdroje(k?.zdroj?.url);
  if (podleAdresy !== "ostatni") return podleAdresy;
  const i = (k?.titulek ?? "").lastIndexOf(" - ");
  if (i < 0) return "ostatni";
  const jmeno = k.titulek.slice(i + 3).trim().toLowerCase();
  return PODLE_JMENA.get(jmeno) ?? "ostatni";
}

/**
 * Drobný řádek pod zprávu: „Kde se to píše: úřad 1 · západní 1 · ruská nezávislá (exil) 2“.
 * Google News jen přeposílá — skutečné médium z adresy nepoznáme, proto „ostatní“.
 */
export function radekSpektra(zdroje) {
  const pocty = {};
  for (const z of zdroje ?? []) {
    if (!z?.url) continue;
    const sk = spektrumZdroje(z.url);
    pocty[sk] = (pocty[sk] ?? 0) + 1;
  }
  const casti = PORADI.filter((sk) => pocty[sk]).map((sk) => `${NAZVY_SPEKTRA[sk]} ${pocty[sk]}`);
  if (!casti.length) return null;
  const jenRuskaStatni = Object.keys(pocty).length === 1 && pocty["ruska-statni"];
  const poznamka = jenRuskaStatni ? " — jen ruská státní média" : "";
  return `<i>Kde se to píše: ${casti.join(" · ")}${poznamka}</i>`;
}
