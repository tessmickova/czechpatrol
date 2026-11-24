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

/* Text se před porovnáním převede na malá písmena; vzory jsou malými. České pády přes \S*, ne \w* — \w nezná písmena s diakritikou („Baltském“). */
const MORE = /(baltsk\S*\s+moř|\bbaltu\b|baltic sea|in the baltic|černé\S*\s+moř|černém\s+moři|black sea|severní\S*\s+moř|north sea|finsk\S*\s+záliv|gulf of finland|barents|norsk\S*\s+moř|norwegian sea|námořní\S*\s+mil|nautical mile|mezinárodní\S*\s+vod|international waters|výlučn\S*\s+ekonomick\S*\s+zón|exclusive economic zone|teritoriální\S*\s+vod|territorial waters|kanálu la manche|english channel|středomoř\S*|mediterranean|jadersk\S*\s+moř|adriatic|egejsk\S*\s+moř|aegean|atlantik\S*|atlantic|kattegat|skagerrak|øresund|öresund|dánsk\S*\s+úžin|danish straits|\bz moře\b|\bze moře\b|from the sea|\bna moři\b|\bat sea\b|\bu\s+(\S+\s+)?pobřeží|při\s+(\S+\s+)?pobřeží|off the ([a-z]+ )?coast|offshore|námořní\S*\s+dron\S*|naval drones?|sea drones?)/;
const DNO = /(podmořsk\w*|undersea|subsea|seabed|mořsk\w*\s+dn)/;
/* Hranice slova přes \p{L} (příznak u): \b je jen ASCII a za „ď“ v „loď“ by nenašel konec slova. */
const PLAVIDLO = /(tanker\S*|stínov\S*\s+flotil\S*|shadow fleet|plavid\S*|\bvessels?\b|(?<!\p{L})lo(?:ď|dě|dí|di|dích|dím|dní\p{L}*)(?!\p{L})|fregat\S*|\bfrigates?\b|ponork\S*|submarines?|korvet\S*|corvettes?|torpédoborc\S*|destroyers?|warships?|válečn\S*\s+lo|\bships?\b)/u;
/*
  Incident na moři i nepřátelská akce vedená z mezinárodních vod proti zemím
  NATO a Evropy (20. 11. 2026, provozovatelka): drony vypuštěné z lodí,
  rušení GPS, průzkum a provokace válečných lodí u pobřeží.
*/
const UDALOST = /(incident|útok|dron|zadrž|zastav|kontrol|poškoz|naruš|sabot|hoř|požár|výbuch|kotv|vlek|attack|drone|seiz|detain|board|damag|fire|explos|anchor|drag|shadow|sledoval|doprovod|escort|intercept|vypust|vypouš|launch|vzlét|rušen|jamm|spoof|gps|špion|spy|surveil|průzkum|reconnaiss|mapov|provok|provoc|světlic|flare|hroz|threat)/;
/* Ruská nebo běloruská plavidla se počítají, jen když akce míří na NATO nebo Evropu. */
const CIL_NATO_EVROPA = /(nato|evrop|europ|polsk|poland|polish|litv|lithuan|lotyš|latvia|eston|finsk|finland|finnish|nors|norw|švéd|swed|dán|denmark|danish|německ|german|nizozem|dutch|netherland|belgi|franc|french|britsk|británi|british|\buk\b|ital|španěl|spain|spanish|portugal|rumun|romania|bulhar|bulgaria|řeck|greece|greek|turec|turkey|turkish|pobalt|baltic|irsk|ireland|irish|island|iceland)/;

/** Námořní událost: moře nebo mořské dno v textu, nebo plavidlo spolu s incidentem. */
export function jeNamorni(text: string): boolean {
  const t = text.toLowerCase();
  return MORE.test(t) || DNO.test(t) || (PLAVIDLO.test(t) && UDALOST.test(t));
}

export interface ProTema { kodZeme: string | null; kategorie: readonly string[]; titulek: string; shrnuti?: string | null; kratkyTitulek?: string | null; naliehave?: { druh: string } | null; /** U záznamů: první doložený fakt (třeba „drony vypuštěné z lodí“ bývá až tam). */ fakta?: readonly string[] }

/**
 * Do kterého boxu zpráva patří, nebo null. Ukrajina, Rusko a Bělorusko
 * jsou mimo rozsah (CLAUDE.md, rozsah války) i tady: box je o hranici
 * a vodách NATO, ne o válečných úderech.
 */
export function temaZpravy(x: ProTema): Tema | null {
  const text = `${x.titulek} ${x.kratkyTitulek ?? ""} ${x.shrnuti ?? ""} ${x.fakta?.[0] ?? ""}`;
  if (x.kodZeme === "UA") return null;
  if (x.kodZeme === "RU" || x.kodZeme === "BY") return jeNamorni(text) && CIL_NATO_EVROPA.test(text.toLowerCase()) ? "vody" : null;
  if (jeNamorni(text)) return "vody";
  const druh = x.naliehave?.druh;
  const hranicni = (ZEME_HRANIC as readonly string[]).includes(x.kodZeme ?? "");
  if (hranicni && (x.kategorie.includes("hranice") || x.kategorie.includes("drony") || druh === "hranice-nato" || druh === "vzdusny-prostor-nato" || druh === "letecky-poplach-nato")) return "hranice";
  return null;
}
