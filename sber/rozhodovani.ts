import { normalizuj } from "./nacti";
import type { Nalez, RegistrZdroj } from "./typy";

export interface Stazeno {
  zdroj: RegistrZdroj;
  ok: boolean;
  text: string;
  polozky: { nadpis: string; odkaz: string; publikovano: string | null; shrnuti: string }[];
  chyba?: string;
  stav: number | null;
}

export interface Rozhodnuti {
  /** true = žádný signál a aspoň jeden zdroj se povedl → zápor lze potvrdit. */
  ciste: boolean;
  overeno: string[];
  selhalo: string[];
  nalezy: Nalez[];
}

/** Klíčová slova, která se ve staženém textu vyskytla. */
export function shody(s: Stazeno): string[] {
  if (!s.ok || !s.zdroj.klicova?.length) return [];
  const text = normalizuj(s.text);
  return s.zdroj.klicova.filter((k) => text.includes(normalizuj(k)));
}

/** Krátký výřez okolo prvního výskytu — aby bylo ve frontě vidět, o co jde. */
export function vyrez(s: Stazeno, klic: string): string {
  const i = normalizuj(s.text).indexOf(normalizuj(klic));
  if (i < 0) return "";
  return s.text.slice(Math.max(0, i - 120), i + 180).trim();
}

/**
 * Rozhodne, jestli lze u dané položky potvrdit zápor.
 *
 * Zápor se potvrdí jen tehdy, když se povedlo stáhnout aspoň jeden relevantní
 * zdroj a ani jeden nehlásí signál. Jakýkoli nález nebo úplný výpadek zdrojů
 * znamená, že hodnota zůstane, jak byla, a věc jde ke kontrole.
 */
export function rozhodni(klic: string, stazene: Stazeno[]): Rozhodnuti {
  const relevantni = stazene.filter((s) => s.zdroj.tyka?.includes(klic));
  const overeno: string[] = [];
  const selhalo: string[] = [];
  const nalezy: Nalez[] = [];

  for (const s of relevantni) {
    if (!s.ok) {
      selhalo.push(s.zdroj.klic);
      continue;
    }
    overeno.push(s.zdroj.klic);
    const trefy = shody(s);
    if (trefy.length) {
      nalezy.push({
        zdroj: s.zdroj.klic,
        nazev: s.zdroj.nazev,
        polozka: {
          nadpis: `Signál u položky „${klic}“`,
          odkaz: s.zdroj.odkaz ?? s.zdroj.url,
          publikovano: null,
          shrnuti: vyrez(s, trefy[0]),
        },
        shody: trefy,
        tyka: [klic],
      });
    }
  }

  return { ciste: overeno.length > 0 && nalezy.length === 0, overeno, selhalo, nalezy };
}
