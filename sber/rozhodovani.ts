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
  /** true = žádná fráze o vyhlášení a aspoň jeden zdroj se povedl. */
  ciste: boolean;
  overeno: string[];
  selhalo: string[];
  /** Vše, co jde ke kontrole — tvrdé i měkké nálezy. */
  nalezy: Nalez[];
}

function najdi(text: string, slova: string[] | undefined): string[] {
  if (!slova?.length) return [];
  const t = normalizuj(text);
  return slova.filter((k) => t.includes(normalizuj(k)));
}

/** Fráze o vyhlášení. Nález blokuje potvrzení záporu. */
export function shody(s: Stazeno): string[] {
  if (!s.ok) return [];
  return najdi(s.text, s.zdroj.klicova);
}

/** Tematická slova. Nález jde jen do fronty, zápor neblokuje. */
export function mekkeShody(s: Stazeno): string[] {
  if (!s.ok) return [];
  return najdi(s.text, s.zdroj.sledovana);
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

  let tvrdy = false;

  for (const s of relevantni) {
    if (!s.ok) {
      selhalo.push(s.zdroj.klic);
      continue;
    }
    overeno.push(s.zdroj.klic);

    const tvrde = shody(s);
    const mekke = mekkeShody(s);
    if (tvrde.length) tvrdy = true;

    const trefy = tvrde.length ? tvrde : mekke;
    if (trefy.length) {
      nalezy.push({
        zdroj: s.zdroj.klic,
        nazev: s.zdroj.nazev,
        polozka: {
          nadpis: tvrde.length
            ? `Možné vyhlášení u položky „${klic}“`
            : `Zmínka u položky „${klic}“`,
          odkaz: s.zdroj.odkaz ?? s.zdroj.url,
          publikovano: null,
          shrnuti: vyrez(s, trefy[0]),
        },
        shody: trefy,
        tyka: [klic],
      });
    }
  }

  return { ciste: overeno.length > 0 && !tvrdy, overeno, selhalo, nalezy };
}
