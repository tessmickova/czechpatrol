import fs from "node:fs";
import path from "node:path";
import { ctiRss, polozkyZeStranky, stahniSeSvolenim } from "./nacti";
import { ZDROJE_UDALOSTI } from "./zdroje-udalosti";
import { stavKyber, vyberZpravy, type PolozkaKyber, type SnimekKyber } from "../src/lib/kyber";
import type { VysledekPokusu } from "../src/lib/prehled/typy";

/*
  Bezpečnost na internetu v Česku (1. 10. 2026) — viz src/lib/kyber.ts.

  Jen veřejné zprávy z vlastních kanálů úřadů a českých médií, čtené
  stejně jako ostatní zdroje: přes robots.txt (stahniSeSvolenim) a se
  stropem velikosti. Nic se neskenuje, nikam se nepřipojuje, žádný web
  se netestuje.

  Proč ne vyhledávání Google News: první běh 1. 10. 2026 ukázal, že
  robots.txt Google News automatické čtení vyhledávacích kanálů
  nepovoluje — a sběr se jím řídí. Přímé kanály médií to dovolují
  a stejné kanály už používá sběr událostí (sber/zdroje-udalosti.ts).

  Neúspěšné čtení nikdy neudělá „klid“ — soubor zůstane s posledním
  úspěchem a web ho po dni přestane ukazovat.
*/

/** Klíče z katalogu sběru událostí — tam jsou adresy ověřené během. Aktuálně.cz ne: jeho robots.txt čtení nedovoluje (1. 10. 2026). */
export const KLICE_KYBER = ["nukib-rss", "policie-rss", "mvcr", "irozhlas", "cro-rss", "ct24", "novinky", "seznam-zpravy", "idnes", "ctk", "denikn"] as const;

/* Technologická média, kde se o útocích píše nejdřív. Nejsou v katalogu událostí. */
const DALSI = [
  { klic: "lupa", nazev: "Lupa.cz", url: "https://www.lupa.cz/rss/clanky/", primarni: false },
  { klic: "zive", nazev: "Živě.cz", url: "https://www.zive.cz/rss/sc-47/", primarni: false },
];

export function zdrojeKyber() {
  const z = KLICE_KYBER.map((k) => ZDROJE_UDALOSTI.find((x) => x.klic === k)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  return [...z.map((x) => ({ klic: x.klic, nazev: x.nazev.split(" — ")[0], url: x.url, primarni: x.primarni })), ...DALSI];
}

const SOUBOR = path.join(process.cwd(), "data", "kyber.json");
const ARCHIV = path.join(process.cwd(), "data", "kyber-archiv.json");

export async function sbirejKyber(ted: string): Promise<{ vysledek: VysledekPokusu; pocet: number; chyba?: string }> {
  const polozky: PolozkaKyber[] = [];
  const zdroje = zdrojeKyber();
  let precteno = 0;
  const chyby: string[] = [];
  for (const z of zdroje) {
    try {
      const { stav, telo } = await stahniSeSvolenim(z.url, 2);
      if (stav >= 400) { chyby.push(`${z.klic}: ${stav === 999 ? telo : `HTTP ${stav}`}`); continue; }
      let p = ctiRss(telo);
      if (!p.length && /<a\b/i.test(telo)) p = polozkyZeStranky(telo, z.url);
      polozky.push(...p.map((x) => ({ ...x, zdroj: z.nazev, uredniZdroj: z.primarni })));
      precteno++;
    } catch (e) {
      chyby.push(`${z.klic}: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (!precteno) return { vysledek: "chyba", pocet: 0, chyba: chyby.slice(0, 4).join("; ") };
  const tedMs = new Date(ted).getTime();
  const zpravy = vyberZpravy(polozky, tedMs);
  const snimek: SnimekKyber = { aktualizovano: ted, nacteno: ted, stav: stavKyber(zpravy, tedMs), zpravy };
  fs.writeFileSync(SOUBOR, JSON.stringify(snimek, null, 2) + "\n", "utf-8");
  /*
    Záznam napříč časem: banner ukazuje jen posledních 7 dní, archiv drží
    každou zachycenou zprávu (bez duplicit), nejvýš posledních 1 000.
  */
  const archiv: typeof zpravy = fs.existsSync(ARCHIV) ? JSON.parse(fs.readFileSync(ARCHIV, "utf-8")) : [];
  const zname = new Set(archiv.map((z) => z.id));
  const doplnene = [...zpravy.filter((z) => !zname.has(z.id)), ...archiv].sort((a, b) => b.kdy.localeCompare(a.kdy)).slice(0, 1000);
  fs.writeFileSync(ARCHIV, JSON.stringify(doplnene, null, 2) + "\n", "utf-8");
  console.log(`[sber] internet: ${snimek.stav}, zpráv ${zpravy.length}, zdrojů ${precteno}/${zdroje.length}${chyby.length ? ` (chyby: ${chyby.join("; ")})` : ""}`);
  return { vysledek: "ok", pocet: zpravy.length, chyba: chyby.length ? chyby.slice(0, 4).join("; ") : undefined };
}
