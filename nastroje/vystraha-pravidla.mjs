/**
 * Pravidla pro mimořádnou výstrahu.
 *
 * Jsou ve vlastním souboru, protože je potřebují tři různá místa: nástroj,
 * kterým se výstraha vyhlašuje, kontrola dat před nasazením a testy. Kdyby
 * si každé místo pravidla psalo po svém, rozešla by se — a rozešla by se
 * zrovna u věci, kde na tom záleží nejvíc.
 */

const DRUHY = ["mobilizace-rusko", "krizove-vysilani", "jine"];

/*
  Slova, kterými web říká člověku, co má dělat. Tenhle web to nedělá: není
  krizový štáb, nemá odpovědnost za následky a rada „vyberte si hotovost"
  rozeslaná tisícům lidí ten problém sama způsobí. Od pokynů jsou úřady.
*/
const RADY = [
  "odjeďte", "odjedte", "neodjíždějte", "neodjizdejte", "utíkejte", "utikejte",
  "vyberte si hotovost", "vyberte hotovost", "vybírejte hotovost", "vybirejte hotovost",
  "nakupte", "kupte", "zásobte se", "zasobte se", "natankujte",
  "evakuujte se", "opusťte zemi", "opustte zemi", "nepanikařte", "nepanikarte",
];

const je = (x) => typeof x === "string" && x.trim().length > 0;
const datum = (d) => je(d) && !Number.isNaN(new Date(d).getTime());
const hostitel = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/**
 * Vrátí seznam důvodů, proč výstraha NESMÍ jít ven. Prázdné pole = v pořádku.
 *
 * `ted` je čas, proti kterému se měří budoucnost — v testech se předává,
 * v provozu je to teď.
 */
export function chybyVystrahy(v, ted = Date.now()) {
  const chyby = [];
  if (!v || typeof v !== "object") return ["výstraha není objekt"];

  for (const pole of ["klic", "nadpis", "text", "kdy", "overeno", "overil", "uroven"]) {
    if (!je(v[pole])) chyby.push(`chybí ${pole}`);
  }
  if (!DRUHY.includes(v.druh)) chyby.push(`druh musí být jeden z: ${DRUHY.join(", ")}`);

  if (datum(v.kdy) && new Date(v.kdy).getTime() > ted + 3_600_000) {
    chyby.push("datum události je v budoucnosti");
  }
  if (datum(v.overeno) && new Date(v.overeno).getTime() > ted + 3_600_000) {
    chyby.push("čas ověření je v budoucnosti");
  }
  if (je(v.kdy) && !datum(v.kdy)) chyby.push("kdy není platné datum");
  if (je(v.overeno) && !datum(v.overeno)) chyby.push("overeno není platné datum");

  /*
    Dva zdroje, a každý z jiné domény. Dvakrát tentýž web přebírající tutéž
    agenturní zprávu není potvrzení — je to jedna zpráva ve dvou oknech.
  */
  const zdroje = Array.isArray(v.zdroje) ? v.zdroje : [];
  const adresy = zdroje.filter((z) => /^https?:\/\//.test(z?.url ?? ""));
  if (adresy.length < 2) chyby.push("výstraha potřebuje aspoň dva zdroje s adresou");
  const domeny = new Set(adresy.map((z) => hostitel(z.url)).filter(Boolean));
  if (adresy.length >= 2 && domeny.size < 2) chyby.push("oba zdroje jsou ze stejné domény");
  for (const z of zdroje) {
    if (!je(z?.nazev)) chyby.push("zdroj bez názvu");
    if (!datum(z?.publikovano)) chyby.push(`zdroj „${z?.nazev ?? "?"}“ bez data vydání`);
  }

  /*
    Zdroj vydaný dřív, než se věc stala, ji nemůže dokládat. Je to táž chyba,
    kterou tenhle web jednou pustil ven u moldavského záznamu.
  */
  if (datum(v.kdy)) {
    const kdy = new Date(v.kdy).getTime();
    for (const z of zdroje) {
      if (!datum(z?.publikovano)) continue;
      if (new Date(z.publikovano).getTime() < kdy - 86_400_000) {
        chyby.push(`zdroj „${z.nazev}“ vyšel dřív než sama událost`);
      }
    }
  }

  if (!Array.isArray(v.coToNeznamena) || v.coToNeznamena.length === 0) {
    chyby.push("chybí „co to neznamená“ — bez toho je z výstrahy poplach");
  }

  const text = `${v.nadpis ?? ""} ${v.text ?? ""} ${(v.coToZnamena ?? []).join(" ")} ${(v.coToNeznamena ?? []).join(" ")}`.toLowerCase();
  for (const r of RADY) {
    if (text.includes(r)) chyby.push(`výstraha radí, co má člověk dělat („${r}“) — to tenhle web nedělá`);
  }
  if (/[!]/.test(`${v.nadpis ?? ""}${v.text ?? ""}`)) chyby.push("vykřičník ve výstraze — pruh je vážný sám o sobě");

  return chyby;
}

export { DRUHY };
