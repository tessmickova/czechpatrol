import napadane from "../../data/napadane-redakce.json";
import type { DataNapadanych } from "../../nastroje/napadane-redakce.mjs";
import { domenaZdroje, jeFalesnaRedakce, jeNapadenaRedakce } from "../../nastroje/redakce-pravidla.mjs";
import { seskupSignaly } from "./signaly";

/*
  Odchylky mezi zdroji o téže události (9. 11. 2026, provozovatelka: „pokud
  je nějaká stránka média napadena a píšou tam, že je jaderný útok, nebo
  naopak, že se nic neděje, a v jiných seriózních je to jinak, označíme to
  jako podezřelé“).

  Pevná pravidla, žádný model. Co zdroj tvrdí = jeho titulek a shrnutí;
  zda o tom píšou ostatní = i jejich výřez článku.
  - PODEZŘELÉ: mimořádné tvrzení (jaderný útok, vyhlášení války, invaze do
    Česka nebo země NATO, vyhlášená mobilizace, článek 5, útok na Česko,
    evakuace celého města), které aspoň dva jiné zdroje o téže události
    neuvádějí; napodobenina redakce; napadená redakce s vlastním odlišným
    tvrzením.
  - LIŠÍ SE (odlisne): totéž proti jedinému jinému zdroji; popření („nic se
    nestalo“) proti aspoň dvěma zdrojům, které událost uvádějí; mimořádné
    tvrzení zatím jen z jednoho zdroje.
  Úřední zdroj (primární) se neoznačuje: jeho popření je zpráva, ne
  manipulace. Zápor, hrozba, cvičení a výročí u mimořádného slova („nejde
  o jaderný útok“, „hrozí jaderným úderem“) se nepočítají. Počty obětí se
  záměrně neporovnávají: v prvních hodinách se mění u všech redakcí.
  Označení říká „liší se od ostatních“, ne „je to lež“.

  Počítá se při sestavení stránky; do prohlížeče jde jen výsledek, ne text
  článků (výřez se z dat pro prohlížeč odstraní).
*/
const NAPADANE = napadane as DataNapadanych;

export interface OdchylkaKandidata {
  uroven: "podezrele" | "odlisne";
  duvody: string[];
}

type Vstup = {
  id: string;
  titulek: string;
  shrnuti?: string | null;
  kodZeme: string | null;
  publikovano?: string | null;
  zachyceno: string;
  naliehave?: { druh: string } | null;
  zdroj: { nazev: string; url: string; primarni?: boolean };
  vyrez?: { text?: string | null } | null;
};

const bez = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/*
  Mimořádná tvrzení. Normalizovaný text: malá písmena, bez diakritiky.
  Invaze jen do Česka nebo země NATO u Ruska: „ruská invaze na Ukrajinu“
  je kontext skoro každé zprávy o válce, ne nové tvrzení (první průchod
  nad frontou 9. 11. 2026 jím označil 14 zpráv ČTK, všechny omylem).
*/
const ZEME_NATO = "(polsk\\w*|polska|pobalt\\w*|litv\\w*|lotys\\w*|eston\\w*|finsk\\w*|cesk\\w*|cesko|slovensk\\w*|nemeck\\w*|rumunsk\\w*|poland|baltic\\w*|lithuania|latvia|estonia|finland|czech\\w*|slovakia|germany|romania)";
const MIMORADNE: { klic: string; nazev: string; re: RegExp }[] = [
  { klic: "jaderny", nazev: "jaderný útok", re: /(jadern\w*|atomov\w*|nuklearn\w*)\s+(utok\w*|uder\w*|vybuch\w*|explozi?\w*)|nuclear\s+(attack|strike|explosion|detonation|blast)/g },
  { klic: "valka", nazev: "vyhlášení války", re: /vyhlasil\w*\s+valku|vyhlaseni\s+valky|declared\s+war|declaration\s+of\s+war/g },
  { klic: "invaze", nazev: "invaze do země NATO", re: new RegExp(`invaz\\w*\\s+(do|na)\\s+${ZEME_NATO}|invaded\\s+${ZEME_NATO}|invasion\\s+of\\s+${ZEME_NATO}`, "g") },
  { klic: "mobilizace", nazev: "vyhlášená mobilizace", re: /vyhlasil\w*\s+(vseobecnou\s+|castecnou\s+)?mobilizac\w*|general\s+mobili[sz]ation|full\s+mobili[sz]ation/g },
  { klic: "clanek5", nazev: "aktivace článku 5 NATO", re: /(aktivoval\w*|aktivace|aktivaci|invok\w*|invoked|triggered)\s+(clanek|clanku|article)\s+5/g },
  { klic: "utok-cr", nazev: "útok na Česko", re: /(utok\w*|uder\w*)\s+na\s+(ceskou\s+republiku|cesko|prahu)\b|attack\s+on\s+(the\s+)?czech|strike\s+on\s+prague/g },
  { klic: "evakuace", nazev: "evakuace celého města nebo země", re: /evakuac\w*\s+(celeho|cele|celou)\s+(mesta|zeme|prahy|republiky)|evakuac\w*\s+prahy|evacuat\w*\s+(the\s+)?(entire|whole)\s+(city|capital|country)/g },
];
const POPRENI = /nic\s+se\s+(nestalo|nedeje)|vse\s+je\s+v\s+poradku|zadne\s+nebezpeci\s+(nehrozi|neni)|k\s+zadnemu\s+utoku\s+nedoslo|utok\s+se\s+nekonal|zprava\s+je\s+(falesna|vymyslena|smyslena)|nothing\s+happened|there\s+is\s+no\s+(threat|danger)|no\s+attack\s+(took\s+place|happened|occurred)/;
/* Zápor nebo podmínka těsně před mimořádným slovem: „nejde o jaderný útok“, „hrozí jaderným úderem“, „no nuclear attack“. */
const ZAPOR = /(\bne(jde|ni|bylo?|byl[ai]?|doslo|hrozi|potvrdil\w*|potvrzuj\w*|existuje|slo)?\b|\bzadn\w*|\bbez\b|\bno\b|\bnot\b|\bnever\b|\bdenied\b|\bpopr\w*|\bvyvrat\w*|\bhroz\w*|\bvaruj\w*|\bpohroz\w*|\bobav\w*|\briziko|\bmozn\w*|\bcvic\w*|\bsimul\w*|\bthreat\w*|\bwarn\w*|\bfear\w*|\brisk\w*|\bcould\b|\bwould\b|\bmight\b|\bdrill\w*|\bexercise\w*|\bif\b|\bpokud\b|\bkdyby\b)\s+(\S+\s+){0,3}$/;
/* Totéž za slovem: „jaderný útok – cvičení“, „nuclear strike drill“, „81 let od jaderného útoku“. */
const KONTEXT_ZA = /^\S*\s*(\S+\s+){0,2}(cvic\w*|simul\w*|doktrin\w*|drill|exercise|doctrine|scenar\w*|hrozb\w*|threat\w*)/;
const VYROCI = /vyroci|\blet\s+od\b|anniversary|years\s+(since|after|ago)|hirosim|nagasak|hiroshima|nagasaki|1945/;

/*
  Co tvrdí sám zdroj = titulek a shrnutí (to vidí čtenář a to je hlavní
  sdělení). Zda o tom píšou ostatní = i jejich výřez článku: ať se zdroj
  neoznačí jen proto, že ostatní totéž zmínili až v textu.
*/
interface Rozbor { mimoradne: Set<string>; zminuje: Set<string>; popreni: boolean; domena: string | null }

function mimoradneV(t: string): Set<string> {
  const vys = new Set<string>();
  if (VYROCI.test(t)) return vys;
  for (const m of MIMORADNE) {
    for (const shoda of t.matchAll(m.re)) {
      const i = shoda.index ?? 0;
      const pred = t.slice(Math.max(0, i - 40), i);
      const za = t.slice(i + shoda[0].length, i + shoda[0].length + 40);
      if (!ZAPOR.test(pred) && !KONTEXT_ZA.test(za)) { vys.add(m.klic); break; }
    }
  }
  return vys;
}

function rozbor(k: Vstup): Rozbor {
  const hlavni = bez(`${k.titulek} ${k.shrnuti ?? ""}`);
  const cele = bez(`${k.titulek} ${k.shrnuti ?? ""} ${k.vyrez?.text ?? ""}`);
  /* Zmínka u ostatních se bere volně: i podmíněná nebo popřená zmínka znamená, že o tom téma ví. */
  const zminuje = new Set(MIMORADNE.filter((m) => new RegExp(m.re.source).test(cele)).map((m) => m.klic));
  return { mimoradne: mimoradneV(hlavni), zminuje, popreni: POPRENI.test(hlavni), domena: domenaZdroje(k.zdroj.url) };
}

const nazev = (klic: string) => MIMORADNE.find((m) => m.klic === klic)?.nazev ?? klic;

/** Odchylky v jedné skupině zpráv o téže události. Klíč = id zprávy. */
export function odchylkySkupiny(polozky: readonly Vstup[], ted = Date.now(), NAP: DataNapadanych = NAPADANE): Map<string, OdchylkaKandidata> {
  const vysledek = new Map<string, OdchylkaKandidata>();
  const rozbory = new Map(polozky.map((p) => [p.id, rozbor(p)]));
  const pridej = (id: string, uroven: OdchylkaKandidata["uroven"], duvod: string) => {
    const o = vysledek.get(id) ?? { uroven, duvody: [] };
    if (uroven === "podezrele") o.uroven = "podezrele";
    if (!o.duvody.includes(duvod)) o.duvody.push(duvod);
    vysledek.set(id, o);
  };
  for (const p of polozky) {
    const r = rozbory.get(p.id)!;
    const falesna = jeFalesnaRedakce(p.zdroj, NAP);
    const napadena = jeNapadenaRedakce(p.zdroj, NAP, ted);
    if (falesna) pridej(p.id, "podezrele", `napodobenina redakce (${r.domena ?? p.zdroj.nazev})`);
    /* Ostatní zdroje: jiná doména, ne napodobenina. */
    const ostatni = polozky.filter((q) => q.id !== p.id && rozbory.get(q.id)!.domena !== r.domena && !jeFalesnaRedakce(q.zdroj, NAP));
    const domenOstatnich = new Set(ostatni.map((q) => rozbory.get(q.id)!.domena)).size;
    let vlastniOdchylka = false;
    if (!p.zdroj.primarni && domenOstatnich >= 1) {
      const jen = [...r.mimoradne].filter((k) => !ostatni.some((q) => rozbory.get(q.id)!.zminuje.has(k)));
      if (jen.length) {
        vlastniOdchylka = true;
        pridej(p.id, domenOstatnich >= 2 || napadena ? "podezrele" : "odlisne", `jen tento zdroj uvádí „${jen.map(nazev).join("“, „")}“; ${domenOstatnich === 1 ? "jiný zdroj" : `${domenOstatnich} jiné zdroje`} o téže události ne`);
      }
      const uvadejiUdalost = ostatni.filter((q) => !rozbory.get(q.id)!.popreni);
      if (r.popreni && new Set(uvadejiUdalost.map((q) => rozbory.get(q.id)!.domena)).size >= 2) {
        vlastniOdchylka = true;
        pridej(p.id, napadena ? "podezrele" : "odlisne", "tvrdí, že se nic nestalo, jiné zdroje událost uvádějí");
      }
    }
    /* Napadená redakce sama o sobě odchylka není — jen zesílí tu, kterou zpráva má. */
    if (napadena && vlastniOdchylka) pridej(p.id, "podezrele", "redakce s doloženým průnikem útočníků");
    if (!p.zdroj.primarni && domenOstatnich === 0 && r.mimoradne.size) {
      pridej(p.id, napadena || falesna ? "podezrele" : "odlisne", `mimořádné tvrzení („${[...r.mimoradne].map(nazev).join("“, „")}“) zatím jen z jednoho zdroje`);
    }
  }
  return vysledek;
}

/**
 * Zprávy s vyznačenou odchylkou a bez textu článku (do prohlížeče). Skupiny
 * jsou tytéž jako ve sloupci Signály z médií (seskupSignaly nad stejným seznamem).
 */
export function sOdchylkami<K extends Vstup>(kandidati: readonly K[], ted = Date.now()): (Omit<K, "vyrez"> & { odchylka: OdchylkaKandidata | null })[] {
  const odchylky = new Map<string, OdchylkaKandidata>();
  for (const g of seskupSignaly(kandidati as unknown as (K & { naliehave?: { druh: string } | null })[])) {
    for (const [id, o] of odchylkySkupiny(g.polozky, ted)) odchylky.set(id, o);
  }
  return kandidati.map(({ vyrez: _v, ...k }) => ({ ...(k as Omit<K, "vyrez">), odchylka: odchylky.get(k.id) ?? null }));
}
