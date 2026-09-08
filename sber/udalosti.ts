import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ctiRss, normalizuj, stahni } from "./nacti";
import { ZDROJE_UDALOSTI, type ZdrojUdalosti } from "./zdroje-udalosti";

/*
  Automatický sběr událostí.

  Každou hodinu projde RSS kanály, vybere zprávy, které odpovídají
  sledovaným tématům, odhadne zemi a oblast a zapíše je do
  data/kandidati.json. Web je ukáže hned — jako „automaticky zachyceno,
  čeká na ověření“. Do počtů a hodnocení nevstupují, dokud je člověk
  nepřevezme do data/incidenty.json (nastroje/prijmi-kandidata.mjs).

  Je-li k dispozici ANTHROPIC_API_KEY, model každého nového kandidáta
  přečte, vyřadí nerelevantní a doplní český titulek, shrnutí, zemi
  a oblast. Bez klíče se použijí jen pravidla podle klíčových slov.
*/

export interface Kandidat {
  id: string;
  zachyceno: string;
  publikovano: string | null;
  zdroj: { nazev: string; url: string; typ: "primary" | "wire" | "media"; primarni: boolean };
  titulek: string;
  titulekPuvodni: string;
  shrnuti: string;
  kodZeme: string | null;
  zeme: string | null;
  kategorie: string[];
  druhOdhad: "pripad" | "opatreni" | "reakce" | "neurceno";
  klasifikace: "pravidla" | "model";
  shody: string[];
  stav: "ceka";
}

const KOREN = path.join(process.cwd(), "data");
const SOUBOR = path.join(KOREN, "kandidati.json");
const DNI_ZPET = 21;
const MAX_KANDIDATU = 200;

/*
  Co sem patří a co ne.

  Web není zpravodajství. Sbírá jen skutky, které mění bezpečnostní situaci,
  a úřední rozhodnutí, která ji mění formálně — nebo doložený a konkrétní krok
  k nim. Prohlášení, sliby, plány, jednání vlády o cenách nebo důchodech sem
  nepatří, i když v nich zazní slovo „bezpečnost“.

  Proto je podmínka dvojí: zpráva musí obsahovat SKUTEK (seznam `AKTY`)
  a musí mít místo (zemi nebo alianci). Ostatní slova (`KONTEXT`) samy o sobě
  nestačí, jen zprávě přidají oblast.
*/

/** Skutky a úřední rozhodnutí. Bez aspoň jednoho z nich se zpráva nezachytí. */
const AKTY: { kategorie: string; slova: string[] }[] = [
  { kategorie: "sabotaz", slova: [
    "sabotage", "sabotaz", "arson", "incendiary device", "zhar", "zharstvi", "zapalna lahev",
    "explosion", "vybuch", "vybusnina", "naloz", "bomb", "poskozeni kabelu", "preruseny kabel",
    "prestrizeny", "vykolejeni", "derailment",
  ] },
  { kategorie: "drony", slova: [
    "airspace violation", "violated airspace", "narusil vzdusny prostor", "naruseni vzdusneho prostoru",
    "sestrel", "shot down", "dopad dronu", "drone crash", "drone incursion",
    "uzavreni letiste", "airport closed", "pozastavila provoz letiste", "grounded flights",
  ] },
  { kategorie: "kyber", slova: [
    "cyberattack", "cyber attack", "kyberneticky utok", "kyberutok", "ransomware", "ddos utok", "ddos attack",
    "hacknut", "hacked", "data breach", "unik dat", "vyrazen z provozu",
  ] },
  { kategorie: "infrastruktura", slova: [
    "poskozen plynovod", "damaged pipeline", "vypadek proudu", "power outage", "blackout",
    "poskozena rozvodna", "utok na rozvodnu", "prerusena dodavka", "zastavena dodavka",
    "undersea cable damage", "subsea cable cut", "cable damaged", "poskozeny podmorsky kabel",
  ] },
  { kategorie: "zpravodajske", slova: [
    // Kmeny bez koncovky, aby čeština fungovala: „obvin“ najde obviněn i obvinilo.
    "zadrz", "zatc", "obvin", "obzalov", "odsoud", "arrested", "charged with", "indicted",
    "vyhost", "expelled diplomat", "odhalena sit", "spy network", "spionazni sit",
  ] },
  { kategorie: "pravo", slova: [
    "state of emergency", "vyhlasil nouzovy stav", "vyhlasila nouzovy stav", "nouzovy stav byl vyhlasen",
    "stav ohrozeni statu", "valecny stav", "vyjimecny stav", "martial law", "stanne pravo",
    "mobilizace vyhlasena", "vyhlasil mobilizaci", "castecna mobilizace", "mobilisation ordered",
    "branna povinnost", "odvody",
  ] },
  { kategorie: "nato", slova: [
    "article 4", "article 5", "clanek 4", "clanku 4", "clanek 5", "clanku 5",
    "aktivovala clanek", "invoked article", "nato scrambled", "vzlétly stihacky", "vzletly stihacky",
    "rozmisteni sil", "deployment of troops", "posili vychodni kridlo", "reinforce eastern flank",
  ] },
  { kategorie: "hranice", slova: [
    // Kontroly na hranicích a vojáci u nich jsou pro čtenáře v Česku to nejviditelnější,
    // co stát dělá. Seznam proto pokrývá i české tvary a cvičení — zachytit se to musí,
    // roztřídit na skutečné zavedení a na nácvik umí až ověření.
    "uzavreni hranic", "uzavrela hranice", "closed the border", "border closure",
    "hranicni kontroly", "kontroly na hranici", "kontroly na hranicich", "kontrol na hranicich",
    "znovuzavedeni kontrol", "znovuzavedeni hranicnich kontrol", "obnovi kontroly", "obnovila kontroly",
    "zavede kontroly", "zavedla kontroly", "namatkove kontroly", "ostraha hranic", "ochrana hranic",
    "border checks", "border controls", "checks at the border",
    "cviceni na hranici", "cviceni na statni hranici", "cviceni ke znovuzavedeni", "hranicni cviceni",
    "evakuace obyvatel", "evacuation ordered",
  ] },
  { kategorie: "vojsko", slova: [
    "nasazeni vojaku", "nasadi vojaky", "nasadila vojaky", "vojaci na hranicich", "armada na hranicich",
    "aktivni zaloha", "povolani zalohy", "troops deployed", "deploy troops", "soldiers deployed",
    "military deployment", "mimoradna pohotovost",
  ] },
  { kategorie: "hybridni", slova: [
    "utok na", "attack on", "strela dopadla", "missile struck", "raketa dopadla", "ostrelovani",
  ] },
];

/**
 * Dvojice slov, které samy o sobě nic neznamenají, ale spolu ano.
 *
 * Čeština si slova přehazuje: „policie chystá na hranici se Slovenskem cvičení“
 * neobsahuje souvislou frázi „cvičení na hranici“, a hledání celých frází to
 * proto minulo. Stačí, když se v textu potkají slova z obou sloupců.
 */
const AKTY_KOMBINACE: { kategorie: string; a: string[]; b: string[] }[] = [
  {
    kategorie: "hranice",
    a: ["hranic", "border", "prechod"],
    b: ["kontrol", "cviceni", "uzavr", "vojak", "vojaci", "armad", "celnic", "zaloh", "checks", "closed", "exercise", "troops", "soldiers"],
  },
  {
    kategorie: "vojsko",
    a: ["vojak", "vojaci", "armad", "zaloh", "troops", "soldiers"],
    b: ["nasazen", "nasadi", "povolan", "hlidk", "deployed", "deploy", "mobiliz"],
  },
];

/** Slova, která zprávě jen přidají oblast. Samy o sobě nikdy nestačí. */
const KONTEXT: { kategorie: string; slova: string[] }[] = [
  { kategorie: "drony", slova: ["dron", "drone", "uav", "vzdusny prostor", "airspace"] },
  { kategorie: "kyber", slova: ["nukib", "kybernetick", "cyber"] },
  { kategorie: "infrastruktura", slova: [
    "plynovod", "pipeline", "rozvodna", "substation", "power grid", "podmorsky kabel",
    "undersea cable", "subsea cable", "zeleznic", "railway", "elektrarna", "power plant",
    "kriticka infrastruktura", "critical infrastructure",
  ] },
  { kategorie: "zpravodajske", slova: ["spionaz", "espionage", "gru", "fsb", "bezpecnostni informacni sluzba", "kontrarozvedka"] },
  { kategorie: "hybridni", slova: ["hybridni", "hybrid warfare", "ruska stopa", "russia-linked", "kremlin-linked"] },
  { kategorie: "nato", slova: ["nato", "aliance", "vychodni kridlo", "eastern flank"] },
  { kategorie: "hranice", slova: ["hranice", "hranicni prechod", "schengen", "border"] },
  { kategorie: "vojsko", slova: ["armada", "vojak", "vojaci", "policie", "celnici"] },
  { kategorie: "rusko", slova: ["rusk", "russia", "kreml", "kremlin"] },
];

/**
 * Témata, která do bezpečnostního přehledu nepatří, i kdyby v textu skutek zazněl.
 * Domácí politika a ekonomika jsou plné slov jako „útok“ nebo „krize“.
 */
const VYLOUCIT = [
  // sport, kultura, spotřeba
  "fotbal", "football", "hokej", "hockey", "liga", "zapas", "gol", "film", "koncert", "concert",
  "recept", "recipe", "horoskop", "celebrity", "smartphone", "sleva", "sale",
  // domácí politika a ekonomika
  "ceny pohonnych hmot", "pohonnych hmot", "benzin", "nafta zdrazila", "duchod", "duchodu", "duchodova reforma",
  "rozpocet", "rozpoctu", "dane", "dani", "inflace", "mzdy", "platy", "dotace",
  "koalice", "opozice", "snemovna", "volby", "volebni", "kampan", "ministr financi",
  "skolstvi", "zdravotnictvi", "pojistovna", "hypoteky", "akcie", "burza", "kurz koruny",
  // předpovědi počasí a nehody bez bezpečnostního rozměru
  "pocasi", "predpoved pocasi", "dopravni nehoda", "srazka aut",
];

const ZEME: { kod: string; nazev: string; slova: string[] }[] = [
  { kod: "CZ", nazev: "Česko", slova: ["czech", "cesko", "ceska republika", "ceske", " cr ", "policie cr", "praha", "praze", "prague", "brno", "brne", "ostrav"] },
  { kod: "SK", nazev: "Slovensko", slova: ["slovak", "slovensk", "bratislav", "kosic"] },
  { kod: "PL", nazev: "Polsko", slova: ["poland", "polish", "polsk", "warsaw", "varsav", "rzeszow", "gdansk"] },
  { kod: "DE", nazev: "Německo", slova: ["germany", "german", "nemeck", "berlin", "hamburg", "leipzig", "munich", "mnichov", "bundeswehr"] },
  { kod: "AT", nazev: "Rakousko", slova: ["austria", "rakousk", "vienna", "viden"] },
  { kod: "HU", nazev: "Maďarsko", slova: ["hungary", "hungarian", "madarsk", "budapest"] },
  { kod: "LT", nazev: "Litva", slova: ["lithuania", "litv", "vilnius", "klaipeda"] },
  { kod: "LV", nazev: "Lotyšsko", slova: ["latvia", "lotys", "riga"] },
  { kod: "EE", nazev: "Estonsko", slova: ["estonia", "estonsk", "tallinn", "narva"] },
  { kod: "FI", nazev: "Finsko", slova: ["finland", "finnish", "finsk", "helsinki", "helsink"] },
  { kod: "SE", nazev: "Švédsko", slova: ["sweden", "swedish", "svedsk", "stockholm", "gotland"] },
  { kod: "NO", nazev: "Norsko", slova: ["norway", "norwegian", "norsk", "oslo"] },
  { kod: "DK", nazev: "Dánsko", slova: ["denmark", "danish", "dansk", "copenhagen", "kodan"] },
  { kod: "NL", nazev: "Nizozemsko", slova: ["netherlands", "dutch", "nizozem", "amsterdam", "hague", "haag"] },
  { kod: "BE", nazev: "Belgie", slova: ["belgium", "belgian", "belgi", "brussels", "brusel"] },
  { kod: "FR", nazev: "Francie", slova: ["france", "french", "francie", "francouz", "paris", "pariz"] },
  { kod: "GB", nazev: "Spojené království", slova: ["britain", "british", "uk ", "united kingdom", "britsk", "london", "londyn"] },
  { kod: "RO", nazev: "Rumunsko", slova: ["romania", "rumunsk", "bucharest", "bukurest"] },
  { kod: "BG", nazev: "Bulharsko", slova: ["bulgaria", "bulharsk", "sofia"] },
  { kod: "MD", nazev: "Moldavsko", slova: ["moldova", "moldav", "chisinau"] },
  { kod: "UA", nazev: "Ukrajina", slova: ["ukraine", "ukrainian", "ukrajin", "kyiv", "kyjev", "odesa", "lviv"] },
  { kod: "RU", nazev: "Rusko", slova: ["russia", "russian", "rusk", "moscow", "moskv", "kremlin", "kreml"] },
  { kod: "BY", nazev: "Bělorusko", slova: ["belarus", "belorus", "minsk"] },
  { kod: "IT", nazev: "Itálie", slova: ["italy", "italian", "itali", "rome", "rim "] },
  { kod: "ES", nazev: "Španělsko", slova: ["spain", "spanish", "spanel", "madrid"] },
  { kod: "EU", nazev: "EU", slova: ["european union", "european commission", "evropska unie", "evropska komise", " eu "] },
];

const nyni = () => new Date().toISOString();

function ctiKandidaty(): Kandidat[] {
  if (!fs.existsSync(SOUBOR)) return [];
  try {
    const stare = JSON.parse(fs.readFileSync(SOUBOR, "utf-8")) as Kandidat[];
    // Id se odvozuje z adresy; starší zápisy se přepočítají a duplicitní adresy se nechají jen jednou.
    const podleAdresy = new Map<string, Kandidat>();
    for (const k of stare) if (!podleAdresy.has(k.zdroj.url)) podleAdresy.set(k.zdroj.url, { ...k, id: kandidatId(k.zdroj.url) });
    return [...podleAdresy.values()];
  } catch { return []; }
}

/**
 * Id kandidáta z adresy. Otisk (hash) místo začátku adresy: odkazy z Google
 * News začínají stejně a zkrácený začátek dával všem stejné id.
 */
export function kandidatId(url: string): string {
  return `k-${createHash("sha256").update(url).digest("hex").slice(0, 16)}`;
}

/** Otisk titulku: prvních osm slov bez diakritiky — stejná zpráva z více redakcí se nezapíše dvakrát. */
export function otisk(titulek: string): string {
  return normalizuj(titulek).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
}

export function odhadniZemi(text: string): { kod: string; nazev: string } | null {
  const t = ` ${normalizuj(text)} `;
  // Rusko a Ukrajina bývají v každé zprávě zmíněné jako původce; rozhoduje první jiná země.
  const shody = ZEME.filter((z) => z.slova.some((s) => t.includes(s)));
  const jina = shody.find((z) => z.kod !== "RU" && z.kod !== "UA" && z.kod !== "BY");
  const v = jina ?? shody[0];
  return v ? { kod: v.kod, nazev: v.nazev } : null;
}

/**
 * Hledá slovo od začátku slova, ne kdekoli uvnitř. Bez toho se „bis“
 * (Bezpečnostní informační služba) trefilo doprostřed jména „Babiš“ a web
 * si od vlády o důchodech udělal zpravodajskou zprávu. Koncovka je povolená,
 * aby čeština fungovala: „sabotaz“ najde i „sabotáže“ a „sabotáží“.
 */
export function obsahujeSlovo(text: string, slovo: string): boolean {
  const vzor = slovo.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${vzor}[a-z]*([^a-z0-9]|$)`).test(text);
}

export function odhadniTemata(text: string): { kategorie: string[]; shody: string[]; akty: string[] } {
  const t = normalizuj(text);
  const kategorie: string[] = [];
  const shody: string[] = [];
  const akty: string[] = [];
  for (const skupina of AKTY) {
    const s = skupina.slova.filter((w) => obsahujeSlovo(t, w));
    if (s.length) { kategorie.push(skupina.kategorie); shody.push(...s); akty.push(...s); }
  }
  for (const k of AKTY_KOMBINACE) {
    const prvni = k.a.find((w) => obsahujeSlovo(t, w));
    const druhy = k.b.find((w) => obsahujeSlovo(t, w));
    if (prvni && druhy) { kategorie.push(k.kategorie); shody.push(`${prvni}+${druhy}`); akty.push(`${prvni}+${druhy}`); }
  }
  for (const skupina of KONTEXT) {
    const s = skupina.slova.filter((w) => obsahujeSlovo(t, w));
    if (s.length) { kategorie.push(skupina.kategorie); shody.push(...s); }
  }
  return { kategorie: [...new Set(kategorie)], shody: [...new Set(shody)], akty: [...new Set(akty)] };
}

/**
 * Zpráva se zachytí, jen když jde o skutek nebo úřední rozhodnutí a je jasné,
 * kde se to stalo. Prohlášení, sliby a plány jsou pro tenhle web šum, i když
 * mluví o bezpečnosti — do záznamů je smí zapsat jen člověk, a to jen tehdy,
 * když se vážou ke konkrétní věci.
 */
export function relevantni(text: string): boolean {
  const t = normalizuj(text);
  if (VYLOUCIT.some((w) => obsahujeSlovo(t, w))) return false;
  const { akty, kategorie } = odhadniTemata(text);
  if (!akty.length) return false;
  // Skutek bez místa je půlka informace. Alianční kontext místo nahradí.
  return Boolean(odhadniZemi(text)) || kategorie.includes("nato");
}

async function stahniZdroj(z: ZdrojUdalosti) {
  try {
    const { stav, telo } = await stahni(z.url, 2);
    if (stav >= 400) return { z, ok: false, polozky: [], chyba: `HTTP ${stav}` };
    return { z, ok: true, polozky: ctiRss(telo) };
  } catch (e) {
    return { z, ok: false, polozky: [], chyba: String(e instanceof Error ? e.message : e) };
  }
}

/** Uveřejněné adresy a otisky titulků — co už je v incidentech, nesmí být znovu kandidát. */
function znameZIncidentu(): { adresy: Set<string>; otisky: Set<string> } {
  const inc = JSON.parse(fs.readFileSync(path.join(KOREN, "incidenty.json"), "utf-8")) as { titulek: string; zdroje: { url: string }[] }[];
  return {
    adresy: new Set(inc.flatMap((i) => i.zdroje.map((s) => s.url)).filter(Boolean)),
    otisky: new Set(inc.map((i) => otisk(i.titulek))),
  };
}

/**
 * Doplnění modelem: vyřadí nerelevantní a přeloží do češtiny.
 * Bez klíče se přeskočí. Model nikdy nerozhoduje o zveřejnění — to dělá člověk.
 */
async function doplnModelem(nove: Kandidat[]): Promise<Kandidat[]> {
  if (!process.env.ANTHROPIC_API_KEY || !nove.length) return nove;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { z } = await import("zod");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const client = new Anthropic();

  const Vysledek = z.object({
    polozky: z.array(z.object({
      id: z.string(),
      relevantni: z.boolean(),
      titulekCs: z.string(),
      shrnutiCs: z.string(),
      kodZeme: z.string().nullable(),
      zeme: z.string().nullable(),
      kategorie: z.array(z.string()),
      druhOdhad: z.enum(["pripad", "opatreni", "reakce", "neurceno"]),
    })),
  });

  const vystup: Kandidat[] = [];
  for (let i = 0; i < nove.length; i += 25) {
    const davka = nove.slice(i, i + 25);
    try {
      const odpoved = await client.messages.parse({
        model: "claude-opus-5",
        max_tokens: 16000,
        output_config: { effort: "low", format: zodOutputFormat(Vysledek) },
        system: [
          "Třídíš zprávy pro český bezpečnostní přehled. Relevantní jsou jen SKUTEČNÉ události z Evropy: sabotáže, žhářství, útoky na infrastrukturu, narušení vzdušného prostoru, kybernetické útoky s dopadem, zatčení agentů, oficiální atribuce, kroky NATO/EU/vlád, mimořádná právní opatření.",
          "Nerelevantní: komentáře, analýzy bez nové skutečnosti, sport, kultura, obecná politika, válka na Ukrajině mimo dopad na NATO/EU, stará událost bez nového faktu.",
          "Pro relevantní napiš věcný český titulek (co se stalo, kde), jednu větu shrnutí bez hodnocení, kód země ISO-2 místa události (EU pro instituce EU, null neurčeno), český název země, oblasti z: cr, nato, hybridni, sabotaz, infrastruktura, drony, hranice, pravo, rusko, diplomacie, kyber, vysetrovani, zpravodajske; druhOdhad: pripad = reálná událost, opatreni = oficiální krok státu/aliance, reakce = prohlášení/varování, neurceno.",
          "Nic si nedomýšlej. Když zpráva neříká zemi, dej null. Vrať každé id přesně jednou.",
        ].join(" "),
        messages: [{ role: "user", content: JSON.stringify(davka.map((k) => ({ id: k.id, titulek: k.titulekPuvodni, shrnuti: k.shrnuti, zdroj: k.zdroj.nazev }))) }],
      });
      if (odpoved.stop_reason === "refusal" || !odpoved.parsed_output) { vystup.push(...davka); continue; }
      const podleId = new Map(odpoved.parsed_output.polozky.map((p) => [p.id, p]));
      for (const k of davka) {
        const p = podleId.get(k.id);
        if (!p) { vystup.push(k); continue; }
        if (!p.relevantni) continue;
        vystup.push({
          ...k,
          titulek: p.titulekCs || k.titulek,
          shrnuti: p.shrnutiCs || k.shrnuti,
          kodZeme: p.kodZeme ?? k.kodZeme,
          zeme: p.zeme ?? k.zeme,
          kategorie: p.kategorie.length ? p.kategorie : k.kategorie,
          druhOdhad: p.druhOdhad,
          klasifikace: "model",
        });
      }
    } catch (e) {
      console.log(`[sber/udalosti] model nedostupný, zůstávají pravidla: ${e instanceof Error ? e.message : e}`);
      vystup.push(...davka);
    }
  }
  return vystup;
}

export async function sbirejUdalosti(): Promise<{ novych: number; celkem: number; nedostupne: string[] }> {
  const stazene = await Promise.all(ZDROJE_UDALOSTI.map(stahniZdroj));
  const nedostupne = stazene.filter((s) => !s.ok).map((s) => `${s.z.klic}: ${s.chyba}`);
  const stare = ctiKandidaty();
  const zname = znameZIncidentu();
  const hranice = Date.now() - DNI_ZPET * 86_400_000;
  const adresy = new Set(stare.map((k) => k.zdroj.url));
  const otisky = new Set(stare.map((k) => otisk(k.titulekPuvodni)));

  const nove: Kandidat[] = [];
  for (const s of stazene) {
    if (!s.ok) continue;
    for (const p of s.polozky) {
      if (!p.odkaz || adresy.has(p.odkaz) || zname.adresy.has(p.odkaz)) continue;
      if (p.publikovano && new Date(p.publikovano).getTime() < hranice) continue;
      const text = `${p.nadpis} ${p.shrnuti}`;
      if (!relevantni(text)) continue;
      const o = otisk(p.nadpis);
      if (otisky.has(o) || zname.otisky.has(o)) continue;
      const zeme = odhadniZemi(text);
      const { kategorie, shody } = odhadniTemata(text);
      const id = kandidatId(p.odkaz);
      nove.push({
        id,
        zachyceno: nyni(),
        publikovano: p.publikovano,
        zdroj: { nazev: s.z.nazev, url: p.odkaz, typ: s.z.typ, primarni: s.z.primarni },
        titulek: p.nadpis,
        titulekPuvodni: p.nadpis,
        shrnuti: p.shrnuti.slice(0, 300),
        kodZeme: zeme?.kod ?? null,
        zeme: zeme?.nazev ?? null,
        kategorie,
        druhOdhad: "neurceno",
        klasifikace: "pravidla",
        shody,
        stav: "ceka",
      });
      adresy.add(p.odkaz);
      otisky.add(o);
    }
  }

  const doplnene = await doplnModelem(nove);
  // Staří kandidáti odcházejí, když jsou starší než okno nebo už byli zveřejněni jako záznam.
  const zivi = stare.filter((k) => new Date(k.publikovano ?? k.zachyceno).getTime() >= hranice && !zname.adresy.has(k.zdroj.url) && !zname.otisky.has(otisk(k.titulek)));
  const vse = [...doplnene, ...zivi]
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, MAX_KANDIDATU);
  fs.writeFileSync(SOUBOR, JSON.stringify(vse, null, 2) + "\n", "utf-8");
  return { novych: doplnene.length, celkem: vse.length, nedostupne };
}
