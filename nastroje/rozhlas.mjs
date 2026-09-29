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
import { maUredniZdroj } from "./uredni-zdroj.mjs";
import { privilegovanePokyny, textyZaznamu } from "./privilegovane-pokyny.mjs";
import { NAZVY_SPEKTRA, radekSpektra, spektrumKandidata } from "./spektrum-medii.mjs";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = "https://czechpatrol.cz";
const STAV = path.join(koren, "data", "fronta", "rozhlaseno.json");
const MAX_ZPRAV_NA_BEH = 8;
/** Kolik záznamů se vejde do jednoho přehledu; zbytek odkazem na web. */
const MAX_V_PREHLEDU_ZAZNAMU = 12;
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
// Kopie číselníku z src/lib/typy.ts — skript je prostý .mjs. Test hlídá, že se nerozejdou.
const PUVODCI = { rusko: "Rusko", ukrajina: "Ukrajina", "jiny-stat": "jiný stát", "neni-stat": "nestátní skupina", domaci: "domácí pachatel", neznamy: "neznámý" };
const DRUHY = { pripad: "případ", aktualizace: "aktualizace", opatreni: "opatření", reakce: "reakce" };
/** Šestý pád názvu země, aby věta „stalo se v…“ byla česky. Neznámá země se opíše jinak. */
const V_ZEMI = {
  CZ: "v Česku", PL: "v Polsku", DE: "v Německu", SK: "na Slovensku", UA: "na Ukrajině",
  LT: "v Litvě", LV: "v Lotyšsku", EE: "v Estonsku", FI: "ve Finsku", SE: "ve Švédsku",
  NO: "v Norsku", DK: "v Dánsku", NL: "v Nizozemsku", GB: "ve Spojeném království",
  RU: "v Rusku", BG: "v Bulharsku", RO: "v Rumunsku", ME: "v Černé Hoře", XZ: "ve Středomoří",
  /*
    Doplněno 16. 9. 2026. Chybějící země spadla do náhradní věty „Událost
    nastala mimo Českou republiku (Moldavsko)" — jiný tvar než u ostatních
    zemí, takže to vypadalo jako dvě různá pravidla. Není to nahodilost,
    je to díra ve slovníku.
  */
  MD: "v Moldavsku", AT: "v Rakousku", HU: "v Maďarsku", BE: "v Belgii", FR: "ve Francii",
  IT: "v Itálii", ES: "ve Španělsku", PT: "v Portugalsku", IE: "v Irsku", CH: "ve Švýcarsku",
  BY: "v Bělorusku", SI: "ve Slovinsku", HR: "v Chorvatsku", RS: "v Srbsku", GR: "v Řecku",
  TR: "v Turecku", SA: "v Saúdské Arábii", IL: "v Izraeli", IQ: "v Iráku", IR: "v Íránu",
  US: "ve Spojených státech", CA: "v Kanadě", IS: "na Islandu", LU: "v Lucembursku",
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
  /*
    Kráceno na hranici slova, ne uprostřed.

    Do kanálu odešlo „Polsko: armáda posiluje hraniční přechody s Ukra".
    Useknuté slovo vypadá jako porucha a u zprávy, kterou čtou lidé kvůli
    bezpečnosti, bere důvěru celé zprávě.
  */
  const t = String(s ?? "").trim();
  if (t.length <= n) return t;
  const orez = t.slice(0, n - 1);
  const mezera = orez.lastIndexOf(" ");
  return `${(mezera > n * 0.6 ? orez.slice(0, mezera) : orez).replace(/[\s,;:.–-]+$/, "")}…`;
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
    /*
      U prohlášení je země ta, kde výrok zazněl — ne místo, o kterém mluví.
      Dřív tu stálo „vyjádření k dění v Rusku“ i u Putinova výroku o
      Pobaltí (25. 9. 2026), což obsah zprávy popíralo.
    */
    ? (d === "reakce" ? `Jde o vyjádření, které zaznělo ${kde}.` : `Událost nastala ${kde}, nikoli v České republice.`)
    /* Týž tvar i pro zemi, která ve slovníku chybí — ať zpráva nezní pokaždé jinak. */
    : `Událost nastala v zemi ${i.zeme}, nikoli v České republice.`;
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
 *   • pachatel, stav vyšetřování,
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

export function sestavZpravu(i, { aktualizace = false, souhrn = false, faktu = 1 } = {}) {
  const d = druh(i);
  const kde = i.kodZeme === "CZ" ? "Česko" : i.zeme;
  const odkaz = `${WEB}/incident/${i.slug}/`;
  /*
    Nadpis nese datum v závorce a nic víc.

    Dřív pod ním stál ještě řádek „Moldavsko · případ · 9. 9. 2026 · nové
    zjištění". Země byla v nadpisu podruhé, slovo „případ" stálo skoro v každé
    zprávě a „nové zjištění" nikdo nespojil s tím, že jde o novinku k dřív
    zveřejněné události. Aktualizace se proto pozná ze slova na začátku
    nadpisu — a co je na ní nového, říká řádek „Co je nového" níž.
  */
  const radky = [
    zahlavi(i),
    `<b>${aktualizace ? "Aktualizace — " : ""}${esc(zkrat(i.kratkyTitulek || i.titulek, 90))} (${esc(radekData(i))})</b>`,
  ];
  /*
    Jistota a původce — dvě věci, které se nesmějí slít.

    Dřív tu stálo „Jistota: vysoká · Pachatel: Rusko (nepotvrzeno)". Čtenář to
    přečte jako jednu větu a vyjde mu z toho „s vysokou jistotou to udělalo
    Rusko". Přitom ta jistota se týká jen toho, ŽE SE UDÁLOST STALA, a o
    původci v tu chvíli nikdo nic neví — vyšetřování teprve začíná.

    U nového případu je to navíc nejnebezpečnější okamžik: viníka lze
    ukázat prstem hned, doložit ho až za měsíce, a v mezičase se to šíří dál.
    Tenhle web zároveň dokumentuje případy, kdy se rychlé připsání ukázalo
    jako mylné. Proto:

    - jistota se jmenuje tím, čeho se týká,
    - dokud atribuce není úřední (nebo doložený domácí pachatel), NEPÍŠE SE
      původce jako údaj. Píše se, že určen není, a odděleně to, že ho někdo
      uvádí — jako tvrzení médií, ne jako náš závěr.
  */
  const potvrzen = i.atribuce === "oficialni" || i.atribuce === "domaci";
  const kdoSeUvadi = i.puvodce && i.puvodce !== "neznamy" ? PUVODCI[i.puvodce] : null;
  /*
    „Vyšetřování pokračuje“ jen tehdy, když to záznam opravdu říká (stav
    „probiha“). Dřív to stálo u každého případu bez původce — i u poškozené
    lotyšské hranice (28. 9. 2026), kde o vyšetřování zdroje nemluví.
  */
  const vysetruje = i.stav === "probiha";
  const pachatel = d !== "pripad"
    ? null
    : potvrzen
      ? `<b>Původce:</b> ${PUVODCI[i.puvodce ?? "neznamy"]} — potvrzeno úředním závěrem`
      : kdoSeUvadi
        ? `<b>Původce: zatím neurčen.</b> Média a komentáře uvádějí ${kdoSeUvadi}; úřední potvrzení k tomu není${vysetruje ? " a vyšetřování pokračuje" : ""}.`
        : `<b>Původce: zatím neurčen.</b>${vysetruje ? " Vyšetřování pokračuje." : ""}`;

  if (souhrn) {
    const { celkem, uredni } = pocetZdroju(i);
    radky.push(
      esc(zkrat(i.titulek, 200)),
      jeArchivni(i) ? "Archivní záznam — událost se nestala teď." : null,
      [pachatel, celkem ? `Zdroje: ${celkem} (úřady ${uredni})` : null].filter(Boolean).join(" · "),
      radekSpektra(i.zdroje),
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
  const jadra = nove ? [nove] : i.fakta?.length ? i.fakta.slice(0, faktu) : [i.titulek];
  radky.push("", `${aktualizace ? "<b>Co je nového:</b> " : ""}${jadra.map((j) => esc(zkrat(j, 280))).join("\n\n")}`);

  // Co potvrzené není. Jedna věta, ale povinně — viz pravidlo č. 6.
  const nejisté = i.neznameho?.[0];
  if (nejisté) radky.push(`<b>Nepotvrzeno:</b> ${esc(zkrat(nejisté, 180))}`);

  const stav = STAVY[i.stav];
  /* Každý údaj na vlastní řádek: na telefonu se tři věci za tečkou slijí v jednu větu. */
  /*
    Jistota, že se událost stala, se do kanálu nepíše.

    Do kanálu jde jen to, co prošlo lidským ověřením — „střední jistota, že
    se to stalo" u takové zprávy čtenáře jen mate a zní, jako bychom si
    nebyli jistí, jestli publikujeme skutečnost. Na webu u záznamu zůstává,
    tam má vedle sebe fakta i zdroje a dá se přečíst v souvislostech.
  */
  radky.push("");
  if (pachatel) radky.push(pachatel);
  if (stav && stav !== "Neuvedeno") radky.push(`<b>Stav:</b> ${stav.toLowerCase()}`);
  radky.push(...radekPokryti(i));
  // Drobně, kde se to píše: úřad, západní, ruská státní… (spektrum-medii.mjs).
  const spektrum = radekSpektra(i.zdroje);
  if (spektrum) radky.push(spektrum);

  radky.push("", `Všechna fakta, hodnocení a všechny zdroje: ${odkaz}`);
  if (d === "opatreni" || dulezitePro(i)) radky.push(`Úřední opatření platná v ČR: ${WEB}/#opatreni`);
  // Patička říká, kdo zprávu vydal a kdy. Vnitřní označení záznamu do ní
  // nepatří — čtenáři nic neříká a odkaz na záznam je o řádek výš.
  radky.push(`CzechPatrol · aktualizováno ${datumCz(i.aktualizovano ?? kdyZjisteno(i))}`);
  return radky.join("\n");
}

/**
 * Mimořádná zpráva — výjimka, kterou spouští jen správce ručně.
 *
 * Do kanálu jinak jde jen lidsky ověřené. Výjimkou jsou záznamy, které
 * správce vědomě pošle hned, třeba výrok ruského vedení o sledovaných
 * zemích (25. 9. 2026 Putin o Pobaltí): čekat na úřední ověření by u
 * výroku nemělo smysl, protože úřad ho nepotvrdí ani nevyvrátí.
 * Text stojí na stejném sestavení jako běžná zpráva; navíc nese označení
 * a u neověřeného záznamu řádek, že vychází z médií — čtenář musí vědět,
 * na čem zpráva stojí.
 */
/*
  Uvedení na pravou míru (29. 9. 2026). Když kolem záznamu koluje zavádějící
  titulek („nová mobilizace“ u dekretu, který nikoho nepovolává), červená
  „MIMOŘÁDNÁ ZPRÁVA“ by ten titulek jen zesílila. Tady je nahoře to, co se
  opravdu stalo, a hned pod tím, co z toho neplyne.
*/
export function sestavVyjasneni(i, nadpis) {
  const fakta = (i.fakta ?? []).slice(0, 3).map((f) => `• ${esc(f)}`);
  return [
    "ℹ️ <b>Uvedení na pravou míru</b>",
    `<b>${esc(nadpis || i.kratkyTitulek || i.titulek)}</b>`,
    "",
    ...fakta,
    "",
    `<b>${esc(klicovaVeta(i))}</b>`,
    "",
    `Zdroje: ${(i.zdroje ?? []).map((z) => `<a href="${esc(z.url)}">${esc(String(z.nazev).split(" — ")[0])}</a>`).join(" · ")}`,
    "",
    `Celý záznam: ${WEB}/incident/${i.slug}/`,
  ].filter((r, n, a) => !(r === "" && a[n - 1] === "")).join("\n");
}

/*
  Fronta mimořádných zpráv v datech (29. 9. 2026). Ruční spuštění workflow
  odsud nejde a správkyně ho z telefonu dělat nemusí: stačí přidat položku
  do data/fronta/mimoradne-zpravy.json a commit spustí rozhlas. Každá
  položka odejde jednou (stav.mimoradne), i když v souboru zůstane.
*/
export function ctiFrontuMimoradnych(soubor = path.join(koren, "data", "fronta", "mimoradne-zpravy.json")) {
  try { return JSON.parse(fs.readFileSync(soubor, "utf-8")); } catch { return []; }
}
export function vyberMimoradne(fronta, zaznamy, stav) {
  return (fronta ?? [])
    .filter((f) => f?.slug && !(stav.mimoradne ?? {})[zaznamy.find((z) => z.slug === f.slug)?.id ?? f.slug])
    .map((f) => ({ f, i: zaznamy.find((z) => z.slug === f.slug) }))
    .filter((x) => x.i && overeny(x.i));
}

export function sestavMimoradnou(i) {
  const uredne = i.lidskyOvereno || i.overeni === "automaticke";
  // Mimořádná zpráva nese dvě doložená fakta: u výroku bývá podstata ve dvou větách.
  const [prvni, ...zbytek] = sestavZpravu(i, { faktu: 2 }).split("\n");
  return [
    "❗ <b>MIMOŘÁDNÁ ZPRÁVA</b>",
    prvni,
    ...(uredne ? [] : ["<i>Úředně neověřeno — vychází ze shodných zpráv více médií.</i>"]),
    ...zbytek,
  ].join("\n");
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
export function sestavSouhrn(polozky, { ted = Date.now(), limit = 3500, cast = null } = {}) {
  const razene = [...polozky].sort((a, b) => vaha(b.i) - vaha(a.i) || kdyZjisteno(b.i).localeCompare(kdyZjisteno(a.i)));
  const zaznamy = razene.map((p) => p.i);
  const pocet = zaznamy.length;
  const slovo = pocet === 1 ? "nový záznam" : pocet < 5 ? "nové záznamy" : "nových záznamů";
  const cisla = zaznamy.filter((i) => druh(i) === "pripad").map((i) => Z_DESETI[i.zavaznost]).filter(Boolean);
  const nejvyssi = cisla.length ? ` · nejvýše ${Math.max(...cisla)} z 10` : "";
  const kusy = [];
  let akt = [
    pruhTecek(zaznamy),
    `<b>CzechPatrol · ${cast === "rano" ? "ranní" : cast === "vecer" ? "večerní" : "denní"} přehled ${datumCz(new Date(ted).toISOString())}</b>`,
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
    "<b>Co se změnilo</b>",
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

export function ctiNavrhy() {
  const soubor = path.join(koren, "data", "navrhy.json");
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


/**
 * Vážné případy doložené dvěma nezávislými zdroji.
 *
 * Výjimka z pravidla, že do kanálu jde jen schválené. Když je případ vážný
 * (O nebo R) a stojí nejméně na dvou nezávislých zdrojích, je čekání na
 * schválení dražší než ta nejistota. Úřední zdroj byl do 22. 9. 2026
 * podmínkou; od té doby ne — kanál pak mlčel i u případů, o kterých psaly
 * dvě redakce, jen úřad se ještě nevyjádřil. Ve zprávě se ale říká, jestli
 * úřední zdroj je, nebo není: to je rozdíl, který čtenář má vidět.
 *
 * Na web se tím NIC nedostane mezi ověřené. Záznam dál čeká ve frontě
 * na člověka a zpráva je označená jako neověřená — kanál dostane varování
 * dřív, web pravdu později.
 */
export function vyberVazneNavrhy(navrhy, stav, { ted = Date.now(), maxStari = 48 * 3_600_000 } = {}) {
  const poslane = stav.signaly ?? {};
  return (navrhy ?? [])
    .filter((n) => (n.kam ?? "zaznam") === "zaznam" && !poslane[n.id])
    .filter((n) => /^[OR]/.test(n.zavaznost ?? ""))
    .filter((n) => (n.zdroje ?? []).length >= 2)
    /*
      Od 23. 9. 2026 (audit, B-02): do veřejného kanálu jen s úředním zdrojem
      podle ADRESY (seznam úředních domén), ne podle toho, co o sobě zdroj
      napsal — a se dvěma různými doménami. Provozovatelka nemá čas každou
      zprávu číst; pravidlo proto musí být takové, aby ji číst nemusela.
    */
    .filter((n) => maUredniZdroj(n.zdroje ?? []) && domen(n.zdroje) >= 2)
    /* Stará událost není varování. Rozhoduje datum UDÁLOSTI, ne zápisu. */
    .filter((n) => n.datumUdalosti && ted - new Date(n.datumUdalosti).getTime() <= maxStari)
    .slice(0, MAX_SIGNALU_NA_BEH);
}

function domen(zdroje) {
  const d = new Set();
  for (const z of zdroje ?? []) {
    try { const h = new URL(z.url).hostname.replace(/^www\./, ""); if (h !== "news.google.com") d.add(h); } catch { /* neplatná adresa se nepočítá */ }
  }
  return d.size;
}

export function sestavVaznyNavrh(n) {
  const uredni = (n.zdroje ?? []).filter((z) => maUredniZdroj([z]));
  const radky = [
    "\u26a0\ufe0f <b>Vážný případ — oznámil úřad, zpracováno automaticky</b>",
    "",
    `<b>${esc(zkrat(n.kratkyTitulek || n.titulek, 90))}</b>`,
  ];
  if (n.fakta?.[0]) radky.push("", esc(zkrat(n.fakta[0], 280)));
  if (n.neznameho?.[0]) radky.push(`<b>Nepotvrzeno:</b> ${esc(zkrat(n.neznameho[0], 180))}`);
  radky.push(
    "",
    `Zdroje: ${(n.zdroje ?? []).length}, z toho úřední ${uredni.length}`,
    ...(n.zdroje ?? []).slice(0, 3).map((z) => `• <a href="${esc(z.url)}">${esc(zkrat(z.nazev, 110))}</a>`),
    ...[radekSpektra(n.zdroje)].filter(Boolean),
    "",
    "Stojí na úředním zdroji a dalším nezávislém zdroji. Hodnocení projektu u něj zatím není.",
    `CzechPatrol · ${datumCz(new Date().toISOString())}`,
  );
  return radky.join("\n");
}

export function sestavSignal(k) {
  const co = NAZVY_SIGNALU[k.naliehave?.druh] ?? "sledovaná událost";
  /* Prázdné řádky jsou tu schválně — na telefonu se ta zpráva musí dát přelétnout. */
  const radky = ["\u26a0\ufe0f <b>Jen pro správce — neověřený signál</b>", "", `<b>${esc(k.titulek)}</b>`];
  if (k.shrnuti) radky.push(esc(zkrat(k.shrnuti, 220)));
  radky.push(
    "",
    `Téma: ${esc(co)}${k.zeme ? ` · ${esc(k.zeme)}` : ""}`,
    `Zdroj: <a href="${esc(k.zdroj.url)}">${esc(k.zdroj.nazev)}</a> <i>(${NAZVY_SPEKTRA[spektrumKandidata(k)]})</i>`,
    "",
    "Zachytil to automatický sběr. <b>Neověřil to zatím člověk</b> — není to potvrzené a do žádných počtů na webu to nevstupuje. Posíláme to proto, že u téhle věci je každá hodina znát.",
    "",
    `${WEB}/udalosti/?tab=cekajici`,
  );
  return radky.join("\n");
}

/*
  Denní přehled toho, co sběr zachytil.

  Do kanálu dosud chodily jen zveřejněné záznamy — tedy to, co prošlo lidským
  ověřením. Když pár dní nikdo nic nezveřejnil, kanál mlčel, přestože sběr
  mezitím zachytil desítky zpráv. Zvenčí to vypadá jako klid, a to je ta
  nejhorší věc, jakou může bezpečnostní přehled předstírat.

  Přehled proto odchází jednou denně se souhrnem a jen tehdy, když ten den
  neodešel žádný ověřený záznam. Je označený jako neověřený, každá položka má
  odkaz na zdroj a je jich nejvýš pět.
*/
const MAX_V_PREHLEDU = 5;

export function vyberDoPrehledu(kandidati, { ted = Date.now(), hodin = 24 } = {}) {
  const od = ted - hodin * 3_600_000;
  return (kandidati ?? [])
    .filter((k) => new Date(k.publikovano ?? k.zachyceno).getTime() >= od)
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, MAX_V_PREHLEDU);
}

export function sestavPrehledZachycenych(kandidati, { ted = Date.now() } = {}) {
  const radky = [
    "\u{1F4E1} <b>Co zachytil sběr za posledních 24 hodin</b>",
    "",
    "<b>Nic z toho zatím neověřil člověk.</b> Je to seznam zpráv, které prošly sítem a čekají na kontrolu — ne potvrzené případy. Do počtů na webu nevstupují.",
    "",
  ];
  for (const k of kandidati) {
    radky.push(`• <a href="${esc(k.zdroj.url)}">${esc(zkrat(k.titulek, 120))}</a>${k.zeme ? ` — ${esc(k.zeme)}` : ""} <i>(${NAZVY_SPEKTRA[spektrumKandidata(k)]})</i>`);
  }
  radky.push("", `${WEB}/udalosti/?tab=cekajici`);
  return radky.join("\n");
}

/*
  Přehled dne — česky, ráno a večer, vždycky.

  Proč vznikl: do kanálu chodilo jen to, co prošlo ověřením. Když se pár dní
  nic neověřilo, kanál mlčel — a večer přišel jediný „přehled zachycených"
  s pěti titulky tak, jak je zdroje vydaly, tedy z větší části anglicky.
  Odběratel se z toho nedozvěděl, co se děje, a ještě to četl v cizím jazyce.

  Přehled dne skládá česky to, co web ví, i když nic nového neprošlo
  ověřením:
    1. co se změnilo — úřední stavy z archivu, cena paliva, služby,
    2. nepotvrzené záznamy — zpracované ze zdrojů, s českým titulkem,
       jasně označené, s odkazem na web,
    3. co sběr zachytil — česky psané titulky jmenovitě, cizojazyčné jen
       počtem s odkazem na frontu. Cizí titulek se nepřekládá, protože
       překladač nemáme; posílat ho v originále je horší než ho spočítat.

  Odchází dvakrát denně (ráno a večer); ověřené záznamy chodí dál zvlášť.
*/
const MAX_NAVRHU_V_PREHLEDU = 5;
const MAX_CESKYCH_ZACHYCENYCH = 4;
/** Návrh starší než týden už není novinka, i když ho nikdo neposlal. */
const NAVRH_NEJVYS_DNI = 7;

/** Text psaný česky? Hlídá se česká diakritika a vylučují se polské a německé znaky. */
export function jeCesky(text) {
  const t = String(text ?? "");
  if (/[ěřůňťď]/i.test(t)) return true;
  if (/[łąęśźż]/i.test(t) || /[äöüß]/i.test(t)) return false;
  return /[áéíýúž]/i.test(t) && /\b(a|v|ve|na|se|je|z|ze|o|k|do|po|za|pro|při|u)\b/i.test(t);
}

/*
  Přehled chodí v 7:30 a 19:30 PRAŽSKÉHO času (28. 9. 2026, přání
  provozovatelky). Cron na GitHubu zná jen UTC, a tak běží dvakrát
  (v letním i zimním posunu) a o tom, jestli je čas, rozhoduje tenhle
  výpočet. Zbytečný běh skončí hned; přehled se pozná podle klíče dne
  a části dne, takže dvakrát neodejde.
*/
const PRAHA = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
export function prazskyCas(ted = Date.now()) {
  const c = Object.fromEntries(PRAHA.formatToParts(new Date(ted)).map((x) => [x.type, x.value]));
  return { den: `${c.year}-${c.month}-${c.day}`, hodina: Number(c.hour), minuta: Number(c.minute) };
}

/** Jméno části dne podle pražského času: do 13:00 ranní přehled, potom večerní. */
export function castDne(ted = Date.now()) {
  return prazskyCas(ted).hodina < 13 ? "rano" : "vecer";
}

/**
 * Je čas na přehled? Od 7:15 do poledne ranní, od 19:15 do půlnoci večerní.
 * Spodní mez chytí běh v 7:30 (cron se spíš zpozdí, než předběhne) a pustí
 * zimní běh v 6:30 naprázdno; horní mez dovolí dohnat zpožděný běh.
 */
export function jeCasPrehledu(ted = Date.now()) {
  const { hodina, minuta } = prazskyCas(ted);
  const m = hodina * 60 + minuta;
  return (m >= 7 * 60 + 15 && m < 12 * 60) || (m >= 19 * 60 + 15 && m < 24 * 60);
}

export function vyberNavrhyDoPrehledu(navrhy, stav, { ted = Date.now() } = {}) {
  const poslane = stav.navrhy ?? {};
  const signaly = stav.signaly ?? {};
  return (navrhy ?? [])
    .filter((n) => (n.kam ?? "zaznam") === "zaznam" && n.id && !poslane[n.id] && !signaly[n.id])
    /* Dva nezávislé zdroje. Jeden článek je zachycená zpráva, ne záznam k ohlášení. */
    .filter((n) => (n.zdroje ?? []).length >= 2)
    .filter((n) => n.titulek && jeCesky(n.kratkyTitulek || n.titulek))
    .filter((n) => n.pripraveno && ted - new Date(n.pripraveno).getTime() <= NAVRH_NEJVYS_DNI * 86_400_000)
    .sort((a, b) => String(b.pripraveno).localeCompare(String(a.pripraveno)))
    .slice(0, MAX_NAVRHU_V_PREHLEDU);
}

/** Změny úředního stavu za posledních 24 hodin — bez počtu záznamů a bez změn pokrytí. */
/*
  Směr změny — kopie pravidla ze src/lib/smer.ts (skript neumí načíst
  TypeScript). Změna tam = změna tady; testy hlídají obojí.
*/
const STUPNICE_SMERU = [
  { "běžný provoz": 0, sledujeme: 1, narušeno: 2 },
  { NE: 0, ANO: 1 },
  { neaktivní: 0, aktivováno: 1 },
  { "Nízká": 0, "Mírně zvýšená": 1, "Střední": 2, "Zvýšená": 3, "Vysoká": 4, "Vážná": 5 },
];
export function smerZmeny(text) {
  const m = String(text).trim().match(/^(.*?): (.+?) \u2192 (.+)$/u);
  if (!m) return "neutral";
  const od = m[2].trim(), do_ = m[3].trim();
  for (const s of STUPNICE_SMERU) {
    if (od in s && do_ in s) return s[do_] > s[od] ? "zhorseni" : s[do_] < s[od] ? "zlepseni" : "neutral";
  }
  return "neutral";
}

export function zmenyStavuZaDen(archiv, { ted = Date.now(), hodin = 24 } = {}) {
  const od = ted - hodin * 3_600_000;
  return (archiv?.snimky ?? [])
    .filter((s) => new Date(s.kdy).getTime() >= od)
    .flatMap((s) => (s.zmeny ?? []).filter((z) => !/^(zveřejněné události|začátek archivu)/.test(z) && !/bez ověřeného zdroje|neověřeno/.test(z)));
}

/** Poslední týden cen, je-li čerstvý (šetření do sedmi dnů). Jinak nic — stará cena není novinka. */
export function palivoDoPrehledu(palivo, { ted = Date.now() } = {}) {
  const rada = (palivo?.rada ?? []).filter((t) => typeof t.nafta === "number" && typeof t.benzin95 === "number");
  if (rada.length < 2) return null;
  const t = rada[rada.length - 1], p = rada[rada.length - 2];
  if (ted - new Date(`${t.konec}T12:00:00Z`).getTime() > 7 * 86_400_000) return null;
  const kc = (n) => n.toFixed(2).replace(".", ",");
  const roz = (n) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${kc(Math.abs(n))}`;
  return `Palivo za litr: nafta ${kc(t.nafta)} Kč (${roz(t.nafta - p.nafta)} za týden), benzin 95 ${kc(t.benzin95)} Kč (${roz(t.benzin95 - p.benzin95)}) — ČSÚ, týden do ${datumCz(`${t.konec}T12:00:00Z`)}`;
}

function ctiSluzby() {
  const soubor = path.join(koren, "data", "sluzby.json");
  if (!fs.existsSync(soubor)) return null;
  try { return JSON.parse(fs.readFileSync(soubor, "utf-8")); } catch { return null; }
}

/** Služby s hlášením provozovatele. V pořádku se nevypisují — ticho tu znamená ticho. */
export function sluzbyDoPrehledu(snimek) {
  const NAZVY = { cloudflare: "Cloudflare", zoom: "Zoom", discord: "Discord" };
  return (snimek?.stavy ?? [])
    .filter((s) => s.stav === "vypadek" || s.stav === "omezeni")
    .map((s) => `${NAZVY[s.klic] ?? s.klic}: ${s.stav === "vypadek" ? "výpadek" : "omezení"}${s.incidenty?.[0]?.nazev ? ` — ${s.incidenty[0].nazev}` : ""} (stavová stránka provozovatele)`);
}

/** Od jaké závažnosti je nepotvrzený záznam „kritický" pro čelo přehledu: O1 = 7 z 10. */
const KRITICKE_OD = 7;
const MAX_KRITICKYCH = 3;

/** Řádek nepotvrzeného záznamu: datum události, odkaz na web, závažnost, počet zdrojů. */
function radekNavrhu(n) {
  const uredni = (n.zdroje ?? []).filter((z) => z.primarni === true || z.typ === "primary").length;
  /* Datum události, ne zpracování — jinak by se týden stará věc četla jako dnešní. */
  const kdy = n.datumUdalosti ? `${datumCz(n.datumUdalosti)} · ` : "";
  const zav = n.zavaznost && Z_DESETI[n.zavaznost] ? ` · závažnost ${Z_DESETI[n.zavaznost]} z 10` : "";
  const spektrum = radekSpektra(n.zdroje);
  return `• ${kdy}<a href="${WEB}/nepotvrzeno/${esc(n.id)}/">${esc(zkrat(n.kratkyTitulek || n.titulek, 110))}</a>${zav} · zdrojů ${(n.zdroje ?? []).length}${uredni ? `, z toho úřední ${uredni}` : ", bez úředního"}${spektrum ? `\n   ${spektrum}` : ""}`;
}

/*
  Pořadí přehledu: nejdřív to nejkritičtější, co sběr zachytil, pak ověřené,
  pak neověřené. Kdo přehled jen přelétne, má nejzávažnější věc nahoře —
  a hned u ní, jestli je ověřená, nebo ne.
*/
/*
  Přehled dne s neověřenými návrhy a zachycenými titulky do kanálu od
  28. 9. 2026 nechodí — provozovatelka chtěla zpět klasický přehled
  ověřených záznamů (sestavSouhrn). Sestavení zůstává, testy ho drží
  pro případ návratu.
*/
export function sestavPrehledDne({ ted = Date.now(), cast = castDne(ted), zmeny = [], palivo = null, sluzby = [], navrhy = [], overene = [], kandidati = [], posledniSber = null } = {}) {
  const od = ted - 24 * 3_600_000;
  const zachycene = (kandidati ?? []).filter((k) => new Date(k.publikovano ?? k.zachyceno).getTime() >= od);
  const ceskeVse = zachycene.filter((k) => jeCesky(k.titulek));
  const ceske = ceskeVse.slice(0, MAX_CESKYCH_ZACHYCENYCH);
  const cizich = zachycene.length - ceskeVse.length;
  const kCesku = zachycene.filter((k) => k.kodZeme === "CZ").length;

  /* Kritické = nepotvrzené záznamy od vysoké závažnosti, nejvýš tři, nejzávažnější první. */
  const kriticke = [...navrhy]
    .filter((n) => (Z_DESETI[n.zavaznost] ?? 0) >= KRITICKE_OD)
    .sort((a, b) => (Z_DESETI[b.zavaznost] ?? 0) - (Z_DESETI[a.zavaznost] ?? 0))
    .slice(0, MAX_KRITICKYCH);
  const kritickeId = new Set(kriticke.map((n) => n.id));
  const ostatniNavrhy = navrhy.filter((n) => !kritickeId.has(n.id));

  const radky = [
    `\u{1F4F0} <b>CzechPatrol · přehled ${cast === "rano" ? "ráno" : "večer"} ${datumCz(new Date(ted).toISOString())}</b>`,
    "",
  ];

  /* Klíčová věta: co dnes platí v Česku. Bez ní by přehled začínal výčtem. */
  /* Zlepšení se říká stejně nahlas jako zhoršení — a jako první, když je jediné. */
  const zlepseni = zmeny.filter((z) => smerZmeny(z) === "zlepseni").length;
  const zhorseni = zmeny.filter((z) => smerZmeny(z) === "zhorseni").length;
  /*
    Dřív tu natvrdo stálo „Mobilizace ne, vycestování bez omezení, hranice
    v běžném režimu" — i když sběr stál a úřední seznam nečteme úplně
    (audit 23. 9. 2026). Teď jen to, co víme: žádnou změnu jsme nenašli.
  */
  const stary = !posledniSber || ted - new Date(posledniSber).getTime() > 3 * 3_600_000;
  const klic = stary
    /* Technická věta, ne poplach (26. 9. 2026): bez výstražného znaku a s tím, že o bezpečnosti nic neříká. */
    ? `Údaje nejsou čerstvé — poslední úspěšná kontrola zdrojů ${posledniSber ? datumCz(posledniSber) : "neznámo kdy"}. O bezpečnostní situaci to nic neříká; oficiální informace dávají HZS, ČHMÚ, obec a policie, v nouzi 112.`
    : !zmeny.length
    ? "V kontrolovaných úředních zdrojích jsme nenašli žádnou změnu stavu v Česku."
    : zlepseni && !zhorseni
      ? `Úřední stav se zlepšil (${zlepseni}) — viz níže.`
      : zhorseni && !zlepseni
        ? `Úřední stav se zhoršil (${zhorseni}) — viz níže.`
        : `Úřední stav se změnil: ${zlepseni} zlepšení, ${zhorseni} zhoršení — viz níže.`;
  radky.push(`<b>${klic}</b>`, "");

  const znacka = (z) => (smerZmeny(z) === "zlepseni" ? "✅ " : smerZmeny(z) === "zhorseni" ? "⚠️ " : "");
  const coSeZmenilo = [...zmeny.map((z) => `• ${znacka(z)}${esc(z)}`), ...(palivo ? [`• ${esc(palivo)}`] : []), ...sluzby.map((x) => `• ${esc(x)}`)];
  if (coSeZmenilo.length) radky.push("<b>Co se změnilo</b>", ...coSeZmenilo, "");

  /* 1. nejkritičtější za sběr — neověřené, ale nahoře, protože závažnost nečeká na razítko */
  radky.push("\u{1F534} <b>Nejkritičtější za sběr</b>" + (kriticke.length ? " — neověřeno, zpracované ze dvou zdrojů" : ""));
  if (kriticke.length) for (const n of kriticke) radky.push(radekNavrhu(n));
  else radky.push("• nic od vysoké závažnosti výš");
  radky.push("");

  /* 2. ověřené — to, za čím projekt stojí */
  radky.push("✅ <b>Ověřené záznamy za 24 h</b>" + (overene.length ? "" : ": žádný"));
  for (const i of overene) {
    const kdy = i.datumUdalosti ? `${datumCz(i.datumUdalosti)} · ` : "";
    const zav = Z_DESETI[i.zavaznost] ? ` · závažnost ${Z_DESETI[i.zavaznost]} z 10` : "";
    const spektrum = radekSpektra(i.zdroje);
    radky.push(`• ${kdy}<a href="${WEB}/incident/${esc(i.slug)}/">${esc(zkrat(i.kratkyTitulek || i.titulek, 110))}</a>${zav}${spektrum ? `\n   ${spektrum}` : ""}`);
  }
  radky.push("");

  /* 3. neověřené — zpracované záznamy a česky psané zachycené zprávy */
  radky.push("⚪ <b>Neověřené</b> — zpracované ze zdrojů, zatím bez potvrzení. Do počtů nevstupují.");
  for (const n of ostatniNavrhy) radky.push(radekNavrhu(n));
  radky.push(`<b>Zachyceno sběrem za 24 h:</b> ${zachycene.length} ${zachycene.length === 1 ? "zpráva" : zachycene.length < 5 ? "zprávy" : "zpráv"}${kCesku ? `, k Česku ${kCesku}` : ""}.`);
  for (const k of ceske) radky.push(`• <a href="${esc(k.zdroj.url)}">${esc(zkrat(k.titulek, 110))}</a>${k.zeme ? ` — ${esc(k.zeme)}` : ""} <i>(${NAZVY_SPEKTRA[spektrumKandidata(k)]})</i>`);
  if (cizich) radky.push(`• dalších ${cizich} ze zahraničních zdrojů v původním jazyce: ${WEB}/udalosti/?tab=cekajici`);
  radky.push("", `Celý přehled: ${WEB}/`);
  return radky.join("\n");
}

/*
  Tipy k přípravě.

  Do kanálu jdou stejně jako ostatní zprávy: jednou, s odkazem na zdroj.
  Není to výstraha ani signál — je to věc, kterou se vyplatí vědět dřív, než
  bude potřeba. Proto chodí i ve chvíli, kdy se nic neděje, a proto nejvýš
  jeden za běh: kdyby jich přišlo pět naráz, nikdo si nepřečte ani jeden.
*/
export function ctiTipy() {
  const soubor = path.join(koren, "data", "tipy.json");
  if (!fs.existsSync(soubor)) return [];
  try { return JSON.parse(fs.readFileSync(soubor, "utf-8")); } catch { return []; }
}

/** Nejvýš jeden tip za tolik hodin — tip je služba, ne proud zpráv. */
const TIP_KAZDYCH_H = 20;

/*
  `znovu` (datum) u tipu = poslat ho ještě jednou, i když už odešel dřív
  (28. 9. 2026: tip o rádiích s ASA, doplněný o modely). Odejde jednou
  po tom datu; stav si pamatuje, kdy naposledy.
*/
const tipCeka = (t, poslane) => !poslane[t.klic] || (t.znovu && String(poslane[t.klic].kdy ?? "") < t.znovu);

export function vyberTip(tipy, stav, { ted = Date.now() } = {}) {
  const poslane = stav.tipy ?? {};
  const posledni = Math.max(0, ...Object.values(poslane).filter((x) => !x?.ticho).map((x) => new Date(x?.kdy ?? 0).getTime() || 0));
  if (ted - posledni < TIP_KAZDYCH_H * 3_600_000) return null;
  return (tipy ?? [])
    .filter((t) => t?.klic && tipCeka(t, poslane))
    .filter((t) => (t.zdroje ?? []).some((z) => /^https?:\/\//.test(z?.url ?? "")))
    .filter((t) => !t.platiDo || new Date(t.platiDo).getTime() > ted)
    .sort((a, b) => String(b.kdy).localeCompare(String(a.kdy)))[0] ?? null;
}

export function sestavTip(t) {
  const radky = [
    "\u{1F4A1} <b>Tip k přípravě</b>",
    "",
    `<b>${esc(t.nadpis)}</b>`,
    esc(t.text),
    "",
  ];
  for (const z of t.zdroje ?? []) radky.push(`Zdroj: <a href="${esc(z.url)}">${esc(z.nazev)}</a>`);
  radky.push("", WEB);
  return radky.join("\n");
}

/** Ceny paliv. Chybějící soubor není chyba — jen se o palivu nic neřekne. */
function ctiPalivo() {
  const soubor = path.join(koren, "data", "palivo.json");
  if (!fs.existsSync(soubor)) return null;
  try { return JSON.parse(fs.readFileSync(soubor, "utf-8")); } catch { return null; }
}

function ctiStav() {
  if (!fs.existsSync(STAV)) return { zaznamy: {}, snimky: {}, palivo: {}, vystrahy: {}, signaly: {}, tipy: {}, prehledy: {}, navrhy: {}, prvniBeh: null };
  try {
    const s = JSON.parse(fs.readFileSync(STAV, "utf-8"));
    // Starší stav pole „palivo", „vystrahy", „signaly" a „navrhy" nemá; bez doplnění by první zápis spadl.
    return { palivo: {}, vystrahy: {}, signaly: {}, tipy: {}, prehledy: {}, navrhy: {}, ...s };
  } catch { return { zaznamy: {}, snimky: {}, palivo: {}, vystrahy: {}, signaly: {}, tipy: {}, prehledy: {}, navrhy: {}, prvniBeh: null }; }
}
function zapisStav(s) {
  fs.mkdirSync(path.dirname(STAV), { recursive: true });
  fs.writeFileSync(STAV, JSON.stringify(s, null, 2) + "\n", "utf-8");
}

/*
  Kudy záznam do kanálu půjde (28. 9. 2026, přání provozovatelky):
  „Nechci spamovat každou novinku.“ Průběžně jen to, co se reálně týká lidí
  v Česku nebo vážně zhoršuje situaci; ostatní v přehledu v 7:30 a 19:30.

  - „hned“ — celá zpráva ihned: vážný případ (O, R), úřední opatření platné
    v Česku, článek 4 nebo 5 NATO v titulku.
  - „kratce“ — malý signál (případ se žlutou závažností, třeba poškozená
    ostraha lotyšské hranice): dvouřádková zpráva, nejvýš jedna za 4 hodiny.
    Co se do okna nevejde, počká na přehled.
  - „prehled“ — všechno ostatní: opatření v cizině, reakce, nízká
    závažnost.

  Pravidlo je opsané v src/lib/kam-odejde.ts (Správa ho ukazuje u tlačítka
  Schválit); testy/kam-odejde.test.ts hlídá, aby se nerozešla.
*/
const CLANEK_4_5 = /(^|[^\p{L}])(čl\.|článe?k\p{L}*|article)\s*[45](?!\d)/iu;
export function cestaZaznamu(i) {
  const d = druh(i);
  if (CLANEK_4_5.test(`${i.titulek ?? ""} ${i.kratkyTitulek ?? ""}`)) return "hned";
  if (d === "pripad" && vazne(i)) return "hned";
  if (d === "opatreni" && dulezitePro(i)) return "hned";
  if (d === "pripad" && /^Y/.test(i.zavaznost ?? "")) return "kratce";
  return "prehled";
}

/** Nejvýš jeden malý signál za tolik hodin. */
export const KRATCE_KAZDYCH_H = 4;
/** Starší malý signál už průběžně nejde — počká na přehled. */
const KRATCE_NEJVYS_H = 12;

/**
 * Smí záznam do veřejného kanálu? Ověřený (člověkem, nebo dvěma zdroji
 * s úředním) — a bez privilegovaného pokynu, pokud ho neschválil člověk.
 * Pokyn („evakuujte“, „nepijte vodu“, „nebezpečí pominulo“) v textu, který
 * napsal automat, do kanálu nikdy (29. 9. 2026, bezpečnostní specifikace).
 */
export const overeny = (i) =>
  (i.lidskyOvereno || i.overeni === "automaticke") &&
  (i.lidskyOvereno === true || privilegovanePokyny(textyZaznamu(i)).length === 0);

/**
 * Tiché zapamatování starého a archivního. Vrací true, když se záznam jen
 * zapamatoval (a nemá se posílat).
 */
function jenZapamatuj(i, stav, ted) {
  const doposlat = stav.zaznamy[i.id]?.doposlat === true;
  if (doposlat || stav.zaznamy[i.id]) return false;
  const prvni = !stav.prvniBeh;
  const zjisteno = new Date(kdyZjisteno(i)).getTime();
  /*
    Zpětně doplněná osa a staré události nejsou novinka: jen se zapamatují,
    aby kanál nezaplavil archiv. Rozhoduje stáří UDÁLOSTI, ne datum, kdy
    jsme ji zapsali — jinak by případ z loňska odešel jako čerstvá zpráva
    jen proto, že jsme ho doplnili dnes.
  */
  if (jeArchivni(i, ted) || zjisteno < ted - NEJSTARSI_DNI * 86_400_000 || (prvni && zjisteno < ted - PRVNI_BEH_DNI * 86_400_000)) {
    stav.zaznamy[i.id] = { kdy: new Date(ted).toISOString(), historie: i.historie?.length ?? 0, ticho: true };
    return true;
  }
  return false;
}

/**
 * Vybere, co odeslat.
 *
 * `okamzite` = jen cesta „hned“ (nové záznamy a nová zjištění k nim).
 * `souhrn` = přehled: všechno ověřené, co ještě v žádném přehledu nebylo —
 * i to, co už odešlo průběžně, aby přehled byl úplný. Záznamy, které
 * odešly před touhle úpravou (bez `cesta`), se do přehledu nevracejí.
 *
 * Vedlejším účinkem označí za oznámené to, co se jen tiše zapamatovalo.
 * Doposlání: u záznamu ve stavu stačí `doposlat: true` (tak se 23. 9. 2026
 * doposílaly WB Electronics a Porvoo).
 */
export function vyberNove(zaznamy, stav, { rezim, ted = Date.now() }) {
  const vybrane = [];
  for (const i of zaznamy) {
    if (!overeny(i)) continue;
    if (jenZapamatuj(i, stav, ted)) continue;
    const doposlat = stav.zaznamy[i.id]?.doposlat === true;
    const z = doposlat ? undefined : stav.zaznamy[i.id];
    const historie = i.historie?.length ?? 0;
    const vice = z && historie > (z.historie ?? 0) && druh(i) === "pripad";
    if (rezim === "okamzite") {
      if (cestaZaznamu(i) !== "hned") continue;
      if (!z) vybrane.push({ i, aktualizace: false });
      else if (vice) vybrane.push({ i, aktualizace: true });
    } else {
      if (!z) vybrane.push({ i, aktualizace: false });
      else if (z.cesta && !z.prehled) vybrane.push({ i, aktualizace: false });
      else if (vice) vybrane.push({ i, aktualizace: true });
    }
  }
  return vybrane;
}

/**
 * Jeden malý signál, pokud od posledního uběhly 4 hodiny. Nejdřív to
 * nejzávažnější, při shodě nejnovější. Ostatní počkají na přehled.
 */
export function vyberKratky(zaznamy, stav, { ted = Date.now() } = {}) {
  const posledni = stav.kratce?.posledni ? new Date(stav.kratce.posledni).getTime() : 0;
  if (ted - posledni < KRATCE_KAZDYCH_H * 3_600_000) return null;
  return zaznamy
    .filter((i) => overeny(i) && !stav.zaznamy[i.id] && cestaZaznamu(i) === "kratce")
    .filter((i) => !jenZapamatuj(i, stav, ted))
    .filter((i) => ted - new Date(kdyZjisteno(i)).getTime() <= KRATCE_NEJVYS_H * 3_600_000)
    .sort((a, b) => vaha(b) - vaha(a) || (Z_DESETI[b.zavaznost] ?? 0) - (Z_DESETI[a.zavaznost] ?? 0) || kdyZjisteno(b).localeCompare(kdyZjisteno(a)))[0] ?? null;
}

/** Malý signál na dva řádky: puntík a titulek, pak odkaz na celý záznam se zdroji. */
export function sestavKratky(i) {
  return [
    `${tecka(i)} <b>${esc(zkrat(String(i.titulek || i.kratkyTitulek), 200))}</b>`,
    `Podrobnosti a zdroje: ${WEB}/incident/${i.slug}/`,
  ].join("\n");
}

/** Přehled bez nových záznamů — i to je zpráva: kanál žije a nic nového nepřibylo. */
export function sestavPrazdnyPrehled({ ted = Date.now(), cast = castDne(ted) } = {}) {
  return [
    `<b>CzechPatrol · ${cast === "rano" ? "ranní" : "večerní"} přehled ${datumCz(new Date(ted).toISOString())}</b>`,
    "Od minulého přehledu žádný nový ověřený záznam.",
    "",
    `${WEB}/`,
  ].join("\n");
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

/*
  `komu` rozlišuje veřejný kanál a soukromou zprávu správci.

  Testovací zpráva nemá chodit odběratelům. Dokud šla jen do kanálu, nedalo
  se vyzkoušet, jestli bot umí napsat správci — a to je přesně ta cesta,
  kterou se hlásí výpadek sběru. Ověřit ji až ve chvíli, kdy výpadek nastane,
  je pozdě.
*/
async function posliTelegram(text, { nahled = true, pokusu = 3, komu = "kanal" } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const kanal = komu === "spravce"
    ? process.env.SPRAVCE_CHAT
    : process.env.TELEGRAM_KANAL || "@czechpatrol";
  if (!token) return { ok: false, chyba: "chybí TELEGRAM_BOT_TOKEN" };
  if (!kanal) return { ok: false, chyba: komu === "spravce" ? "není nastaven SPRAVCE_CHAT" : "není nastaven TELEGRAM_KANAL" };

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

/** Vrátí záznam o pozastavení, nebo null, když kanál běží. */
export function pozastaveno(soubor = path.join(koren, "data", "fronta", "rozhlas-pozastaveno.json")) {
  try {
    const d = JSON.parse(fs.readFileSync(soubor, "utf-8"));
    return d && d.pozastaveno === true ? d : null;
  } catch {
    return null;
  }
}

async function main() {
  const arg = process.argv.slice(2);
  const rezim = arg.includes("--souhrn") ? "souhrn" : "okamzite";
  const nacisto = arg.includes("--nacisto");
  const test = arg.includes("--test");
  const posli = async (text, volby) => (nacisto ? (console.log("---\n" + text), { ok: true }) : posliTelegram(text, volby));

  /*
    Pozastavení kanálu (27. 9. 2026, úprava formátu zpráv). Vypínač je
    soubor v repozitáři, ne nastavení na GitHubu: vidí ho každý, kdo čte
    kód, a obnovení je jeden commit. Nic se neoznačí jako odeslané, takže
    po obnovení se neztratí žádný záznam. Zkouška správci a náhled
    (--nacisto) jdou dál — na nich se nový formát ladí.
  */
  const pauza = pozastaveno();
  if (pauza && !nacisto && !(test && arg.includes("--test-spravce"))) {
    console.log(`[rozhlas] POZASTAVENO od ${pauza.od ?? "?"} (${pauza.duvod ?? "bez důvodu"}) — do kanálu se nic neposílá. Obnovení: smazat data/fronta/rozhlas-pozastaveno.json.`);
    return;
  }

  const zaznamy = JSON.parse(fs.readFileSync(path.join(koren, "data", "incidenty.json"), "utf-8"))
    .sort((a, b) => kdyZjisteno(a).localeCompare(kdyZjisteno(b)));

  if (test) {
    /*
      `--test-spravce` pošle zprávu soukromě správci, ne do kanálu.
      Odběratelé nemají důvod číst, že si někdo zkouší nastavení.
    */
    const komu = arg.includes("--test-spravce") ? "spravce" : "kanal";
    // Ukázkou je poslední ověřený záznam — na výmyslu by se formát ověřit nedal.
    const ukazka = [...zaznamy].reverse().find((i) => i.lidskyOvereno && druh(i) === "pripad");
    const text = komu === "spravce"
      ? [
          "<b>Zkouška spojení</b>",
          "",
          "Tuhle zprávu poslal hlídač sběru, aby se ověřilo, že ti bot umí napsat.",
          "Nic se nestalo a nic nedělej — je to jen zkouška.",
          "",
          "Až sběr opravdu vypadne, přijde sem hlášení se stejnou cestou: po třech hodinách bez úspěšného sběru.",
        ].join("\n")
      : sestavTest(ukazka);
    const v = await posli(text, { komu });
    console.log(v.ok ? `test odeslán (${komu})` : `test selhal (${komu}): ${v.chyba}`);
    process.exit(v.ok ? 0 : 1);
  }
  const iMimoradne = arg.indexOf("--mimoradne");
  if (iMimoradne !== -1) {
    /*
      Jednorázově a jen jednou: stav si pamatuje, co odešlo mimořádně, takže
      opakované spuštění (nebo dvojklik v Actions) nepošle zprávu dvakrát.
      Záznam se zároveň zapíše mezi odeslané, aby ho běžný rozhlas po
      pozdějším ověření neposlal znovu jako novinku.
    */
    const slug = arg[iMimoradne + 1];
    const i = zaznamy.find((z) => z.slug === slug);
    if (!i) { console.error(`[rozhlas] mimořádná: záznam „${slug}" není zveřejněný`); process.exit(1); }
    if (!process.env.TELEGRAM_BOT_TOKEN && !nacisto) { console.error("[rozhlas] CHYBÍ TELEGRAM_BOT_TOKEN — nic se neodeslalo"); process.exit(1); }
    const stav = ctiStav();
    stav.mimoradne ??= {};
    if (stav.mimoradne[i.id]) { console.log(`[rozhlas] mimořádná k „${slug}" už odešla ${stav.mimoradne[i.id].kdy}`); return; }
    let ok = true, messageId = null;
    for (const [n, dil] of rozdelZpravu(sestavMimoradnou(i)).entries()) {
      const v = await posli(dil, { nahled: n === 0 });
      if (!v.ok) { ok = false; console.error(`[rozhlas] mimořádná neodešla: ${v.chyba}`); break; }
      messageId ??= v.messageId ?? null;
    }
    if (!ok) process.exit(1);
    const kdy = new Date().toISOString();
    stav.mimoradne[i.id] = { kdy, slug, messageId };
    stav.zaznamy[i.id] ??= { kdy, historie: i.historie?.length ?? 0, mimoradne: true };
    if (!nacisto) zapisStav(stav);
    console.log(`[rozhlas] mimořádná zpráva odeslána: ${slug}`);
    return;
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

  /* 0a. mimořádné zprávy z fronty v datech — před vším ostatním kromě výstrahy. */
  if (rezim === "okamzite" && !prvniBeh) {
    for (const { f, i } of vyberMimoradne(ctiFrontuMimoradnych(), zaznamy, stav)) {
      const text = f.styl === "vyjasneni" ? sestavVyjasneni(i, f.nadpis) : sestavMimoradnou(i);
      let ok = true, messageId = null;
      for (const [n, dil] of rozdelZpravu(text).entries()) {
        const v = await posli(dil, { nahled: n === 0 });
        if (!v.ok && !v.nejisty) { ok = false; console.log(`[rozhlas] mimořádná z fronty neodešla: ${v.chyba}`); break; }
        messageId ??= v.messageId ?? null;
      }
      if (!ok) { selhalo++; continue; }
      const kdy = new Date(ted).toISOString();
      stav.mimoradne ??= {};
      stav.mimoradne[i.id] = { kdy, slug: i.slug, styl: f.styl ?? "mimoradna", messageId };
      stav.zaznamy[i.id] ??= { kdy, historie: i.historie?.length ?? 0, cesta: "hned", messageId };
      odeslano++;
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
      /*
        Od 23. 9. 2026 (audit, B-01): neověřený signál z jediného titulku
        NIKDY do veřejného kanálu — jen správci do soukromého chatu. Titulek
        „Kreml popřel mobilizaci" by jinak odešel jako poplach (§ 357 TZ).
        Když se věc potvrdí úředně, odejde do kanálu řádnou cestou.
      */
      const v = await posli(sestavSignal(k), { nahled: false, komu: "spravce" });
      if (v.ok) { stav.signaly[k.id] = { kdy: new Date(ted).toISOString(), messageId: v.messageId ?? null }; odeslano++; }
      else { selhalo++; console.log(`[rozhlas] signál neodešel: ${v.chyba}`); }
    }
  }

  /*
    0b2. vážné případy doložené úředním zdrojem.

    Jediná cesta, kterou se do kanálu dostane něco neschváleného kromě
    naléhavých signálů. Podmínky jsou schválně úzké: vážnost O nebo R, dva
    nezávislé zdroje a aspoň jeden úřední.
  */
  if (rezim === "okamzite") {
    for (const n of vyberVazneNavrhy(ctiNavrhy(), stav, { ted })) {
      if (prvniBeh) { stav.signaly[n.id] = { kdy: new Date(ted).toISOString(), ticho: true }; continue; }
      /*
        Od 29. 9. 2026 jen SPRÁVCI, ne do veřejného kanálu. Návrh píše
        ověřovatel (model): titulek i fakt jsou jeho text a úřední adresa
        dokládá jen to, že se úřad k věci vyjádřil, ne co přesně řekl.
        Veřejně to odejde až po schválení člověkem jako záznam.
      */
      const v = await posli(sestavVaznyNavrh(n), { nahled: false, komu: "spravce" });
      if (v.ok) { stav.signaly[n.id] = { kdy: new Date(ted).toISOString(), messageId: v.messageId ?? null }; odeslano++; }
      else { selhalo++; console.log(`[rozhlas] vážný návrh neodešel: ${v.chyba}`); }
    }
  }

  // 1. změny oficiálních stavů — vždy hned
  for (const { snimek, zmeny } of vyberZmenyStavu(archiv, stav)) {
    if (prvniBeh) { stav.snimky[snimek.kdy] = { kdy: new Date(ted).toISOString(), ticho: true }; continue; }
    const v = await posli(sestavZmenuStavu(snimek, zmeny), { nahled: false });
    if (v.ok) { stav.snimky[snimek.kdy] = { kdy: new Date(ted).toISOString(), messageId: v.messageId ?? null }; odeslano++; } else { selhalo++; console.log(`[rozhlas] ${v.chyba}`); }
  }

  /*
    Cena paliv průběžně nechodí (28. 9. 2026): týdenní pohyb ceny není
    krize. Skok, který sběr naměří, jde jednou větou do přehledu. Když
    benzín opravdu dochází, je to úřední opatření nebo případ v Česku
    a jde cestou „hned“.
  */
  const palivo = ctiPalivo();
  const skok = vyberPalivo(palivo, stav);

  // 2. záznamy
  const den = prazskyCas(ted).den;
  const cast = castDne(ted);
  const klicPrehledu = `${den}-${cast}`;
  const vynutit = arg.includes("--vynutit");
  let nove = [];
  let davka = [];
  if (rezim === "okamzite") {
    nove = vyberNove(zaznamy, stav, { rezim, ted });
    davka = nove.slice(0, MAX_ZPRAV_NA_BEH);
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
      const zaznam = { kdy: new Date(ted).toISOString(), historie: i.historie?.length ?? 0, cesta: "hned" };
      if (!ok && nejisty) stav.zaznamy[i.id] = { ...zaznam, nejistyVysledek: true };
      if (ok) { stav.zaznamy[i.id] = { ...zaznam, messageId: prvniId }; odeslano += dily.length; }
      else selhalo++;
    }

    // 2b. malý signál — dva řádky, nejvýš jeden za 4 hodiny.
    const kratky = prvniBeh ? null : vyberKratky(zaznamy, stav, { ted });
    if (kratky) {
      const v = await posli(sestavKratky(kratky), { nahled: false });
      if (v.ok || v.nejisty) {
        stav.zaznamy[kratky.id] = { kdy: new Date(ted).toISOString(), historie: kratky.historie?.length ?? 0, cesta: "kratce", messageId: v.messageId ?? null };
        stav.kratce = { posledni: new Date(ted).toISOString(), id: kratky.id };
        if (v.ok) odeslano++;
      } else { selhalo++; console.log(`[rozhlas] malý signál neodešel: ${v.chyba}`); }
    }
  } else if (!prvniBeh && !(stav.prehledy ?? {})[klicPrehledu] && (vynutit || jeCasPrehledu(ted))) {
    /*
      Přehled v 7:30 a 19:30 — klasický formát (pruh puntíků, závažnost,
      co z toho plyne pro Česko, položky podle naléhavosti). Obsahuje
      všechno ověřené od minulého přehledu, i to, co odešlo průběžně.
    */
    nove = vyberNove(zaznamy, stav, { rezim, ted });
    davka = nove.slice(0, MAX_V_PREHLEDU_ZAZNAMU);
    const kusy = davka.length ? sestavSouhrn(davka, { ted, cast }).kusy : [sestavPrazdnyPrehled({ ted, cast })];
    if (skok) kusy[kusy.length - 1] += `\n\n\u26fd ${esc(skok.text.split("\n")[0])}`;
    if (nove.length > davka.length) kusy[kusy.length - 1] += `\n\nDalší záznamy (${nove.length - davka.length}) na ${WEB}/udalosti/`;
    let ok = true;
    let prvniId = null;
    for (const k of kusy) {
      const v = await posli(k, { nahled: false });
      if (v.ok) prvniId ??= v.messageId ?? null;
      else { ok = false; console.log(`[rozhlas] přehled neodešel: ${v.chyba}`); }
    }
    if (ok) {
      const kdy = new Date(ted).toISOString();
      for (const { i } of nove) stav.zaznamy[i.id] = { ...(stav.zaznamy[i.id] ?? { cesta: "prehled" }), kdy: stav.zaznamy[i.id]?.kdy ?? kdy, historie: i.historie?.length ?? 0, prehled: klicPrehledu, doposlat: undefined };
      stav.prehledy[klicPrehledu] = { kdy, zaznamu: nove.length, messageId: prvniId };
      if (skok) stav.palivo[skok.tyden] = { kdy, prehled: klicPrehledu };
      odeslano += kusy.length;
    } else selhalo++;
  } else if (rezim === "souhrn") {
    console.log(`[rozhlas] přehled ${klicPrehledu}: ${(stav.prehledy ?? {})[klicPrehledu] ? "už odešel" : "není čas (7:30 a 19:30 pražského času)"}`);
  }

  /* 3. tip k přípravě — nejvýš jeden za 20 hodin, za ostatními zprávami, ať nepředbíhá naléhavé. */
  const tip = vyberTip(ctiTipy(), stav, { ted });
  if (tip) {
    if (prvniBeh) {
      stav.tipy[tip.klic] = { kdy: new Date(ted).toISOString(), ticho: true };
    } else {
      const v = await posli(sestavTip(tip), { nahled: false });
      if (v.ok) { stav.tipy[tip.klic] = { kdy: new Date(ted).toISOString(), messageId: v.messageId ?? null }; odeslano++; }
      else { selhalo++; console.log(`[rozhlas] tip neodešel: ${v.chyba}`); }
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
