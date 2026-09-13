/**
 * Ruční převzetí zprávy, kterou síto nepustilo, mezi kandidáty.
 *
 *   node nastroje/prijmi-odmitnuty.mjs <id> [<id>…]
 *   node nastroje/prijmi-odmitnuty.mjs --vazne     (vše, co model označil jako vážné)
 *
 * Proč to dělá člověk u příkazové řádky a ne kliknutí na webu: web je statický,
 * zapsat do repozitáře odsud nejde. A hlavně — převzetí má být vědomý krok.
 *
 * Nic se tím nezveřejňuje. Položka se přesune mezi kandidáty se stavem „ceka“,
 * kde ji čeká stejné ověření jako každou jinou: otevřít zdroj, ověřit fakta,
 * teprve pak `nastroje/prijmi-kandidata.mjs`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cestaOdmitnutych = path.join(koren, "data", "fronta", "odmitnute.json");
const cestaKandidatu = path.join(koren, "data", "kandidati.json");

const cti = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : []);
const odmitnute = cti(cestaOdmitnutych);
const kandidati = cti(cestaKandidatu);

const arg = process.argv.slice(2);
if (!arg.length) {
  console.log("Použití: node nastroje/prijmi-odmitnuty.mjs <id>… | --vazne");
  console.log(`\nOdmítnutých v přehledu: ${odmitnute.length}`);
  const vazne = odmitnute.filter((o) => o.posouzeni?.podezreni === "vysoke");
  if (vazne.length) {
    console.log(`Model označil jako vážné: ${vazne.length}`);
    for (const o of vazne.slice(0, 10)) console.log(`  ${o.id}  ${o.titulek.slice(0, 80)}`);
  }
  process.exit(1);
}

const vybrane = arg.includes("--vazne")
  ? odmitnute.filter((o) => o.posouzeni?.podezreni === "vysoke")
  : arg.filter((a) => !a.startsWith("--")).map((id) => odmitnute.find((o) => o.id === id)).filter(Boolean);

const chybi = arg.filter((a) => !a.startsWith("--") && !odmitnute.some((o) => o.id === a));
for (const id of chybi) console.log(`!! ${id} v odmítnutých není`);
if (!vybrane.length) {
  console.log("Není co převzít.");
  process.exit(chybi.length ? 1 : 0);
}

const adresy = new Set(kandidati.map((k) => k.zdroj.url));
let prevzato = 0;

for (const o of vybrane) {
  if (adresy.has(o.zdroj.url)) {
    console.log(`— ${o.id} už mezi kandidáty je`);
    continue;
  }
  kandidati.unshift({
    id: o.id,
    zachyceno: new Date().toISOString(),
    publikovano: o.publikovano,
    zdroj: o.zdroj,
    titulek: o.titulek,
    titulekPuvodni: o.titulek,
    shrnuti: o.shrnuti,
    kodZeme: null,
    zeme: null,
    kategorie: o.kategorie,
    druhOdhad: "neurceno",
    // Ne „pravidla“ ani „model“: tuhle položku vytáhl člověk proti sítu.
    klasifikace: "clovek",
    shody: [`ručně z odmítnutých (${o.duvod})`],
    stav: "ceka",
  });
  adresy.add(o.zdroj.url);
  prevzato++;
  console.log(`+ ${o.id}  ${o.titulek.slice(0, 80)}`);
}

if (prevzato) {
  fs.writeFileSync(cestaKandidatu, JSON.stringify(kandidati, null, 2) + "\n", "utf-8");
  // Převzaté z odmítnutých zmizí, ať se nenabízejí podruhé.
  const prevzata = new Set(vybrane.map((o) => o.id));
  const zbytek = odmitnute.filter((o) => !prevzata.has(o.id));
  fs.writeFileSync(cestaOdmitnutych, JSON.stringify(zbytek, null, 2) + "\n", "utf-8");
}

console.log(`\nPřevzato ${prevzato}. Zdroj si teď otevři a ověř — teprve pak nastroje/prijmi-kandidata.mjs.`);
