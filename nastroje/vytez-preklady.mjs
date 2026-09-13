/**
 * Vytěží z kódu všechny české věty obalené v t("…") a zapíše je jako zdroj
 * překladu do data/preklady/ui/zdroj.json.
 *
 *   node nastroje/vytez-preklady.mjs          vypíše přehled
 *   node nastroje/vytez-preklady.mjs --zapis  zapíše zdroj.json
 *
 * Proč zvlášť od překládání: výtěžek je levný a deterministický, překlad stojí
 * peníze a potřebuje klíč. Tohle jde spustit kdykoli a kdekoli.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const zdrojovy = path.join(koren, "data", "preklady", "ui", "zdroj.json");

function souboryKodu(dir) {
  const ven = [];
  for (const polozka of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, polozka.name);
    if (polozka.isDirectory()) ven.push(...souboryKodu(p));
    else if (/\.tsx?$/.test(polozka.name)) ven.push(p);
  }
  return ven;
}

// t("…") a t('…'). Víceřádkové řetězce ani šablony schválně ne: překlad se
// skládá z celých vět, ne z kousků slepených za běhu.
const VZOR = /\bt\(\s*(["'])((?:\\.|(?!\1)[^\\])*?)\1\s*\)/g;

const vety = new Map();
for (const soubor of souboryKodu(path.join(koren, "src"))) {
  const text = fs.readFileSync(soubor, "utf-8");
  for (const m of text.matchAll(VZOR)) {
    const veta = m[2].replace(/\\(["'\\])/g, "$1");
    if (!veta.trim()) continue;
    if (!vety.has(veta)) vety.set(veta, []);
    vety.get(veta).push(path.relative(koren, soubor));
  }
}

const serazene = [...vety.keys()].sort((a, b) => a.localeCompare(b, "cs"));
const znaku = serazene.reduce((s, v) => s + v.length, 0);

console.log(`Vět k překladu: ${serazene.length} (${znaku} znaků)`);

if (process.argv.includes("--zapis")) {
  fs.mkdirSync(path.dirname(zdrojovy), { recursive: true });
  fs.writeFileSync(zdrojovy, JSON.stringify(serazene, null, 2) + "\n", "utf-8");
  console.log(`Zapsáno do ${path.relative(koren, zdrojovy)}`);
} else {
  console.log("(spusť s --zapis, aby se zdroj.json přepsal)");
  for (const v of serazene.slice(0, 15)) console.log(`  ${v.slice(0, 90)}`);
}
