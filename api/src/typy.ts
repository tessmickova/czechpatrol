export interface Env {
  DB: D1Database;
  PUVOD_WEBU: string;
  RP_ID: string;
  /** Předchozí adresy webu během přechodu na vlastní doménu, oddělené čárkou. Viz pomocne.ts. */
  PUVOD_WEBU_DALSI?: string;
  NAZEV_WEBU: string;
  STAV_URL: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_JMENO?: string;
  ADMIN_BOOTSTRAP_KOD?: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_ID?: string;
  // Kopnutí do sběru dat na GitHubu. Bez tokenu se sběr neplánuje odsud.
  GH_TOKEN_SBER?: string;
  SBER_REPO?: string;
  SBER_WORKFLOW?: string;
  /* Kam hlídač hlásí, že sběr přestal běžet. Viz src/hlidac.ts. */
  SPRAVCE_CHAT?: string;
  TELEGRAM_KANAL?: string;
  /* Premium a kredity — viz docs/PREMIUM-NAVRH.md. Bez klíče a brány se
     platby nespouštějí a web říká „připravujeme“. Vše jsou tajemství Workeru. */
  KLIC_SIFROVANI?: string;
  COMGATE_MERCHANT?: string;
  COMGATE_SECRET?: string;
  /** "true" = testovací režim brány (výchozí, dokud není řečeno jinak). */
  COMGATE_TEST?: string;
  /** Odesílání e-mailů: "resend" nebo "postmark", klíč a adresa odesílatele. */
  EMAIL_POSKYTOVATEL?: string;
  EMAIL_API_KLIC?: string;
  EMAIL_ODESILATEL?: string;
  /** Serverový token e-shopu pro uplatnění kreditu. Bez něj se kredity neuplatňují. */
  ESHOP_TOKEN?: string;
  /** Pozvánky do komunity a chatu pro Premium — nikdy ve veřejném kódu webu. */
  KOMUNITA_TELEGRAM_ODKAZ?: string;
  KOMUNITA_WHATSAPP_ODKAZ?: string;
}

/**
 * Produkty. Cena i kredit v haléřích (celá čísla). Jediné místo, kde je
 * částka; web si ji čte z GET /premium, nikde ji neopisuje.
 */
export const PRODUKTY = {
  "premium-odolnost": { nazev: "Odolnější domácnost — Premium", cenaHaleru: 15000, kreditHaleru: 15000, mena: "CZK" },
} as const;
export type Produkt = keyof typeof PRODUKTY;
export const jeProdukt = (p: unknown): p is Produkt => typeof p === "string" && p in PRODUKTY;

export type Role = "obcan" | "podporovatel" | "izs" | "admin";
export const ROLE: Role[] = ["obcan", "podporovatel", "izs", "admin"];

export type Frekvence = "ihned" | "denne" | "tydne" | "jen-kriticke";
export type MinZavaznost = "stredni" | "vysoka" | "kriticka";
export type Zavaznost = "nizka" | "stredni" | "vysoka" | "kriticka";
export type DruhKanalu = "telegram" | "whatsapp";

export interface Nastaveni {
  frekvence: Frekvence;
  minZavaznost: MinZavaznost;
  ticho: { od: string; do: string } | null;
  oblasti: string[];
  zpravyIzs: boolean;
  kraj: string | null;
}

export const VYCHOZI_NASTAVENI: Nastaveni = {
  frekvence: "tydne",
  minZavaznost: "vysoka",
  ticho: null,
  oblasti: [],
  zpravyIzs: true,
  kraj: null,
};

export interface RadekUctu {
  id: string;
  role: Role;
  vytvoreno: string;
  posledni_prihlaseni: string | null;
  poznamka: string | null;
  nazev: string | null;
  obnova_hash: string | null;
  nastaveni: string;
}

export interface Prihlaseny {
  id: string;
  role: Role;
  nastaveni: Nastaveni;
  nazev: string | null;
}

/** Zpráva, která má odejít čtenářům. */
export interface NovaZprava {
  druh: "uroven" | "pravni" | "nato" | "provoz" | "udalost" | "izs";
  zavaznost: Zavaznost;
  oblast: string | null;
  kategorie: string[] | null;
  titulek: string;
  text: string;
  odkaz: string | null;
}

/** Stav webu, jak ho vydává /stav.json. */
export interface StavWebu {
  verze: number;
  web: string;
  generovano: string;
  overeno: string | null;
  uroven: string | null;
  nazev: string | null;
  pasmo: string | null;
  trend: string | null;
  hybridni: string | null;
  primy: string | null;
  pravni: Record<string, boolean | null>;
  nato: Record<string, boolean | null>;
  provoz: Record<string, string>;
  udalosti: {
    slug: string;
    titulek: string;
    zavaznost: string;
    pasmo: string;
    kategorie: string[];
    zeme: string;
    kodZeme: string;
    datumUdalosti: string;
    datumZjisteni: string | null;
    aktualizovano: string;
    odkaz: string;
  }[];
}
