import fs from "node:fs";
import path from "node:path";
import { ctiRss, stahniSeSvolenim } from "./nacti";
import { stavKyber, vyberZpravy, type SnimekKyber } from "../src/lib/kyber";
import type { VysledekPokusu } from "../src/lib/prehled/typy";

/*
  Bezpečnost na internetu v Česku (1. 10. 2026) — viz src/lib/kyber.ts.

  Jen veřejné zprávy přes RSS Google News (česká vydání), čtené stejně jako
  ostatní zdroje: přes robots.txt (stahniSeSvolenim) a se stropem velikosti.
  Nic se neskenuje, nikam se nepřipojuje, žádný web se netestuje. Dotazy
  míří na úřady (site:) i na témata; co do Česka nepatří, odfiltruje
  vyberZpravy. Neúspěšné čtení nikdy neudělá „klid“ — soubor zůstane
  s posledním úspěchem.
*/

const gn = (dotaz: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(dotaz)}&hl=cs&gl=CZ&ceid=CZ:cs`;

export const DOTAZY_KYBER = [
  "site:nukib.gov.cz",
  "site:csirt.cz",
  "NÚKIB varování",
  "DDoS útok weby",
  "NoName057",
  "kybernetický útok Česko",
  "podvodné SMS varování",
  "policie varuje podvodníci",
  "phishing banka varování klienty",
  "výpadek Downdetector",
] as const;

const SOUBOR = path.join(process.cwd(), "data", "kyber.json");
const ARCHIV = path.join(process.cwd(), "data", "kyber-archiv.json");

export async function sbirejKyber(ted: string): Promise<{ vysledek: VysledekPokusu; pocet: number; chyba?: string }> {
  const polozky: ReturnType<typeof ctiRss> = [];
  let precteno = 0;
  const chyby: string[] = [];
  for (const d of DOTAZY_KYBER) {
    try {
      const { stav, telo } = await stahniSeSvolenim(gn(d), 2);
      if (stav >= 400) { chyby.push(`${d}: ${stav === 999 ? "robots.txt" : `HTTP ${stav}`}`); continue; }
      polozky.push(...ctiRss(telo));
      precteno++;
    } catch (e) {
      chyby.push(`${d}: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (!precteno) return { vysledek: "chyba", pocet: 0, chyba: chyby.slice(0, 3).join("; ") };
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
  console.log(`[sber] internet: ${snimek.stav}, zpráv ${zpravy.length}, dotazů ${precteno}/${DOTAZY_KYBER.length}${chyby.length ? ` (chyby: ${chyby.slice(0, 3).join("; ")})` : ""}`);
  return { vysledek: "ok", pocet: zpravy.length };
}
