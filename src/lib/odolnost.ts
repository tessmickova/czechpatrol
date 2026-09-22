import katalog from "../../data/odolnost/funkce.json";

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
}

export interface Funkce {
  klic: string;
  nazev: string;
  potreba: string;
  /** 3 = bez toho se nedá být, 2 = důležité, 1 = pohodlí. */
  dulezitost: number;
  sezona?: string;
  zasoba?: { jednotka: string; naOsobuDen?: number; naZvireDen?: number; poznamka: string };
  cesty: Cesta[];
  nulaKc: string[];
  kompenzace: string[];
}

export const FUNKCE = katalog.funkce as Funkce[];
export const ZAVISLOSTI = katalog.zavislosti as Record<string, { nazev: string }>;
export const VERZE_KATALOGU = katalog.verze;
export const HORIZONTY_DNI = [1, 3, 7, 14, 30] as const;
export type HorizontDni = (typeof HORIZONTY_DNI)[number];

/** Co člověk zadává. Nic víc se neukládá — u každého pole je řečeno proč. */
export interface Profil {
  /** Kolik lidí a zvířat: jmenovatel pro vodu. */
  osob: number;
  zvirat: number;
  /** Které cesty domácnost má, po funkcích. */
  cesty: Record<string, string[]>;
  /** Zásoby: voda v litrech, užitková voda v litrech, jídlo a léky ve dnech. null = nezadáno (není totéž co nula). */
  zasoby: { pitnaVodaL: number | null; uzitkovaVodaL: number | null; jidloDni: number | null; lekyDni: number | null };
  /** Energie: kapacita vlastních zdrojů ve Wh a denní potřeba v nouzovém režimu ve Wh; dobíjení = solár, generátor, auto. */
  energie: { kapacitaWh: number; potrebaDenWh: number; dobijeni: boolean };
  /** Co člověk označil jako neřešitelné: klíč funkce → důvod. */
  nemohu: Record<string, string>;
}

export const PRAZDNY_PROFIL: Profil = {
  osob: 1,
  zvirat: 0,
  cesty: {},
  zasoby: { pitnaVodaL: null, uzitkovaVodaL: null, jidloDni: null, lekyDni: null },
  energie: { kapacitaWh: 0, potrebaDenWh: 0, dobijeni: false },
  nemohu: {},
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

export function hodnotFunkci(f: Funkce, profil: Profil): HodnoceniFunkce {
  const vybrane = new Set(profil.cesty[f.klic] ?? []);
  /* Vlastní zdroj energie sejme závislost na síti u přenosných zařízení; pevná instalace ji má dál. */
  const vlastniEnergie = profil.energie.kapacitaWh > 0;
  const mam = f.cesty
    .filter((c) => vybrane.has(c.klic))
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
}

function dny(mnozstvi: number | null, naDen: number): number | null {
  if (mnozstvi === null || naDen <= 0) return null;
  return Math.floor((mnozstvi / naDen) * 10) / 10;
}

export function vydrze(profil: Profil): Vydrz[] {
  const voda = FUNKCE.find((f) => f.klic === "pitna-voda")!.zasoba!;
  const hyg = FUNKCE.find((f) => f.klic === "hygiena")!.zasoba!;
  const osob = Math.max(0, profil.osob);
  const zvirat = Math.max(0, profil.zvirat);
  const vodaDen = osob * (voda.naOsobuDen ?? 0) + zvirat * (voda.naZvireDen ?? 0);
  const hygDen = osob * (hyg.naOsobuDen ?? 0);
  const en = profil.energie;
  return [
    { klic: "pitna-voda", nazev: "Pitná voda", dni: dny(profil.zasoby.pitnaVodaL, vodaDen), predpoklad: `${voda.naOsobuDen} l na osobu a den, ${voda.naZvireDen} l na zvíře; ${osob} ${osob === 1 ? "osoba" : osob < 5 ? "osoby" : "osob"}${zvirat ? `, ${zvirat} zvíř.` : ""}. ${voda.poznamka}` },
    { klic: "hygiena", nazev: "Užitková voda", dni: dny(profil.zasoby.uzitkovaVodaL, hygDen), predpoklad: `${hyg.naOsobuDen} l na osobu a den. ${hyg.poznamka}` },
    { klic: "potraviny", nazev: "Jídlo", dni: profil.zasoby.jidloDni, predpoklad: "Dny podle vašeho odhadu pro celou domácnost bez nákupu." },
    { klic: "zdravi", nazev: "Léky a pomůcky", dni: profil.zasoby.lekyDni, predpoklad: "Dny podle toho, co vám řekl lékař. Web dávky nepočítá." },
    {
      klic: "energie",
      nazev: "Vlastní energie v nouzovém režimu",
      dni: en.kapacitaWh > 0 && en.potrebaDenWh > 0 ? (en.dobijeni ? Infinity : dny(en.kapacitaWh, en.potrebaDenWh)) : null,
      predpoklad: en.dobijeni
        ? `Kapacita ${en.kapacitaWh} Wh, potřeba ${en.potrebaDenWh} Wh/den, s dobíjením — doba závisí na slunci nebo palivu, ne na kapacitě. Ztráty při nabíjení a vybíjení nejsou započtené.`
        : `Kapacita ${en.kapacitaWh} Wh, potřeba ${en.potrebaDenWh} Wh/den, bez dobíjení. Skutečná doba bývá kratší o ztráty (obvykle desítky procent) a v zimě dál klesá.`,
    },
  ];
}

export type StavHorizontu = "pripraveno" | "castecne" | "slabe" | "nehodnoceno";

export interface Horizont {
  dni: HorizontDni;
  stav: StavHorizontu;
  dojde: Vydrz[];
  nehodnoceno: Vydrz[];
}

export function horizonty(profil: Profil): Horizont[] {
  const v = vydrze(profil).filter((x) => x.klic !== "energie" || profil.energie.kapacitaWh > 0);
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
      zaklad: `Důležitost ${f.dulezitost} ze 3; potřeba: ${f.potreba}.`,
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

  /* 4. Zásoby, které dojdou dřív než za 72 hodin. */
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

/* ---------- souhrn pro dashboard ---------- */

export interface Souhrn {
  hodnoceni: HodnoceniFunkce[];
  body: BodSelhani[];
  horizonty: Horizont[];
  vydrze: Vydrz[];
  doporuceni: Doporuceni[];
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
    nejslabsi,
    vyreseno: { n: hodnoceni.filter((h) => h.redundance === 3).length, z: hodnoceni.length },
  };
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
