"use client";

import { useCallback, useEffect, useState } from "react";
import { UCTY_ZAPNUTE } from "@/config/web";
import { api, token, useUcet } from "@/lib/ucet";

/*
  Premium „Odolnější domácnost“ na straně webu.

  Cena, kredit i to, jestli platby vůbec běží, se čtou z API (GET /premium).
  Web nic z toho neopisuje: kdyby byla částka v konfiguraci webu a jiná
  v API, tlačítko by lhalo. Bez API je stav „připravujeme“ a nic se
  nenabízí jako funkční.

  Hranice FREE / PREMIUM je v komponentě odolnosti; tady je jen odpověď
  na otázku „má tenhle účet Premium“ a kroky k platbě.
*/

export interface PremiumVerejne {
  bezi: boolean;
  test: boolean | null;
  produkt: string;
  nazev: string;
  cenaHaleru: number;
  kreditHaleru: number;
  mena: string;
  eshopBezi: boolean;
}

export interface Komunita { telegram: string | null; whatsapp: string | null }

export interface Opravneni {
  id: string; produkt: string; druh: string; zdroj: string; platneOd: string; platneDo: string | null; stav: string; platne: boolean;
}

export const kc = (haleru: number) => `${Math.round(haleru / 100)} Kč`;

export function usePremium() {
  const { ucet, nacita: nacitaUcet } = useUcet();
  const [verejne, setVerejne] = useState<PremiumVerejne | null>(null);
  const [premium, setPremium] = useState(false);
  const [komunita, setKomunita] = useState<Komunita | null>(null);
  const [opravneni, setOpravneni] = useState<Opravneni[]>([]);
  const [nacita, setNacita] = useState(UCTY_ZAPNUTE);

  const nacti = useCallback(async () => {
    if (!UCTY_ZAPNUTE) { setNacita(false); return; }
    try {
      const v = await api<PremiumVerejne>("/premium");
      setVerejne(v);
    } catch {
      setVerejne(null);
    }
    if (token()) {
      try {
        const o = await api<{ opravneni: Opravneni[]; premium: boolean; komunita: Komunita | null }>("/ja/opravneni");
        setPremium(o.premium);
        setKomunita(o.komunita);
        setOpravneni(o.opravneni);
      } catch {
        setPremium(false);
        setKomunita(null);
      }
    } else {
      setPremium(false);
      setKomunita(null);
      setOpravneni([]);
    }
    setNacita(false);
  }, []);

  useEffect(() => {
    nacti();
    window.addEventListener("czechpatrol:ucet", nacti);
    return () => window.removeEventListener("czechpatrol:ucet", nacti);
  }, [nacti]);

  return { ucet, verejne, premium, komunita, opravneni, nacita: nacita || nacitaUcet, obnov: nacti };
}

/** Založí platbu a vrátí adresu platební stránky brány. */
export async function zacniPlatbu(produkt = "premium-odolnost"): Promise<{ id: string; presmerovani: string }> {
  return api<{ id: string; presmerovani: string }>("/platby/zacit", { method: "POST", telo: { produkt } });
}

export interface Kredit {
  id: string; kod: string; maska: string; hodnotaHaleru: number; mena: string; stav: string; vytvoreno: string; expirace: string | null; uplatneno: string | null;
  nahradaZa: string | null; nahrazen: string | null; email: { stav: string; pokusy: number; odeslano: string | null } | null;
}

export const STAV_KREDITU: Record<string, string> = { ACTIVE: "aktivní", REDEEMED: "uplatněný", EXPIRED: "prošlý", REVOKED: "zneplatněný", REPLACED: "nahrazený" };
export const STAV_EMAILU: Record<string, string> = { QUEUED: "čeká na odeslání", SENT: "odeslán", FAILED: "nepodařilo se doručit", DELIVERED: "doručen" };
export const STAV_PLATBY: Record<string, string> = { CREATED: "založena", PENDING: "čeká na bránu", PAID: "zaplaceno", FAILED: "selhala", CANCELLED: "zrušena", REFUNDED: "vrácena", PARTIALLY_REFUNDED: "částečně vrácena" };
