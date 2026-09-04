import fs from "node:fs";
import path from "node:path";
import { JE_UKAZKA } from "@/config/web";
import type {
  CelkovyStav, HybridniTlak, Incident, NatoPolozka, PravniStav,
  Provoz, RuskoStav, TydenniHodnoceni, Watchlist,
} from "./typy";

/**
 * Vrstva mezi daty a UI. Dnes čte JSON z repozitáře; až přibude databáze,
 * mění se jen tenhle soubor, ne stránky.
 *
 * Ukázková data se přimíchávají jen v režimu „ukazka“ a každý takový záznam
 * si nese příznak `ukazka`, aby ho šlo v UI viditelně odlišit. Do produkčního
 * buildu se nedostanou.
 */

const KOREN = path.join(process.cwd(), "data");

function nacti<T>(soubor: string, vychozi: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(KOREN, soubor), "utf-8")) as T;
  } catch {
    return vychozi;
  }
}

function nactiUkazku<T>(soubor: string, vychozi: T): T {
  if (!JE_UKAZKA) return vychozi;
  try {
    return JSON.parse(fs.readFileSync(path.join(KOREN, "ukazka", soubor), "utf-8")) as T;
  } catch {
    return vychozi;
  }
}

export type SUkazkou<T> = T & { ukazka?: boolean };

export function incidenty(): SUkazkou<Incident>[] {
  // Na produkci se zobrazují jen záznamy, které prošly lidskou kontrolou.
  const ostre = nacti<Incident[]>("incidenty.json", []).filter((i) => i.lidskyOvereno);
  const ukazkove = nactiUkazku<Incident[]>("incidenty.json", []).map((i) => ({ ...i, ukazka: true }));
  return [...ostre, ...ukazkove].sort((a, b) =>
    (b.datumZjisteni ?? b.datumUdalosti).localeCompare(a.datumZjisteni ?? a.datumUdalosti),
  );
}

export function incident(slug: string): SUkazkou<Incident> | undefined {
  return incidenty().find((i) => i.slug === slug);
}

export function celkovyStav(): SUkazkou<CelkovyStav> {
  const prazdny: CelkovyStav = {
    aktualizovano: null, uroven: null, trend: null, trendPopis: "", shrnuti: "",
    noveSignaly: { celkem: 0, vysoke: 0, stredni: 0, kriticke: 0 },
  };
  const u = nactiUkazku<CelkovyStav | null>("stav.json", null);
  if (u) return { ...u, ukazka: true };
  return nacti<CelkovyStav>("stav.json", prazdny);
}

export function pravniStav(): PravniStav {
  const ostry = nacti<PravniStav>("pravni-stav.json", { overeno: null, polozky: [] });
  const u = nactiUkazku<PravniStav | null>("pravni-stav.json", null);
  if (!u) return ostry;
  // Ukázka doplňuje jen hodnoty, definice a zdroje zůstávají skutečné.
  return {
    overeno: u.overeno,
    polozky: ostry.polozky.map((p) => {
      const nahrada = u.polozky.find((x) => x.klic === p.klic);
      return nahrada ? { ...p, plati: nahrada.plati, hodnota: nahrada.hodnota, overeno: nahrada.overeno } : p;
    }),
  };
}

export function nato(): { overeno: string | null; polozky: NatoPolozka[] } {
  const ostry = nacti<{ overeno: string | null; polozky: NatoPolozka[] }>("nato.json", { overeno: null, polozky: [] });
  const u = nactiUkazku<{ overeno: string | null; polozky: NatoPolozka[] } | null>("nato.json", null);
  if (!u) return ostry;
  return {
    overeno: u.overeno,
    polozky: ostry.polozky.map((p) => {
      const n = u.polozky.find((x) => x.klic === p.klic);
      return n ? { ...p, aktivni: n.aktivni, hodnota: n.hodnota, overeno: n.overeno } : p;
    }),
  };
}

export function provoz(): Provoz {
  const ostry = nacti<Provoz>("provoz.json", { overeno: null, polozky: [] });
  const u = nactiUkazku<Provoz | null>("provoz.json", null);
  if (!u) return ostry;
  return {
    overeno: u.overeno,
    polozky: ostry.polozky.map((p) => {
      const n = u.polozky.find((x) => x.klic === p.klic);
      return n ? { ...p, stav: n.stav, hodnota: n.hodnota, overeno: n.overeno } : p;
    }),
  };
}

export function hybridniTlak(): HybridniTlak {
  const ostry = nacti<HybridniTlak>("hybridni-tlak.json", { overeno: null, celkem: null, podkategorie: [] });
  const u = nactiUkazku<HybridniTlak | null>("hybridni-tlak.json", null);
  if (!u) return ostry;
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
  const ostre = nacti<TydenniHodnoceni[]>("tydny.json", []);
  const u = nactiUkazku<TydenniHodnoceni[]>("tydny.json", []);
  return (u.length ? u : ostre).slice().sort((a, b) => a.zacatek.localeCompare(b.zacatek));
}

export function rusko(): RuskoStav {
  const ostry = nacti<RuskoStav>("rusko.json", {
    overeno: null, casovyTlak: null, dopadNaIndex: "", poznamkaZdravi: "",
    ukazatele: [], sledujemePo: { nadpis: "", termin: "", body: [] },
  });
  const u = nactiUkazku<RuskoStav | null>("rusko.json", null);
  if (!u) return ostry;
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

export function watchlist(): Watchlist {
  return nacti<Watchlist>("watchlist.json", { overeno: null, eskalacni: [], uklidnujici: [] });
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
  const zelena = primy?.uroven ? UROVNE_PASMO(primy.uroven) : false;

  return [
    pr("mobilizace")?.plati === false && "V ČR nebyla vyhlášena mobilizace.",
    pr("vycestovani")?.plati === false && "Vycestování z ČR není obecně omezeno.",
    pr("stav-ohrozeni")?.plati === false && "Nebyl vyhlášen stav ohrožení státu.",
    na("clanek-5")?.aktivni === false && "Článek 5 NATO nebyl aktivován.",
    zelena && "Riziko přímého vojenského střetu NATO–Rusko zůstává nízké.",
  ].filter(Boolean) as string[];
}

function UROVNE_PASMO(u: import("./typy").Uroven): boolean {
  // Vyhýbáme se kruhovému importu skály do datové vrstvy.
  return u === "G1" || u === "G2" || u === "G3";
}
