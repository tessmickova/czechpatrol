/*
  Témata levého sloupce úvodu (20. 11. 2026, provozovatelka: „místo sloupce
  Doloženo zdroji box s aktuálními incidenty na hranicích … a pod to box
  mezinárodní vody“). Pevná pravidla nad zemí, kategorií, druhem
  naléhavosti a titulkem — bez modelu, stejně pro záznamy i zachycené
  zprávy. Co je doložené a co jen zachycené, říká štítek u řádku.
*/

/** Země NATO na hranici s Ruskem nebo Běloruskem; Rumunsko kvůli dronům z války na Ukrajině. Pořadí = pořadí záložek. */
export const ZEME_HRANIC = ["PL", "LT", "LV", "EE", "FI", "NO", "RO"] as const;
export type ZemeHranic = (typeof ZEME_HRANIC)[number];

/** Jak staré záznamy se v boxech ukazují. Zachycené zprávy mají vlastní lhůtu fronty (tři týdny). */
export const OKNO_TEMAT_DNI = 60;

export type Tema = "hranice" | "vody";

/* Text se před porovnáním převede na malá písmena; vzory jsou malými. */
const MORE = /(baltsk\w*\s+moř|\bbaltu\b|baltic sea|in the baltic|černé\w*\s+moř|černém\s+moři|black sea|severní\w*\s+moř|north sea|finsk\w*\s+záliv|gulf of finland|barents|norsk\w*\s+moř|norwegian sea|námořní\w*\s+mil|nautical mile|mezinárodní\w*\s+vod|international waters|výlučn\w*\s+ekonomick\w*\s+zón|exclusive economic zone|teritoriální\w*\s+vod|territorial waters|kanálu la manche|english channel)/;
const DNO = /(podmořsk\w*|undersea|subsea|seabed|mořsk\w*\s+dn)/;
const PLAVIDLO = /(tanker\w*|stínov\w*\s+flotil\w*|shadow fleet|plavid\w*|\bvessels?\b|\blo[dď]\w*\b|\bships?\b|fregat\w*|\bfrigates?\b|ponork\w*|submarines?|korvet\w*|corvettes?|torpédoborc\w*|destroyers?)/;
const UDALOST = /(incident|útok|dron|zadrž|zastav|kontrol|poškoz|naruš|sabot|hoř|požár|výbuch|kotv|vlek|attack|drone|seiz|detain|board|damag|fire|explos|anchor|drag|shadow|sledoval|doprovod|escort|intercept)/;

/** Námořní událost: moře nebo mořské dno v textu, nebo plavidlo spolu s incidentem. */
export function jeNamorni(text: string): boolean {
  const t = text.toLowerCase();
  return MORE.test(t) || DNO.test(t) || (PLAVIDLO.test(t) && UDALOST.test(t));
}

export interface ProTema { kodZeme: string | null; kategorie: readonly string[]; titulek: string; shrnuti?: string | null; kratkyTitulek?: string | null; naliehave?: { druh: string } | null }

/**
 * Do kterého boxu zpráva patří, nebo null. Ukrajina, Rusko a Bělorusko
 * jsou mimo rozsah (CLAUDE.md, rozsah války) i tady: box je o hranici
 * a vodách NATO, ne o válečných úderech.
 */
export function temaZpravy(x: ProTema): Tema | null {
  if (x.kodZeme === "UA" || x.kodZeme === "RU" || x.kodZeme === "BY") return null;
  if (jeNamorni(`${x.titulek} ${x.kratkyTitulek ?? ""} ${x.shrnuti ?? ""}`)) return "vody";
  const druh = x.naliehave?.druh;
  const hranicni = (ZEME_HRANIC as readonly string[]).includes(x.kodZeme ?? "");
  if (hranicni && (x.kategorie.includes("hranice") || x.kategorie.includes("drony") || druh === "hranice-nato" || druh === "vzdusny-prostor-nato")) return "hranice";
  return null;
}
