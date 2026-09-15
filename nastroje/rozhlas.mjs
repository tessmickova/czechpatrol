/**
 * Rozhlas: krátké zprávy o nových ověřených záznamech do kanálů,
 * s odkazem na celý záznam na webu.
 *
 *   node nastroje/rozhlas.mjs --okamzite   # jen vážné případy, opatření a změny oficiálních stavů
 *   node nastroje/rozhlas.mjs --souhrn     # denní souhrn všeho ostatního
 *   node nastroje/rozhlas.mjs --test       # jedna testovací zpráva
 *   node nastroje/rozhlas.mjs --nacisto    # jen vypíše, nic neposílá
 *
 * Posílá se výhradně to, co je na webu: záznamy s lidskyOvereno a změny
 * oficiálních stavů z archivu. Automaticky zachycení kandidáti nikdy.
 * Každý záznam odejde jednou; nová položka v historii záznamu znamená
 * jednu zprávu „aktualizace“. Stav je v data/fronta/rozhlaseno.json.
 *
 * Přístupy: TELEGRAM_BOT_TOKEN (secret) a TELEGRAM_KANAL (např. @czechpatrol).
 * Bez tokenu skript nic neposílá a skončí bez chyby — web tím nesmí spadnout.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = "https://czechpatrol.pages.dev";
const STAV = path.join(koren, "data", "fronta", "rozhlaseno.json");
const MAX_ZPRAV_NA_BEH = 8;
/** Při prvním spuštění se oznámí jen záznamy zjištěné v posledních dnech; starší se považují za oznámené. */
const PRVNI_BEH_DNI = 2;
/** Záznam zjištěný před delší dobou (zpětné doplnění osy) se neoznamuje nikdy — jen se zapamatuje. */
const NEJSTARSI_DNI = 14;

const NAZVY_UROVNI = {
  G1: "Nízká", G2: "Nízká", G3: "Nízká", Y1: "Mírně zvýšená", Y2: "Střední", Y3: "Zvýšená", YO: "Zvýšená",
  O1: "Vysoká", O2: "Vysoká", O3: "Vysoká", R1: "Vážná", R2: "Vážná", R3: "Vážná",
};
/** Úroveň jako číslo 1–10. Táž tabulka jako `zDeseti()` v src/lib/skala.ts — hlídá test. */
const Z_DESETI = { G1: 1, G2: 2, G3: 3, Y1: 4, Y2: 5, Y3: 6, YO: 6, O1: 7, O2: 8, O3: 8, R1: 9, R2: 9, R3: 10 };
const JISTOTY = { nizka: "nízká", stredni: "střední", vysoka: "vysoká", potvrzeno: "potvrzeno" };
// Kopie číselníku z src/lib/typy.ts — skript je prostý .mjs. Test hlídá, že se nerozejdou.
const PUVODCI = { rusko: "Rusko", ukrajina: "Ukrajina", "jiny-stat": "jiný stát", "neni-stat": "nestátní skupina", domaci: "domácí pachatel", neznamy: "neznámý" };
const DRUHY = { pripad: "případ", aktualizace: "aktualizace", opatreni: "opatření", reakce: "reakce" };
/** Šestý pád názvu země, aby věta „stalo se v…“ byla česky. Neznámá země se opíše jinak. */
const V_ZEMI = {
  CZ: "v Česku", PL: "v Polsku", DE: "v Německu", SK: "na Slovensku", UA: "na Ukrajině",
  LT: "v Litvě", LV: "v Lotyšsku", EE: "v Estonsku", FI: "ve Finsku", SE: "ve Švédsku",
  NO: "v Norsku", DK: "v Dánsku", NL: "v Nizozemsku", GB: "ve Spojeném království",
  RU: "v Rusku", BG: "v Bulharsku", RO: "v Rumunsku", ME: "v Černé Hoře", XZ: "ve Středomoří",
};
/** Co která barva znamená a v jakém pořadí naléhavosti se puntíky řadí. */
const POPIS_TECKY = {
  "🔴": "vážné", "🟠": "vysoká závažnost", "🟡": "střední závažnost", "🟢": "nízká závažnost",
  "📋": "opatření", "🔁": "aktualizace", "💬": "reakce",
};
const PORADI_TECEK = ["🔴", "🟠", "🟡", "🟢", "📋", "🔁", "💬"];
const DRUH_SLOVA = { pripad: "Případ", aktualizace: "Aktualizace případu", opatreni: "Oficiální opatření", reakce: "Prohlášení nebo reakce" };
/** Stavy vyšetřování — táž slova jako STAVY v src/lib/kategorie.ts. */
const STAVY = {
  probiha: "Vyšetřování pokračuje", uzavreno: "Vyšetřování uzavřeno", obvineni: "Podáno obvinění",
  "bez-vysetrovani": "Bez vyšetřování", neuvedeno: "Neuvedeno",
};
/**
 * Zdroje se v kanálu vypisují všechny a po skupinách, aby bylo vidět,
 * kdo o věci mluví: jestli ji oznámil úřad, nebo ji zatím nesou jen noviny.
 * Pořadí je od nejsilnějšího důkazu k nejslabšímu.
 */
const SKUPINY_ZDROJU = [
  { typ: "primary", nadpis: "Úřady a primární zdroje", slovo: "úřady" },
  { typ: "wire", nadpis: "Agentury", slovo: "agentury" },
  { typ: "media", nadpis: "Noviny a zpravodajství", slovo: "média" },
  { typ: "local", nadpis: "Místní média", slovo: "místní" },
  { typ: "analysis", nadpis: "Analýzy", slovo: "analýzy" },
  { typ: "social", nadpis: "Sociální sítě — samy o sobě nic nedokládají", slovo: "sítě" },
];

/*
  Stará událost se nesmí tvářit jako nová.

  Zpráva dřív ukazovala jen datum ZJIŠTĚNÍ. Když se do archivu doplnil případ
  z roku 2024, jeho datum zjištění bylo dnešní — a v kanálu to vypadalo, že
  se to právě stalo. To je přesně ten druh zprávy, která vyvolá paniku kvůli
  něčemu, co je dávno za námi.

  Nově se datum události a datum zjištění píšou obě, kdykoli se liší o víc než
  pár dní, a záznam starší než měsíc dostane v záhlaví slovo ARCHIV.
*/

/** Od jakého rozdílu se datum události a zjištění píšou obě. */
export const DNI_ROZDILU = 3;
/** Od jakého stáří události je záznam archivní. */
export const DNI_ARCHIVU = 31;

export const druh = (i) => i.druh ?? (i.puvodce ? "pripad" : "reakce");
export const kdyZjisteno = (i) => i.datumZjisteni ?? i.datumUdalosti;

/** Kolik dní uplynulo od události do teď. null = neznámé datum. */
export function stariUdalostiDni(i, ted = Date.now()) {
  const t = new Date(i.datumUdalosti ?? kdyZjisteno(i)).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((ted - t) / 86_400_000);
}

/**
 * Je to archivní záznam? Tedy událost, která se stala dávno, i když ji do
 * přehledu doplňujeme teprve teď.
 */
export function jeArchivni(i, ted = Date.now()) {
  if (i.historicky || i.archivniZaznam) return true;
  const dni = stariUdalostiDni(i, ted);
  return dni !== null && dni > DNI_ARCHIVU;
}

/**
 * Řádek s datem. Píše obě data, když se liší — „stalo se" a „vyšlo najevo".
 * Jedno datum stačí jen tehdy, když událost vyšla najevo prakticky hned.
 */
export function radekData(i) {
  const udalost = i.datumUdalosti;
  const zjisteno = kdyZjisteno(i);
  if (!udalost || udalost.slice(0, 10) === zjisteno.slice(0, 10)) return datumCz(zjisteno);
  const rozdil = Math.abs(new Date(zjisteno).getTime() - new Date(udalost).getTime()) / 86_400_000;
  if (rozdil <= DNI_ROZDILU) return datumCz(udalost);
  return `stalo se ${datumCz(udalost)} · vyšlo najevo ${datumCz(zjisteno)}`;
}
const vazne = (i) => /^[OR]/.test(i.zavaznost);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function tecka(i) {
  const d = druh(i);
  if (d === "opatreni") return "📋";
  if (d === "reakce") return "💬";
  if (d === "aktualizace") return "🔁";
  const u = i.zavaznost;
  return u.startsWith("R") ? "🔴" : u.startsWith("O") || u === "YO" ? "🟠" : u.startsWith("Y") ? "🟡" : "🟢";
}

/**
 * Záhlaví zprávy: barevný puntík a hned za ním závažnost číslem, aby čtenář
 * z prvního řádku věděl, o jak vážnou věc jde. Číslo je jen jinak zapsaná
 * úroveň z webu, ne pravděpodobnost. Záznamy bez závažnosti (opatření,
 * prohlášení, aktualizace) mají místo čísla slovo, čím jsou.
 */
export function zahlavi(i, ted = Date.now()) {
  const d = druh(i);
  /*
    Archiv se pozná hned v prvním řádku. Čtenář, který uvidí červený puntík
    a vysokou závažnost, musí okamžitě vědět, jestli se to děje teď, nebo
    jestli doplňujeme něco z loňska.
  */
  const archiv = jeArchivni(i, ted) ? "🗄 ARCHIV · " : "";
  if (d !== "pripad") return `${tecka(i)} ${archiv}${DRUH_SLOVA[d]}`;
  const cislo = Z_DESETI[i.zavaznost];
  const nazev = NAZVY_UROVNI[i.zavaznost] ?? i.zavaznost;
  return `${tecka(i)} ${archiv}Závažnost: ${cislo ?? "?"} z 10 · ${nazev.toLowerCase()}`;
}

export function datumCz(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

function zkrat(s, n = 240) {
  s = String(s).trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "), n - 40) + 1).trim()}…`;
}

function spocitejTecky(zaznamy) {
  const pocty = {};
  for (const i of zaznamy) { const t = tecka(i); pocty[t] = (pocty[t] ?? 0) + 1; }
  return pocty;
}

/**
 * Pruh puntíků na začátku zprávy: tolik puntíků, kolik je čeho uvnitř.
 * Čtenář z jednoho pohledu vidí, co ho ve zprávě čeká, ještě než ji začne číst.
 * Když je jednoho druhu hodně, místo řady puntíků se napíše počet.
 */
export function pruhTecek(zaznamy, { max = 6 } = {}) {
  const pocty = spocitejTecky(zaznamy);
  return PORADI_TECEK.filter((t) => pocty[t])
    .map((t) => (pocty[t] > max ? `${t}×${pocty[t]}` : t.repeat(pocty[t])))
    .join("");
}

/** Legenda k pruhu: co která barva ve zprávě znamená a kolikrát tam je. */
export function legendaTecek(zaznamy) {
  const pocty = spocitejTecky(zaznamy);
  return PORADI_TECEK.filter((t) => pocty[t]).map((t) => `${t} ${pocty[t]}× ${POPIS_TECKY[t]}`).join(" · ");
}

/*
  Dvě různé otázky, které se nesmějí slít do jedné věty:
  „stalo se to u nás“ (kodZeme) a „týká se nás to“ (oblast „cr“).

  Dřív to byla jedna funkce a zpráva o ruském dronu, který zasáhl vlak na
  Ukrajině, tvrdila „Záznam se týká území České republiky“, protože záznam
  nesl oblast „cr“ kvůli českému politikovi ve vlaku. To je nepravda, a ještě
  v kanálu s odběrateli.
*/
const naUzemiCr = (i) => i.kodZeme === "CZ";
const tykaSeCr = (i) => (i.kategorie ?? []).includes("cr");
/** Sjednocení pro pořadí a denní souhrn: doma NEBO se nás to týká. */
const dulezitePro = (i) => naUzemiCr(i) || tykaSeCr(i);

/**
 * Naléhavost pro řazení v souhrnu: opatření nahoru, pak podle závažnosti.
 * Poslední číslice rozhoduje jen při shodě — tam jde české dřív než zahraniční.
 */
export function vaha(i) {
  const u = i.zavaznost ?? "";
  const zaklad = druh(i) === "opatreni" ? 100
    : u.startsWith("R") ? 40 : u.startsWith("O") || u === "YO" ? 30 : u.startsWith("Y") ? 20 : 10;
  return zaklad * 10 + (dulezitePro(i) ? 1 : 0);
}

/**
 * Nejzásadnější věta zprávy — ta, kterou čtenář potřebuje, i kdyby nečetl zbytek:
 * jestli z toho pro něj v Česku něco oficiálně plyne, nebo ne.
 *
 * Skládá se výhradně z toho, co je v záznamu a na webu. Nic se nedomýšlí
 * a nikomu se neradí, jestli někam jet nebo nejet — na to data nestačí.
 */
export function klicovaVeta(i) {
  const d = druh(i);
  const nato = i.kodZeme === "EU";
  // „z toho“ sedí za všechny předchozí věty (událost, záznam, opatření) — jiné zájmeno by některou z nich rozbilo.
  const nic = "Pro Českou republiku z toho neplyne žádné nové úřední opatření.";
  if (d === "opatreni" && naUzemiCr(i)) {
    const nazev = zkrat(String(i.kratkyTitulek || i.titulek).replace(/^(ČR|Česko|Česká republika)\s*[:–-]\s*/i, ""), 90);
    return `V České republice bylo přijato úřední opatření: ${nazev}. Rozsah a platnost uvádí přehled opatření.`;
  }
  const kde = nato ? "v rámci NATO" : V_ZEMI[i.kodZeme];
  if (d === "opatreni") return `Opatření platí ${kde ?? `mimo Českou republiku (${i.zeme})`}, nikoli v České republice. ${nic}`;
  if (naUzemiCr(i)) return `Záznam se týká území České republiky. ${nic}`;
  if (nato) return `Záznam se týká NATO jako celku. ${nic}`;
  const misto = kde
    ? `${d === "reakce" ? "Jde o vyjádření k dění" : "Událost nastala"} ${kde}, nikoli v České republice.`
    : `Událost nastala mimo Českou republiku (${i.zeme}).`;
  // Událost mimo ČR, která se Česka přesto týká: řekne se obojí, ne jen jedno.
  const vazba = tykaSeCr(i) ? " Pro Česko je podstatná, proto ji vedeme." : "";
  return `${misto}${vazba} ${nic}`;
}

/** Souhrn pokrytí: kolik zdrojů a kdo z nich je úřad. Přesně to, co čtenář chce vědět. */
export function pocetZdroju(i) {
  const zdroje = (i.zdroje ?? []).filter((z) => z.url);
  const pocty = {};
  for (const z of zdroje) pocty[z.typ] = (pocty[z.typ] ?? 0) + 1;
  return { celkem: zdroje.length, pocty, uredni: pocty.primary ?? 0 };
}

/**
 * Pokrytí na jeden řádek: kolik zdrojů a jak se dělí.
 *
 * Tohle je to, kvůli čemu se ve zprávě zdroje vypisovaly — aby čtenář na
 * první pohled viděl, jestli věc stojí na úřadu, nebo jen na novinách.
 * Výpis odkazů to nesl navíc; poměr nese i samotný řádek, a ten se do
 * kanálu vejde.
 */
export function radekPokryti(i) {
  const { celkem, pocty, uredni } = pocetZdroju(i);
  if (!celkem) return ["Zdroje: žádný odkaz. Záznam je vedený jako nedoložený."];
  const prehled = SKUPINY_ZDROJU.filter((sk) => sk.typ === "primary" || pocty[sk.typ])
    .map((sk) => `${sk.slovo} ${pocty[sk.typ] ?? 0}`)
    .join(" · ");
  const radky = [`Zdroje: ${celkem} (${prehled})`];
  // Věta mluví o seznamu odkazů, ne o světě: úřad mohl věc oznámit, jen k tomu
  // nemáme přímý odkaz. Zaměnit obojí by byla nepravda.
  if (!uredni) radky.push("Mezi zdroji není přímý odkaz na úřední oznámení; údaje jsou zprostředkované.");
  return radky;
}

/**
 * Výpis všech zdrojů po skupinách. Úřady první — a když žádný není, napíše se to
 * natvrdo, protože „stojí to jen na novinách“ je pro čtenáře podstatná informace.
 *
 * Do kanálu se od září 2026 neposílá; zůstává pro web a pro případ, že by se
 * někdy hodil plný výpis jinde.
 */
export function sestavZdroje(i) {
  const zdroje = (i.zdroje ?? []).filter((z) => z.url && /^https?:\/\//.test(z.url));
  const { celkem, pocty, uredni } = pocetZdroju(i);
  if (!celkem) return ["Zdroje: žádný odkaz. Záznam je vedený jako nedoložený."];
  const prehled = SKUPINY_ZDROJU.filter((sk) => sk.typ === "primary" || pocty[sk.typ])
    .map((sk) => `${sk.slovo} ${pocty[sk.typ] ?? 0}`)
    .join(" · ");
  const radky = [`Zdroje (${celkem}): ${prehled}`];
  // Věta mluví o seznamu odkazů, ne o světě: úřad mohl věc oznámit, jen k tomu
  // není přímý odkaz. Zaměnit obojí by byla nepravda.
  if (!uredni) radky.push("Mezi zdroji není přímý odkaz na úřední oznámení; údaje pocházejí ze zprostředkovaných zdrojů.");
  for (const sk of SKUPINY_ZDROJU) {
    const skupina = zdroje.filter((z) => z.typ === sk.typ);
    if (!skupina.length) continue;
    radky.push("", sk.nadpis);
    for (const z of skupina) {
      const kdy = z.publikovano ? ` · ${datumCz(z.publikovano)}` : "";
      const jazyk = z.jazyk && z.jazyk !== "cs" ? ` · ${z.jazyk}` : "";
      radky.push(`• <a href="${esc(z.url)}">${esc(zkrat(z.nazev, 120))}</a>${kdy}${jazyk}`);
    }
  }
  return radky;
}

/**
 * Jedna zpráva k záznamu.
 *
 * Kanál je upozornění, ne archiv: celý rozbor je na webu a odkaz na něj
 * vede z každé zprávy. Zpráva proto nese jen to, bez čeho by byla holým
 * titulkem — a holý titulek je přesně to, co pravidlo č. 0 zakazuje:
 *
 *   • puntík a závažnost číslem — aby šla míra přečíst, ne odhadnout,
 *   • tučná věta, co z toho plyne pro Česko (skoro vždy: nic),
 *   • jedna věta, co se stalo,
 *   • jedna věta, co potvrzené není — bez ní by si čtenář vyvodil víc,
 *     než data ukazují (pravidlo č. 6),
 *   • jistota, pachatel, stav vyšetřování,
 *   • poměr zdrojů: kolik z nich je úřad a kolik noviny,
 *   • odkaz na záznam a citovatelná patička.
 *
 * Vypadl výpis všech odkazů (poměr nese řádek pokrytí) a hodnocení
 * projektu. Hodnocení se schválně nezkracuje: zkrácené hodnocení bez
 * podkladu je horší než žádné. Patří na web, kde je pod ním doložení.
 *
 * V souhrnu se posílá ještě kratší podoba — tam jde o výčet, ne o čtení.
 */
export { PUVODCI };

export function sestavZpravu(i, { aktualizace = false, souhrn = false } = {}) {
  const d = druh(i);
  const kde = i.kodZeme === "CZ" ? "Česko" : i.zeme;
  const odkaz = `${WEB}/incident/${i.slug}/`;
  const radky = [
    zahlavi(i),
    `<b>${esc(zkrat(i.kratkyTitulek || i.titulek, 90))}</b>`,
    // Druh se opakuje jen u případů — u ostatních ho už nese záhlaví.
    `${esc(kde)} · ${d === "pripad" ? `${DRUHY[d]} · ` : ""}${esc(radekData(i))}${aktualizace ? " · nové zjištění" : ""}`,
  ];
  const jistota = `Jistota informace: ${JISTOTY[i.jistota] ?? i.jistota}`;
  const potvrzen = i.atribuce === "oficialni" || i.atribuce === "domaci";
  const pachatel = d === "pripad"
    ? `Původce: ${PUVODCI[i.puvodce ?? "neznamy"]}${i.puvodce && i.puvodce !== "neznamy" && !potvrzen ? " — dosud nepotvrzeno" : ""}`
    : null;

  if (souhrn) {
    const { celkem, uredni } = pocetZdroju(i);
    radky.push(
      esc(zkrat(i.titulek, 200)),
      jeArchivni(i) ? "Archivní záznam — událost se nestala teď." : null,
      [jistota, pachatel, celkem ? `Zdroje: ${celkem} (úřady ${uredni})` : null].filter(Boolean).join(" · "),
      odkaz,
    );
    return radky.filter((r) => r !== null).join("\n");
  }

  /*
    U archivního záznamu jde vysvětlení před klíčovou větu. Bez něj by
    „závažnost 8 z 10" u dvouleté události působila jako aktuální hrozba.
  */
  if (jeArchivni(i)) {
    const dni = stariUdalostiDni(i);
    const kdy = dni !== null && dni > 365 ? `před ${Math.round(dni / 365)} lety` : `před ${Math.round((dni ?? 0) / 30)} měsíci`;
    radky.push("", `<b>Archivní záznam: událost se stala ${esc(kdy)}. Doplňujeme ji do přehledu, neděje se teď.</b>`);
  }

  radky.push("", `<b>${esc(klicovaVeta(i))}</b>`);

  // Co se stalo: u aktualizace to nové, jinak první doložený fakt. Jedna věta.
  const nove = aktualizace && i.historie?.length ? i.historie[i.historie.length - 1].text : null;
  const jadro = nove ?? i.fakta?.[0] ?? i.titulek;
  radky.push("", `${aktualizace ? "Co je nového: " : ""}${esc(zkrat(jadro, 280))}`);

  // Co potvrzené není. Jedna věta, ale povinně — viz pravidlo č. 6.
  const nejisté = i.neznameho?.[0];
  if (nejisté) radky.push(`Nepotvrzeno: ${esc(zkrat(nejisté, 180))}`);

  const stav = STAVY[i.stav];
  radky.push("", [jistota, pachatel, stav && stav !== "Neuvedeno" ? `Stav: ${stav.toLowerCase()}` : null].filter(Boolean).join(" · "));
  radky.push(...radekPokryti(i));

  radky.push("", `Všechna fakta, hodnocení a všechny zdroje: ${odkaz}`);
  if (d === "opatreni" || dulezitePro(i)) radky.push(`Úřední opatření platná v ČR: ${WEB}/#opatreni`);
  // Patička dělá ze zprávy citovatelný dokument: kdo ji vydal a pod jakým číslem.
  radky.push(`CzechPatrol · záznam ${esc(i.slug)} · aktualizováno ${datumCz(i.aktualizovano ?? kdyZjisteno(i))}`);
  return radky.join("\n");
}

/**
 * Rozdělí dlouhou zprávu na díly, které Telegram unese (limit 4096 znaků).
 * Dělí se jen mezi odstavci, aby se nerozpadlo formátování.
 */
export function rozdelZpravu(text, { limit = 3800 } = {}) {
  if (text.length <= limit) return [text];
  const kusy = [];
  let akt = "";
  for (const odstavec of text.split("\n\n")) {
    const dalsi = akt ? `${akt}\n\n${odstavec}` : odstavec;
    if (dalsi.length > limit && akt) { kusy.push(akt); akt = odstavec; } else akt = dalsi;
  }
  if (akt) kusy.push(akt);
  return kusy.map((k, n) => (n === 0 ? k : `↳ pokračování ${n + 1}/${kusy.length}\n\n${k}`));
}

/** Nejzásadnější věta celého souhrnu: platí dnes v Česku něco nového, nebo ne. */
export function klicovaVetaSouhrnu(zaznamy) {
  const opatreniCr = zaznamy.find((i) => druh(i) === "opatreni" && dulezitePro(i));
  if (opatreniCr) return klicovaVeta(opatreniCr);
  const ceske = zaznamy.find((i) => dulezitePro(i));
  if (ceske) {
    const nazev = zkrat(String(ceske.kratkyTitulek || ceske.titulek).replace(/^(ČR|Česko|Česká republika)\s*[:–-]\s*/i, ""), 90);
    return `Území České republiky se týká záznam: ${nazev}. Nové úřední opatření z něj neplyne.`;
  }
  return "Žádný ze záznamů tohoto přehledu nezakládá v České republice nové úřední opatření.";
}

/**
 * Denní souhrn: pruh puntíků a legenda nahoře, tučně to podstatné, pak zkrácené
 * položky seřazené podle naléhavosti. Delší souhrn se rozdělí na víc zpráv.
 */
export function sestavSouhrn(polozky, { ted = Date.now(), limit = 3500 } = {}) {
  const razene = [...polozky].sort((a, b) => vaha(b.i) - vaha(a.i) || kdyZjisteno(b.i).localeCompare(kdyZjisteno(a.i)));
  const zaznamy = razene.map((p) => p.i);
  const pocet = zaznamy.length;
  const slovo = pocet === 1 ? "nový záznam" : pocet < 5 ? "nové záznamy" : "nových záznamů";
  const cisla = zaznamy.filter((i) => druh(i) === "pripad").map((i) => Z_DESETI[i.zavaznost]).filter(Boolean);
  const nejvyssi = cisla.length ? ` · nejvýše ${Math.max(...cisla)} z 10` : "";
  const kusy = [];
  let akt = [
    pruhTecek(zaznamy),
    `<b>CzechPatrol · denní přehled ${datumCz(new Date(ted).toISOString())}</b>`,
    `${pocet} ${slovo}${nejvyssi}`,
    `<i>${legendaTecek(zaznamy)}</i>`,
    "",
    `<b>${esc(klicovaVetaSouhrnu(zaznamy))}</b>`,
  ].join("\n");
  for (const p of razene) {
    const z = sestavZpravu(p.i, { aktualizace: p.aktualizace, souhrn: true });
    if ((akt + "\n\n" + z).length > limit) { kusy.push(akt); akt = z; } else akt += "\n\n" + z;
  }
  akt += `\n\nPřehled vydává CzechPatrol · ${WEB}/`;
  kusy.push(akt);
  return { kusy, razene };
}

/** Zpráva o změně oficiálního stavu z archivu snímků. To nejzávažnější, co kanál posílá. */
export function sestavZmenuStavu(snimek, zmeny) {
  return [
    `📋 Změna úředního stavu`,
    `podle úředních zdrojů · ${datumCz(snimek.kdy)}`,
    "",
    `<b>Mění se rozsah toho, co úředně platí. Aktuální stav uvádí přehled opatření.</b>`,
    "",
    "Co se změnilo",
    ...zmeny.map((z) => `• ${esc(z)}`),
    "",
    `Úřední opatření platná v ČR: ${WEB}/#opatreni`,
    `CzechPatrol · stav k ${datumCz(snimek.kdy)}`,
  ].join("\n");
}

/** Testovací zpráva. S ukázkou skutečného formátu, aby bylo vidět, jak zprávy vypadají. */
export function sestavTest(ukazka) {
  const radky = [
    `🧪 Zkušební zpráva`,
    `<b>CzechPatrol · ověření kanálu</b>`,
    "",
    `<b>Kanál je funkční. Zprávy o ověřených záznamech vycházejí odsud; každá uvádí zdroje a odkaz na úplný záznam.</b>`,
    "",
    "Zpráva začíná barevným puntíkem a závažností číslem od 1 do 10. Číslo je jinak zapsaná táž úroveň jako na webu, nikoli pravděpodobnost.",
    `<i>${PORADI_TECEK.map((t) => `${t} ${POPIS_TECKY[t]}`).join(" · ")}</i>`,
  ];
  if (ukazka) radky.push("", "Ukázka formátu:", "", sestavZpravu(ukazka));
  else radky.push("", `${WEB}/`);
  return radky.join("\n");
}

/**
 * Zpráva o skokové změně ceny pohonných hmot.
 *
 * Text skládá sběr (`src/lib/palivo.ts`) nad čerstvě staženou řadou ČSÚ —
 * tady se jen obalí do tvaru kanálu. Je to schválně: „co je skok" se nesmí
 * rozhodovat na dvou místech.
 *
 * Co v té zprávě nikdy nebude: že cena poroste a že je vhodné natankovat.
 * Předpověď nemáme z čeho doložit a výzva k tankování by u čerpacích stanic
 * způsobila přesně tu škodu, které se celý web vyhýbá.
 */
export function sestavPalivo(zprava) {
  const [nadpis, ...zbytek] = zprava.text.split("\n");
  return [
    `\u26fd <b>${esc(nadpis)}</b>`,
    ...zbytek.map((r) => (r ? esc(r) : "")),
    "",
    `${WEB}/#opatreni`,
  ].join("\n");
}

/**
 * Vybere zprávu o palivu, pokud je čím se pochlubit a ještě neodešla.
 * Klíčem je týden šetření — týž týden se neoznamuje dvakrát, ani kdyby
 * sběr mezitím řadu stáhl znovu.
 */
export function vyberPalivo(palivo, stav) {
  const z = palivo?.zprava;
  if (!z || !z.tyden || !z.text) return null;
  if ((stav.palivo ?? {})[z.tyden]) return null;
  return z;
}

/*
  Mimořádná výstraha.

  Do kanálu odchází jako první zpráva běhu a jen jednou — klíčem je `klic`
  výstrahy. Kdyby se posílala podle obsahu, každá oprava překlepu by se
  odeslala znovu jako nový poplach.

  Text drží stejné pravidlo jako pruh na webu: hned za tím, co se stalo,
  stojí i to, co z toho neplyne. Do Telegramu chodí lidé s telefonem v ruce
  a zpráva bez druhé části by se šířila dál už jen tou první.
*/
export function ctiVystrahu() {
  const soubor = path.join(koren, "data", "vystraha.json");
  if (!fs.existsSync(soubor)) return null;
  try { return JSON.parse(fs.readFileSync(soubor, "utf-8")).aktivni ?? null; } catch { return null; }
}

export function vyberVystrahu(vystraha, stav) {
  if (!vystraha?.klic) return null;
  if ((stav.vystrahy ?? {})[vystraha.klic]) return null;
  return vystraha;
}

export function sestavVystrahu(v) {
  const radky = [
    "\u{1F6A8} <b>MIMOŘÁDNÁ VÝSTRAHA</b>",
    "",
    `<b>${esc(v.nadpis)}</b>`,
    esc(v.text),
  ];
  if (v.coToZnamena?.length) {
    radky.push("", "<b>Co to znamená</b>", ...v.coToZnamena.map((x) => `• ${esc(x)}`));
  }
  if (v.coToNeznamena?.length) {
    radky.push("", "<b>Co to neznamená</b>", ...v.coToNeznamena.map((x) => `• ${esc(x)}`));
  }
  radky.push("", `Událost: ${datumCz(v.kdy)} · ověřeno ${datumCz(v.overeno)} (${esc(v.overil)})`);
  for (const z of v.zdroje ?? []) radky.push(`Zdroj: <a href="${esc(z.url)}">${esc(z.nazev)}</a>`);
  radky.push("", WEB);
  return radky.join("\n");
}

/*
  Naléhavé signály ze sběru.

  Tohle je jediné místo, kde do kanálu odchází NEOVĚŘENÁ zpráva. Důvod: mezi
  zachycením a lidským ověřením jsou u téhle věci hodiny, a u vyhlášené
  mobilizace nebo spuštěného krizového vysílání je ta prodleva to jediné,
  na čem záleží.

  Proto tvrdá pravidla:
  - jen spouštěče stupně 1 (mobilizace, krizové vysílání, článek 4/5,
    mimořádný právní stav v ČR, uzavření hranic) — příprava mobilizace ani
    dron nad Aliancí sem nepatří, ty počkají na člověka,
  - zpráva začíná slovem NEOVĚŘENO a nese odkaz na zdroj, aby si to každý
    mohl přečíst sám,
  - nejvýš dvě za běh, ať se z kanálu nestane proud fám,
  - každý kandidát jen jednou (klíčem je jeho id).

  Co to NENÍ: potvrzení, že se to stalo. Přesně tohle je hranice, kterou si
  tenhle web hlídá — proto to v té zprávě stojí napsané.
*/
const MAX_SIGNALU_NA_BEH = 2;

export function ctiKandidaty() {
  const soubor = path.join(koren, "data", "kandidati.json");
  if (!fs.existsSync(soubor)) return [];
  try { return JSON.parse(fs.readFileSync(soubor, "utf-8")); } catch { return []; }
}

export function vyberSignaly(kandidati, stav, { ted = Date.now(), maxStari = 6 * 3_600_000 } = {}) {
  const poslane = stav.signaly ?? {};
  return (kandidati ?? [])
    .filter((k) => k?.naliehave?.stupen === 1 && !poslane[k.id])
    /*
      Jen čerstvé. Kandidát může do fronty přijít i s několikadenním zpožděním
      (kanál se probral, zdroj doplnil datum) a rozeslat takovou zprávu jako
      naléhavou by bylo horší než mlčet.
    */
    .filter((k) => ted - new Date(k.publikovano ?? k.zachyceno).getTime() <= maxStari)
    .sort((a, b) => (a.publikovano ?? a.zachyceno).localeCompare(b.publikovano ?? b.zachyceno))
    .slice(0, MAX_SIGNALU_NA_BEH);
}

const NAZVY_SIGNALU = {
  "mobilizace-rusko": "vyhlášení mobilizace v Rusku",
  "krizove-vysilani": "krizové vysílání Českého rozhlasu",
  "clanek-nato": "aktivace článku 4 nebo 5 NATO",
  "pravni-stav-cr": "mimořádný právní stav v ČR",
  "hranice-cr": "uzavření hranic ČR",
  "priprava-mobilizace": "přípravy mobilizace v Rusku",
  "vzdusny-prostor-nato": "narušení vzdušného prostoru Aliance",
};

export function sestavSignal(k) {
  const co = NAZVY_SIGNALU[k.naliehave?.druh] ?? "sledovaná událost";
  /* Prázdné řádky jsou tu schválně — na telefonu se ta zpráva musí dát přelétnout. */
  const radky = ["\u26a0\ufe0f <b>NEOVĚŘENO — signál ke kontrole</b>", "", `<b>${esc(k.titulek)}</b>`];
  if (k.shrnuti) radky.push(esc(zkrat(k.shrnuti, 220)));
  radky.push(
    "",
    `Téma: ${esc(co)}${k.zeme ? ` · ${esc(k.zeme)}` : ""}`,
    `Zdroj: <a href="${esc(k.zdroj.url)}">${esc(k.zdroj.nazev)}</a>`,
    "",
    "Zachytil to automatický sběr. <b>Neověřil to zatím člověk</b> — není to potvrzené a do žádných počtů na webu to nevstupuje. Posíláme to proto, že u téhle věci je každá hodina znát.",
    "",
    `${WEB}/udalosti/?zalozka=cekajici`,
  );
  return radky.join("\n");
}

/** Ceny paliv. Chybějící soubor není chyba — jen se o palivu nic neřekne. */
function ctiPalivo() {
  const soubor = path.join(koren, "data", "palivo.json");
  if (!fs.existsSync(soubor)) return null;
  try { return JSON.parse(fs.readFileSync(soubor, "utf-8")); } catch { return null; }
}

function ctiStav() {
  if (!fs.existsSync(STAV)) return { zaznamy: {}, snimky: {}, palivo: {}, vystrahy: {}, signaly: {}, prvniBeh: null };
  try {
    const s = JSON.parse(fs.readFileSync(STAV, "utf-8"));
    // Starší stav pole „palivo", „vystrahy" a „signaly" nemá; bez doplnění by první zápis spadl.
    return { palivo: {}, vystrahy: {}, signaly: {}, ...s };
  } catch { return { zaznamy: {}, snimky: {}, palivo: {}, vystrahy: {}, signaly: {}, prvniBeh: null }; }
}
function zapisStav(s) {
  fs.mkdirSync(path.dirname(STAV), { recursive: true });
  fs.writeFileSync(STAV, JSON.stringify(s, null, 2) + "\n", "utf-8");
}

/**
 * Vybere, co odeslat. `okamzite` = jen vážné případy a opatření; `souhrn` = zbytek.
 * Vrací položky {i, aktualizace} a vedlejším účinkem označí za oznámené to, co se při prvním běhu přeskočilo.
 */
export function vyberNove(zaznamy, stav, { rezim, ted = Date.now() }) {
  const prvni = !stav.prvniBeh;
  const hranicePrvni = ted - PRVNI_BEH_DNI * 86_400_000;
  const hraniceStari = ted - NEJSTARSI_DNI * 86_400_000;
  const vybrane = [];
  for (const i of zaznamy) {
    if (!i.lidskyOvereno) continue;
    const d = druh(i);
    const historie = i.historie?.length ?? 0;
    const z = stav.zaznamy[i.id];
    const zjisteno = new Date(kdyZjisteno(i)).getTime();
    /*
      Zpětně doplněná osa a staré události nejsou novinka: jen se zapamatují,
      aby kanál nezaplavil archiv. Rozhoduje stáří UDÁLOSTI, ne datum, kdy
      jsme ji zapsali — jinak by případ z loňska odešel jako čerstvá zpráva
      jen proto, že jsme ho doplnili dnes.

      Nové zjištění k takovému případu novinka je; přijde příště jako
      aktualizace, protože záznam už budeme mít zapamatovaný.
    */
    if (!z && (jeArchivni(i, ted) || zjisteno < hraniceStari || (prvni && zjisteno < hranicePrvni))) {
      stav.zaznamy[i.id] = { kdy: new Date(ted).toISOString(), historie, ticho: true };
      continue;
    }
    const patriDoOkamzitych = d === "opatreni" || (d === "pripad" && vazne(i));
    if (rezim === "okamzite" && !patriDoOkamzitych) continue;
    if (rezim === "souhrn" && patriDoOkamzitych && z) continue; // vážné šly hned; do souhrnu jen když ještě neodešly
    if (!z) vybrane.push({ i, aktualizace: false });
    else if (historie > z.historie && d === "pripad") vybrane.push({ i, aktualizace: true });
  }
  return vybrane;
}

/** Změny oficiálních stavů z archivu, které ještě nebyly oznámené. */
export function vyberZmenyStavu(archiv, stav) {
  const vysledek = [];
  for (const s of archiv.snimky ?? []) {
    if (stav.snimky[s.kdy]) continue;
    const zmeny = (s.zmeny ?? []).filter((z) => /^(právní stav|NATO)/.test(z) && !/neověřeno → NE|neověřeno → neaktivní/.test(z));
    if (zmeny.length) vysledek.push({ snimek: s, zmeny });
  }
  return vysledek;
}

/** `nahled` = ukázat kartu odkazu. U souhrnu s mnoha odkazy jen překáží. */
/*
  Odeslání jedné zprávy do Telegramu.

  Co se změnilo oproti původní verzi a proč:

  - Kontroluje se TĚLO odpovědi, ne jen HTTP stav. Bot API umí vrátit 200
    s `ok: false`; brát to jako úspěch znamenalo tiše ztratit zprávu.
  - Ukládá se `message_id` a čas. Bez něj se nedá navázat oprava na původní
    zprávu ani dohledat, co vlastně odešlo.
  - HTTP 429 se řeší podle `retry_after`, ne jako obyčejná chyba.
  - Po vypršení časového limitu se vrací `nejisty`, ne `chyba`. Telegram mohl
    zprávu přijmout a odpověď se cestou ztratit; tvrdit, že neodešla, by vedlo
    k druhému odeslání. Exactly-once se tu slíbit nedá a nepředstíráme to.
*/

/** Kolik sekund navíc počkat nad rámec toho, co řekne Telegram. */
const REZERVA_429 = 1;
/** Časový limit jednoho pokusu. Delší čekání blokuje celý běh. */
const LIMIT_MS = 20_000;

async function posliTelegram(text, { nahled = true, pokusu = 3 } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const kanal = process.env.TELEGRAM_KANAL || "@czechpatrol";
  if (!token) return { ok: false, chyba: "chybí TELEGRAM_BOT_TOKEN" };

  for (let pokus = 1; pokus <= pokusu; pokus++) {
    let r;
    try {
      r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: kanal, text, parse_mode: "HTML", disable_web_page_preview: !nahled }),
        signal: AbortSignal.timeout(LIMIT_MS),
      });
    } catch (e) {
      // Spojení spadlo nebo vypršel limit. Nevíme, jestli zpráva prošla.
      return { ok: false, nejisty: true, chyba: `spojení selhalo (${e?.name ?? e}); výsledek je nejistý` };
    }

    const telo = await r.json().catch(() => null);

    if (r.ok && telo?.ok) {
      return { ok: true, messageId: telo.result?.message_id ?? null, kdy: new Date().toISOString() };
    }

    //Limit rychlosti: Telegram sám řekne, jak dlouho počkat.
    const pockat = telo?.parameters?.retry_after;
    if (r.status === 429 && pockat && pokus < pokusu) {
      console.log(`[rozhlas] Telegram omezuje rychlost, čekám ${pockat + REZERVA_429} s`);
      await new Promise((x) => setTimeout(x, (pockat + REZERVA_429) * 1000));
      continue;
    }

    // Dočasná chyba na straně Telegramu — zkusit znovu s odstupem má smysl.
    if (r.status >= 500 && pokus < pokusu) {
      await new Promise((x) => setTimeout(x, 1000 * 2 ** pokus));
      continue;
    }

    const popis = telo?.description ?? (await r.text().catch(() => "")).slice(0, 200);
    return { ok: false, chyba: `telegram ${r.status}: ${popis}` };
  }

  return { ok: false, chyba: "vyčerpány pokusy" };
}

async function main() {
  const arg = process.argv.slice(2);
  const rezim = arg.includes("--souhrn") ? "souhrn" : "okamzite";
  const nacisto = arg.includes("--nacisto");
  const test = arg.includes("--test");
  const posli = async (text, volby) => (nacisto ? (console.log("---\n" + text), { ok: true }) : posliTelegram(text, volby));

  const zaznamy = JSON.parse(fs.readFileSync(path.join(koren, "data", "incidenty.json"), "utf-8"))
    .sort((a, b) => kdyZjisteno(a).localeCompare(kdyZjisteno(b)));

  if (test) {
    // Ukázkou je poslední ověřený záznam — na výmyslu by se formát ověřit nedal.
    const ukazka = [...zaznamy].reverse().find((i) => i.lidskyOvereno && druh(i) === "pripad");
    const v = await posli(sestavTest(ukazka));
    console.log(v.ok ? "test odeslán" : `test selhal: ${v.chyba}`);
    process.exit(v.ok ? 0 : 1);
  }
  if (!process.env.TELEGRAM_BOT_TOKEN && !nacisto) {
    /*
      Chybějící token nesmí vypadat jako úspěšný běh s nulou zpráv. Přesně
      tak totiž vypadá i výpadek doručování — a nikdo by si ho nevšiml.
      Nasucho (--nacisto) je to naopak legitimní stav bez poplachu.
    */
    console.error("[rozhlas] CHYBÍ TELEGRAM_BOT_TOKEN — služba neběží, nic se neodeslalo");
    process.exit(1);
  }

  const archiv = JSON.parse(fs.readFileSync(path.join(koren, "data", "historie.json"), "utf-8"));
  const stav = ctiStav();
  const ted = Date.now();
  const prvniBeh = !stav.prvniBeh;

  let odeslano = 0, selhalo = 0;

  /*
    0. mimořádná výstraha — před vším ostatním.

    Při prvním běhu (prázdný stav) se posílá jen výstraha ověřená v posledních
    24 hodinách. Starší se jen zapamatuje: prázdný stav znamená i to, že se
    soubor stavu ztratil, a rozeslat kvůli tomu týden starý poplach by bylo
    horší než mlčet.
  */
  const vystraha = vyberVystrahu(ctiVystrahu(), stav);
  if (vystraha) {
    const cerstva = ted - new Date(vystraha.overeno).getTime() <= 24 * 3_600_000;
    if (prvniBeh && !cerstva) {
      stav.vystrahy[vystraha.klic] = { kdy: new Date(ted).toISOString(), ticho: true };
    } else {
      const v = await posli(sestavVystrahu(vystraha), { nahled: false });
      if (v.ok) { stav.vystrahy[vystraha.klic] = { kdy: new Date(ted).toISOString(), messageId: v.messageId ?? null }; odeslano++; }
      else { selhalo++; console.log(`[rozhlas] výstraha neodešla: ${v.chyba}`); }
    }
  }

  /*
    0b. naléhavé signály ze sběru — neověřené, jasně označené.

    Při prvním běhu se jen zapamatují: prázdný stav znamená i to, že se soubor
    ztratil, a rozeslat kvůli tomu dávku starých signálů by z kanálu udělalo
    přesně ten proud fám, kterému se web brání.
  */
  if (rezim === "okamzite") {
    for (const k of vyberSignaly(ctiKandidaty(), stav, { ted })) {
      if (prvniBeh) { stav.signaly[k.id] = { kdy: new Date(ted).toISOString(), ticho: true }; continue; }
      const v = await posli(sestavSignal(k), { nahled: false });
      if (v.ok) { stav.signaly[k.id] = { kdy: new Date(ted).toISOString(), messageId: v.messageId ?? null }; odeslano++; }
      else { selhalo++; console.log(`[rozhlas] signál neodešel: ${v.chyba}`); }
    }
  }

  // 1. změny oficiálních stavů — vždy hned
  for (const { snimek, zmeny } of vyberZmenyStavu(archiv, stav)) {
    if (prvniBeh) { stav.snimky[snimek.kdy] = { kdy: new Date(ted).toISOString(), ticho: true }; continue; }
    const v = await posli(sestavZmenuStavu(snimek, zmeny), { nahled: false });
    if (v.ok) { stav.snimky[snimek.kdy] = { kdy: new Date(ted).toISOString(), messageId: v.messageId ?? null }; odeslano++; } else { selhalo++; console.log(`[rozhlas] ${v.chyba}`); }
  }

  /*
    1b. skokový pohyb ceny pohonných hmot.

    Jde jen v okamžitém režimu a jen tehdy, když sběr skok opravdu naměřil.
    Při prvním běhu se jen zapamatuje — jinak by kanál začal cenou, která
    mohla vyskočit před týdnem a už dávno není novinka.
  */
  const palivo = ctiPalivo();
  const skok = vyberPalivo(palivo, stav);
  if (rezim === "okamzite" && skok) {
    if (prvniBeh) {
      stav.palivo[skok.tyden] = { kdy: new Date(ted).toISOString(), ticho: true };
    } else {
      const v = await posli(sestavPalivo(skok), { nahled: false });
      if (v.ok) { stav.palivo[skok.tyden] = { kdy: new Date(ted).toISOString(), messageId: v.messageId ?? null }; odeslano++; }
      else { selhalo++; console.log(`[rozhlas] ${v.chyba}`); }
    }
  }

  // 2. záznamy
  const nove = vyberNove(zaznamy, stav, { rezim, ted });
  const davka = nove.slice(0, MAX_ZPRAV_NA_BEH);
  if (rezim === "souhrn" && davka.length > 1) {
    const { kusy } = sestavSouhrn(davka, { ted });
    let ok = true;
    for (const k of kusy) { const v = await posli(k, { nahled: false }); if (!v.ok) { ok = false; console.log(`[rozhlas] ${v.chyba}`); } }
    if (ok) { for (const { i } of davka) stav.zaznamy[i.id] = { kdy: new Date(ted).toISOString(), historie: i.historie?.length ?? 0 }; odeslano += kusy.length; } else selhalo++;
  } else {
    for (const { i, aktualizace } of davka) {
      const dily = rozdelZpravu(sestavZpravu(i, { aktualizace }));
      let ok = true;
      // Id první zprávy si držíme, aby se na ni dala navázat případná oprava.
      let prvniId = null;
      let nejisty = false;
      for (const [n, dil] of dily.entries()) {
        // Náhled webu jen u prvního dílu, ať se karta neopakuje.
        const v = await posli(dil, { nahled: n === 0 });
        if (v.ok) { if (n === 0) prvniId = v.messageId ?? null; }
        else { ok = false; if (v.nejisty) nejisty = true; console.log(`[rozhlas] ${v.chyba}`); }
      }
      /*
        Nejistý výsledek si pamatujeme jako odeslaný. Telegram mohl zprávu
        přijmout a odpověď se cestou ztratit; druhé odeslání téhož záznamu
        je horší než jedna možná chybějící zpráva, kterou člověk dohledá.
      */
      if (!ok && nejisty) {
        stav.zaznamy[i.id] = { kdy: new Date(ted).toISOString(), historie: i.historie?.length ?? 0, nejistyVysledek: true };
      }
      if (ok) { stav.zaznamy[i.id] = { kdy: new Date(ted).toISOString(), historie: i.historie?.length ?? 0, messageId: prvniId }; odeslano += dily.length; }
      else selhalo++;
    }
  }

  if (prvniBeh) stav.prvniBeh = new Date(ted).toISOString();
  if (!nacisto) zapisStav(stav);
  console.log(`[rozhlas] režim ${rezim}: odesláno ${odeslano}, selhalo ${selhalo}, čeká na příště ${Math.max(0, nove.length - davka.length)}${prvniBeh ? " (první běh: starší záznamy jen zaznamenány jako oznámené)" : ""}`);
  if (selhalo) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error("[rozhlas] selhalo:", e); process.exit(1); });
}
