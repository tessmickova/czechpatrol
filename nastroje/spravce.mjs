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
import { maUredniZdroj } from "./uredni-zdroj.mjs";

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
  /*
    Co doložené není, musí u zveřejněného záznamu stát. Je to jedno z pravidel
    webu: čtenář má vedle fakt vidět i hranici toho, co víme. Model to někdy
    nevyplní — doplnit to je práce člověka, ne důvod záznam zahodit.
  */
  if (!(z.neznameho ?? []).length) {
    console.error(`Návrh ${id} neříká, co doložené není. Doplňte to a schvalte znovu:`);
    console.error(`  npm run spravce uprav ${id} '{"neznameho":["…"]}'`);
    process.exit(2);
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


/*
  Vrácení návrhu k dalšímu ověření.

  Návrh zůstane ve frontě, jen se u něj poznačí, že čeká na doplnění. Bez té
  poznámky by se po kliknutí nic viditelného nestalo a člověk by tlačítko
  zmáčkl znovu — nebo návrh omylem schválil.
*/
function znovu(id, duvod) {
  if (!id) {
    console.error("Který návrh? npm run spravce znovu <id> [důvod]");
    process.exit(1);
  }
  const n = cti("data/navrhy.json", []);
  const z = n.find((x) => x.id === id);
  if (!z) {
    console.error(`Návrh ${id} tu není. Seznam: npm run spravce navrhy`);
    process.exit(1);
  }
  z.preverit = { kdy: new Date().toISOString(), duvod: (duvod ?? "").slice(0, 300) || null };
  fs.writeFileSync(path.join(koren, "data/navrhy.json"), `${JSON.stringify(n, null, 2)}\n`);
  console.log(`Návrh ${id} označen k dalšímu ověření.`);
}


/*
  Úprava návrhu před schválením.

  Návrh připravil stroj. Schválení je jediné místo, kde do něj vstupuje
  člověk — a dokud šlo jen odkliknout ano/ne, znamenalo to zveřejnit strojový
  text tak, jak je. Tady se dá opravit titulek, doplnit původce nebo přepsat,
  co z textu neplyne.

  Mění se jen vyjmenovaná pole. Zbytek (lidskyOvereno, id, zdroje, historie)
  se odsud sáhnout nedá: o ověření rozhoduje schválení, ne obsah formuláře,
  a zdroje se nemají přepisovat ručně, když je celá cena projektu v tom, že
  odkazují na doklad.
*/
const SEZNAMY = ["fakta", "neznameho"];
const UPRAVITELNA = [
  "titulek",
  "kratkyTitulek",
  "zavaznost",
  "jistota",
  "druh",
  "puvodce",
  "atribuce",
  "vyznam",
  "datumUdalosti",
  "fakta",
  "neznameho",
];

function uprav(id, jsonText) {
  if (!id || !jsonText) {
    console.error("Použití: npm run spravce uprav <id> '<json se změnami>'");
    process.exit(1);
  }
  let zmeny;
  try {
    zmeny = JSON.parse(jsonText);
  } catch {
    console.error("Změny nejsou platný JSON.");
    process.exit(1);
  }
  const n = cti("data/navrhy.json", []);
  const z = n.find((x) => x.id === id);
  if (!z) {
    console.error(`Návrh ${id} tu není.`);
    process.exit(1);
  }
  const pouzite = [];
  for (const [klic, hodnota] of Object.entries(zmeny)) {
    if (!UPRAVITELNA.includes(klic)) {
      console.error(`Pole ${klic} se takhle měnit nedá — mění se jen: ${UPRAVITELNA.join(", ")}.`);
      process.exit(1);
    }
    if (hodnota === null || hodnota === undefined) continue;
    /* Formulář posílá seznamy jako text po řádcích. */
    z[klic] = SEZNAMY.includes(klic) && typeof hodnota === "string"
      ? hodnota.split("\n").map((r) => r.trim()).filter(Boolean)
      : hodnota;
    pouzite.push(klic);
  }
  if (!pouzite.length) {
    console.log("Nic k úpravě.");
    return;
  }
  /* Stopa po lidském zásahu. Bez ní nejde poznat, co psal stroj a co člověk. */
  z.historie = [
    ...(z.historie ?? []),
    { kdy: new Date().toISOString(), text: `Před zveřejněním upraveno správcem: ${pouzite.join(", ")}.`, novySignal: false },
  ];
  fs.writeFileSync(path.join(koren, "data/navrhy.json"), `${JSON.stringify(n, null, 2)}\n`);
  console.log(`Návrh ${id}: upraveno ${pouzite.join(", ")}.`);
}


/*
  Oprava už zveřejněného záznamu.

  Do té doby se dal opravit jen návrh, tedy něco, co ještě nikdo neviděl.
  Jenže chyba se pozná většinou až na webu — a oprava zveřejněného údaje je
  přesně ta situace, kdy se projekt pozná: buď se přizná, nebo se přepíše
  potichu.

  Proto se tu dělají dvě věci naráz: opraví se záznam A zapíše se to do
  data/opravy.json, které web ukazuje na stránce Opravy. Bez zápisu do oprav
  by to bylo tiché přepsání a to se tady nedělá.
*/
function upravZaznam(slug, jsonText) {
  if (!slug || !jsonText) {
    console.error("Použití: npm run spravce uprav-zaznam <slug> '<json se změnami a důvodem>'");
    process.exit(1);
  }
  let vstup;
  try {
    vstup = JSON.parse(jsonText);
  } catch {
    console.error("Změny nejsou platný JSON.");
    process.exit(1);
  }
  const { duvod, ...zmeny } = vstup;
  if (!duvod || String(duvod).trim().length < 10) {
    console.error("Chybí důvod opravy. Bez něj se zveřejněný údaj nepřepisuje.");
    process.exit(1);
  }

  const inc = cti("data/incidenty.json", []);
  const z = inc.find((x) => x.slug === slug);
  if (!z) {
    console.error(`Záznam ${slug} tu není.`);
    process.exit(1);
  }

  const pouzite = [];
  for (const [klic, hodnota] of Object.entries(zmeny)) {
    if (!UPRAVITELNA.includes(klic)) {
      console.error(`Pole ${klic} se takhle měnit nedá — mění se jen: ${UPRAVITELNA.join(", ")}.`);
      process.exit(1);
    }
    if (hodnota === null || hodnota === undefined) continue;
    z[klic] = hodnota;
    pouzite.push(klic);
  }
  if (!pouzite.length) {
    console.log("Nic k úpravě.");
    return;
  }

  const ted = new Date();
  z.aktualizovano = ted.toISOString();
  z.historie = [
    ...(z.historie ?? []),
    { kdy: ted.toISOString(), text: `Opraveno po zveřejnění: ${pouzite.join(", ")}. Důvod: ${duvod}`, novySignal: false },
  ];

  const opravy = cti("data/opravy.json", []);
  /* Na začátek: stránka Opravy ukazuje nejnovější první a pořadí je v souboru. */
  opravy.unshift({
    id: `o-${ted.toISOString().slice(0, 10)}-${slug}`.slice(0, 80),
    datum: ted.toISOString().slice(0, 10),
    tykaSe: slug,
    druh: "oprava-udaje",
    co: `Upraveno: ${pouzite.join(", ")}.`,
    proc: String(duvod).trim().slice(0, 600),
  });

  fs.writeFileSync(path.join(koren, "data/incidenty.json"), `${JSON.stringify(inc, null, 2)}\n`);
  fs.writeFileSync(path.join(koren, "data/opravy.json"), `${JSON.stringify(opravy, null, 2)}\n`);
  console.log(`Záznam ${slug}: upraveno ${pouzite.join(", ")}. Zapsáno i do oprav.`);
}


/*
  Stažení zveřejněného záznamu zpět mezi nepotvrzené.

  Protiváha automatického zveřejnění. Když se ukáže, že záznam podmínky
  nesplňoval — typicky že jeho „úřední" zdroj úřední nebyl — nesmí zůstat
  mezi tím, za čím projekt stojí. Ale nesmí ani zmizet: tiché smazání je
  k nerozeznání od toho, že tam nikdy nebyl.

  Proto se záznam vrací do fronty návrhů, kde je na webu dál vidět jako
  nepotvrzený, a důvod se zapíše na stránku Opravy.
*/
function stahniZaznam(slug, jsonText) {
  if (!slug || !jsonText) {
    console.error("Použití: npm run spravce stahni <slug> '<json s důvodem>'");
    process.exit(1);
  }
  let vstup;
  try {
    vstup = JSON.parse(jsonText);
  } catch {
    console.error("Důvod není platný JSON.");
    process.exit(1);
  }
  const duvod = String(vstup.duvod ?? "").trim();
  if (duvod.length < 10) {
    console.error("Chybí důvod stažení. Bez něj se zveřejněný záznam nestahuje.");
    process.exit(1);
  }

  const inc = cti("data/incidenty.json", []);
  const i = inc.findIndex((x) => x.slug === slug);
  if (i < 0) {
    console.error(`Záznam ${slug} mezi zveřejněnými není.`);
    process.exit(1);
  }

  const ted = new Date();
  const { overeni: _o, ...z } = inc[i];
  z.lidskyOvereno = false;
  z.kam = "zaznam";
  z.pripravil = "stazeno";
  z.pripraveno = ted.toISOString();
  z.aktualizovano = ted.toISOString();
  z.historie = [
    ...(z.historie ?? []),
    { kdy: ted.toISOString(), text: `Staženo ze zveřejněných mezi nepotvrzené. Důvod: ${duvod}`, novySignal: false },
  ];

  inc.splice(i, 1);
  const navrhy = cti("data/navrhy.json", []);
  navrhy.push(z);

  const opravy = cti("data/opravy.json", []);
  opravy.unshift({
    id: `o-${ted.toISOString().slice(0, 10)}-stazeno-${slug}`.slice(0, 80),
    datum: ted.toISOString().slice(0, 10),
    tykaSe: slug,
    druh: "oprava-dat",
    co: "Záznam stažen ze zveřejněných mezi nepotvrzené. Do počtů se už nezapočítává.",
    proc: duvod.slice(0, 600),
  });

  fs.writeFileSync(path.join(koren, "data/incidenty.json"), `${JSON.stringify(inc, null, 2)}\n`);
  fs.writeFileSync(path.join(koren, "data/navrhy.json"), `${JSON.stringify(navrhy, null, 2)}\n`);
  fs.writeFileSync(path.join(koren, "data/opravy.json"), `${JSON.stringify(opravy, null, 2)}\n`);
  console.log(`Záznam ${slug} stažen mezi nepotvrzené a zapsán do oprav.`);
}

/*
  Automatické zveřejnění dobře doložených návrhů.

  Podmínky jsou úzké a všechny musí platit naráz: dva nezávislé zdroje
  a aspoň jeden z nich úřední. Co je nesplní, zůstane ve frontě a na webu
  se ukazuje jen mezi zachycenými a neověřenými.

  Bez lidského čtení se nezveřejňuje hodnocení projektu — jen doložená fakta,
  zdroje a datum. Hodnocení je názor a ten nemá vzniknout bez člověka.

  Záznam nese overeni: "automaticke", aby šlo na webu napsat, že ho nikdo
  nečetl. Web dlouho sliboval, že všechno na něm prošlo člověkem; jakmile to
  přestane platit, musí to být u každého záznamu vidět.
*/
function dobreDolozeny(n) {
  const zdroje = n.zdroje ?? [];
  return (
    (n.kam ?? "zaznam") === "zaznam" &&
    zdroje.length >= 2 &&
    /*
      Úřední zdroj se pozná podle adresy, ne podle toho, co si o sobě napsal.
      Dřív stačilo `typ: "primary"` — a tak se 20. 9. 2026 zveřejnil sám
      záznam doložený „tiskovou zprávou rumunského ministerstva", která ale
      byla jejím zrcadlem na globalsecurity.org.
    */
    maUredniZdroj(zdroje) &&
    (n.fakta ?? []).length > 0
  );
}

function zverejniAutomaticky() {
  const navrhy = cti("data/navrhy.json", []);
  const inc = cti("data/incidenty.json", []);
  const jiz = new Set(inc.map((x) => x.id));

  const kZverejneni = navrhy.filter((n) => dobreDolozeny(n) && !jiz.has(n.id));
  if (!kZverejneni.length) {
    console.log(`Nic dobře doloženého k zveřejnění. Ve frontě zůstává ${navrhy.length}.`);
    return;
  }

  const ted = new Date().toISOString();
  for (const n of kZverejneni) {
    const { kam: _k, pripravil: _p, pripraveno: _q, preverit: _r, ...zaznam } = n;
    zaznam.lidskyOvereno = false;
    zaznam.overeni = "automaticke";
    /* U případu musí původce stát; „neznámý" je pravdivá odpověď. */
    if ((zaznam.druh ?? "pripad") === "pripad" && !zaznam.puvodce) zaznam.puvodce = "neznamy";
    /* Hodnocení je názor — bez člověka nevzniká. */
    zaznam.vyznam = "";
    zaznam.aktualizovano = ted;
    zaznam.historie = [
      ...(zaznam.historie ?? []),
      { kdy: ted, text: "Zveřejněno automaticky: dva nezávislé zdroje, z toho úřední. Bez lidské kontroly.", novySignal: false },
    ];
    inc.push(zaznam);
  }

  const zbytek = navrhy.filter((n) => !kZverejneni.some((z) => z.id === n.id));
  fs.writeFileSync(path.join(koren, "data/incidenty.json"), `${JSON.stringify(inc, null, 2)}\n`);
  fs.writeFileSync(path.join(koren, "data/navrhy.json"), `${JSON.stringify(zbytek, null, 2)}\n`);
  console.log(`Zveřejněno automaticky: ${kZverejneni.length}. Ve frontě zůstává ${zbytek.length}.`);
  for (const n of kZverejneni) console.log(`  + ${n.slug} (${n.zdroje.length} zdrojů)`);
}

const prikaz = process.argv[2];
const arg = process.argv.slice(3);

if (!prikaz || prikaz === "stav") stav();
else if (prikaz === "fronta") fronta();
else if (prikaz === "navrhy") navrhy();
else if (prikaz === "schval") schval(arg[0]);
else if (prikaz === "zamitni") zamitni(arg[0], arg.slice(1).join(" "));
else if (prikaz === "znovu") znovu(arg[0], arg.slice(1).join(" "));
else if (prikaz === "uprav") uprav(arg[0], arg.slice(1).join(" "));
else if (prikaz === "uprav-zaznam") upravZaznam(arg[0], arg.slice(1).join(" "));
else if (prikaz === "stahni") stahniZaznam(arg[0], arg.slice(1).join(" "));
else if (prikaz === "zverejni") zverejniAutomaticky();
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
  console.error("Použití: stav | fronta | navrhy | uprav <id> <json> | uprav-zaznam <slug> <json> | zverejni | schval <id> | znovu <id> [důvod] | zamitni <id> [důvod] | prijmi <id> | tip [soubor] | vystraha … | nahled");
  process.exit(1);
}
