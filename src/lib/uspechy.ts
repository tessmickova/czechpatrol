import soubor from "../../data/uspechy.json";
import type { Incident } from "./typy";

/*
  Úspěchy složek (26. 9. 2026): co bezpečnostní složky odvrátily, odhalily
  nebo dotáhly k soudu — z NAŠICH OVĚŘENÝCH ZÁZNAMŮ, nic navíc.

  Pravidla, aby se sem nedostalo nic, co úspěch není:
  - jen ověřené záznamy (člověkem nebo úředním zdrojem), ne archivní;
  - jen za posledních OKNO_DNI dní;
  - bez zemí, jejichž „zadržení“ je krokem protivníka (RU, BY) a bez
    moře/neurčeného místa (XZ);
  - v názvu nebo prvním faktu musí být skutek složky (zadržení, obžaloba,
    zmaření, vyhoštění, sestřelení…) a záznam musí patřit k našim tématům;
  - ruční výjimky a zařazení v data/uspechy.json.
*/

export const OKNO_DNI = 180;
const DEN = 86_400_000;
const PROTIVNIK = new Set(["RU", "BY", "XZ"]);
const TEMATA = new Set(["vysetrovani", "zpravodajske", "pravo", "sabotaz", "kyber", "drony", "hranice", "hybridni"]);

export type Slozka = "policie" | "zpravodajske" | "armada" | "kyber" | "diplomacie";

export const SLOZKY: { klic: Slozka; nazev: string; popis: string }[] = [
  { klic: "policie", nazev: "Policie a žalobci", popis: "Zadržení, obvinění a obžaloby pachatelů sabotáží, špionáže a útoků." },
  { klic: "zpravodajske", nazev: "Zpravodajské služby", popis: "Odhalené sítě, zmařené operace a kontrarozvědka." },
  { klic: "armada", nazev: "Armáda a obrana", popis: "Sestřelené drony, zachycené průniky, ochrana vzdušného prostoru." },
  { klic: "kyber", nazev: "Kyberbezpečnost", popis: "Odražené a zneškodněné kybernetické útoky." },
  { klic: "diplomacie", nazev: "Vlády a diplomacie", popis: "Vyhoštění agentů a kroky vlád proti vlivovým operacím." },
];

const SKUTEK = /zatk|zadrž|zadrz|obvin|obžal|obzal|odsouz|odhal|zmař|zmar|překaz|prekaz|zabrán|zabran|rozbil|zneškod|znesk|sestřel|sestrel|zachyt|vyhost|vyhoštěn|arrest|detain|charged|indict|convict|foil|thwart|shot down|intercept|expel/i;

const PRAVIDLA: [Slozka, RegExp][] = [
  ["kyber", /kyber|cyber|NÚKIB|NUKIB|CERT|hacker|ransomware/i],
  ["armada", /sestřel|sestrel|shot down|stíhač|stihac|protivzdušn|air defen|armád|armad|vojsk|intercept/i],
  ["diplomacie", /vyhost|vyhoštěn|expel|diplomat|persona non grata|sankc/i],
  ["zpravodajske", /BIS\b|ABW|BfV|MI5|SÄPO|SAPO|kontrarozvěd|kontrarozved|zpravodaj|intelligence|špion|spion|GRU|FSB|agent/i],
  ["policie", /polic|police|žalob|zalob|zastupitel|prokur|soud|zatk|zadrž|zadrz|obvin|obžal|arrest|charged|indict/i],
];

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
    if (vyloucene.has(i.slug) || i.archivniZaznam || PROTIVNIK.has(i.kodZeme)) continue;
    if (!(i.lidskyOvereno || i.overeni === "automaticke")) continue;
    const kdy = Date.parse(i.datumZjisteni ?? i.datumUdalosti);
    if (Number.isNaN(kdy) || ted - kdy > OKNO_DNI * DEN) continue;
    if (!(i.kategorie ?? []).some((k) => TEMATA.has(k))) continue;
    const text = `${i.titulek} ${i.kratkyTitulek ?? ""} ${i.fakta?.[0] ?? ""}`;
    if (!SKUTEK.test(text)) continue;
    const rucne = upravy.slozka[i.slug] as Slozka | undefined;
    const slozka = rucne ?? PRAVIDLA.find(([, re]) => re.test(text))?.[0];
    if (!slozka) continue;
    vysledek.push({ slug: i.slug, titulek: i.kratkyTitulek || i.titulek, datum: i.datumUdalosti, kodZeme: i.kodZeme, zeme: i.zeme, slozka, coSeStalo: i.fakta?.[0] ?? "" });
  }
  return vysledek.sort((a, b) => b.datum.localeCompare(a.datum));
}
