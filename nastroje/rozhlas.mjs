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
const PUVODCI = { rusko: "Rusko", ukrajina: "Ukrajina", "jiny-stat": "jiný stát", domaci: "domácí", neznamy: "neznámý" };
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

export const druh = (i) => i.druh ?? (i.puvodce ? "pripad" : "reakce");
export const kdyZjisteno = (i) => i.datumZjisteni ?? i.datumUdalosti;
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
export function zahlavi(i) {
  const d = druh(i);
  if (d !== "pripad") return `${tecka(i)} ${DRUH_SLOVA[d]}`;
  const cislo = Z_DESETI[i.zavaznost];
  const nazev = NAZVY_UROVNI[i.zavaznost] ?? i.zavaznost;
  return `${tecka(i)} Závažnost: ${cislo ?? "?"} z 10 · ${nazev.toLowerCase()}`;
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

const seTykaCr = (i) => i.kodZeme === "CZ" || (i.kategorie ?? []).includes("cr");

/**
 * Naléhavost pro řazení v souhrnu: opatření nahoru, pak podle závažnosti.
 * Poslední číslice rozhoduje jen při shodě — tam jde české dřív než zahraniční.
 */
export function vaha(i) {
  const u = i.zavaznost ?? "";
  const zaklad = druh(i) === "opatreni" ? 100
    : u.startsWith("R") ? 40 : u.startsWith("O") || u === "YO" ? 30 : u.startsWith("Y") ? 20 : 10;
  return zaklad * 10 + (seTykaCr(i) ? 1 : 0);
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
  const nic = "Žádné nové oficiální opatření pro Česko z toho neplyne.";
  if (d === "opatreni" && seTykaCr(i)) {
    // Název už začíná „ČR:“ — ve větě „Platí v Česku“ by se to opakovalo.
    const nazev = zkrat(String(i.kratkyTitulek || i.titulek).replace(/^(ČR|Česko|Česká republika)\s*[:–-]\s*/i, ""), 90);
    return `Platí v Česku: ${nazev}. Co přesně a od kdy, je v přehledu opatření.`;
  }
  const kde = nato ? "v rámci NATO" : V_ZEMI[i.kodZeme];
  if (d === "opatreni") return `Opatření platí ${kde ?? `mimo Česko (${i.zeme})`}, ne v Česku. ${nic}`;
  if (seTykaCr(i)) return `Týká se přímo Česka. ${nic}`;
  if (nato) return `Týká se NATO jako celku. ${nic}`;
  const misto = kde
    ? `${d === "reakce" ? "Týká se dění" : "Stalo se"} ${kde}, ne v Česku.`
    : `Stalo se mimo Česko (${i.zeme}).`;
  return `${misto} ${nic}`;
}

/**
 * Jedna zpráva k záznamu. Nahoře puntík a krátký titulek, hned pod ním tučně
 * to nejpodstatnější pro čtenáře, pak co se stalo, co zatím nevíme, hodnocení
 * a odkaz na celý záznam se zdroji. V souhrnu se posílá zkrácená podoba.
 */
export function sestavZpravu(i, { aktualizace = false, souhrn = false } = {}) {
  const d = druh(i);
  const kde = i.kodZeme === "CZ" ? "Česko" : i.zeme;
  const odkaz = `${WEB}/incident/${i.slug}/`;
  const udaje = [`Jistota: ${JISTOTY[i.jistota] ?? i.jistota}`];
  if (d === "pripad") {
    const potvrzen = i.atribuce === "oficialni" || i.atribuce === "domaci";
    udaje.push(`Pachatel: ${PUVODCI[i.puvodce ?? "neznamy"]}${i.puvodce && i.puvodce !== "neznamy" && !potvrzen ? " (nepotvrzeno)" : ""}`);
  }
  const radky = [
    zahlavi(i),
    `<b>${esc(zkrat(i.kratkyTitulek || i.titulek, 90))}</b>`,
    // Druh se opakuje jen u případů — u ostatních ho už nese záhlaví.
    `${esc(kde)} · ${d === "pripad" ? `${DRUHY[d]} · ` : ""}${datumCz(kdyZjisteno(i))}${aktualizace ? " · nové zjištění" : ""}`,
  ];
  if (souhrn) {
    radky.push(esc(zkrat(i.titulek, 200)), udaje.join(" · "), odkaz);
    return radky.join("\n");
  }
  const nove = aktualizace && i.historie?.length ? i.historie[i.historie.length - 1].text : null;
  radky.push("", `<b>${esc(klicovaVeta(i))}</b>`, "");
  radky.push(nove ? "Co je nového" : "Co se stalo");
  if (nove) {
    // U aktualizace je nové zjištění první; hned pod ním připomeneme, o jaký případ jde.
    radky.push(`• ${esc(zkrat(nove, 320))}`);
    radky.push(`• Případ: ${esc(zkrat(i.titulek, 200))}`);
  } else {
    radky.push(`• ${esc(zkrat(i.titulek, 260))}`);
    if (i.fakta?.[0]) radky.push(`• ${esc(zkrat(i.fakta[0], 300))}`);
  }
  if (i.neznameho?.[0]) radky.push("", "Co zatím nevíme", `• ${esc(zkrat(i.neznameho[0], 200))}`);
  radky.push("", udaje.join(" · "), "", "Celý záznam a zdroje:", odkaz);
  if (d === "opatreni" || seTykaCr(i)) radky.push(`Co v Česku právě platí: ${WEB}/#opatreni`);
  return radky.join("\n");
}

/** Nejzásadnější věta celého souhrnu: platí dnes v Česku něco nového, nebo ne. */
export function klicovaVetaSouhrnu(zaznamy) {
  const opatreniCr = zaznamy.find((i) => druh(i) === "opatreni" && seTykaCr(i));
  if (opatreniCr) return klicovaVeta(opatreniCr);
  const ceske = zaznamy.find((i) => seTykaCr(i));
  if (ceske) {
    const nazev = zkrat(String(ceske.kratkyTitulek || ceske.titulek).replace(/^(ČR|Česko|Česká republika)\s*[:–-]\s*/i, ""), 90);
    return `Přímo Česka se týká: ${nazev}. Žádné nové oficiální opatření z toho pro Česko neplyne.`;
  }
  return "Žádný z dnešních záznamů nezakládá v Česku nové oficiální opatření. Co u nás platí, je v přehledu opatření.";
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
    `<b>CzechPatrol · souhrn ${datumCz(new Date(ted).toISOString())}</b>`,
    `${pocet} ${slovo}${nejvyssi}`,
    `<i>${legendaTecek(zaznamy)}</i>`,
    "",
    `<b>${esc(klicovaVetaSouhrnu(zaznamy))}</b>`,
  ].join("\n");
  for (const p of razene) {
    const z = sestavZpravu(p.i, { aktualizace: p.aktualizace, souhrn: true });
    if ((akt + "\n\n" + z).length > limit) { kusy.push(akt); akt = z; } else akt += "\n\n" + z;
  }
  kusy.push(akt);
  return { kusy, razene };
}

/** Zpráva o změně oficiálního stavu z archivu snímků. To nejzávažnější, co kanál posílá. */
export function sestavZmenuStavu(snimek, zmeny) {
  return [
    `📋 Změna oficiálního stavu`,
    `podle úředních zdrojů · ${datumCz(snimek.kdy)}`,
    "",
    `<b>Mění se to, co oficiálně platí. Co je v platnosti právě teď, je v přehledu opatření.</b>`,
    "",
    "Co se změnilo",
    ...zmeny.map((z) => `• ${esc(z)}`),
    "",
    "Co platí teď:",
    `${WEB}/#opatreni`,
  ].join("\n");
}

/** Testovací zpráva. S ukázkou skutečného formátu, aby bylo vidět, jak zprávy vypadají. */
export function sestavTest(ukazka) {
  const radky = [
    `🧪`,
    `<b>Testovací zpráva CzechPatrol</b>`,
    "",
    `<b>Kanál je propojený. Odsud budou chodit zprávy o ověřených záznamech, každá s odkazem na zdroje.</b>`,
    "",
    "Každá zpráva začíná barevným puntíkem a závažností číslem od 1 do 10. Číslo je jen jinak zapsaná táž úroveň jako na webu, ne pravděpodobnost. V souhrnu je nahoře tolik puntíků, kolik je čeho uvnitř.",
    `<i>${PORADI_TECEK.map((t) => `${t} ${POPIS_TECKY[t]}`).join(" · ")}</i>`,
  ];
  if (ukazka) radky.push("", "Ukázka formátu:", "", sestavZpravu(ukazka));
  else radky.push("", `${WEB}/`);
  return radky.join("\n");
}

function ctiStav() {
  if (!fs.existsSync(STAV)) return { zaznamy: {}, snimky: {}, prvniBeh: null };
  try { return JSON.parse(fs.readFileSync(STAV, "utf-8")); } catch { return { zaznamy: {}, snimky: {}, prvniBeh: null }; }
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
    // Zpětně doplněná osa a staré události nejsou novinka: jen se zapamatují, aby kanál nezaplavil archiv.
    if (!z && (i.historicky || zjisteno < hraniceStari || (prvni && zjisteno < hranicePrvni))) {
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
async function posliTelegram(text, { nahled = true } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const kanal = process.env.TELEGRAM_KANAL || "@czechpatrol";
  if (!token) return { ok: false, chyba: "chybí TELEGRAM_BOT_TOKEN" };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: kanal, text, parse_mode: "HTML", disable_web_page_preview: !nahled }),
  });
  if (r.ok) return { ok: true };
  const t = await r.text().catch(() => "");
  return { ok: false, chyba: `telegram ${r.status}: ${t.slice(0, 200)}` };
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
    console.log("[rozhlas] chybí TELEGRAM_BOT_TOKEN, nic se neposílá");
    return;
  }

  const archiv = JSON.parse(fs.readFileSync(path.join(koren, "data", "historie.json"), "utf-8"));
  const stav = ctiStav();
  const ted = Date.now();
  const prvniBeh = !stav.prvniBeh;

  let odeslano = 0, selhalo = 0;

  // 1. změny oficiálních stavů — vždy hned
  for (const { snimek, zmeny } of vyberZmenyStavu(archiv, stav)) {
    if (prvniBeh) { stav.snimky[snimek.kdy] = { kdy: new Date(ted).toISOString(), ticho: true }; continue; }
    const v = await posli(sestavZmenuStavu(snimek, zmeny), { nahled: false });
    if (v.ok) { stav.snimky[snimek.kdy] = { kdy: new Date(ted).toISOString() }; odeslano++; } else { selhalo++; console.log(`[rozhlas] ${v.chyba}`); }
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
      const v = await posli(sestavZpravu(i, { aktualizace }));
      if (v.ok) { stav.zaznamy[i.id] = { kdy: new Date(ted).toISOString(), historie: i.historie?.length ?? 0 }; odeslano++; }
      else { selhalo++; console.log(`[rozhlas] ${v.chyba}`); }
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
