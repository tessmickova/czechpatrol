import katalog from "../../data/odolnost/funkce.json";
import krajeData from "../../data/odolnost/kraje.json";
import potravinyData from "../../data/odolnost/potraviny.json";

export interface Potravina { klic: string; nazev: string; jednotka: "kg" | "l"; gramu: number; na100: { kcal: number; bilkoviny: number; tuky: number; sacharidy: number }; /** Jí se jen uvařené (suchá rýže, těstoviny, luštěniny). */ varit?: boolean }
export const POTRAVINY = potravinyData as unknown as { potreba: { kcal: number; bilkoviny: number; tuky: number; sacharidy: number; zdroj: { nazev: string; url: string } }; zdrojHodnot: { nazev: string; url: string }; polozky: Potravina[] };
import { SLUNECNE_HODINY, spotrebaPoRezimech, UCINNOST_SOLARU_VYCHOZI, type Sezona, type VybranySpotrebic } from "./energie";

/*
  Odolnost domácnosti — deterministický model.

  Potřeba → funkce → cesty → závislosti. Každá cesta má pevný seznam
  závislostí z katalogu; člověk jen říká, které cesty má, kolik má zásob
  a co nemůže vyřešit. Všechno ostatní se počítá tady, bez modelu a bez
  sítě, stejně pro každého. Výstup je vysvětlitelný: u každého doporučení
  je vidět, z čeho plyne.

  Co model schválně neumí: dávkování léků, úpravu vody, zásahy do
  elektroinstalace, verdikt „jste v bezpečí". Počítá závislosti a zásoby,
  ne osud.
*/

export type KlicZavislosti = keyof typeof katalog.zavislosti;

export interface Cesta {
  klic: string;
  nazev: string;
  zavislosti: string[];
  zasoba?: boolean;
  externi?: boolean;
  zadarmo?: boolean;
  poznamka?: string;
  jak?: string;
  /** Potřebuje elektřinu, ale stačí vlastní zdroj (powerbanka, powerstation). */
  zVlastniEnergie?: boolean;
  /** Obecný název věci, která cestu zajistí — bez značky a ceny. Z toho je seznam Co dokoupit. */
  koupit?: string;
  /** Cesta platí až od počtu kusů ve vybavení; „naOsobu“ = má jich být tolik co lidí. */
  pocet?: { pole: string; min: number; naOsobu?: boolean };
  /** Cesta plyne z kontextu domácnosti (např. rodina v dosahu), ne ze zaškrtnutí. */
  kontext?: keyof Kontext;
}

/** Kontext domácnosti. Bez adresy: kraj, druh bydlení a sídla, počty a rodina v dosahu. */
export interface Kontext {
  /** Klíč kraje z data/odolnost/kraje.json; "" = neuvedeno. */
  kraj: string;
  bydleni: "byt" | "dum" | "";
  sidlo: "mesto" | "venkov" | "";
  deti: number;
  seniori: number;
  /** Někdo v domácnosti je závislý na péči, léku nebo přístroji (bez podrobností). */
  zavislyNaPeci: boolean;
  rodinaVDosahu: boolean;
}

export interface Funkce {
  klic: string;
  nazev: string;
  potreba: string;
  /** 3 = bez toho se nedá být, 2 = důležité, 1 = pohodlí. */
  dulezitost: number;
  sezona?: string;
  ikona: string;
  zasoba?: { jednotka: string; naOsobuDen?: number; naZvireDen?: number; poznamka: string };
  cesty: Cesta[];
  nulaKc: string[];
  kompenzace: string[];
}

export const FUNKCE = katalog.funkce as Funkce[];
export const ZAVISLOSTI = katalog.zavislosti as Record<string, { nazev: string }>;
export const VERZE_KATALOGU = katalog.verze;
/* 72 hodin je základ, ne cíl; 24 hodin se nepočítá — je to málo. Konec u 45 a 60 dní. */
export const HORIZONTY_DNI = [3, 7, 14, 30, 45, 60] as const;

/* ---------- kraj a srážky ---------- */

export type TridaSrazek = "sussi" | "prumer" | "vlhci";
export interface Kraj { klic: string; nazev: string; trida: TridaSrazek; srazkyMmRok: number | null; dniSeSrazkami: number | null; poznamka?: string }
export const KRAJE_ODOLNOSTI = krajeData.kraje as Kraj[];
export const TRIDY_SRAZEK = krajeData.tridy as Record<TridaSrazek, { nazev: string; nasobekRezervy: number; popis: string }>;
export const ZDROJ_KRAJU = krajeData.zdroj;

export function kraj(profil: Profil): Kraj | null {
  return KRAJE_ODOLNOSTI.find((k) => k.klic === profil.kontext.kraj) ?? null;
}

/**
 * Doporučená zásoba pitné vody na daný počet dní, v litrech. V sušším
 * kraji o třetinu víc: studny v suchu klesají, dešťová voda je nejistá,
 * náhradní zásobování je vytížené. Násobek je v kraje.json a jde přečíst.
 */
export function doporucenaZasobaVody(profil: Profil, dni: number): { litru: number; nasobek: number; trida: TridaSrazek | null; predpoklad: string } {
  const voda = FUNKCE.find((f) => f.klic === "pitna-voda")!.zasoba!;
  const naDen = Math.max(0, profil.osob) * (voda.naOsobuDen ?? 0) + Math.max(0, profil.zvirat) * (voda.naZvireDen ?? 0);
  const k = kraj(profil);
  const trida = k?.trida ?? null;
  const nasobek = trida ? TRIDY_SRAZEK[trida].nasobekRezervy : 1;
  const litru = Math.ceil(naDen * dni * nasobek);
  const predpoklad = `${voda.naOsobuDen} l na osobu a den, ${voda.naZvireDen} l na zvíře, ${dni} dní${trida && nasobek !== 1 ? `, ×${nasobek} pro ${TRIDY_SRAZEK[trida].nazev}` : ""}. ${k ? `Zařazení kraje je orientační podle dlouhodobých srážkových poměrů; číselné průměry doplníme z ČHMÚ.` : "Kraj neuveden — platí základní rezerva."}`;
  return { litru, nasobek, trida, predpoklad };
}
export type HorizontDni = (typeof HORIZONTY_DNI)[number];

/** Co člověk zadává. Nic víc se neukládá — u každého pole je řečeno proč. */
export interface Profil {
  /** Kolik lidí a zvířat: jmenovatel pro vodu. */
  osob: number;
  zvirat: number;
  /** Které cesty domácnost má, po funkcích. */
  cesty: Record<string, string[]>;
  /** Zásoby: voda v litrech, užitková voda v litrech, jídlo a léky ve dnech. null = nezadáno (není totéž co nula). */
  zasoby: { pitnaVodaL: number | null; uzitkovaVodaL: number | null; jidloDni: number | null; lekyDni: number | null; /** Jídlo podrobně: množství podle data/odolnost/potraviny.json (kg nebo l). */ potraviny?: Record<string, number>; /** Na kolik litrů vystačí filtr nebo tablety (údaj výrobce); null = neuvedeno, počítá se bez stropu. */ upravaL?: number | null };
  /**
   * Energie: kapacita vlastních zdrojů ve Wh, vybrané spotřebiče (z nich
   * se počítá denní potřeba po režimech), dobíjení = solár, generátor,
   * auto, a případný výkon panelů ve Wp. `potrebaDenWh` zůstává pro ruční
   * zadání bez výběru spotřebičů.
   */
  energie: { kapacitaWh: number; potrebaDenWh: number; dobijeni: boolean; spotrebice?: VybranySpotrebic[]; solarWp?: number | null };
  /** Co člověk označil jako neřešitelné: klíč funkce → důvod. */
  nemohu: Record<string, string>;
  /** Kontext domácnosti (rozšířené vstupy). */
  kontext: Kontext;
  /** Počty kusů vybavení, ze kterých se počítají cesty s „pocet“ (vysílačky…). null = nezadáno. */
  vybaveni: Record<string, number | null>;
}

export const PRAZDNY_PROFIL: Profil = {
  osob: 1,
  zvirat: 0,
  cesty: {},
  zasoby: { pitnaVodaL: null, uzitkovaVodaL: null, jidloDni: null, lekyDni: null, upravaL: null },
  energie: { kapacitaWh: 0, potrebaDenWh: 0, dobijeni: false },
  nemohu: {},
  kontext: { kraj: "", bydleni: "", sidlo: "", deti: 0, seniori: 0, zavislyNaPeci: false, rodinaVDosahu: false },
  vybaveni: {},
};

export const KLIC_ULOZISTE_ODOLNOSTI = "czechpatrol:odolnost:v1";

export const DUVODY_NEMOHU: { klic: string; nazev: string }[] = [
  { klic: "penize", nazev: "nemám na to peníze" },
  { klic: "prostor", nazev: "nemám prostor" },
  { klic: "najem", nazev: "bydlím v nájmu" },
  { klic: "technicky", nazev: "technicky to nejde" },
  { klic: "zdravi", nazev: "zdravotní omezení" },
  { klic: "auto", nazev: "nemám auto" },
  { klic: "palivo", nazev: "nemohu skladovat palivo" },
  { klic: "jine", nazev: "jiný důvod" },
];

/* ---------- redundance a společný způsob selhání ---------- */

export interface HodnoceniFunkce {
  funkce: Funkce;
  mam: Cesta[];
  /** 0 žádná cesta, 1 jedna, 2 záloha se společnou závislostí, 3 aspoň dvě nezávislé cesty. */
  redundance: 0 | 1 | 2 | 3;
  /** Závislosti, které sdílí víc cest — dvě zálohy, jeden způsob selhání. */
  spolecne: string[];
  /** Závislosti, jejichž výpadek funkci vypne úplně (všechny cesty na nich stojí). */
  kriticke: string[];
  nemohu: string | null;
}

function nezavisle(cesty: Cesta[]): number {
  /* Největší množina cest, které nesdílejí žádnou závislost. Cest je pár, hrubá síla stačí. */
  let nej = 0;
  const n = cesty.length;
  for (let maska = 1; maska < 1 << n; maska++) {
    const vyber = cesty.filter((_, i) => maska & (1 << i));
    const videno = new Set<string>();
    let ok = true;
    for (const c of vyber) {
      for (const z of c.zavislosti) {
        if (videno.has(z)) { ok = false; break; }
        videno.add(z);
      }
      if (!ok) break;
    }
    if (ok) nej = Math.max(nej, vyber.length);
  }
  return nej;
}

/** Zaškrtnutá, nebo plynoucí z kontextu, nebo daná počtem kusů. */
export function maCestu(c: Cesta, f: Funkce, profil: Profil, vybrane: Set<string>): boolean {
  if (c.kontext) return Boolean(profil.kontext[c.kontext]);
  if (c.pocet) {
    const n = profil.vybaveni[c.pocet.pole];
    return typeof n === "number" && n >= c.pocet.min;
  }
  return vybrane.has(c.klic);
}

/** Vysílačky pro dvojici stačí; „pro každého“ je lepší. Vrací větu k zobrazení, nebo null. */
export function poznamkaKPoctu(c: Cesta, profil: Profil): string | null {
  if (!c.pocet) return null;
  const n = profil.vybaveni[c.pocet.pole];
  if (typeof n !== "number") return `Zadejte počet kusů (od ${c.pocet.min}).`;
  if (n < c.pocet.min) return `Máte ${n}; cesta platí od ${c.pocet.min} kusů.`;
  if (c.pocet.naOsobu && n < profil.osob) return `Máte ${n} pro ${profil.osob} ${profil.osob < 5 ? "osoby" : "osob"}; ideálně pro každého, kdo se může pohybovat sám.`;
  return null;
}

export function hodnotFunkci(f: Funkce, profil: Profil): HodnoceniFunkce {
  const vybrane = new Set(profil.cesty[f.klic] ?? []);
  /* Vlastní zdroj energie sejme závislost na síti u přenosných zařízení; pevná instalace ji má dál. */
  const vlastniEnergie = profil.energie.kapacitaWh > 0;
  const mam = f.cesty
    .filter((c) => maCestu(c, f, profil, vybrane))
    .map((c) => (vlastniEnergie && c.zVlastniEnergie ? { ...c, zavislosti: c.zavislosti.filter((z) => z !== "elektrina") } : c));
  const pocty = new Map<string, number>();
  for (const c of mam) for (const z of c.zavislosti) pocty.set(z, (pocty.get(z) ?? 0) + 1);
  const spolecne = [...pocty.entries()].filter(([, n]) => n >= 2).map(([z]) => z);
  const kriticke = [...pocty.entries()].filter(([, n]) => n === mam.length && mam.length > 0).map(([z]) => z);
  let redundance: 0 | 1 | 2 | 3 = 0;
  if (mam.length === 1) redundance = 1;
  else if (mam.length >= 2) redundance = nezavisle(mam) >= 2 ? 3 : 2;
  return { funkce: f, mam, redundance, spolecne, kriticke, nemohu: profil.nemohu[f.klic] ?? null };
}

/* ---------- jediné body selhání ---------- */

export interface BodSelhani {
  zavislost: string;
  nazev: string;
  /** Funkce, které výpadek téhle závislosti vypne úplně. */
  vypne: Funkce[];
  /** Součet důležitostí vypnutých funkcí — pořadí. */
  vaha: number;
}

export function bodySelhani(hodnoceni: HodnoceniFunkce[]): BodSelhani[] {
  const mapa = new Map<string, Funkce[]>();
  for (const h of hodnoceni) for (const z of h.kriticke) mapa.set(z, [...(mapa.get(z) ?? []), h.funkce]);
  return [...mapa.entries()]
    .map(([zavislost, vypne]) => ({ zavislost, nazev: ZAVISLOSTI[zavislost]?.nazev ?? zavislost, vypne, vaha: vypne.reduce((s, f) => s + f.dulezitost, 0) }))
    .filter((b) => b.vypne.length >= 1)
    .sort((a, b) => b.vaha - a.vaha || b.vypne.length - a.vypne.length);
}

/* ---------- horizonty a spotřeba ---------- */

export interface Vydrz {
  klic: "pitna-voda" | "hygiena" | "potraviny" | "energie" | "zdravi";
  nazev: string;
  dni: number | null;
  predpoklad: string;
  /**
   * Odkud číslo je (13. 11. 2026). „odhad“ = napsali jste ho sami a web ho
   * jen opakuje — musí to být vidět, jinak to vypadá jako výsledek výpočtu;
   * „vypocet“ = z množství a spotřeby; „zdroj“ = obnovitelný zdroj, zásoba
   * není omezení.
   */
  puvod?: "odhad" | "vypocet" | "zdroj";
  /** Jedna věta pod řádkem: kontrola odhadu, co přidal filtr, proč je číslo nižší, než by čekal. */
  upozorneni?: string | null;
}

/** Denní potřeba: z vybraných spotřebičů (režim kritické a nutné), jinak ručně zadané číslo. */
export function potrebaDenWh(en: Profil["energie"]): number {
  if (en.spotrebice && en.spotrebice.length) return spotrebaPoRezimech(en.spotrebice).nutne;
  return en.potrebaDenWh;
}

function dny(mnozstvi: number | null, naDen: number): number | null {
  if (mnozstvi === null || naDen <= 0) return null;
  return Math.floor((mnozstvi / naDen) * 10) / 10;
}

/*
  Jídlo podrobně (26. 9. 2026, na přání provozovatelky): kolik dní vydrží
  energie, bílkoviny, tuky a sacharidy ze zásob. Potřeba na osobu a den
  = referenční hodnota příjmu EU (2 000 kcal, 50 g, 70 g, 260 g); děti
  počítáme jako dospělé — raději rezerva než podhodnocení. Hodnoty
  potravin orientační (USDA), přesné na obalu.
*/
export interface Zivina { klic: "kcal" | "bilkoviny" | "tuky" | "sacharidy"; nazev: string; jednotka: string; mame: number; naDen: number; dni: number | null }

export interface RozpisJidla {
  zivin: Zivina[];
  nejdriv: Zivina | null;
  /** Energie jen z toho, co se nemusí vařit (13. 11. 2026). */
  kcalBezVareni: number;
  dniBezVareni: number | null;
  /** Názvy zadaných potravin, které se musí uvařit. */
  kVareni: string[];
}

export function rozpisJidla(profil: Profil): RozpisJidla | null {
  const mnozstvi = profil.zasoby.potraviny ?? {};
  const zadano = POTRAVINY.polozky.filter((x) => (mnozstvi[x.klic] ?? 0) > 0);
  if (!zadano.length) return null;
  const osob = Math.max(1, profil.osob);
  const soucet = { kcal: 0, bilkoviny: 0, tuky: 0, sacharidy: 0 };
  let kcalBezVareni = 0;
  for (const x of zadano) {
    const g = mnozstvi[x.klic] * x.gramu;
    for (const k of Object.keys(soucet) as (keyof typeof soucet)[]) soucet[k] += (g / 100) * x.na100[k];
    if (!x.varit) kcalBezVareni += (g / 100) * x.na100.kcal;
  }
  const NAZVY: Record<Zivina["klic"], [string, string]> = { kcal: ["Energie", "kcal"], bilkoviny: ["Bílkoviny", "g"], tuky: ["Tuky", "g"], sacharidy: ["Sacharidy", "g"] };
  const zivin: Zivina[] = (["kcal", "bilkoviny", "tuky", "sacharidy"] as const).map((k) => {
    const naDen = osob * POTRAVINY.potreba[k];
    return { klic: k, nazev: NAZVY[k][0], jednotka: NAZVY[k][1], mame: soucet[k], naDen, dni: dny(soucet[k], naDen) };
  });
  const nejdriv = zivin.filter((z) => z.dni !== null).sort((a, b) => (a.dni as number) - (b.dni as number))[0] ?? null;
  return { zivin, nejdriv, kcalBezVareni, dniBezVareni: dny(kcalBezVareni, osob * POTRAVINY.potreba.kcal), kVareni: zadano.filter((x) => x.varit).map((x) => x.nazev.replace(/\s*\(.*\)$/, "").toLowerCase()) };
}

/**
 * Uvaří domácnost bez proudu? true = má cestu k vaření, která nestojí na
 * elektřině (kartuše, kamna, plyn ze sítě); false = vaření vyplnila a jede
 * jen na proud, nebo má jen „jídlo bez vaření“; null = vaření nevyplnila.
 */
export function vareniBezProudu(profil: Profil): boolean | null {
  const vybrane = profil.cesty["vareni"] ?? [];
  if (!vybrane.length) return null;
  const f = FUNKCE.find((x) => x.klic === "vareni")!;
  return f.cesty.some((c) => vybrane.includes(c.klic) && c.klic !== "bez-vareni" && !c.zavislosti.includes("elektrina"));
}

/** Roční období pro odhad soláru podle data: listopad–únor zima, březen–duben a září–říjen přechod, květen–srpen léto. */
export function sezonaPodleData(ted: number): Sezona {
  const m = new Date(ted).getMonth() + 1;
  if (m >= 5 && m <= 8) return "leto";
  if (m === 3 || m === 4 || m === 9 || m === 10) return "prechod";
  return "zima";
}

/* 1 den, 2–4 dny, 5 dní; desetinné číslo „dne“ (2,5 dne). */
const sklonDni = (d: number) => (!Number.isInteger(d) ? "dne" : d === 1 ? "den" : d > 1 && d < 5 ? "dny" : "dní");
const cz = (n: number) => n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });

/*
  Voda (13. 11. 2026, z komentáře čtenářky: „nereaguje na informaci, že
  mám užitkovou vodu a filtr“). Pravidla:
  - S filtrem nebo tabletami (cesta „úprava“ u pitné vody) je užitková voda
    i rezerva na pití, nejvýš do kapacity filtru, je-li zadaná.
  - Pitná voda pak ukazuje, jak dlouho vydrží pití, když hygiena ustoupí
    (pití má přednost). Hygiena ukazuje, kdy dojde užitková voda, když se
    z ní po vypití pitné zásoby zároveň pije. Obě čísla platí současně:
    v horizontu h jde pít, když h ≤ pití, a mýt se i pít, když h ≤ hygiena.
  - Studna s ruční pumpou: hygiena bez limitu zásoby; pití jen s úpravou
    vody (pitnost studny bez rozboru neznáme).
*/
function vydrzVody(profil: Profil, D: number, H: number): { pitna: Pick<Vydrz, "dni" | "puvod" | "upozorneni">; hygiena: Pick<Vydrz, "dni" | "puvod" | "upozorneni"> } {
  const cesty = profil.cesty["pitna-voda"] ?? [];
  const uprava = cesty.includes("uprava");
  const studna = cesty.includes("studna-rucni");
  const P = profil.zasoby.pitnaVodaL;
  const U = profil.zasoby.uzitkovaVodaL;
  const C = typeof profil.zasoby.upravaL === "number" ? profil.zasoby.upravaL : Infinity;

  if (studna) {
    const pitna = uprava
      ? { dni: C === Infinity ? Infinity : dny((P ?? 0) + C, D), puvod: (C === Infinity ? "zdroj" : "vypocet") as Vydrz["puvod"], upozorneni: C === Infinity ? "Studna s ruční pumpou a úprava vody: pití neomezuje zásoba, ale vydatnost studny v suchu a životnost filtru." : `Studna s úpravou vody: omezuje vás kapacita filtru nebo tablet (${cz(C)} l).` }
      : { dni: dny(P, D), puvod: "vypocet" as const, upozorneni: "Studnu s ruční pumpou do pití nepočítáme: bez rozboru nevíme, jestli je voda pitná. Když ji upravujete filtrem nebo tabletami, zaškrtněte úpravu u pitné vody." };
    return { pitna, hygiena: { dni: Infinity, puvod: "zdroj", upozorneni: "Studna s ruční pumpou: užitková voda není omezená zásobou." } };
  }

  if (!uprava || !U) {
    const nabidka = !uprava && U ? "Máte filtr nebo tablety na úpravu vody? Zaškrtněte je u pitné vody — užitková voda se pak započítá i k pití." : null;
    return { pitna: { dni: dny(P, D), puvod: "vypocet", upozorneni: nabidka }, hygiena: { dni: dny(U, H), puvod: "vypocet" } };
  }

  /* S úpravou a užitkovou vodou. */
  const p = P ?? 0;
  const prevod = Math.min(U, C);
  const pitnaDni = dny(p + prevod, D);
  const zFiltru = D > 0 ? Math.floor((prevod / D) * 10) / 10 : 0;
  let hygDni: number | null = null;
  if (H > 0) {
    const t1 = D > 0 ? p / D : Infinity;
    if (U / H <= t1) hygDni = U / H;
    else {
      const spolecne = (p + U) / (D + H);
      hygDni = spolecne - t1 <= prevod / D ? spolecne : (U - prevod) / H;
    }
    hygDni = Math.floor(hygDni * 10) / 10;
  }
  return {
    pitna: {
      dni: pitnaDni,
      puvod: "vypocet",
      upozorneni: `Z toho ${cz(zFiltru)} ${sklonDni(zFiltru)} z užitkové vody přes filtr${C !== Infinity ? ` (kapacita ${cz(C)} l)` : " — kapacitu filtru jste nezadali, počítáme bez stropu"}. Platí, když hygiena ustoupí pití.`,
    },
    hygiena: {
      dni: hygDni,
      puvod: "vypocet",
      upozorneni: hygDni !== null && hygDni < (dny(U, H) ?? 0) ? `Kratší než ${cz(dny(U, H) ?? 0)} ${sklonDni(dny(U, H) ?? 0)}: po vypití pitné zásoby se pije z užitkové.` : null,
    },
  };
}

export function vydrze(profil: Profil, ted = Date.now()): Vydrz[] {
  const voda = FUNKCE.find((f) => f.klic === "pitna-voda")!.zasoba!;
  const hyg = FUNKCE.find((f) => f.klic === "hygiena")!.zasoba!;
  const osob = Math.max(0, profil.osob);
  const zvirat = Math.max(0, profil.zvirat);
  const vodaDen = osob * (voda.naOsobuDen ?? 0) + zvirat * (voda.naZvireDen ?? 0);
  const hygDen = osob * (hyg.naOsobuDen ?? 0);
  const en = profil.energie;
  const v = vydrzVody(profil, vodaDen, hygDen);
  const krmivo = zvirat ? " Krmivo pro zvířata se nepočítá." : "";
  return [
    { klic: "pitna-voda", nazev: "Pitná voda", ...v.pitna, predpoklad: `${voda.naOsobuDen} l na osobu a den, ${voda.naZvireDen} l na zvíře; ${osob} ${osob === 1 ? "osoba" : osob < 5 ? "osoby" : "osob"}${zvirat ? `, ${zvirat} zvíř.` : ""}. ${voda.poznamka}` },
    { klic: "hygiena", nazev: "Užitková voda", ...v.hygiena, predpoklad: `${hyg.naOsobuDen} l na osobu a den. ${hyg.poznamka}` },
    (() => {
      /*
        Rozpis podle zásob má přednost před odhadem ve dnech: je z čísel, ne
        z pocitu. Odhad ve dnech web jen opakuje — proto u něj stojí „váš
        odhad“ a kontrola, kolik jídla to znamená (13. 11. 2026).
      */
      const r = rozpisJidla(profil);
      const odhad = profil.zasoby.jidloDni;
      const potrebaDen = Math.max(1, osob) * POTRAVINY.potreba.kcal;
      if (!r) {
        if (odhad === null) return { klic: "potraviny" as const, nazev: "Jídlo", dni: null, predpoklad: `Vyplňte zásoby v „Jídlo podrobně“ — spočítáme dny z toho, co máte doma.${krmivo}` };
        const ryze = POTRAVINY.polozky.find((x) => x.klic === "ryze")!;
        const kg = (odhad * potrebaDen) / (ryze.na100.kcal * 10);
        return {
          klic: "potraviny" as const, nazev: "Jídlo", dni: odhad, puvod: "odhad" as const,
          predpoklad: `Číslo je váš odhad, web ho jen opakuje. Přesně to spočítá „Jídlo podrobně“ z toho, co máte doma.${krmivo}`,
          upozorneni: `Kontrola: ${cz(odhad)} ${sklonDni(odhad)} pro ${Math.max(1, osob)} ${Math.max(1, osob) === 1 ? "osobu" : Math.max(1, osob) < 5 ? "osoby" : "osob"} je asi ${Math.round(odhad * potrebaDen).toLocaleString("cs-CZ")} kcal — tolik má zhruba ${cz(Math.round(kg * 10) / 10)} kg rýže nebo těstovin. Máte doma tolik?`,
        };
      }
      const vse = r.zivin.find((z) => z.klic === "kcal")!.dni;
      const vari = vareniBezProudu(profil);
      const odhadVeta = odhad !== null ? ` Váš odhad byl ${cz(odhad)} ${sklonDni(odhad)}.` : "";
      const zaklad = `Spočítáno ze zásob: ${Math.round(r.zivin[0].mame).toLocaleString("cs-CZ")} kcal, potřeba ${r.zivin[0].naDen.toLocaleString("cs-CZ")} kcal za den (${Math.max(1, osob)} × ${POTRAVINY.potreba.kcal} kcal, referenční hodnota EU). Rozpis bílkovin, tuků a sacharidů je pod tím.${krmivo}`;
      if (r.kVareni.length && vari === false) {
        return {
          klic: "potraviny" as const, nazev: "Jídlo (bez vaření)", dni: r.dniBezVareni ?? 0, puvod: "vypocet" as const, predpoklad: zaklad,
          upozorneni: `Bez proudu nemáte jak vařit, a bez vaření nesníte: ${r.kVareni.join(", ")}. S vařičem, který jede bez proudu, by jídlo vydrželo ${lidskaDoba(vse ?? 0)}; k vaření je potřeba i voda.${odhadVeta}`,
        };
      }
      return {
        klic: "potraviny" as const, nazev: "Jídlo (energie)", dni: vse, puvod: "vypocet" as const, predpoklad: zaklad,
        upozorneni: r.kVareni.length && vari === null
          ? `Z toho jen ${lidskaDoba(r.dniBezVareni ?? 0)} bez vaření. U „Vaření“ vyplňte, jak uvaříte bez proudu.${odhadVeta}`
          : odhadVeta.trim() || null,
      };
    })(),
    { klic: "zdravi", nazev: "Léky a pomůcky", dni: profil.zasoby.lekyDni, puvod: "odhad", predpoklad: "Dny podle toho, co vám řekl lékař. Web dávky nepočítá." },
    (() => {
      /*
        Dobíjení už neznamená „bez limitu“ (13. 11. 2026): malý panel
        v listopadu nevyrobí, co powerstation za den vydá. Se zadaným výkonem
        panelů se počítá zisk v aktuálním ročním období; generátor a auto
        závisí na palivu, které neznáme — počítá se jen kapacita.
      */
      const potreba = potrebaDenWh(en);
      const kapacita = en.kapacitaWh * 0.85;
      const zaklad = `Kapacita ${en.kapacitaWh} Wh, potřeba ${potreba} Wh/den (kritické a nutné spotřebiče), po odečtení 15 % ztrát.`;
      if (!(en.kapacitaWh > 0 && potreba > 0)) return { klic: "energie" as const, nazev: "Vlastní energie v nouzovém režimu", dni: null, predpoklad: zaklad };
      const wp = en.solarWp ?? 0;
      if (en.dobijeni && wp > 0) {
        const sezona = sezonaPodleData(ted);
        const zisk = Math.round(wp * SLUNECNE_HODINY[sezona].hodin * UCINNOST_SOLARU_VYCHOZI);
        const predpoklad = `${zaklad} Panely ${wp} Wp dají v období ${SLUNECNE_HODINY[sezona].nazev} asi ${zisk} Wh za den (${SLUNECNE_HODINY[sezona].hodin} h plného slunce, účinnost ${Math.round(UCINNOST_SOLARU_VYCHOZI * 100)} %). Orientační průměr; zatažené dny jsou horší.`;
        if (zisk >= potreba) return { klic: "energie" as const, nazev: "Vlastní energie v nouzovém režimu", dni: Infinity, puvod: "zdroj" as const, predpoklad };
        return { klic: "energie" as const, nazev: "Vlastní energie v nouzovém režimu", dni: dny(kapacita, potreba - zisk), puvod: "vypocet" as const, predpoklad, upozorneni: `Panely pokryjí ${zisk} z ${potreba} Wh denně; zbytek bere baterie.` };
      }
      return {
        klic: "energie" as const, nazev: "Vlastní energie v nouzovém režimu", dni: dny(kapacita, potreba), puvod: "vypocet" as const,
        predpoklad: `${zaklad} V zimě dál klesá.`,
        upozorneni: en.dobijeni ? "Bez dobíjení. Generátor nebo auto prodlouží výdrž podle zásoby paliva; u soláru zadejte výkon panelů a spočítáme to." : null,
      };
    })(),
  ];
}

export type StavHorizontu = "pripraveno" | "castecne" | "slabe" | "nehodnoceno";

export interface Horizont {
  dni: HorizontDni;
  stav: StavHorizontu;
  dojde: Vydrz[];
  nehodnoceno: Vydrz[];
}

export function horizonty(profil: Profil, ted = Date.now()): Horizont[] {
  const v = vydrze(profil, ted).filter((x) => x.klic !== "energie" || profil.energie.kapacitaWh > 0);
  return HORIZONTY_DNI.map((h) => {
    const zname = v.filter((x) => x.dni !== null);
    const nehodnoceno = v.filter((x) => x.dni === null);
    const dojde = zname.filter((x) => (x.dni as number) < h);
    let stav: StavHorizontu;
    if (!zname.length) stav = "nehodnoceno";
    else if (!dojde.length) stav = "pripraveno";
    else if (dojde.length < zname.length) stav = "castecne";
    else stav = "slabe";
    return { dni: h, stav, dojde, nehodnoceno };
  });
}

/* ---------- co mi ještě chybí ---------- */

/** Věta o tom, koho se to v domácnosti týká — z kontextu, bez podrobností. */
export function kohoSeTyka(profil: Profil): string {
  const k = profil.kontext;
  const casti: string[] = [];
  if (k.deti > 0) casti.push(`${k.deti} ${k.deti === 1 ? "dítě" : k.deti < 5 ? "děti" : "dětí"}`);
  if (k.seniori > 0) casti.push(`${k.seniori} ${k.seniori === 1 ? "senior" : k.seniori < 5 ? "senioři" : "seniorů"}`);
  if (k.zavislyNaPeci) casti.push("někdo závislý na péči");
  if (!casti.length) return "";
  return ` V domácnosti: ${casti.join(", ")} — výpadek dopadá dřív a hůř.`;
}

export interface Doporuceni {
  druh: "kriticka-zavislost" | "bez-zalohy" | "spolecne-selhani" | "zasoba" | "kompenzace";
  nadpis: string;
  proc: string;
  zaklad: string;
  resi: string[];
  alternativy: string[];
  kdyNeni: string;
  funkce?: string;
}

/**
 * Nejslabší důležitý článek dřív než další zlepšení nejsilnějšího.
 * Vrací nejvýš pět věcí; co je vyřešené (redundance 3), se nenabízí.
 */
export function coChybi(profil: Profil): Doporuceni[] {
  const hod = FUNKCE.map((f) => hodnotFunkci(f, profil));
  const vysledek: Doporuceni[] = [];

  /* 1. Kritické závislosti, které vypínají víc funkcí naráz. */
  for (const b of bodySelhani(hod).filter((b) => b.vypne.length >= 2).slice(0, 2)) {
    const alternativy = b.vypne.flatMap((f) => {
      const h = hod.find((x) => x.funkce.klic === f.klic)!;
      return f.cesty.filter((c) => !h.mam.some((m) => m.klic === c.klic) && !c.zavislosti.includes(b.zavislost)).slice(0, 2).map((c) => `${f.nazev}: ${c.nazev}${c.zadarmo ? " (0 Kč)" : ""}`);
    });
    vysledek.push({
      druh: "kriticka-zavislost",
      nadpis: `Výpadek: ${b.nazev.toLowerCase()} u vás vypne ${b.vypne.length} ${b.vypne.length < 5 ? "funkce" : "funkcí"}`,
      proc: `Každá cesta k těmto funkcím stojí na jediné závislosti: ${b.nazev.toLowerCase()}.`,
      zaklad: `Vaše zaškrtnuté cesty u: ${b.vypne.map((f) => f.nazev.toLowerCase()).join(", ")}.`,
      resi: b.vypne.map((f) => f.nazev),
      alternativy: alternativy.length ? alternativy : ["V katalogu není cesta bez této závislosti — označte „Tohle nemohu vyřešit“ a uvidíte, co jde místo toho."],
      kdyNeni: "Když k některé z těch funkcí přibude cesta, která tuhle závislost nemá.",
    });
  }

  /* 2. Důležité funkce bez jediné cesty nebo s jedinou. */
  const bezZalohy = hod
    .filter((h) => h.redundance <= 1 && !h.nemohu)
    .sort((a, b) => b.funkce.dulezitost - a.funkce.dulezitost || a.redundance - b.redundance);
  for (const h of bezZalohy.slice(0, 2)) {
    const f = h.funkce;
    const kandidati = f.cesty.filter((c) => !h.mam.some((m) => m.klic === c.klic));
    kandidati.sort((a, b) => Number(Boolean(b.zadarmo)) - Number(Boolean(a.zadarmo)));
    vysledek.push({
      druh: "bez-zalohy",
      nadpis: h.redundance === 0 ? `${f.nazev}: žádná zaškrtnutá cesta` : `${f.nazev}: jediná cesta (${h.mam[0].nazev.toLowerCase()})`,
      proc: h.redundance === 0 ? "Bez cesty nevíme, jak by domácnost tuhle potřebu řešila." : "Když ta jedna cesta selže, není čím ji nahradit.",
      zaklad: `Důležitost ${f.dulezitost} ze 3; potřeba: ${f.potreba}.${kohoSeTyka(profil)}`,
      resi: [f.nazev],
      alternativy: kandidati.slice(0, 3).map((c) => `${c.nazev}${c.zadarmo ? " (0 Kč)" : ""}`),
      kdyNeni: "Když už máte cestu, kterou jsme v seznamu nenašli — zaškrtněte ji, nebo ji označte jako neřešitelnou.",
      funkce: f.klic,
    });
  }

  /* 3. Zálohy se společnou závislostí. */
  for (const h of hod.filter((h) => h.redundance === 2 && h.funkce.dulezitost >= 2).slice(0, 1)) {
    vysledek.push({
      druh: "spolecne-selhani",
      nadpis: `${h.funkce.nazev}: dvě zálohy, jeden způsob selhání`,
      proc: `Vaše cesty sdílejí závislost: ${h.spolecne.map((z) => ZAVISLOSTI[z]?.nazev.toLowerCase() ?? z).join(", ")}. Když vypadne, vypadnou obě.`,
      zaklad: `Cesty: ${h.mam.map((m) => m.nazev.toLowerCase()).join("; ")}.`,
      resi: [h.funkce.nazev],
      alternativy: h.funkce.cesty
        .filter((c) => !h.mam.some((m) => m.klic === c.klic) && !c.zavislosti.some((z) => h.spolecne.includes(z)))
        .slice(0, 3)
        .map((c) => `${c.nazev}${c.zadarmo ? " (0 Kč)" : ""}`),
      kdyNeni: "Když se s výpadkem té závislosti smíříte a máte plán přesunu.",
      funkce: h.funkce.klic,
    });
  }

  /* 4. Zásoby, které dojdou dřív než za 72 hodin — základ, pod který nejde jít. */
  const h72 = horizonty(profil).find((x) => x.dni === 3)!;
  for (const v of h72.dojde.slice(0, 1)) {
    vysledek.push({
      druh: "zasoba",
      nadpis: `${v.nazev}: vydrží ${v.dni} ${v.dni === 1 ? "den" : (v.dni as number) < 5 ? "dny" : "dní"}, ne 3`,
      proc: "Tři dny jsou základní veřejná úroveň; pod ní je domácnost odkázaná na externí pomoc hned.",
      zaklad: v.predpoklad,
      resi: [v.nazev],
      alternativy: ["Doplnit z toho, co běžně používáte (voda z kohoutku do nádob, jídlo, které jíte).", "Snížit spotřebu: oddělit pitnou a užitkovou vodu."],
      kdyNeni: "Když je spolehlivé náhradní zásobování obce a víte, kde je.",
    });
  }

  /* 4b. Kraj: v sušší oblasti doporučená rezerva vody na 7 dní, když ji zadaná zásoba nekryje. */
  const k = kraj(profil);
  if (k && TRIDY_SRAZEK[k.trida].nasobekRezervy > 1 && profil.zasoby.pitnaVodaL !== null) {
    const d = doporucenaZasobaVody(profil, 7);
    if (profil.zasoby.pitnaVodaL < d.litru && !vysledek.some((x) => x.druh === "zasoba")) {
      vysledek.push({
        druh: "zasoba",
        nadpis: `Pitná voda: pro ${k.nazev} kraj doporučujeme ${d.litru} l na 7 dní, máte ${profil.zasoby.pitnaVodaL} l`,
        proc: TRIDY_SRAZEK[k.trida].popis,
        zaklad: d.predpoklad,
        resi: ["Pitná voda"],
        alternativy: ["Doplnit nádoby a naplnit je z kohoutku, dokud teče.", "Znát výdejní místa obce pro náhradní zásobování.", "Oddělit pitnou a užitkovou vodu, aby pitná nešla na splachování."],
        kdyNeni: "Když máte vlastní zdroj s ruční pumpou, který v suchu nevysychá.",
      });
    }
  }

  /* 5. Kompenzace pro to, co člověk označil jako neřešitelné. */
  for (const h of hod.filter((h) => h.nemohu).slice(0, 1)) {
    vysledek.push({
      druh: "kompenzace",
      nadpis: `${h.funkce.nazev}: řešíte jinak (${DUVODY_NEMOHU.find((d) => d.klic === h.nemohu)?.nazev ?? h.nemohu})`,
      proc: "Ideální řešení nejde; jde snížit závislost, přesunout funkci nebo se domluvit na pomoci.",
      zaklad: "Označeno vámi jako neřešitelné. Bez červeného varování.",
      resi: [h.funkce.nazev],
      alternativy: h.funkce.kompenzace,
      kdyNeni: "Když se situace změní a ideální řešení bude možné — pak označení zrušte.",
      funkce: h.funkce.klic,
    });
  }

  return vysledek.slice(0, 5);
}

/* ---------- co dokoupit ---------- */

export interface Nakup {
  funkce: string;
  nazevFunkce: string;
  polozka: string;
  /** Proč právě tohle: jednou větou z modelu. */
  proc: string;
}

/**
 * Seznam věcí, které chybějící cesty zajistí. Jen u funkcí bez nezávislé
 * zálohy, které člověk neoznačil jako neřešitelné. Věci bez značky a ceny;
 * napřed u nejdůležitějších funkcí. Nikdy víc než osm — seznam na dva
 * nákupy, ne katalog.
 */
export function coDokoupit(profil: Profil): Nakup[] {
  const hod = FUNKCE.map((f) => hodnotFunkci(f, profil))
    .filter((h) => h.redundance < 3 && !h.nemohu)
    .sort((a, b) => b.funkce.dulezitost - a.funkce.dulezitost || a.redundance - b.redundance);
  const videno = new Set<string>();
  const vysledek: Nakup[] = [];
  for (const h of hod) {
    const vybrane = new Set(profil.cesty[h.funkce.klic] ?? []);
    for (const c of h.funkce.cesty) {
      if (!c.koupit || maCestu(c, h.funkce, profil, vybrane) || videno.has(c.koupit)) continue;
      videno.add(c.koupit);
      vysledek.push({
        funkce: h.funkce.klic,
        nazevFunkce: h.funkce.nazev,
        polozka: c.koupit,
        proc: h.redundance === 0 ? `${h.funkce.nazev}: zatím žádná cesta.` : h.redundance === 1 ? `${h.funkce.nazev}: jediná cesta, tohle přidá zálohu bez vnější závislosti.` : `${h.funkce.nazev}: zálohy sdílejí závislost, tohle je nezávislá.`,
      });
      if (vysledek.length >= 8) return vysledek;
      break; // jedna věc na funkci a kolo; další kolo až po té nejdůležitější
    }
  }
  return vysledek;
}

/* ---------- souhrn pro dashboard ---------- */

export interface Souhrn {
  hodnoceni: HodnoceniFunkce[];
  body: BodSelhani[];
  horizonty: Horizont[];
  vydrze: Vydrz[];
  doporuceni: Doporuceni[];
  nakup: Nakup[];
  nejslabsi: HodnoceniFunkce | null;
  /** Kolik funkcí má aspoň dvě nezávislé cesty, z kolika. */
  vyreseno: { n: number; z: number };
}

export function souhrn(profil: Profil): Souhrn {
  const hodnoceni = FUNKCE.map((f) => hodnotFunkci(f, profil));
  const dulezite = hodnoceni.filter((h) => h.funkce.dulezitost >= 2 && !h.nemohu);
  const nejslabsi = [...dulezite].sort((a, b) => a.redundance - b.redundance || b.funkce.dulezitost - a.funkce.dulezitost)[0] ?? null;
  return {
    hodnoceni,
    body: bodySelhani(hodnoceni),
    horizonty: horizonty(profil),
    vydrze: vydrze(profil),
    doporuceni: coChybi(profil),
    nakup: coDokoupit(profil),
    nejslabsi,
    vyreseno: { n: hodnoceni.filter((h) => h.redundance === 3).length, z: hodnoceni.length },
  };
}

/* ---------- zdarma vs. Premium ---------- */

/**
 * Bezpečnostní nálezy — vždy zdarma, i bez účtu, nad nabídkou Premium.
 *
 * Nález je něco, co může ohrozit zdraví nebo život, ne „slabina“: péče
 * nebo přístroj závislý na jediné cestě, pitná voda nebo teplo bez
 * jakékoli cesty, zdravotní funkce bez zálohy. Web u toho neradí
 * medicínsky ani technicky; odkazuje na oficiální postupy (/pripravenost/).
 */
export interface BezpecnostniNalez { klic: string; nadpis: string; proc: string; funkce: string }

const ZIVOTNE_DULEZITE = ["pitna-voda", "teplo", "zdravi", "komunikace"];

export function bezpecnostniNalezy(profil: Profil, hodnoceni: HodnoceniFunkce[]): BezpecnostniNalez[] {
  const n: BezpecnostniNalez[] = [];
  for (const h of hodnoceni) {
    if (h.nemohu) continue;
    const f = h.funkce;
    if (ZIVOTNE_DULEZITE.includes(f.klic) && h.redundance === 0) {
      n.push({ klic: `bez-cesty-${f.klic}`, nadpis: `${f.nazev}: žádná cesta`, proc: `Pro ${f.nazev.toLowerCase()} není zaškrtnutá ani jedna cesta. Bez ní domácnost při výpadku nemá jak pokrýt základní potřebu.`, funkce: f.klic });
    }
    if (f.klic === "zdravi" && profil.kontext.zavislyNaPeci && h.redundance <= 1 && h.kriticke.length) {
      n.push({ klic: "pece-jedina-cesta", nadpis: "Péče nebo přístroj závisí na jediné cestě", proc: `Někdo u vás je závislý na péči, léku nebo přístroji a zdraví má jedinou cestu, která stojí na ${h.kriticke.map((z) => ZAVISLOSTI[z]?.nazev.toLowerCase() ?? z).join(", ")}. Výpadek této závislosti je pro vás bezprostřední riziko; postup domluvte s lékařem a poskytovatelem přístroje.`, funkce: "zdravi" });
    }
    if (f.klic === "teplo" && h.redundance <= 1 && h.kriticke.includes("elektrina") && (profil.kontext.deti > 0 || profil.kontext.seniori > 0)) {
      n.push({ klic: "teplo-deti-seniori", nadpis: "Teplo stojí jen na elektřině a doma jsou děti nebo senioři", proc: "Při delším výpadku elektřiny v zimě je podchlazení riziko nejdřív pro děti a seniory. Náhradní teplo nebo místo, kam jít, patří k prvním věcem k zařízení.", funkce: "teplo" });
    }
  }
  return n;
}

/** Počty do souhrnu zdarma: kolik oblastí je v pořádku, kolik slabin, kolik kritických závislostí. */
export function pocty(s: Souhrn): { vPoradku: number; slabin: number; kritickych: number; nehodnoceno: number; horizont72: StavHorizontu } {
  const hodnocene = s.hodnoceni.filter((h) => !h.nemohu);
  return {
    vPoradku: hodnocene.filter((h) => h.redundance === 3).length,
    slabin: hodnocene.filter((h) => h.mam.length > 0 && h.redundance < 3).length,
    kritickych: s.body.filter((b) => b.vypne.length >= 2).length,
    nehodnoceno: hodnocene.filter((h) => h.mam.length === 0).length,
    horizont72: s.horizonty.find((h) => h.dni === 3)?.stav ?? "nehodnoceno",
  };
}

/**
 * Skóre 0–100 pro srovnání v žebříčku. Orientační hra, ne doklad.
 *
 * Dvě části: 70 bodů za zálohy (každá oblast podle důležitosti, plný
 * počet za tři nezávislé cesty), 30 bodů za horizonty (kolik z šesti je
 * „připraveno“, půl bodu za „částečně“). Oblasti označené „řeším jinak“
 * se nepočítají ani do jmenovatele. Prázdný dotazník = 0.
 */
export function skore(s: Souhrn): number {
  const hodnocene = s.hodnoceni.filter((h) => !h.nemohu);
  const vahaCelkem = hodnocene.reduce((a, h) => a + h.funkce.dulezitost, 0);
  const zalohy = vahaCelkem ? hodnocene.reduce((a, h) => a + (h.funkce.dulezitost * h.redundance) / 3, 0) / vahaCelkem : 0;
  const hor = s.horizonty.length ? s.horizonty.reduce((a, h) => a + (h.stav === "pripraveno" ? 1 : h.stav === "castecne" ? 0.5 : 0), 0) / s.horizonty.length : 0;
  return Math.round(70 * zalohy + 30 * hor);
}

/** Lidský zápis doby: 47 min, 4 h 21 min, 1 d 7 h. */
export function lidskaDoba(dni: number): string {
  if (!Number.isFinite(dni)) return "bez limitu kapacity";
  const hodin = dni * 24;
  if (hodin < 1) return `${Math.round(hodin * 60)} min`;
  if (hodin < 24) { const h = Math.floor(hodin); const m = Math.round((hodin - h) * 60); return m ? `${h} h ${m} min` : `${h} h`; }
  const d = Math.floor(dni); const h = Math.round((dni - d) * 24);
  return h ? `${d} d ${h} h` : `${d} d`;
}

/* ---------- úložiště jen v zařízení ---------- */

export function nactiProfil(): Profil | null {
  try {
    const s = localStorage.getItem(KLIC_ULOZISTE_ODOLNOSTI);
    if (!s) return PRAZDNY_PROFIL;
    const p = JSON.parse(s) as Partial<Profil>;
    return {
      osob: Number(p.osob) || 1,
      zvirat: Number(p.zvirat) || 0,
      cesty: p.cesty && typeof p.cesty === "object" ? p.cesty : {},
      zasoby: { ...PRAZDNY_PROFIL.zasoby, ...(p.zasoby ?? {}) },  // null zůstává null: nezadáno není nula
      energie: { ...PRAZDNY_PROFIL.energie, ...(p.energie ?? {}) },
      nemohu: p.nemohu && typeof p.nemohu === "object" ? p.nemohu : {},
      kontext: { ...PRAZDNY_PROFIL.kontext, ...(p.kontext ?? {}) },  // kraj: "" u starších profilů
      vybaveni: p.vybaveni && typeof p.vybaveni === "object" ? p.vybaveni : {},
    };
  } catch {
    return null;
  }
}

export function ulozProfil(p: Profil): boolean {
  try {
    localStorage.setItem(KLIC_ULOZISTE_ODOLNOSTI, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
