"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { KODY_JAZYKU } from "./jazyky";
import en from "../../data/preklady/ui/en.json";
import de from "../../data/preklady/ui/de.json";
import pl from "../../data/preklady/ui/pl.json";
import sk from "../../data/preklady/ui/sk.json";
import uk from "../../data/preklady/ui/uk.json";
import lt from "../../data/preklady/ui/lt.json";
import lv from "../../data/preklady/ui/lv.json";
import et from "../../data/preklady/ui/et.json";
import fi from "../../data/preklady/ui/fi.json";
import sv from "../../data/preklady/ui/sv.json";
import nb from "../../data/preklady/ui/nb.json";
import da from "../../data/preklady/ui/da.json";
import ro from "../../data/preklady/ui/ro.json";
import bg from "../../data/preklady/ui/bg.json";
import hu from "../../data/preklady/ui/hu.json";

/*
  Překlad rozhraní.

  Klíčem je česká věta, ne vymyšlený identifikátor. Důvody jsou tři a všechny
  praktické:

  1. Migrace je jen obalení: `"Poslední události"` → `t("Poslední události")`.
     Nemusí se vymýšlet a udržovat tisíc jmen klíčů.
  2. Chybějící překlad nikdy nevyrobí prázdné místo. Když překlad není, vrátí
     se česká věta — čtenář uvidí češtinu, ne díru. To je v souladu s pravidlem
     č. 4: co není ověřené, se nedopočítává.
  3. Zdroj překladu je vidět přímo v kódu, takže se nemůže rozejít s tím, co
     se opravdu zobrazuje.

  Co se nepřekládá nikdy: fakta u událostí, titulky převzaté od médií, názvy
  zdrojů a odkazy. To jsou cizí tvrzení — přeložit je by znamenalo tvrdit něco,
  co nikdo neověřil, a fakta se nesmějí lišit podle jazyka.
*/

type Slovnik = Record<string, string>;

/*
  Statické importy, ne dynamická cesta: sestavení pak ví, co do buildu patří,
  a chybějící soubor zastaví build místo toho, aby se projevil až na webu.
*/
const SLOVNIK: Record<string, Slovnik> = {
  en, de, pl, sk, uk, lt, lv, et, fi, sv, nb, da, ro, bg, hu,
};

export const VYCHOZI_JAZYK = "cs";

const Kontext = createContext<string>(VYCHOZI_JAZYK);

export function JazykProvider({ kod, children }: { kod: string; children: React.ReactNode }) {
  return <Kontext.Provider value={kod}>{children}</Kontext.Provider>;
}

/**
 * Přeloží českou větu do daného jazyka.
 *
 * Bez překladu vrací češtinu — záměrně. Poloprázdné rozhraní je horší než
 * rozhraní, kde jedna věta zůstala česky.
 */
export function prelozit(kod: string, cesky: string): string {
  if (kod === VYCHOZI_JAZYK) return cesky;
  return SLOVNIK[kod]?.[cesky] || cesky;
}

/** Překladač pro klientské komponenty. */
export function useT() {
  const kod = useContext(Kontext);
  return useCallback((cesky: string) => prelozit(kod, cesky), [kod]);
}

/**
 * Jazyk, cesta a překladač odkazů pohromadě.
 *
 * `odkaz()` doplní jazykovou předponu vnitřním adresám a nechá být vnější,
 * kotvy a soubory.
 */
export function useContextJazyka() {
  const kod = useContext(Kontext);
  return useMemo(
    () => ({
      kod,
      odkaz: (href: string) => {
        if (kod === VYCHOZI_JAZYK) return href;
        if (!href.startsWith("/") || href.startsWith("//")) return href;
        if (/\.[a-z0-9]+$/i.test(href.split("?")[0])) return href;
        return sJazykem(href, kod);
      },
    }),
    [kod],
  );
}

export function useJazyk() {
  const kod = useContext(Kontext);
  const cesta = usePathname();
  return useMemo(() => ({ kod, cesta }), [kod, cesta]);
}

/* ---------------- adresy ---------------- */

/**
 * Cesta bez jazykové předpony. `/pl/udalosti/` → `/udalosti/`.
 *
 * Používá se při přepnutí jazyka: čtenář má zůstat na téže stránce, ne se
 * vrátit na úvod.
 */
export function bezJazyka(cesta: string): string {
  const [, prvni, ...zbytek] = cesta.split("/");
  if (!KODY_JAZYKU.includes(prvni)) return cesta || "/";
  const zbyva = zbytek.join("/");
  return zbyva ? `/${zbyva}` : "/";
}

/** Opačný směr: `/udalosti/` + `pl` → `/pl/udalosti/`. */
export function sJazykem(cesta: string, kod: string): string {
  const hola = bezJazyka(cesta);
  if (kod === VYCHOZI_JAZYK) return hola;
  return hola === "/" ? `/${kod}/` : `/${kod}${hola}`;
}

/** Jazyk vyčtený z cesty. Pro místa, kde není po ruce kontext. */
export function jazykZCesty(cesta: string): string {
  const prvni = cesta.split("/")[1];
  return KODY_JAZYKU.includes(prvni) ? prvni : VYCHOZI_JAZYK;
}
