import fs from "node:fs";
import path from "node:path";
import { stahniSeSvolenim } from "./nacti";
import { PIZZA_INDEX } from "../src/config/odkazy-ven";
import type { VysledekPokusu } from "../src/lib/prehled/typy";

/*
  Pizza index (PizzINT) — jedno číslo z veřejné stránky.

  Ověřeno sondou ze sítě sběru 26. 9. 2026: stránka nese v HTML text
  „DOUGHCON 5 FADE OUT • LOWEST STATE OF READINESS“ (stupnice 1–5, 5 je
  nejnižší). robots.txt zakazuje jen /api/ a další vnitřní cesty; úvodní
  stránku číst povoluje — a čte se přes stahniSeSvolenim, takže změna
  robots.txt čtení sama zastaví.

  Nepřečtená hodnota se nikdy nenahrazuje „klidem“: soubor zůstane s
  posledním úspěchem a web podle stáří ukáže „nezjištěno“.
*/

const SOUBOR = path.join(process.cwd(), "data", "pizza-index.json");

export interface PizzaIndex {
  /** 1 (nejvyšší) až 5 (nejnižší), jak ho uvádí PizzINT. */
  uroven: number | null;
  /** Popisek stupně ze stránky, anglicky (např. „FADE OUT“). */
  popis: string | null;
  /** Kdy se hodnota naposledy úspěšně přečetla. */
  nacteno: string | null;
}

export function ctiDoughcon(html: string): { uroven: number; popis: string | null } | null {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  const m = text.match(/DOUGHCON\s+([1-5])\b\s*([A-Z][A-Z \-']{1,40}?)?\s*(?:•|$|[a-z])/);
  if (!m) return null;
  return { uroven: Number(m[1]), popis: m[2]?.trim() || null };
}

export async function sbirejPizzaIndex(ted: string): Promise<{ vysledek: VysledekPokusu; chyba?: string }> {
  try {
    const { stav, telo } = await stahniSeSvolenim(PIZZA_INDEX.url, 1);
    if (stav === 999) return { vysledek: "chyba", chyba: "robots.txt nepovoluje" };
    if (stav >= 400) return { vysledek: "chyba", chyba: `HTTP ${stav}` };
    const d = ctiDoughcon(telo);
    if (!d) return { vysledek: "obsah", chyba: "DOUGHCON na stránce nenalezen" };
    const zapis: PizzaIndex = { uroven: d.uroven, popis: d.popis, nacteno: ted };
    fs.writeFileSync(SOUBOR, JSON.stringify(zapis, null, 2) + "\n", "utf-8");
    return { vysledek: "ok" };
  } catch (e) {
    return { vysledek: "chyba", chyba: String(e instanceof Error ? e.message : e) };
  }
}
