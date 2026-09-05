export interface Env {
  DB: D1Database;
  PUVOD_WEBU: string;
  RP_ID: string;
  NAZEV_WEBU: string;
  STAV_URL: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_JMENO?: string;
  ADMIN_BOOTSTRAP_KOD?: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_ID?: string;
}

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
  frekvence: "ihned",
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
