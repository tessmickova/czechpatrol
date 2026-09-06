/**
 * Model nákladů: čte docs/naklady.json a vypíše, kolik podporovatelů
 * pokryje provoz. Vstupy se mění jen v tom souboru.
 *
 *   node nastroje/naklady.mjs
 *   node nastroje/naklady.mjs --prispevek 150
 */
import fs from "node:fs";

const d = JSON.parse(fs.readFileSync(new URL("../docs/naklady.json", import.meta.url), "utf-8"));
const arg = process.argv.indexOf("--prispevek");
const prispevek = arg > -1 ? Number(process.argv[arg + 1]) : d.scenare.prumernyPrispevekKc;

const mesicne = d.polozky.reduce((s, p) => s + p.mesicneKc, 0);
console.log(`Náklady k ${d.aktualizovano}`);
for (const p of d.polozky) console.log(`  ${p.nazev}: ${p.mesicneKc} ${d.mena} (${p.poznamka})`);
console.log(`  celkem: ${mesicne} ${d.mena}/měs., ${mesicne * 12} ${d.mena}/rok`);
console.log("");
const scenare = [mesicne, 500, 1500, 5000];
console.log(`Kolik podporovatelů pokryje náklad (průměrný příspěvek ${prispevek} ${d.mena}/měs.):`);
for (const n of scenare) console.log(`  ${n} ${d.mena}/měs. → ${Math.ceil(n / prispevek)} podporovatelů`);
console.log("");
console.log(`Plus (hypotéza): ${d.plus.mesicneKc} ${d.mena}/měs. nebo ${d.plus.rocneKc} ${d.mena}/rok — ${d.plus.poznamka}`);
