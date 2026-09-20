"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, UCTY_ZAPNUTE } from "@/config/web";

/**
 * Klientská strana účtů.
 *
 * Web je statický a API běží jinde, proto se přihlášení nese tokenem
 * v hlavičce, ne cookie — cookie třetí strany by Safari zahodilo. Token
 * žije jen v tomhle prohlížeči a jde kdykoli zneplatnit odhlášením.
 */

export type Role = "obcan" | "podporovatel" | "izs" | "admin";

export const ROLE: Record<Role, { nazev: string; popis: string }> = {
  obcan: { nazev: "Čtenář", popis: "Základní účet. Upozornění a nastavení." },
  podporovatel: { nazev: "Podporovatel", popis: "Podporuje provoz projektu." },
  izs: { nazev: "Partner IZS", popis: "Ověřená složka. Může navrhnout zprávu čtenářům." },
  admin: { nazev: "Správce", popis: "Spravuje účty a schvaluje zprávy." },
};

export type Frekvence = "ihned" | "denne" | "tydne" | "jen-kriticke";
export type MinZavaznost = "stredni" | "vysoka" | "kriticka";

export interface NastaveniUpozorneni {
  frekvence: Frekvence;
  minZavaznost: MinZavaznost;
  /** null = žádné tiché hodiny, všechno důležité přijde hned. */
  ticho: { od: string; do: string } | null;
  oblasti: string[];
  zpravyIzs: boolean;
  /** Kraj pro zprávy partnerů IZS. null = jen celostátní. */
  kraj: string | null;
}

export interface Ucet {
  id: string;
  role: Role;
  vytvoreno: string;
  telegram: boolean;
  whatsapp: boolean;
  upozorneni: NastaveniUpozorneni;
  /** Jen u partnerů IZS: název složky, který se objeví ve zprávách. */
  nazev: string | null;
  /** Kolik passkey je k účtu přihlášených — kvůli varování před ztrátou přístupu. */
  passkeys: number;
}

/** Které doručovací kanály server právě umí. Kanál bez tokenu se nenabízí. */
export interface DostupneKanaly {
  telegram: boolean;
  whatsapp: boolean;
}

export const VYCHOZI_UPOZORNENI: NastaveniUpozorneni = {
  frekvence: "tydne",
  minZavaznost: "vysoka",
  ticho: null,
  oblasti: [],
  zpravyIzs: true,
  kraj: null,
};

const KLIC_TOKENU = "czechpatrol.token";

export function token(): string | null {
  try {
    return localStorage.getItem(KLIC_TOKENU);
  } catch {
    return null;
  }
}

export function ulozToken(t: string | null) {
  try {
    if (t) localStorage.setItem(KLIC_TOKENU, t);
    else localStorage.removeItem(KLIC_TOKENU);
  } catch {
    /* soukromé okno bez úložiště — přihlášení vydrží jen do obnovení stránky */
  }
  window.dispatchEvent(new Event("czechpatrol:ucet"));
}

export class ChybaApi extends Error {
  constructor(public stav: number, zprava: string) {
    super(zprava);
  }
}

/** Jediný způsob, jak web mluví s API. */
export async function api<T>(cesta: string, init: RequestInit & { telo?: unknown } = {}): Promise<T> {
  if (!UCTY_ZAPNUTE) throw new ChybaApi(0, "Účty zatím nejsou zapnuté.");
  const hlavicky: Record<string, string> = { Accept: "application/json" };
  const t = token();
  if (t) hlavicky.Authorization = `Bearer ${t}`;
  if (init.telo !== undefined) hlavicky["Content-Type"] = "application/json";
  const odpoved = await fetch(`${API_URL}${cesta}`, {
    ...init,
    headers: { ...hlavicky, ...(init.headers as Record<string, string> | undefined) },
    body: init.telo !== undefined ? JSON.stringify(init.telo) : init.body,
  });
  if (odpoved.status === 401) ulozToken(null);
  const text = await odpoved.text();

  /*
    Odpověď, která není JSON, znamená skoro vždycky jedinou věc: API_URL
    nemíří na Worker, ale na statický web. Ten na POST odpovídá 405 a na
    neznámou cestu vrací HTML. Worker se takhle chovat neumí — neznámou
    cestu hlásí jako 404 v JSONu.

    Bez tohohle rozlišení dostane člověk holé „Chyba 405", což nevypadá jako
    špatná adresa, ale jako rozbité přihlašování, a hledá se to hodinu.
  */
  let data: { chyba?: string } & T;
  try {
    data = text ? (JSON.parse(text) as { chyba?: string } & T) : ({} as { chyba?: string } & T);
  } catch {
    throw new ChybaApi(
      odpoved.status,
      `API neodpovídá jako API (stav ${odpoved.status}). Zkontrolujte adresu ${API_URL} — má mířit na worker, ne na web. Ověření: ${API_URL}/zdravi má vrátit {"ok":true}.`,
    );
  }

  if (!odpoved.ok) throw new ChybaApi(odpoved.status, (data as { chyba?: string }).chyba ?? `Chyba ${odpoved.status}`);
  return data;
}

/** Přihlášený účet, nebo null. Sleduje změny tokenu napříč komponentami. */
export function useUcet() {
  const [ucet, setUcet] = useState<Ucet | null>(null);
  const [dostupne, setDostupne] = useState<DostupneKanaly>({ telegram: false, whatsapp: false });
  const [nacita, setNacita] = useState(UCTY_ZAPNUTE);

  const nacti = useCallback(async () => {
    if (!UCTY_ZAPNUTE || !token()) {
      setUcet(null);
      setNacita(false);
      return;
    }
    try {
      const v = await api<{ ucet: Ucet; dostupne: DostupneKanaly }>("/ja");
      setUcet(v.ucet);
      setDostupne(v.dostupne);
    } catch {
      setUcet(null);
    } finally {
      setNacita(false);
    }
  }, []);

  useEffect(() => {
    nacti();
    window.addEventListener("czechpatrol:ucet", nacti);
    return () => window.removeEventListener("czechpatrol:ucet", nacti);
  }, [nacti]);

  return { ucet, dostupne, nacita, obnov: nacti };
}

export async function odhlasit() {
  try {
    await api("/auth/odhlaseni", { method: "POST" });
  } catch {
    /* token už mohl vypršet — lokálně ho zahodíme tak jako tak */
  }
  ulozToken(null);
}

/** Má účet aspoň tuhle roli? Pořadí: čtenář < podporovatel < IZS < správce. */
export function maRoli(ucet: Ucet | null, role: Role): boolean {
  if (!ucet) return false;
  const poradi: Role[] = ["obcan", "podporovatel", "izs", "admin"];
  return poradi.indexOf(ucet.role) >= poradi.indexOf(role);
}
