import type { Frekvence, Nastaveni, NovaZprava, StavWebu, Zavaznost } from "./typy";

/*
  Co se posílá a kdy.

  Čisté funkce bez databáze — dají se otestovat na papíře. Rozhodují dvě
  věci: z rozdílu dvou stavů webu, co je zpráva; a z nastavení čtenáře,
  jestli a kdy mu má přijít.
*/

const PORADI: Record<Zavaznost, number> = { nizka: 0, stredni: 1, vysoka: 2, kriticka: 3 };

const NAZVY_PRAVNI: Record<string, string> = {
  "stav-ohrozeni": "Stav ohrožení státu",
  "valecny-stav": "Válečný stav",
  mobilizace: "Mobilizace",
  "nouzovy-stav": "Nouzový stav",
  vycestovani: "Omezení vycestování z ČR",
  hranice: "Mimořádné uzavření hranic",
  "schuze-parlamentu": "Mimořádná bezpečnostní schůze Parlamentu",
};
const NAZVY_NATO: Record<string, string> = {
  "clanek-4": "Článek 4 NATO (konzultace)",
  "clanek-5": "Článek 5 NATO (kolektivní obrana)",
  readiness: "Mimořádná změna pohotovosti NATO",
  evakuace: "Evakuace personálu NATO",
  "vychodni-kridlo": "Východní křídlo NATO",
};
const NAZVY_PROVOZU: Record<string, string> = {
  vycestovani: "Vycestování",
  hranice: "Hranice a doprava",
  palivo: "Palivo a čerpací stanice",
  elektrina: "Elektřina a energetika",
  plyn: "Plyn",
  banky: "Banky a hotovost",
  komunikace: "Mobilní síť a internet",
  "bezny-zivot": "Školy a běžný režim",
};
const STAVY_PROVOZU: Record<string, string> = {
  bezny: "běžný provoz",
  sledujeme: "sledujeme",
  narusen: "narušeno",
};

function zavaznostPasma(pasmo: string | null, nahoru: boolean): Zavaznost {
  if (pasmo === "cervena") return "kriticka";
  if (pasmo === "oranzova") return nahoru ? "vysoka" : "stredni";
  return "stredni";
}

/** Z rozdílu dvou stavů udělá zprávy. První stav (bez minulého) nic negeneruje. */
export function rozdilStavu(stary: StavWebu | null, novy: StavWebu): NovaZprava[] {
  if (!stary) return [];
  const z: NovaZprava[] = [];
  const web = novy.web;

  if (stary.uroven !== novy.uroven && novy.uroven) {
    const nahoru = (novy.pasmo ?? "") !== (stary.pasmo ?? "") ? true : novy.trend === "nahoru";
    z.push({
      druh: "uroven",
      zavaznost: zavaznostPasma(novy.pasmo, nahoru),
      oblast: null,
      kategorie: null,
      titulek: "Změna celkové úrovně",
      text: `${stary.nazev ?? "nestanoveno"} → ${novy.nazev}`,
      odkaz: `${web}/`,
    });
  }

  for (const [k, v] of Object.entries(novy.pravni)) {
    const s = stary.pravni[k] ?? null;
    if (s === v) continue;
    if (v === true) z.push({ druh: "pravni", zavaznost: "kriticka", oblast: null, kategorie: null, titulek: NAZVY_PRAVNI[k] ?? k, text: "Vyhlášeno podle úředního zdroje.", odkaz: `${web}/#cr` });
    else if (s === true && v === false) z.push({ druh: "pravni", zavaznost: "vysoka", oblast: null, kategorie: null, titulek: NAZVY_PRAVNI[k] ?? k, text: "Ukončeno — podle úředních zdrojů už neplatí.", odkaz: `${web}/#cr` });
    // null ↔ false je změna ověření, ne změna stavu; nic se neposílá.
  }

  for (const [k, v] of Object.entries(novy.nato)) {
    const s = stary.nato[k] ?? null;
    if (s === v) continue;
    const clanek = k === "clanek-4" || k === "clanek-5";
    if (v === true) z.push({ druh: "nato", zavaznost: clanek ? "kriticka" : "vysoka", oblast: null, kategorie: null, titulek: NAZVY_NATO[k] ?? k, text: "Aktivováno podle oficiálního oznámení.", odkaz: `${web}/#nato` });
    else if (s === true && v === false) z.push({ druh: "nato", zavaznost: clanek ? "vysoka" : "stredni", oblast: null, kategorie: null, titulek: NAZVY_NATO[k] ?? k, text: "Ukončeno.", odkaz: `${web}/#nato` });
  }

  for (const [k, v] of Object.entries(novy.provoz)) {
    const s = stary.provoz[k];
    if (s === v || v === "bez-zdroje" || s === "bez-zdroje" || s === undefined) continue;
    const zavaznost: Zavaznost = v === "narusen" ? "vysoka" : "stredni";
    z.push({ druh: "provoz", zavaznost, oblast: null, kategorie: null, titulek: NAZVY_PROVOZU[k] ?? k, text: `${STAVY_PROVOZU[s] ?? s} → ${STAVY_PROVOZU[v] ?? v}`, odkaz: `${web}/` });
  }

  const stare = new Set(stary.udalosti.map((u) => u.slug));
  for (const u of novy.udalosti) {
    if (stare.has(u.slug)) continue;
    const zavaznost: Zavaznost = u.pasmo === "cervena" ? "kriticka" : u.pasmo === "oranzova" ? "vysoka" : u.pasmo === "zelena" ? "nizka" : "stredni";
    z.push({ druh: "udalost", zavaznost, oblast: null, kategorie: u.kategorie, titulek: u.titulek, text: `${u.zeme} · událost ${cesky(u.datumUdalosti)}`, odkaz: u.odkaz });
  }
  return z;
}

export function cesky(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

/* ---------- pražský čas ---------- */

function castiPrahy(d: Date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short",
  });
  const c: Record<string, string> = {};
  for (const p of f.formatToParts(d)) c[p.type] = p.value;
  return { y: +c.year, m: +c.month, d: +c.day, h: +c.hour % 24, mi: +c.minute, den: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(c.weekday) };
}

/** Okamžik odpovídající danému pražskému času. */
export function zPrahy(y: number, m: number, d: number, h: number, mi: number): Date {
  let odhad = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const c = castiPrahy(new Date(odhad));
    const videno = Date.UTC(c.y, c.m - 1, c.d, c.h, c.mi);
    odhad += Date.UTC(y, m - 1, d, h, mi) - videno;
  }
  return new Date(odhad);
}

function minuty(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Je pražský čas uvnitř tichých hodin? Zvládá i interval přes půlnoc. */
export function vTichu(ted: Date, ticho: { od: string; do: string } | null): boolean {
  if (!ticho) return false;
  const c = castiPrahy(ted);
  const t = c.h * 60 + c.mi;
  const od = minuty(ticho.od), do_ = minuty(ticho.do);
  return od <= do_ ? t >= od && t < do_ : t >= od || t < do_;
}

/** Konec tichých hodin — dnes nebo zítra. */
export function konecTicha(ted: Date, ticho: { od: string; do: string }): Date {
  const c = castiPrahy(ted);
  const [h, mi] = ticho.do.split(":").map(Number);
  let konec = zPrahy(c.y, c.m, c.d, h, mi || 0);
  if (konec <= ted) konec = new Date(konec.getTime() + 86_400_000);
  return konec;
}

/** Další souhrn: denně v 18:00, týdně v neděli 18:00 pražského času. */
export function dalsiSouhrn(ted: Date, frekvence: "denne" | "tydne"): Date {
  const c = castiPrahy(ted);
  let kandidat = zPrahy(c.y, c.m, c.d, 18, 0);
  if (frekvence === "denne") {
    if (kandidat <= ted) kandidat = new Date(kandidat.getTime() + 86_400_000);
    return kandidat;
  }
  const doNedele = (7 - c.den) % 7;
  kandidat = new Date(kandidat.getTime() + doNedele * 86_400_000);
  if (kandidat <= ted) kandidat = new Date(kandidat.getTime() + 7 * 86_400_000);
  return kandidat;
}

/* ---------- plánování pro jednoho čtenáře ---------- */

/**
 * Kdy má zpráva přijít tomuhle čtenáři. null = vůbec.
 * Kritické jde vždy hned; zprávy partnera IZS taky — jsou časové.
 */
export function naplanuj(z: NovaZprava, n: Nastaveni, ted: Date): Date | null {
  if (z.druh === "izs") {
    if (!n.zpravyIzs) return null;
    if (z.oblast && z.oblast !== "Celá ČR" && z.oblast !== n.kraj) return null;
    return ted;
  }
  if (PORADI[z.zavaznost] < PORADI[n.minZavaznost]) return null;
  if (n.oblasti.length && z.kategorie && !z.kategorie.some((k) => n.oblasti.includes(k))) return null;

  const kriticka = z.zavaznost === "kriticka";
  const f: Frekvence = n.frekvence;
  if (f === "jen-kriticke") return kriticka ? ted : null;
  if (kriticka) return ted;
  if (f === "denne" || f === "tydne") return dalsiSouhrn(ted, f);
  return vTichu(ted, n.ticho) ? konecTicha(ted, n.ticho!) : ted;
}

/* ---------- text zprávy ---------- */

const ZNAK: Record<Zavaznost, string> = { nizka: "🟢", stredni: "🟡", vysoka: "🟠", kriticka: "🔴" };

export interface ZpravaKTextu {
  druh: NovaZprava["druh"];
  zavaznost: Zavaznost;
  titulek: string;
  text: string;
  odkaz: string | null;
  oblast: string | null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const PATA = "<i>CzechPatrol · analytický přehled, ne úřední varování.</i>";

/** Jedna zpráva ve formátu Telegram HTML. */
export function textZpravy(z: ZpravaKTextu): string {
  if (z.druh === "izs") {
    return [`🚨 <b>Zpráva partnera IZS</b>${z.oblast ? ` · ${esc(z.oblast)}` : ""}`, `<b>${esc(z.titulek)}</b>`, esc(z.text), z.odkaz ? esc(z.odkaz) : null, "", "<i>Zprávu poslala ověřená složka IZS přes CzechPatrol. Není to úřední varování; v nouzi volejte 112.</i>"]
      .filter((r) => r !== null)
      .join("\n");
  }
  return [`${ZNAK[z.zavaznost]} <b>${esc(z.titulek)}</b>`, esc(z.text), z.odkaz ? esc(z.odkaz) : null, "", PATA].filter((r) => r !== null).join("\n");
}

/** Souhrn více zpráv v jedné. */
export function textSouhrnu(zpravy: ZpravaKTextu[], web: string): string {
  const radky = zpravy.map((z) => `${ZNAK[z.zavaznost]} <b>${esc(z.titulek)}</b> — ${esc(z.text)}`);
  return [`<b>CzechPatrol · souhrn</b> (${zpravy.length})`, ...radky, "", esc(web), PATA].join("\n");
}

/** Prostý text bez HTML — pro WhatsApp. */
export function prostyText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
