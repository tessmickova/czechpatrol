/**
 * Souhrn situace na úvodu — jedna až dvě věty, které píše ověřovatel Patrol.
 *
 * Proč to existuje (zadání 24. 9. 2026): věta pod hlavním nadpisem má být
 * živé vyhodnocení situace, ne šablona. Placené volání modelu je od
 * 20. 9. 2026 vypnuté, a tak větu píše externí ověřovatel na své větvi a
 * hodinový sběr ji přebírá — ale jen když projde těmihle pravidly. Co
 * neprojde, se nepřevezme a web ukazuje větu z úředního stavu.
 *
 * Pravidla nejsou o vkusu, ale o tom, aby AI nevytvořila nové tvrzení
 * (CLAUDE.md 0.5) a nikoho nestrašila (0.6): délka, žádné odkazy, žádné
 * nálepky, žádná slova vyvolávající paniku, žádné vykřičníky, žádná
 * předpověď.
 */
import { nalepkyVTextu } from "./zasady-textu.mjs";

export const NEJDELE_ZNAKU = 320;
export const NEJKRATSI_ZNAKU = 40;
/** Po téhle době se věta na webu nahradí větou z úředního stavu. */
export const PLATNOST_HODIN = 30;

const PANIKA = [
  /\bpanik/i, /\butíkejte\b/i, /\butečte\b/i, /\bzachraň/i, /\bkatastrof/i, /\bapokalyp/i, /\bkonec světa\b/i,
  /\bhrozí válka\b/i, /\bválka (je|bude) (tady|tu|blízko)\b/i, /\bmobilizujte\b/i, /\bzbrojte\b/i,
  /\bbude(me)? (napaden|napadeni)\b/i, /\bnapadne\b/i, /\bzaútočí\b/i, /\bčekejte útok\b/i,
];
const PREDPOVED = [/\bbrzy\b/i, /\bv nejbližších (dnech|hodinách)\b/i, /\bočekáváme\b/i, /\bpředpokládáme\b/i, /\bhrozí\b/i];

/** Vrátí seznam důvodů, proč souhrn neprojde. Prázdný seznam = v pořádku. */
export function chybySouhrnu(s, ted = Date.now()) {
  const chyby = [];
  if (!s || typeof s !== "object") return ["souhrn není objekt"];
  if (s.veta === null) return chyby; // prázdný souhrn je platný: web vezme větu z úředního stavu
  if (typeof s.veta !== "string") return ["veta není text"];
  const v = s.veta.trim();
  if (v.length < NEJKRATSI_ZNAKU) chyby.push(`věta je kratší než ${NEJKRATSI_ZNAKU} znaků`);
  if (v.length > NEJDELE_ZNAKU) chyby.push(`věta je delší než ${NEJDELE_ZNAKU} znaků`);
  if (/https?:\/\/|www\./i.test(v)) chyby.push("věta obsahuje odkaz");
  if (/!/.test(v)) chyby.push("věta obsahuje vykřičník");
  if (/\[DOPLNIT\]/.test(v)) chyby.push("věta obsahuje zástupný text");
  if ((v.match(/[.?]/g) ?? []).length > 3) chyby.push("víc než tři věty");
  const nalepky = nalepkyVTextu(v);
  if (nalepky.length) chyby.push(`nálepky: ${nalepky.join(", ")}`);
  for (const p of PANIKA) if (p.test(v)) chyby.push(`slovo vyvolávající paniku: ${p}`);
  for (const p of PREDPOVED) if (p.test(v)) chyby.push(`předpověď místo popisu: ${p}`);
  if (typeof s.aktualizovano !== "string" || Number.isNaN(new Date(s.aktualizovano).getTime())) chyby.push("aktualizovano není datum");
  else if (new Date(s.aktualizovano).getTime() > ted + 3_600_000) chyby.push("aktualizovano je v budoucnosti");
  if (s.napsal !== "patrol") chyby.push("napsal musí být „patrol“");
  if (!Array.isArray(s.podklady) || !s.podklady.length) chyby.push("chybí podklady (id záznamů, ze kterých věta vychází)");
  return chyby;
}

/** Je věta ještě čerstvá? Stará se na webu neukazuje. */
export function jeCerstvy(s, ted = Date.now()) {
  if (!s?.veta || !s.aktualizovano) return false;
  return ted - new Date(s.aktualizovano).getTime() <= PLATNOST_HODIN * 3_600_000;
}

export const POKYNY_SOUHRNU = [
  "C) SOUHRN SITUACE — jedna až dvě věty pod hlavní nadpis webu",
  "",
  "Zapiš do data/souhrn-situace.json na své větvi:",
  '  { "veta": "…", "aktualizovano": "<ISO čas>", "napsal": "patrol", "podklady": ["<id záznamů>"] }',
  "",
  "Co to je: klidné vyhodnocení toho, co web právě dokládá — pro člověka",
  "v Česku, který se ptá „děje se něco, co se mě týká?“. Vychází JEN ze",
  "zveřejněných záznamů za posledních 7 dní (data/incidenty.json,",
  "lidskyOvereno), úředního stavu ČR (pravni-stav.json, provoz.json) a",
  "stavu NATO. Nic z fronty, nic nepotvrzeného, nic ze zpráv dne.",
  "",
  `- Nejvýš ${NEJDELE_ZNAKU} znaků, nejvýš tři věty, česky, bez vykřičníku, bez odkazu.`,
  "- Začni tím, co platí pro Česko (co je, nebo že v úředních zdrojích nic není),",
  "  pak jednou větou okolí. Uveď, o co se to opírá (kolik doložených záznamů).",
  "- Žádné nové tvrzení, žádný odhad, žádná předpověď (ne „hrozí“, „brzy“,",
  "  „očekáváme“). Žádná panika: popis, ne varování. Bez nálepek.",
  "- Do podklady dej id záznamů, ze kterých věta vychází. Bez nich se nepřevezme.",
  "- Přepiš ji pokaždé, když ji zadání znovu žádá; stará se z webu sama stáhne",
  `  po ${PLATNOST_HODIN} hodinách a nahradí ji věta z úředního stavu.`,
  "",
  "Sběr větu převezme jen, když projde nastroje/souhrn-situace.mjs (délka,",
  "odkazy, nálepky, slova vyvolávající paniku, předpověď). Co neprojde, se",
  "zahodí bez náhrady — tak to raději napiš střízlivě.",
].join("\n");
