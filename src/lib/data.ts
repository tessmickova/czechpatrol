import { JE_UKAZKA } from "@/config/web";
import type {
  Archiv, CelkovyStav, HybridniTlak, Incident, NatoPolozka, PravniStav,
  Provoz, RuskoStav, TydenniHodnoceni, Uroven, Watchlist,
} from "./typy";

import ostreIncidenty from "../../data/incidenty.json";
import ostryStav from "../../data/stav.json";
import ostryPravni from "../../data/pravni-stav.json";
import ostreNato from "../../data/nato.json";
import ostryProvoz from "../../data/provoz.json";
import ostryHybridni from "../../data/hybridni-tlak.json";
import ostreTydny from "../../data/tydny.json";
import ostreRusko from "../../data/rusko.json";
import ostryWatchlist from "../../data/watchlist.json";
import ostryArchiv from "../../data/historie.json";

import ukazkoveIncidenty from "../../data/ukazka/incidenty.json";
import ukazkovyStav from "../../data/ukazka/stav.json";
import ukazkovyPravni from "../../data/ukazka/pravni-stav.json";
import ukazkoveNato from "../../data/ukazka/nato.json";
import ukazkovyProvoz from "../../data/ukazka/provoz.json";
import ukazkovyHybridni from "../../data/ukazka/hybridni-tlak.json";
import ukazkoveTydny from "../../data/ukazka/tydny.json";
import ukazkoveRusko from "../../data/ukazka/rusko.json";
import ukazkovyArchiv from "../../data/ukazka/historie.json";

/**
 * Vrstva mezi daty a UI.
 *
 * JSON se importuje staticky, ne přes `fs` — díky tomu běží tenhle modul
 * i v prohlížeči, takže z týchž komponent jde postavit statický web
 * i klikací náhled. Až přibude databáze, mění se jen tenhle soubor.
 *
 * Ukázková data se přimíchávají jen v režimu „ukazka“ a každý takový záznam
 * si nese příznak `ukazka`. Podmínka stojí na proměnné, kterou build nahradí
 * konstantou, takže se do produkčního balíčku ukázková data vůbec nedostanou.
 */

export type SUkazkou<T> = T & { ukazka?: boolean };

/** Zúžení typu z JSONu: struktura je hlídaná testy nad daty. */
const jako = <T,>(x: unknown): T => x as T;

export function incidenty(): SUkazkou<Incident>[] {
  // Na produkci se zobrazují jen záznamy, které prošly lidskou kontrolou.
  const ostre = jako<Incident[]>(ostreIncidenty).filter((i) => i.lidskyOvereno);
  const ukazkove = JE_UKAZKA
    ? jako<Incident[]>(ukazkoveIncidenty).map((i) => ({ ...i, ukazka: true }))
    : [];
  return [...ostre, ...ukazkove].sort((a, b) =>
    (b.datumZjisteni ?? b.datumUdalosti).localeCompare(a.datumZjisteni ?? a.datumUdalosti),
  );
}

export function incident(slug: string): SUkazkou<Incident> | undefined {
  return incidenty().find((i) => i.slug === slug);
}

export function celkovyStav(): SUkazkou<CelkovyStav> {
  if (JE_UKAZKA) return { ...jako<CelkovyStav>(ukazkovyStav), ukazka: true };
  return jako<CelkovyStav>(ostryStav);
}

export function pravniStav(): PravniStav {
  const ostry = jako<PravniStav>(ostryPravni);
  if (!JE_UKAZKA) return ostry;
  // Ukázka doplňuje jen hodnoty, definice a zdroje zůstávají skutečné.
  const u = jako<PravniStav>(ukazkovyPravni);
  return {
    overeno: u.overeno,
    polozky: ostry.polozky.map((p) => {
      const n = u.polozky.find((x) => x.klic === p.klic);
      return n ? { ...p, plati: n.plati, hodnota: n.hodnota, overeno: n.overeno } : p;
    }),
  };
}

export function nato(): { overeno: string | null; polozky: NatoPolozka[] } {
  const ostry = jako<{ overeno: string | null; polozky: NatoPolozka[] }>(ostreNato);
  if (!JE_UKAZKA) return ostry;
  const u = jako<{ overeno: string | null; polozky: NatoPolozka[] }>(ukazkoveNato);
  return {
    overeno: u.overeno,
    polozky: ostry.polozky.map((p) => {
      const n = u.polozky.find((x) => x.klic === p.klic);
      return n ? { ...p, aktivni: n.aktivni, hodnota: n.hodnota, overeno: n.overeno } : p;
    }),
  };
}

export function provoz(): Provoz {
  const ostry = jako<Provoz>(ostryProvoz);
  if (!JE_UKAZKA) return ostry;
  const u = jako<Provoz>(ukazkovyProvoz);
  return {
    overeno: u.overeno,
    polozky: ostry.polozky.map((p) => {
      const n = u.polozky.find((x) => x.klic === p.klic);
      return n ? { ...p, stav: n.stav, hodnota: n.hodnota, overeno: n.overeno } : p;
    }),
  };
}

export function hybridniTlak(): HybridniTlak {
  const ostry = jako<HybridniTlak>(ostryHybridni);
  if (!JE_UKAZKA) return ostry;
  const u = jako<HybridniTlak>(ukazkovyHybridni);
  return {
    overeno: u.overeno,
    celkem: u.celkem,
    podkategorie: ostry.podkategorie.map((p) => {
      const n = u.podkategorie.find((x) => x.klic === p.klic);
      return n ? { ...p, uroven: n.uroven } : p;
    }),
  };
}

export function tydny(): TydenniHodnoceni[] {
  const zdroj = JE_UKAZKA ? jako<TydenniHodnoceni[]>(ukazkoveTydny) : jako<TydenniHodnoceni[]>(ostreTydny);
  return zdroj.slice().sort((a, b) => a.zacatek.localeCompare(b.zacatek));
}

export function rusko(): RuskoStav {
  const ostry = jako<RuskoStav>(ostreRusko);
  if (!JE_UKAZKA) return ostry;
  const u = jako<RuskoStav>(ukazkoveRusko);
  return {
    ...ostry,
    overeno: u.overeno,
    casovyTlak: u.casovyTlak,
    dopadNaIndex: u.dopadNaIndex,
    ukazatele: ostry.ukazatele.map((p) => {
      const n = u.ukazatele.find((x) => x.nazev === p.nazev);
      return n ? { ...p, uroven: n.uroven } : p;
    }),
  };
}

/** Archiv stavů v čase. Podklad pro časový posuvník. */
export function archiv(): Archiv {
  const a = JE_UKAZKA ? jako<Archiv>(ukazkovyArchiv) : jako<Archiv>(ostryArchiv);
  return { ...a, snimky: a.snimky.slice().sort((x, y) => x.kdy.localeCompare(y.kdy)) };
}

/**
 * Kdy naposledy proběhlo ověření proti zdrojům.
 *
 * Není to totéž co `stav.aktualizovano` — celkovou úroveň stanovuje člověk,
 * kdežto tohle je čas posledního běhu sběru. Hlavička má ukazovat tenhle.
 */
export function posledniOvereni(): string | null {
  const casy = [pravniStav().overeno, nato().overeno, provoz().overeno].filter(
    (x): x is string => Boolean(x),
  );
  return casy.length ? casy.sort().at(-1)! : null;
}

/**
 * Jak dlouho se nezměnil právní stav ČR ani stav NATO.
 *
 * Klid je taky informace — bez něj by web ukazoval jen to, co se pokazilo.
 * Rozlišujeme ale dvě různé věci: „od poslední změny“ a „od začátku archivu“.
 * Když archiv žádnou změnu nezachytil, nesmíme tvrdit, že žádná nenastala —
 * jen že o žádné nevíme.
 */
export function dnyBezZmeny(): { dnu: number; odZacatkuArchivu: boolean } | null {
  const s = archiv().snimky;
  if (s.length < 2) return null;
  const posledni = s[s.length - 1];
  const zmena = [...s]
    .reverse()
    .find((x) => x.zmeny.some((z) => z.startsWith("právní") || z.startsWith("NATO")));
  const od = zmena ? zmena.kdy : s[0].kdy;
  const dnu = Math.max(
    0,
    Math.floor((new Date(posledni.kdy).getTime() - new Date(od).getTime()) / 86_400_000),
  );
  // Pod jeden celý den nemá smysl o „dnech beze změny“ mluvit.
  if (dnu < 1) return null;
  return { dnu, odZacatkuArchivu: !zmena };
}

export function watchlist(): Watchlist {
  return jako<Watchlist>(ostryWatchlist);
}

/** Všechny zdroje použité na webu, bez duplicit — pro stránku /zdroje. */
export function vsechnyZdroje() {
  const vse = [
    ...incidenty().flatMap((i) => i.zdroje),
    ...pravniStav().polozky.flatMap((p) => p.zdroje),
    ...nato().polozky.flatMap((p) => p.zdroje),
    ...provoz().polozky.flatMap((p) => p.zdroje),
  ];
  const podleUrl = new Map<string, (typeof vse)[number]>();
  for (const z of vse) if (!podleUrl.has(z.url)) podleUrl.set(z.url, z);
  return [...podleUrl.values()].sort((a, b) => a.nazev.localeCompare(b.nazev, "cs"));
}

/**
 * Ověřené uklidňující body — co se (zatím) nestalo.
 *
 * Uvádíme jen položky skutečně ověřené proti primárnímu zdroji. Neověřenou
 * hodnotu sem nepíšeme: uklidňovat bez podkladu je stejná chyba jako strašit.
 */
export function klidoveBody(): string[] {
  const p = pravniStav();
  const a = nato();
  const h = hybridniTlak();
  const pr = (k: string) => p.polozky.find((x) => x.klic === k);
  const na = (k: string) => a.polozky.find((x) => x.klic === k);
  const primy = h.podkategorie.find((x) => x.klic === "primy");
  const nizke = primy?.uroven ? jeZelena(primy.uroven) : false;

  return [
    pr("mobilizace")?.plati === false && "V ČR nebyla vyhlášena mobilizace.",
    pr("vycestovani")?.plati === false && "Vycestování z ČR není obecně omezeno.",
    pr("stav-ohrozeni")?.plati === false && "Nebyl vyhlášen stav ohrožení státu.",
    na("clanek-5")?.aktivni === false && "Článek 5 NATO nebyl aktivován.",
    nizke && "Riziko přímého vojenského střetu NATO–Rusko zůstává nízké.",
  ].filter(Boolean) as string[];
}

/** Vyhýbáme se kruhovému importu stupnice do datové vrstvy. */
function jeZelena(u: Uroven): boolean {
  return u === "G1" || u === "G2" || u === "G3";
}
