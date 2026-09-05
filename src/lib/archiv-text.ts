/**
 * Lidský popis změny v archivu.
 *
 * Sběrač si změny zapisuje stručně a podle klíčů („provoz — palivo:
 * bez-zdroje → bezny“). Čtenář ale má vidět „Palivo a čerpací stanice: bez
 * ověřeného zdroje → běžný provoz“. Překlad je tady, na jednom místě, aby ho
 * mohl použít web i sběrač — a aby starší záznamy nezůstaly v surové podobě.
 */

export const NAZVY_PROVOZU: Record<string, string> = {
  vycestovani: "Vycestování",
  hranice: "Hranice a doprava",
  palivo: "Palivo a čerpací stanice",
  elektrina: "Elektřina a energetika",
  plyn: "Plyn",
  banky: "Banky a hotovost",
  komunikace: "Mobilní síť a internet",
  "bezny-zivot": "Školy a běžný režim",
};

export const NAZVY_STAVU_PROVOZU: Record<string, string> = {
  bezny: "běžný provoz",
  sledujeme: "sledujeme",
  narusen: "narušeno",
  "bez-zdroje": "bez ověřeného zdroje",
};

export const NAZVY_PRAVNI: Record<string, string> = {
  "stav-ohrozeni": "Stav ohrožení státu",
  "valecny-stav": "Válečný stav",
  mobilizace: "Mobilizace",
  vycestovani: "Omezení vycestování",
  hranice: "Uzavření hranic",
  "nouzovy-stav": "Nouzový stav",
  "schuze-parlamentu": "Mimořádná schůze Parlamentu",
};

export const NAZVY_NATO: Record<string, string> = {
  "clanek-4": "NATO čl. 4 (konzultace)",
  "clanek-5": "NATO čl. 5 (kolektivní obrana)",
  readiness: "NATO pohotovost",
  evakuace: "NATO evakuace personálu",
  "vychodni-kridlo": "NATO východní křídlo",
};

// Zapsáno escapovaně schválně: literál s diakritikou by se rozbil, kdyby se
// stránka někde načetla v jiném kódování než UTF-8.
const KLIC = /^(provoz|pr\u00e1vn\u00ed stav|NATO) \u2014 ([a-z0-9-]+): (.+) \u2192 (.+)$/u;

/** Starší zápisy používají dřívější názvy úrovní; čtenář má vidět jedny. */
const STARE_NAZVY: [RegExp, string][] = [
  [/Zvýšená pozornost/g, "Nízká"],
  [/Téměř oranžová/g, "Větší střední"],
  [/Téměř červená/g, "Vysoká"],
  // Bez \b — hranice slov v JS neumí diakritiku.
  [/Vyšší/g, "Větší střední"],
  [/Oranžová/g, "Vysoká"],
  [/Kritická/g, "Vážná"],
];

/** Přeloží surový zápis změny na větu pro čtenáře. Neznámý tvar vrací beze změny. */
export function lidskaZmena(puvodni: string): string {
  const z = STARE_NAZVY.reduce((s, [r, n]) => s.replace(r, n), puvodni);
  const m = z.match(KLIC);
  if (!m) return z.charAt(0).toUpperCase() + z.slice(1);
  const [, oblast, klic, od, do_] = m;
  if (oblast === "provoz") {
    const nazev = NAZVY_PROVOZU[klic] ?? klic;
    const stav = (s: string) => NAZVY_STAVU_PROVOZU[s] ?? s;
    return `${nazev}: ${stav(od)} → ${stav(do_)}`;
  }
  if (oblast === "právní stav") return `${NAZVY_PRAVNI[klic] ?? klic}: ${od} → ${do_}`;
  return `${NAZVY_NATO[klic] ?? `NATO ${klic}`}: ${od} → ${do_}`;
}
