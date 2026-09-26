import soubor from "../../data/uspechy.json";
import type { Incident } from "./typy";

/*
  Zásahy složek (26. 9. 2026; do 26. 9. „Úspěchy složek“ — přejmenováno,
  viz KARTA níž): co bezpečnostní složky a úřady oznámily — z NAŠICH
  OVĚŘENÝCH ZÁZNAMŮ, nic navíc.

  Pravidla, aby se sem nedostalo nic, co úspěch není:
  - jen ověřené záznamy (člověkem nebo úředním zdrojem), ne archivní;
  - jen za posledních OKNO_DNI dní (obojí mimo Česko — viz níže);
  - bez zemí, jejichž „zadržení“ je krokem protivníka (RU, BY) a bez
    moře/neurčeného místa (XZ);
  - v názvu nebo prvním faktu musí být skutek složky (zadržení, obžaloba,
    zmaření, vyhoštění, sestřelení…) a záznam musí patřit k našim tématům;
  - ruční výjimky a zařazení v data/uspechy.json.
*/

export const OKNO_DNI = 180;
/*
  Česko je bez časového okna a bere i archivní záznamy: úspěchy českých
  složek v našich tématech jsou vzácné (k 26. 9. 2026 za půl roku ani jeden
  ověřený) a filtr „Česko“ by byl trvale prázdný. Datum je u každé
  položky, takže stáří nikoho nezmate; v „Vše“ je řazení podle data
  odsune pod čerstvé evropské.
*/
const DEN = 86_400_000;
const PROTIVNIK = new Set(["RU", "BY", "XZ"]);
const TEMATA = new Set(["vysetrovani", "zpravodajske", "pravo", "sabotaz", "kyber", "drony", "hranice", "hybridni"]);

export type Slozka = "policie" | "zpravodajske" | "armada" | "kyber" | "diplomacie";

/*
  Texty karty (26. 9. 2026, CLAUDE.md pravidlo 6): popisujeme, co úřad sám
  oznámil — zadržení, obžalobu, rozsudek, sestřelení, vyhoštění. Nehodnotíme
  to jako „úspěch“ ani „vítězství“ a nepíšeme, proti komu krok směřuje:
  hodnocení kroku vůči konkrétnímu státu je stranění a provokace, kterou
  web dělat nesmí. Obviněný je podezřelý, ne pachatel (presumpce neviny).
  Hlídá to test testy/uspechy.test.ts (ZAKAZANE_V_TEXTECH).
*/
export const KARTA = {
  nazev: "Zásahy složek",
  napoveda:
    "Co bezpečnostní složky a úřady samy oznámily — zadržení, obžaloby, rozsudky, sestřelené drony, vyhoštění — v našich tématech. " +
    "Přebíráme jen to, co úřad zveřejnil, a nehodnotíme to. Obvinění není odsouzení: dokud nerozhodne soud, jde o podezřelé. " +
    "Nejdřív Česko — všechny naše ověřené záznamy bez ohledu na stáří, protože takových případů je málo; datum je u každého. " +
    "Pak V4 (Slovensko, Polsko, Maďarsko) a ostatní Evropa za posledního půl roku; zbytek světa jen pod „Vše“. Každá položka vede na zdroje.",
  prazdno: "Ve zvolené oblasti zatím nemáme ověřený záznam o zásahu složek.",
};

export const SLOZKY: { klic: Slozka; nazev: string; popis: string }[] = [
  { klic: "policie", nazev: "Policie a žalobci", popis: "Zadržení, obvinění, obžaloby a rozsudky, jak je oznámily policie, státní zastupitelství a soudy." },
  { klic: "zpravodajske", nazev: "Zpravodajské služby", popis: "Případy, které zpravodajské služby nebo žalobci zveřejnili." },
  { klic: "armada", nazev: "Armáda a obrana", popis: "Sestřelené drony a zachycená narušení vzdušného prostoru podle armád." },
  { klic: "kyber", nazev: "Kyberbezpečnost", popis: "Kybernetické útoky, které úřady oznámily jako odražené nebo zastavené." },
  { klic: "diplomacie", nazev: "Vlády a diplomacie", popis: "Vyhoštění diplomatů a další kroky vlád, jak je samy oznámily." },
];

/** Slova, která v textech karty nesmí být — hodnotí, straní nebo předjímají vinu. */
export const ZAKAZANE_V_TEXTECH = /úspěch|vítěz|porážk|porazil|pachatel|proti\s|nepřítel|protivník/i;

const SKUTEK = /zatk|zadrž|zadrz|obvin|obžal|obzal|odsou[zd]|odhal|zmař|zmar|překaz|prekaz|zabrán|zabran|rozbil|zneškod|znesk|sestřel|sestrel|zachyt|vyhost|vyhoštěn|arrest|detain|charged|indict|convict|foil|thwart|shot down|intercept|expel/i;

const PRAVIDLA: [Slozka, RegExp][] = [
  ["kyber", /kyber|cyber|NÚKIB|NUKIB|CERT|hacker|ransomware/i],
  ["armada", /sestřel|sestrel|shot down|stíhač|stihac|protivzdušn|air defen|armád|armad|vojsk|intercept/i],
  ["diplomacie", /vyhost|vyhoštěn|expel|diplomat|persona non grata|sankc/i],
  ["zpravodajske", /BIS\b|ABW|BfV|MI5|SÄPO|SAPO|kontrarozvěd|kontrarozved|zpravodaj|intelligence|špion|spion|GRU|FSB|agent/i],
  ["policie", /polic|police|žalob|zalob|zastupitel|prokur|soud|odsou[zd]|convict|zatk|zadrž|zadrz|obvin|obžal|arrest|charged|indict/i],
];

/*
  Pořadí podle blízkosti (rozhodnutí provozovatelky 26. 9. 2026): nejdřív
  Česko, pak V4 (Slovensko, Polsko, Maďarsko), pak ostatní Evropa. Karta
  otevírá Česko; „Vše“ je poslední a řadí podle data.
*/
export type Oblast = "cr" | "v4" | "evropa" | "vse";

export const OBLASTI: { klic: Oblast; nazev: string }[] = [
  { klic: "cr", nazev: "Česko" },
  { klic: "v4", nazev: "V4" },
  { klic: "evropa", nazev: "Evropa" },
  { klic: "vse", nazev: "Vše" },
];

const V4 = new Set(["SK", "PL", "HU"]);

/*
  Ostatní evropské státy (a „EU“ pro celounijní kroky). Seznam, ne „všechno
  ostatní“: obžaloba v USA by jinak ve filtru „Evropa“ klamala. Co tu není,
  se ukáže jen pod „Vše“. Rusko a Bělorusko vyřadí už výběr.
*/
const EVROPA = new Set([
  "AL", "AD", "AT", "BA", "BE", "BG", "CH", "CY", "DE", "DK", "EE", "ES", "EU", "FI", "FR", "GB", "GR", "HR", "IE", "IS",
  "IT", "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PT", "RO", "RS", "SE", "SI", "SM", "UA", "VA", "XK",
]);

export const vOblasti = (u: Pick<Uspech, "kodZeme">, o: Oblast) =>
  o === "vse" || (o === "cr" ? u.kodZeme === "CZ" : o === "v4" ? V4.has(u.kodZeme) : EVROPA.has(u.kodZeme));

export interface Uspech {
  slug: string;
  titulek: string;
  datum: string;
  kodZeme: string;
  zeme: string;
  slozka: Slozka;
  coSeStalo: string;
}

export function vyberUspechy(
  zaznamy: Incident[],
  ted = Date.now(),
  upravy: { vyloucene: string[]; slozka: Record<string, string> } = soubor,
): Uspech[] {
  const vyloucene = new Set(upravy.vyloucene);
  const vysledek: Uspech[] = [];
  for (const i of zaznamy) {
    const cr = i.kodZeme === "CZ";
    if (vyloucene.has(i.slug) || (i.archivniZaznam && !cr) || PROTIVNIK.has(i.kodZeme)) continue;
    if (!(i.lidskyOvereno || i.overeni === "automaticke")) continue;
    const kdy = Date.parse(i.datumZjisteni ?? i.datumUdalosti);
    if (Number.isNaN(kdy) || (!cr && ted - kdy > OKNO_DNI * DEN)) continue;
    if (!(i.kategorie ?? []).some((k) => TEMATA.has(k))) continue;
    const text = `${i.titulek} ${i.kratkyTitulek ?? ""} ${i.fakta?.[0] ?? ""}`;
    if (!SKUTEK.test(text)) continue;
    const rucne = upravy.slozka[i.slug] as Slozka | undefined;
    const slozka = rucne ?? PRAVIDLA.find(([, re]) => re.test(text))?.[0];
    if (!slozka) continue;
    /*
      Karta má ukázat zásah složky, ne původní čin: „Autobusy Klíčov“ a první fakt
      o zapálení autobusů by v Zásazích působily jako hrozba. Proto titulek
      a fakt, který skutek složky jmenuje, a teprve pak ty první.
    */
    const titulek = i.kratkyTitulek && SKUTEK.test(i.kratkyTitulek) ? i.kratkyTitulek : SKUTEK.test(i.titulek) ? i.titulek : i.kratkyTitulek || i.titulek;
    const coSeStalo = (i.fakta ?? []).find((f) => SKUTEK.test(f)) ?? i.fakta?.[0] ?? "";
    vysledek.push({ slug: i.slug, titulek, datum: i.datumUdalosti, kodZeme: i.kodZeme, zeme: i.zeme, slozka, coSeStalo });
  }
  return vysledek.sort((a, b) => b.datum.localeCompare(a.datum));
}
