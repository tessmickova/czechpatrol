#!/usr/bin/env node
/**
 * Správa přehledu z jednoho místa.
 *
 *   npm run spravce              co čeká na rozhodnutí
 *   npm run spravce fronta       všechno, co zachytil sběr
 *   npm run spravce prijmi <id>  kostra záznamu z kandidáta
 *   npm run spravce tip <soubor> přidat tip k přípravě
 *   npm run spravce vystraha …   vyhlásit nebo sundat mimořádnou výstrahu
 *   npm run spravce nahled       co by teď odešlo do kanálu (nic se neodešle)
 *
 * Proč v terminálu, a ne na webu
 * ------------------------------
 * Hostovaná správa (účty, role, passkey) v projektu je — je to worker v api/
 * a stránka /sprava/. Běží ale jen tehdy, když ji někdo nasadí a nastaví jí
 * tajemství; do té doby je to prázdná skořápka.
 *
 * Tenhle nástroj běží na tvém počítači, proti souborům v repozitáři, a
 * nepotřebuje účet ani síť. Nikdo ho nemůže vypnout, zablokovat ani odstavit
 * — to je u projektu, který má být pojistkou, důležitější než pohodlí.
 * Jediné, co potřebuje, je klon repozitáře a node.
 *
 * Nic nezveřejňuje samo. Ukazuje, co čeká, a připraví to; zveřejnění je
 * pořád commit a push, tedy vědomý krok, který je vidět v historii.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cti = (f, zaloha) => {
  const c = path.join(koren, f);
  if (!fs.existsSync(c)) return zaloha;
  try { return JSON.parse(fs.readFileSync(c, "utf-8")); } catch { return zaloha; }
};
const den = (iso) => new Date(iso).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });
const NAZVY_NALEHAVOSTI = {
  "mobilizace-rusko": "mobilizace v Rusku",
  "priprava-mobilizace": "přípravy mobilizace",
  "krizove-vysilani": "krizové vysílání",
  "clanek-nato": "článek 4/5 NATO",
  "pravni-stav-cr": "právní stav ČR",
  "hranice-cr": "hranice ČR",
  "vzdusny-prostor-nato": "vzdušný prostor Aliance",
};

function stav() {
  const kandidati = cti("data/kandidati.json", []);
  const incidenty = cti("data/incidenty.json", []);
  const tipy = cti("data/tipy.json", []);
  const vystraha = cti("data/vystraha.json", { aktivni: null, archiv: [] });
  const rozhlas = cti("data/fronta/rozhlaseno.json", {});
  const overujeme = cti("data/overujeme.json", []);

  const naliehave = kandidati.filter((k) => k.naliehave);
  const poslednizaznam = incidenty
    .map((i) => i.datumZjisteni ?? i.datumUdalosti)
    .sort()
    .at(-1);
  const dnesek = new Date().toISOString().slice(0, 10);
  const dnesOdeslano = Object.values(rozhlas.zaznamy ?? {}).filter((z) => (z?.kdy ?? "").startsWith(dnesek)).length;

  console.log("\n=== CO ČEKÁ NA ROZHODNUTÍ ===\n");

  if (vystraha.aktivni) {
    console.log(`  VÝSTRAHA PLATÍ: ${vystraha.aktivni.nadpis}`);
    console.log(`     ověřil ${vystraha.aktivni.overil}, ${den(vystraha.aktivni.overeno)}`);
    console.log(`     sundat: npm run spravce vystraha sundej "důvod"\n`);
  }

  if (naliehave.length) {
    console.log(`  NALÉHAVÉ ZE SBĚRU (${naliehave.length}) — podívat se první:`);
    for (const k of naliehave.slice(0, 5)) {
      console.log(`     [${k.id}] ${NAZVY_NALEHAVOSTI[k.naliehave.druh] ?? k.naliehave.druh} · ${k.titulek.slice(0, 68)}`);
    }
    console.log("");
  }

  console.log(`  Fronta kandidátů: ${kandidati.length} (npm run spravce fronta)`);
  console.log(`  Zveřejněné záznamy: ${incidenty.length}, poslední ${poslednizaznam ? den(poslednizaznam) : "—"}`);
  if (poslednizaznam) {
    const dni = Math.floor((Date.now() - new Date(poslednizaznam).getTime()) / 86_400_000);
    if (dni >= 2) console.log(`     ! ${dni} dní bez nového zveřejněného záznamu — web ukazuje starý stav`);
  }
  console.log(`  Tipy k přípravě: ${tipy.length}`);
  console.log(`  Právě ověřované zprávy: ${overujeme.filter((o) => o.stav === "overujeme").length}`);
  console.log(`  Do kanálu dnes odešlo záznamů: ${dnesOdeslano}`);
  console.log("\n  Co dál:");
  console.log("     npm run spravce prijmi <id>    kostra záznamu z kandidáta");
  console.log("     npm run spravce nahled         co by teď odešlo do kanálu");
  console.log("     npm run kontrola:data          kontrola před nasazením\n");
}

function fronta() {
  const kandidati = cti("data/kandidati.json", []);
  const radky = [...kandidati].sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno));
  console.log(`\nFronta: ${radky.length} kandidátů. Naléhavé nahoře.\n`);
  for (const k of radky.slice(0, 40)) {
    const znak = k.naliehave ? "!" : " ";
    console.log(`${znak} ${den(k.publikovano ?? k.zachyceno)}  ${(k.kodZeme ?? "--").padEnd(3)} [${k.id}]`);
    console.log(`    ${k.titulek.slice(0, 92)}`);
    console.log(`    ${k.zdroj.url}`);
  }
  if (radky.length > 40) console.log(`\n… a dalších ${radky.length - 40}.`);
  console.log("");
}

function tip(soubor) {
  if (!soubor) {
    const tipy = cti("data/tipy.json", []);
    console.log(`\nTipy k přípravě (${tipy.length}):\n`);
    for (const t of tipy) console.log(`  ${den(t.kdy)}  [${t.klic}] ${t.nadpis}`);
    console.log("\nPřidat: npm run spravce tip navrh.json\n");
    return;
  }
  const novy = JSON.parse(fs.readFileSync(path.resolve(soubor), "utf-8"));
  const tipy = cti("data/tipy.json", []);
  if (!novy.klic || !novy.nadpis || !novy.text || !novy.kdy) {
    console.error("Tip potřebuje klic, nadpis, text a kdy.");
    process.exit(1);
  }
  if (!(novy.zdroje ?? []).some((z) => /^https?:\/\//.test(z?.url ?? ""))) {
    /* Tip jde i do kanálu. Bez doloženého zdroje je to fáma s ikonou. */
    console.error("Tip nemá zdroj s adresou. Bez něj ven nejde.");
    process.exit(1);
  }
  if (tipy.some((t) => t.klic === novy.klic)) {
    console.error(`Tip s klíčem ${novy.klic} už existuje.`);
    process.exit(1);
  }
  tipy.unshift({ platiDo: null, ...novy });
  fs.writeFileSync(path.join(koren, "data/tipy.json"), `${JSON.stringify(tipy, null, 2)}\n`);
  console.log(`Přidáno: ${novy.nadpis}`);
  console.log("Zkontroluj (npm run kontrola:data), commitni a nahraj.");
}

const prikaz = process.argv[2];
const arg = process.argv.slice(3);

if (!prikaz || prikaz === "stav") stav();
else if (prikaz === "fronta") fronta();
else if (prikaz === "tip") tip(arg[0]);
else if (prikaz === "prijmi") {
  /* Delegace na stávající nástroj: kostru záznamu už umí a umí ji dobře. */
  execFileSync("node", [path.join(koren, "nastroje/prijmi-kandidata.mjs"), ...arg], { stdio: "inherit" });
} else if (prikaz === "vystraha") {
  execFileSync("node", [path.join(koren, "nastroje/vystraha.mjs"), ...arg], { stdio: "inherit" });
} else if (prikaz === "nahled") {
  /* --nacisto = nic se neodešle, jen vypíše, co by odešlo. */
  execFileSync("node", [path.join(koren, "nastroje/rozhlas.mjs"), "--nacisto", ...arg], { stdio: "inherit" });
} else {
  console.error(`Neznámý příkaz: ${prikaz}`);
  console.error("Použití: stav | fronta | prijmi <id> | tip [soubor] | vystraha … | nahled");
  process.exit(1);
}
