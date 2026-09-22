import snimek from "../../data/sluzby.json";

/*
  Stav služeb naživo.

  Proč to na bezpečnostním webu je: ve chvíli, kdy se něco děje, lidé
  nejdřív zjišťují, jestli jim jde zavolat, napsat a zaplatit. Položka
  „Mobilní síť a internet" v mřížce stavů říká, co potvrdily úřady; tohle
  je o krok dřív — co hlásí provozovatelé sami na svých stavových
  stránkách, v tuhle minutu.

  Odkud se čte: jen stavové stránky ve formátu Statuspage (`/api/v2/
  summary.json`), které vracejí strojově čitelný stav a povolují čtení
  z cizí stránky. České mobilní sítě, banky ani distributoři elektřiny
  takové rozhraní veřejně nemají — u nich se nic nepředstírá, odkazuje
  se na hlášení uživatelů (downdetector.cz) a na mřížku stavů vedle.

  Dvě vrstvy: sběr na Actions ukládá snímek do data/sluzby.json (aby web
  nebyl nikdy prázdný), prohlížeč si pak stav přečte sám a přepíše ho
  čerstvým. Když čtení z prohlížeče selže, zůstane snímek s časem —
  starý údaj s časem je lepší než žádný, a nikdy se nevydává za živý.
*/

export type StavSluzby = "provoz" | "omezeni" | "vypadek" | "nezjisteno";

export interface Sluzba {
  klic: string;
  nazev: string;
  /** Čemu služba slouží — jedno slovo pro čtenáře. */
  kategorie: "komunikace" | "internet";
  /** Strojová adresa stavu (Statuspage summary.json). */
  url: string;
  /** Stavová stránka pro čtenáře. */
  odkaz: string;
  /** Klíč položky v mřížce „Běžný život", které se výpadek týká. */
  tyka: string | null;
  /** Proč ji sledujeme — věta pro náhled. */
  proc: string;
}

export interface StavSluzbyZaznam {
  klic: string;
  stav: StavSluzby;
  /** Slovy provozovatele, např. „All Systems Operational". */
  popis: string | null;
  /** Otevřené incidenty podle provozovatele. */
  incidenty: { nazev: string; odkaz: string | null; aktualizovano: string | null }[];
  /** Součásti, které nejsou v provozu. */
  postizene: string[];
  /** Kdy byl stav přečten. */
  zkontrolovano: string | null;
  /** Proč se stav nepodařilo přečíst. */
  chyba: string | null;
}

export interface SnimekSluzeb {
  aktualizovano: string | null;
  stavy: StavSluzbyZaznam[];
}

/*
  Registr. Jen adresy, o kterých víme, že jsou stavové stránky Statuspage —
  nic se nehádá. Přidání služby = jeden záznam tady, nic jiného.

  Signal tu není schválně: jeho status.signal.org na /api/v2/summary.json
  nevrací JSON (ověřeno během sběru 21. 9. 2026), takže není Statuspage
  a nemáme z čeho číst. WhatsApp a Telegram veřejnou stavovou stránku
  nemají vůbec. U messengerů tak zbývají jen hlášení uživatelů.
*/
export const SLUZBY: Sluzba[] = [
  {
    klic: "cloudflare",
    nazev: "Cloudflare",
    kategorie: "internet",
    url: "https://www.cloudflarestatus.com/api/v2/summary.json",
    odkaz: "https://www.cloudflarestatus.com/",
    tyka: "komunikace",
    proc: "Síť, přes kterou běží velká část českých i světových webů včetně tohoto. Jeho výpadek vypadá jako „nejde internet“, i když síť jede.",
  },
  {
    klic: "zoom",
    nazev: "Zoom",
    kategorie: "komunikace",
    url: "https://status.zoom.us/api/v2/summary.json",
    odkaz: "https://status.zoom.us/",
    tyka: null,
    proc: "Videohovory, přes které v krizi jednají úřady, školy i firmy. Výpadek se pozná jako nepřipojitelné schůzky.",
  },
  {
    klic: "discord",
    nazev: "Discord",
    kategorie: "komunikace",
    url: "https://discordstatus.com/api/v2/summary.json",
    odkaz: "https://discordstatus.com/",
    tyka: null,
    proc: "Hlasové a textové kanály, které v krizi používají komunity a dobrovolníci k domluvě.",
  },
];

export const SLOVA_STAVU: Record<StavSluzby, string> = {
  provoz: "v provozu",
  omezeni: "omezení",
  vypadek: "výpadek",
  nezjisteno: "bez údaje",
};

/*
  Převod Statuspage na náš stav. Čtyři stupně provozovatele (none, minor,
  major, critical) na tři naše plus „bez údaje" — jemnější dělení by
  tvrdilo přesnost, kterou stavové stránky nemají: „minor" u jednoho
  provozovatele je „major" u jiného.
*/
const STUPEN: Record<string, StavSluzby> = {
  none: "provoz",
  minor: "omezeni",
  major: "vypadek",
  critical: "vypadek",
  /* Plánovaná údržba: služba může být omezená, ale není to výpadek. Zoom ji hlásil 22. 9. 2026 a panel ukazoval „bez údaje". */
  maintenance: "omezeni",
};

/** Přečte summary.json. Cokoli nečekaného vrátí jako „bez údaje" s důvodem, nikdy jako provoz. */
export function prectiStatuspage(klic: string, telo: unknown, ted: string): StavSluzbyZaznam {
  const prazdny: StavSluzbyZaznam = { klic, stav: "nezjisteno", popis: null, incidenty: [], postizene: [], zkontrolovano: ted, chyba: null };
  if (!telo || typeof telo !== "object") return { ...prazdny, chyba: "odpověď není objekt" };
  const o = telo as { status?: { indicator?: string; description?: string }; incidents?: unknown[]; components?: unknown[] };
  const indikator = o.status?.indicator;
  const stav = indikator ? STUPEN[indikator] : undefined;
  if (!stav) return { ...prazdny, chyba: `neznámý indikátor „${indikator ?? "žádný"}"` };
  const incidenty = (Array.isArray(o.incidents) ? o.incidents : [])
    .map((i) => i as { name?: string; shortlink?: string; updated_at?: string; status?: string })
    .filter((i) => typeof i.name === "string" && i.status !== "resolved")
    .slice(0, 3)
    .map((i) => ({ nazev: i.name as string, odkaz: typeof i.shortlink === "string" ? i.shortlink : null, aktualizovano: typeof i.updated_at === "string" ? i.updated_at : null }));
  const postizene = (Array.isArray(o.components) ? o.components : [])
    .map((c) => c as { name?: string; status?: string })
    .filter((c) => typeof c.name === "string" && c.status && c.status !== "operational")
    .slice(0, 4)
    .map((c) => c.name as string);
  return { ...prazdny, stav, popis: typeof o.status?.description === "string" ? o.status.description : null, incidenty, postizene };
}

export function snimekSluzeb(): SnimekSluzeb {
  return snimek as SnimekSluzeb;
}
