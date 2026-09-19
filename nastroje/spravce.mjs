#!/usr/bin/env node
/**
 * Správa přehledu z jednoho místa.
 *
 *   npm run spravce              co čeká na rozhodnutí
 *   npm run spravce fronta       všechno, co zachytil sběr
 *   npm run spravce prijmi <id>  kostra záznamu z kandidáta
 *   npm run spravce navrhy       hotové záznamy, které čekají na tvé schválení
 *   npm run spravce zamitni <id> [důvod]   návrh do koše, se stopou
 *   npm run spravce schval <id>  schválit návrh a zveřejnit ho
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
  const navrhu = cti("data/navrhy.json", []).length;
  if (navrhu) console.log(`  Návrhy ke schválení: ${navrhu} (npm run spravce navrhy)`);
  console.log(`  Tipy k přípravě: ${tipy.length}`);
  console.log(`  Právě ověřované zprávy: ${overujeme.filter((o) => o.stav === "overujeme").length}`);
  console.log(`  Do kanálu dnes odešlo záznamů: ${dnesOdeslano}`);
  console.log("\n  Co dál:");
  console.log("     npm run spravce navrhy         hotové záznamy čekající na schválení");
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

/*
  Fronta návrhů.

  Chybějící mezičlánek mezi „zachycený titulek" a „zveřejněný záznam".
  Kandidát ze sběru je holý odkaz; zveřejněný záznam musí mít fakta, zdroje
  a hlavně tvoje ověření — testy zveřejnění bez `lidskyOvereno` zablokují,
  a to je správně. Dosud ale nebylo kam odložit záznam, který je hotový
  a čeká jen na to, aby se na něj někdo podíval.

  Návrh proto stojí v data/navrhy.json. Na web se nedostane, do počtů
  nevstupuje a `schval` ho přesune mezi záznamy až ve chvíli, kdy řekneš ty.
*/
function navrhy() {
  const n = cti("data/navrhy.json", []);
  if (!n.length) {
    console.log("\nŽádné návrhy nečekají.\n");
    return;
  }
  console.log(`\nNÁVRHY KE SCHVÁLENÍ (${n.length}):\n`);
  for (const z of n) {
    const kam = z.kam ?? "zaznam";
    if (kam === "overujeme") {
      /* Tvrzení, ne událost: úřední protipól patří nahoru, tvrzení až pod něj. */
      console.log(`  [${z.id}]  ${z.kodZeme}  → právě ověřované zprávy`);
      console.log(`     HLÁSÍ SE: ${z.coSeHlasi}`);
      console.log("     ÚŘADY:");
      for (const x of z.coRikajiUrady) console.log(`       · ${x}`);
      console.log("     OVĚŘILI JSME:");
      for (const x of z.coJsmeOverili) console.log(`       · ${x}`);
      console.log(`     KDYBY PLATILO: ${z.kdybyPlatilo}`);
      console.log(`     CO DĚLAT TEĎ: ${z.coDelatTed}`);
      console.log("     hlásí:");
      for (const x of z.kdoHlasi) console.log(`       · ${x.nazev}\n         ${x.url}`);
      console.log("");
      continue;
    }
    console.log(`  [${z.id}]  ${den(z.datumUdalosti)}  ${z.kodZeme}  ${z.druh}  → záznamy`);
    console.log(`     ${z.titulek}`);
    console.log(`     fakta: ${z.fakta.length}, zdroje: ${z.zdroje.length}, připravil ${z.pripravil ?? "—"}`);
    for (const f of z.fakta) console.log(`       · ${f}`);
    console.log("     nedoloženo:");
    for (const x of z.neznameho) console.log(`       · ${x}`);
    console.log("     zdroje:");
    for (const x of z.zdroje) console.log(`       · ${x.nazev}\n         ${x.url}`);
    console.log("");
  }
  console.log("Schválit: npm run spravce schval <id>   (dokud to neuděláš, na web to nejde)\n");
}

function schval(id) {
  if (!id) {
    console.error("Který návrh? npm run spravce schval <id>");
    process.exit(1);
  }
  const n = cti("data/navrhy.json", []);
  const z = n.find((x) => x.id === id);
  if (!z) {
    console.error(`Návrh ${id} tu není. Seznam: npm run spravce navrhy`);
    process.exit(1);
  }
  const kam = z.kam ?? "zaznam";
  const soubor = kam === "overujeme" ? "data/overujeme.json" : "data/incidenty.json";
  const cil = cti(soubor, []);
  if (cil.some((x) => x.id === id)) {
    console.error(`${id} už v ${soubor} je.`);
    process.exit(1);
  }

  /* Schválení je právě ta lidská kontrola, kterou testy i kontrola dat vyžadují. */
  const { kam: _kam, pripravil: _p, pripraveno: _k, ...zaznam } = z;
  zaznam.lidskyOvereno = true;

  if (kam === "overujeme") {
    /*
      Lhůta se počítá od schválení, ne od přípravy. Pravidlo zní, že
      neuzavřená zpráva se nesmí vléct déle než týden — a ten týden má
      běžet od chvíle, kdy se zpráva objeví na webu, ne od chvíle, kdy ji
      někdo připravil do fronty.
    */
    const ted = new Date();
    zaznam.zacalo = ted.toISOString();
    zaznam.overenoNaposledy = ted.toISOString();
    zaznam.uzavritDo = new Date(ted.getTime() + 7 * 86_400_000).toISOString();
  }

  cil.push(zaznam);
  fs.writeFileSync(path.join(koren, soubor), `${JSON.stringify(cil, null, 2)}\n`);
  fs.writeFileSync(path.join(koren, "data/navrhy.json"), `${JSON.stringify(n.filter((x) => x.id !== id), null, 2)}\n`);
  console.log(`Schváleno → ${soubor}: ${zaznam.titulek ?? zaznam.slug}`);
  console.log("Zkontroluj (npm run kontrola:data), commitni a nahraj.");
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


/*
  Zamítnutí návrhu.

  Návrh se nesmaže beze stopy — přesune se do data/fronta/zamitnute-navrhy.json
  i s důvodem. Bez toho by nešlo poznat, jestli se něco neobjevuje proto, že to
  nikdo nezachytil, nebo proto, že to už jednou někdo odmítl.
*/
function zamitni(id, duvod) {
  if (!id) {
    console.error("Který návrh? npm run spravce zamitni <id> [důvod]");
    process.exit(1);
  }
  const n = cti("data/navrhy.json", []);
  const z = n.find((x) => x.id === id);
  if (!z) {
    console.error(`Návrh ${id} tu není. Seznam: npm run spravce navrhy`);
    process.exit(1);
  }
  const odmitnute = cti("data/fronta/zamitnute-navrhy.json", []);
  odmitnute.push({ id, titulek: z.titulek ?? null, zamitnuto: new Date().toISOString(), duvod: (duvod ?? "").slice(0, 300) || null });
  fs.mkdirSync(path.join(koren, "data/fronta"), { recursive: true });
  fs.writeFileSync(path.join(koren, "data/fronta/zamitnute-navrhy.json"), `${JSON.stringify(odmitnute, null, 2)}\n`);
  fs.writeFileSync(path.join(koren, "data/navrhy.json"), `${JSON.stringify(n.filter((x) => x.id !== id), null, 2)}\n`);
  console.log(`Návrh ${id} zamítnut. Zůstala po něm stopa v data/fronta/zamitnute-navrhy.json.`);
}

const prikaz = process.argv[2];
const arg = process.argv.slice(3);

if (!prikaz || prikaz === "stav") stav();
else if (prikaz === "fronta") fronta();
else if (prikaz === "navrhy") navrhy();
else if (prikaz === "schval") schval(arg[0]);
else if (prikaz === "zamitni") zamitni(arg[0], arg.slice(1).join(" "));
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
  console.error("Použití: stav | fronta | navrhy | schval <id> | zamitni <id> [důvod] | prijmi <id> | tip [soubor] | vystraha … | nahled");
  process.exit(1);
}
