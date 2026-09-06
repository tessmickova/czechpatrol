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
const JISTOTY = { nizka: "nízká", stredni: "střední", vysoka: "vysoká", potvrzeno: "potvrzeno" };
const PUVODCI = { rusko: "Rusko", ukrajina: "Ukrajina", "jiny-stat": "jiný stát", domaci: "domácí", neznamy: "neznámý" };
const DRUHY = { pripad: "případ", aktualizace: "aktualizace", opatreni: "opatření", reakce: "reakce" };

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

/** Jedna zpráva k záznamu. Titulek, fakt, závažnost a jistota zvlášť, odkaz na celý záznam. */
export function sestavZpravu(i, { aktualizace = false } = {}) {
  const d = druh(i);
  const radky = [];
  radky.push(`${tecka(i)} <b>${esc(i.titulek)}</b>`);
  const kde = i.kodZeme === "CZ" ? "Česko" : i.zeme;
  radky.push(`${esc(kde)} · ${DRUHY[d]}${aktualizace ? " · nové zjištění" : ""} · ${datumCz(kdyZjisteno(i))}`);
  const fakt = aktualizace && i.historie?.length ? i.historie[i.historie.length - 1].text : i.fakta?.[0];
  if (fakt) radky.push(esc(zkrat(fakt)));
  const casti = [];
  if (d === "pripad") casti.push(`Závažnost: ${NAZVY_UROVNI[i.zavaznost] ?? i.zavaznost}`);
  casti.push(`Jistota: ${JISTOTY[i.jistota] ?? i.jistota}`);
  if (d === "pripad") {
    const potvrzen = i.atribuce === "oficialni" || i.atribuce === "domaci";
    casti.push(`Pachatel: ${PUVODCI[i.puvodce ?? "neznamy"]}${i.puvodce && i.puvodce !== "neznamy" && !potvrzen ? " (nepotvrzeno)" : ""}`);
  }
  radky.push(casti.join(" · "));
  radky.push(`Celý záznam a zdroje: ${WEB}/incident/${i.slug}/`);
  return radky.join("\n");
}

/** Zpráva o změně oficiálního stavu z archivu snímků. */
export function sestavZmenuStavu(snimek, zmeny) {
  return [
    `📋 <b>Změna oficiálního stavu</b>`,
    `${datumCz(snimek.kdy)} · podle úředních zdrojů`,
    ...zmeny.map((z) => `• ${esc(z)}`),
    `Co platí teď: ${WEB}/#opatreni`,
  ].join("\n");
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

async function posliTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const kanal = process.env.TELEGRAM_KANAL || "@czechpatrol";
  if (!token) return { ok: false, chyba: "chybí TELEGRAM_BOT_TOKEN" };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: kanal, text, parse_mode: "HTML", disable_web_page_preview: false }),
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
  const posli = async (text) => (nacisto ? (console.log("---\n" + text), { ok: true }) : posliTelegram(text));

  if (test) {
    const v = await posli(`🧪 <b>Testovací zpráva CzechPatrol</b>\nKanál je propojený. Zprávy o ověřených záznamech budou chodit odsud, každá s odkazem na celý záznam a zdroje.\n${WEB}/`);
    console.log(v.ok ? "test odeslán" : `test selhal: ${v.chyba}`);
    process.exit(v.ok ? 0 : 1);
  }
  if (!process.env.TELEGRAM_BOT_TOKEN && !nacisto) {
    console.log("[rozhlas] chybí TELEGRAM_BOT_TOKEN, nic se neposílá");
    return;
  }

  const zaznamy = JSON.parse(fs.readFileSync(path.join(koren, "data", "incidenty.json"), "utf-8"))
    .sort((a, b) => kdyZjisteno(a).localeCompare(kdyZjisteno(b)));
  const archiv = JSON.parse(fs.readFileSync(path.join(koren, "data", "historie.json"), "utf-8"));
  const stav = ctiStav();
  const ted = Date.now();
  const prvniBeh = !stav.prvniBeh;

  let odeslano = 0, selhalo = 0;

  // 1. změny oficiálních stavů — vždy hned
  for (const { snimek, zmeny } of vyberZmenyStavu(archiv, stav)) {
    if (prvniBeh) { stav.snimky[snimek.kdy] = { kdy: new Date(ted).toISOString(), ticho: true }; continue; }
    const v = await posli(sestavZmenuStavu(snimek, zmeny));
    if (v.ok) { stav.snimky[snimek.kdy] = { kdy: new Date(ted).toISOString() }; odeslano++; } else { selhalo++; console.log(`[rozhlas] ${v.chyba}`); }
  }

  // 2. záznamy
  const nove = vyberNove(zaznamy, stav, { rezim, ted });
  const davka = nove.slice(0, MAX_ZPRAV_NA_BEH);
  if (rezim === "souhrn" && davka.length > 1) {
    // souhrn: jedna zpráva s více položkami, dělená po ~3500 znacích
    const hlava = `📰 <b>CzechPatrol · denní souhrn ${datumCz(new Date(ted).toISOString())}</b>\n${davka.length} ${davka.length < 5 ? "nové záznamy" : "nových záznamů"}`;
    const kusy = [];
    let akt = hlava;
    for (const { i, aktualizace } of davka) {
      const z = sestavZpravu(i, { aktualizace });
      if ((akt + "\n\n" + z).length > 3500) { kusy.push(akt); akt = z; } else akt += "\n\n" + z;
    }
    kusy.push(akt);
    let ok = true;
    for (const k of kusy) { const v = await posli(k); if (!v.ok) { ok = false; console.log(`[rozhlas] ${v.chyba}`); } }
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
