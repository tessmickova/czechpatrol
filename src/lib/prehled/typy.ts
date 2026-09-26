/*
  Rychlý přehled — datový kontrakt.

  Pět věcí se tu schválně drží odděleně (docs/RYCHLY-PREHLED.md):
    1. stav konkrétní informace  (StavInformace)
    2. stav datového zdroje      (StavZdroje)
    3. typ a autorita informace  (TypInformace)
    4. vztah k lokalitě          (VztahKLokalite)
    5. pokrytí souhrnu           (Pokryti)

  Jediný barevný semafor „bezpečno / nebezpečno“ tu není a být nesmí: web
  nemá podklady k celkovému posouzení bezpečnosti místa, jen k tomu, co
  které zdroje řekly a jak čerstvě to víme.
*/

/** Kraje ČR — stejná jména jako oblasti zpráv partnerů IZS (api/src/izs.ts). */
export const KRAJE = [
  "Hlavní město Praha", "Středočeský", "Jihočeský", "Plzeňský", "Karlovarský", "Ústecký",
  "Liberecký", "Královéhradecký", "Pardubický", "Vysočina", "Jihomoravský", "Olomoucký", "Zlínský", "Moravskoslezský",
] as const;
export type Kraj = (typeof KRAJE)[number];

/**
 * Zvolená lokalita. „nenastaveno“ je samostatný stav: přehled si nesmí
 * potichu domyslet Prahu ani celou republiku.
 */
export type Lokalita = { druh: "nenastaveno" } | { druh: "cr" } | { druh: "kraj"; kraj: Kraj };

/* ---------- zdroje ---------- */

/** Výsledek jednoho pokusu o zdroj, jak ho zapisuje sběr. */
export type VysledekPokusu = "ok" | "chyba" | "obsah";

/**
 * Trvalý stav zdroje mezi běhy (data/fronta/zdroje-stav.json).
 *
 * `posledni-beh.json` se každým během přepíše, takže z něj nešlo poznat,
 * kdy zdroj naposledy OPRAVDU odpověděl — jen jestli odpověděl teď.
 */
export interface ZaznamZdroje {
  posledniUspech: string | null;
  posledniPokus: string | null;
  posledniVysledek: VysledekPokusu;
  chyba: string | null;
  neuspechuZaSebou: number;
}

/**
 * - aktualni    — poslední úspěch v mezích skupiny
 * - zpozdeny    — úspěch starší, než by odpovídalo běhům; změnu nelze vyloučit
 * - nedostupny  — dlouho bez úspěchu, nebo nikdy
 * - neuplny     — poslední pokus vrátil HTTP 200 s nečekaným obsahem
 * - neoveritelny — zdroj automat trvale blokuje (ocekavaneBlokovani); známé omezení, ne výpadek
 */
export type StavZdroje = "aktualni" | "zpozdeny" | "nedostupny" | "neuplny" | "neoveritelny";

export interface ZdrojVeSnimku extends ZaznamZdroje {
  klic: string;
  nazev: string;
  odkaz: string;
  /** Automat se ke zdroji trvale nedostane (JS, blokace) — nepočítá se jako výpadek. */
  blokovany: boolean;
}

/* ---------- informace ---------- */

/**
 * Autorita a druh informace.
 * - oficialni-pokyn     — vydavatel říká obyvatelům, co mají dělat (jen je-li to v originále)
 * - oficialni-vystraha  — vydavatel varuje, bez výslovného pokynu
 * - oficialni-opatreni  — vyhlášený stav nebo opatření (nouzový stav, uzavření hranic)
 * - potvrzena-udalost   — doložená událost bez pokynu obyvatelstvu
 * - analyza             — náš výpočet nebo vyhodnocení; nikdy výstraha
 */
export type TypInformace = "oficialni-pokyn" | "oficialni-vystraha" | "oficialni-opatreni" | "potvrzena-udalost" | "analyza";

export type StavInformace = "platna" | "nadchazejici" | "ukoncena" | "odvolana" | "opravena" | "nejasna";

export type Uzemi =
  | { druh: "cr" }
  | { druh: "kraje"; kraje: string[] }
  /** Část území (okres, obec, úsek). `kraje` = ve kterých krajích leží, jsou-li známé. */
  | { druh: "cast"; popis: string; kraje: string[] }
  | { druh: "zahranici"; zeme: string }
  | { druh: "nezname"; popis?: string };

export type VztahKLokalite = "v-uzemi" | "mimo" | "nelze-urcit";

export interface InformaceVstup {
  id: string;
  typ: TypInformace;
  titulek: string;
  text: string;
  /** Je `text` znění vydavatele, nebo naše shrnutí? Naše shrnutí se na webu označí. */
  textJe: "zneni-vydavatele" | "shrnuti-cp";
  /** Pokyn obyvatelstvu doslova z originálu. null = v originále žádný není; nic se nedoplňuje. */
  pokyn: string | null;
  vydavatel: string | null;
  odkaz: string | null;
  vydano: string | null;
  platiOd: string | null;
  platiDo: string | null;
  odvolano: string | null;
  opraveno: string | null;
  uzemi: Uzemi;
  /** Co zatím nevíme — jen u událostí a analýz. */
  coNevime: string[];
  /** Jistota a původ — povinné u analýzy. */
  jistota: string | null;
  puvod: string | null;
  /** Odkaz na podrobnosti na webu. */
  detail: string | null;
}

/* ---------- snímek (build → /prehled.json → prohlížeč) ---------- */

export interface SnimekPrehledu {
  verze: 1;
  /** Kdy vznikl build. NIKDY se neukazuje jako čas kontroly zdrojů. */
  generovano: string;
  beh: { kdy: string | null; zdroju: number; ok: number };
  zdroje: ZdrojVeSnimku[];
  sluzby: { aktualizovano: string | null };
  palivo: { aktualizovano: string | null };
  informace: InformaceVstup[];
  neovereno: { signalu24h: number; vyvracenych: number; oznacenoUradem: number };
}

/* ---------- výsledek pro UI ---------- */

export type StavDat = "aktualni" | "zpozdeni" | "vypadek-zasadniho" | "nelze-potvrdit" | "vypadek-vseho";

export type DruhHlavniho =
  | "vystraha"
  | "posledni-znama"
  | "vystraha-nejasna"
  | "bez-vystrahy"
  | "zpozdeni"
  | "vypadek-zasadniho"
  | "nelze-potvrdit"
  | "vypadek-vseho";

export interface VyhodnocenyZdroj extends ZdrojVeSnimku {
  skupina: string;
  nazevSkupiny: string;
  zasadni: boolean;
  stav: StavZdroje;
}

export interface VyhodnocenaInformace extends InformaceVstup {
  stav: StavInformace;
  vztah: VztahKLokalite;
  /** Novější změnu u vydavatele teď nemůžeme ověřit (výpadek kontroly). */
  zmenuNelzeOverit: boolean;
}

export interface Prehled {
  lokalita: Lokalita;
  oblastText: string;
  stavDat: StavDat;
  hlavni: { druh: DruhHlavniho; nadpis: string; veta: string; ton: "vystraha" | "pozor" | "neutralni" };
  /** Poslední úspěšná kontrola zásadních zdrojů; null = žádná. */
  posledniKontrola: string | null;
  zdroje: VyhodnocenyZdroj[];
  pokryti: { zahrnuto: string[]; nelzeOverit: string[]; necteme: string[] };
  oficialni: VyhodnocenaInformace[];
  /** Oficiální informace mimo zvolenou oblast — jen počet, ať nepřekáží. */
  mimoOblast: number;
  udalosti: VyhodnocenaInformace[];
  analyza: VyhodnocenaInformace | null;
  neovereno: SnimekPrehledu["neovereno"];
}
