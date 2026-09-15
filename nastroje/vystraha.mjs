#!/usr/bin/env node
/**
 * Vyhlášení a sundání mimořádné výstrahy.
 *
 *   node nastroje/vystraha.mjs stav
 *   node nastroje/vystraha.mjs vyhlas navrh.json
 *   node nastroje/vystraha.mjs sundej "proč se sundává"
 *
 * Výstrahu smí vyhlásit jen člověk a jen tímhle nástrojem. Automatický sběr
 * k tomuhle souboru nesahá: kdyby mohl, stačila by jedna podvržená zpráva
 * k tomu, aby web sám vyhlásil mobilizaci.
 *
 * Návrh je JSON s poli podle Vystraha v src/lib/typy.ts. Nástroj ho nepřijme,
 * dokud nemá dva zdroje z různých domén, datum události, podpis toho, kdo to
 * ověřil, a odstavec „co to neznamená“.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chybyVystrahy } from "./vystraha-pravidla.mjs";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOUBOR = path.join(koren, "data", "vystraha.json");

const cti = () => JSON.parse(fs.readFileSync(SOUBOR, "utf-8"));
const zapis = (d) => fs.writeFileSync(SOUBOR, `${JSON.stringify(d, null, 2)}\n`);

const prikaz = process.argv[2];
const arg = process.argv[3];

if (prikaz === "stav") {
  const d = cti();
  if (!d.aktivni) {
    console.log("Žádná výstraha neplatí. Na webu není žádný pruh.");
  } else {
    console.log(`PLATÍ: ${d.aktivni.nadpis}`);
    console.log(`  druh: ${d.aktivni.druh}`);
    console.log(`  událost: ${d.aktivni.kdy}`);
    console.log(`  ověřil: ${d.aktivni.overil} (${d.aktivni.overeno})`);
    console.log(`  zdrojů: ${d.aktivni.zdroje?.length ?? 0}`);
  }
  console.log(`V archivu: ${d.archiv.length}`);
  process.exit(0);
}

if (prikaz === "vyhlas") {
  if (!arg) {
    console.error("Chybí cesta k návrhu: node nastroje/vystraha.mjs vyhlas navrh.json");
    process.exit(1);
  }
  const navrh = JSON.parse(fs.readFileSync(path.resolve(arg), "utf-8"));
  const chyby = chybyVystrahy(navrh);
  if (chyby.length) {
    console.error("Výstraha NEBYLA vyhlášena. Chybí nebo nesedí:");
    for (const c of chyby) console.error(`  - ${c}`);
    process.exit(1);
  }
  const d = cti();
  if (d.aktivni) {
    /*
      Dvě výstrahy naráz nedávají smysl: člověk si přečte tu horní a druhou
      přehlédne. Starou je potřeba nejdřív vědomě sundat.
    */
    console.error(`Už platí jiná výstraha: „${d.aktivni.nadpis}“. Nejdřív ji sundej.`);
    process.exit(1);
  }
  d.aktivni = navrh;
  zapis(d);
  console.log(`Vyhlášeno: ${navrh.nadpis}`);
  console.log("Commitni a nahraj — nasazení pruh zveřejní a rozhlas o něm dá vědět do kanálu.");
  process.exit(0);
}

if (prikaz === "sundej") {
  if (!arg) {
    console.error('Chybí důvod: node nastroje/vystraha.mjs sundej "situace se vrátila do normálu"');
    process.exit(1);
  }
  const d = cti();
  if (!d.aktivni) {
    console.error("Žádná výstraha neplatí, není co sundávat.");
    process.exit(1);
  }
  /* Výstraha nikdy nezmizí beze stopy — kdo ji viděl, musí dohledat, co s ní bylo dál. */
  d.archiv.unshift({ ...d.aktivni, sundano: new Date().toISOString(), procSundano: arg });
  const nadpis = d.aktivni.nadpis;
  d.aktivni = null;
  zapis(d);
  console.log(`Sundáno: ${nadpis}`);
  console.log(`Do archivu zapsáno proč: ${arg}`);
  process.exit(0);
}

console.error("Použití: node nastroje/vystraha.mjs stav | vyhlas <navrh.json> | sundej \"důvod\"");
process.exit(1);
