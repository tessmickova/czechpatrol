"use client";

import { useEffect, useState } from "react";
import { prectiStatuspage, SLUZBY, type SnimekSluzeb, type StavSluzbyZaznam } from "./sluzby";

/*
  Živé čtení stavu služeb v prohlížeči.

  Začíná snímkem ze sběru (stejné HTML na serveru i v prohlížeči), po
  připojení přečte stavové stránky přímo a pak každých pět minut znovu.
  Kde čtení selže, zůstane poslední známý stav i s časem — a příznak
  `zive: false`, aby web nepsal „naživo" o něčem, co naživo není.
*/

const INTERVAL = 5 * 60_000;
const LIMIT = 8_000;

export interface ZivyStav extends StavSluzbyZaznam {
  /** Přečteno v tomhle prohlížeči, ne ze snímku sběru. */
  zive: boolean;
}

export function useStavSluzeb(snimek: SnimekSluzeb): { stavy: ZivyStav[]; kdy: string | null } {
  const [stavy, setStavy] = useState<ZivyStav[]>(() =>
    SLUZBY.map((s) => {
      const z = snimek.stavy.find((x) => x.klic === s.klic);
      return z ? { ...z, zive: false } : { klic: s.klic, stav: "nezjisteno", popis: null, incidenty: [], postizene: [], zkontrolovano: null, chyba: "zatím nečteno", zive: false };
    }),
  );
  const [kdy, setKdy] = useState<string | null>(snimek.aktualizovano);

  useEffect(() => {
    let zije = true;
    const precti = async () => {
      const ted = new Date().toISOString();
      const nove = await Promise.all(
        SLUZBY.map(async (s): Promise<ZivyStav | null> => {
          try {
            const o = await fetch(s.url, { signal: AbortSignal.timeout(LIMIT), headers: { accept: "application/json" } });
            if (!o.ok) return null;
            return { ...prectiStatuspage(s.klic, await o.json(), ted), zive: true };
          } catch {
            return null;
          }
        }),
      );
      if (!zije) return;
      setStavy((stare) => stare.map((st, i) => nove[i] ?? st));
      if (nove.some(Boolean)) setKdy(ted);
    };
    void precti();
    const t = setInterval(() => void precti(), INTERVAL);
    return () => { zije = false; clearInterval(t); };
  }, []);

  return { stavy, kdy };
}
