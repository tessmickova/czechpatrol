/**
 * Je tenhle odkaz opravdu na úřad?
 *
 * Proč to existuje
 * ----------------
 * „Úřední zdroj" byl dosud tvrzení toho, kdo záznam připravil: stačilo
 * napsat `typ: "primary"` a pravidlo pro automatické zveřejnění to vzalo.
 * 20. 9. 2026 se takhle na web dostal záznam o dronu v Rumunsku, doložený
 * „tiskovou zprávou rumunského ministerstva obrany" — jenže odkaz vedl na
 * globalsecurity.org, což je její zrcadlo, ne ministerstvo. Chybu nahlásil
 * sám externí ověřovatel, který ji udělal.
 *
 * Pravidlo o dvou zdrojích, z nichž jeden je úřední, má smysl jen tehdy, když
 * „úřední" někdo ověří. Adresa je to jediné, co ověřit jde strojově.
 *
 * Co to NEŘEŠÍ: jestli je obsah na té adrese pravdivý, ani jestli odkaz
 * odpovídá. Řeší jedinou otázku — vede na úřad, nebo na někoho, kdo o úřadu
 * píše. Zrcadlo, agregátor a tisková distribuce jsou to druhé.
 */

/*
  Koncovky, které drží stát.

  Doména v těchhle jmenných prostorech se nedá jen tak koupit — přiděluje ji
  správce, který žadatele prověřuje. Proto se jim dá věřit i u úřadu, který
  v seznamu níž nestojí.
*/
const UREDNI_KONCOVKY = [
  ".gov",
  ".gov.cz", ".gov.uk", ".gov.pl", ".gov.ua", ".gov.au", ".gov.sa",
  ".gouv.fr",
  ".gv.at",
  ".bund.de",
  ".europa.eu",
  ".nato.int",
  ".int",
  ".police.uk",
  ".parliament.uk",
  ".belgium.be",
  ".admin.ch",
];

/*
  Úřady, jejichž adresa koncovku nemá.

  Půlka Evropy má ministerstva na běžné národní doméně — norská NSM na
  nsm.no, švédská MSB na msb.se. Seznam je proto nutné zlo; roste tím, že
  sem někdo vědomě dopíše řádek, ne tím, že si zdroj sám řekne, že je úřední.
*/
const UREDNI_DOMENY = new Set([
  // Česko
  "policie.cz", "nukib.gov.cz", "vlada.gov.cz", "mvcr.cz", "bis.cz", "hzscr.cz",
  "ceps.cz", "spravazeleznic.cz", "mzv.gov.cz", "army.cz", "mocr.army.cz",
  // Slovensko
  "sk-cert.sk", "nbu.gov.sk",
  // Německo
  "bsi.bund.de", "bundesregierung.de", "generalbundesanwalt.de", "bundeswehr.de",
  "polizei.brandenburg.de", "bka.de",
  // Polsko
  "gov.pl", "abw.gov.pl", "cert.pl",
  // Nizozemsko
  "rijksoverheid.nl", "politie.nl", "ncsc.nl", "nctv.nl", "prorail.nl",
  "prosecutionservice.nl", "om.nl",
  // Pobaltí
  "cert.lv", "ria.ee", "politsei.ee", "kapo.ee", "kriis.ee", "valitsus.ee",
  "emta.ee", "nksc.lt", "kam.lt",
  // Severské státy
  "msb.se", "sakerhetspolisen.se", "government.se", "regeringen.se",
  "kyberturvallisuuskeskus.fi", "traficom.fi", "raja.fi", "valtioneuvosto.fi",
  "nsm.no", "pst.no", "regjeringen.no",
  "pet.dk", "forsvaret.dk", "cfcs.dk",
  // Rumunsko, Moldavsko, Bulharsko
  "mapn.ro", "dnsc.ro", "gov.md", "presidency.ro",
  // Rakousko
  "bundesheer.at",
  // Mezinárodní
  "enisa.europa.eu", "consilium.europa.eu", "eeas.europa.eu",
  "press.un.org", "digitallibrary.un.org", "un.org", "osce.org", "iaea.org",
  /*
    Soudní tribunál MH17. Vlastní doména bez úřední koncovky, ale je to
    stránka soudu samotného — tedy první ruka, ne referát o něm.
  */
  "courtmh17.com",
]);

/**
 * Vede odkaz na úřad?
 *
 * Nerozhoduje, co si o sobě zdroj napsal v datech — rozhoduje adresa.
 */
export function jeUredniZdroj(url) {
  let host;
  try {
    host = new URL(String(url)).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  if (UREDNI_DOMENY.has(host)) return true;
  if (UREDNI_KONCOVKY.some((k) => host === k.slice(1) || host.endsWith(k))) return true;
  /* Podoména úřadu z výčtu: shape.nato.int, press.policie.cz a podobně. */
  return [...UREDNI_DOMENY].some((d) => host.endsWith(`.${d}`));
}

/** Zdroj, který se tváří jako úřední, ale adresa tomu neodpovídá. */
export function falesneUredni(zdroje = []) {
  return zdroje.filter((z) => (z.typ === "primary" || z.primarni === true) && !jeUredniZdroj(z.url));
}

/** Má záznam aspoň jeden doopravdy úřední zdroj? */
export function maUredniZdroj(zdroje = []) {
  return zdroje.some((z) => (z.typ === "primary" || z.primarni === true) && jeUredniZdroj(z.url));
}
