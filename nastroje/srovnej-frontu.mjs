/**
 * Srovná frontu kandidátů s tím, co už je zpracované.
 *
 *   node nastroje/srovnej-frontu.mjs          zapíše
 *   node nastroje/srovnej-frontu.mjs --sucho  jen vypíše, co by zapsal
 *
 * Proč to existuje
 * ----------------
 * Zachycená zpráva, ze které se stal návrh nebo zveřejněný záznam, nemá dál
 * stát ve frontě a tvářit se, že na někoho čeká. Tohle účetnictví dělal denní
 * audit; ten je od 20. 9. 2026 vypnutý, protože stál na placeném modelu.
 *
 * Externí ověřovatel to za něj dělat nemůže a nemá: do fronty kandidátů
 * nezapisuje a pamatovat si cizí účetnictví není jeho práce. Když to po něm
 * nikdo neudělal, kontrola dat mu práci odmítla přijmout — a tři hotové
 * návrhy tak zůstaly nezapsané, přestože byly v pořádku.
 *
 * Proto to dělá tenhle nástroj, automaticky při každém převzetí dat.
 * Účetnictví se nemá dělat ručně: zapomene se na něj přesně tehdy, když
 * na něm něco visí.
 */
import fs from "node:fs";
import path from "node:path";

const koren = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cesta = (...c) => path.join(koren, ...c);
const cti = (p, zaloha) => {
  try {
    return JSON.parse(fs.readFileSync(cesta(p), "utf-8"));
  } catch {
    return zaloha;
  }
};

const sucho = process.argv.includes("--sucho");

const kandidati = cti("data/kandidati.json", []);
const incidenty = cti("data/incidenty.json", []);
const navrhy = cti("data/navrhy.json", []);

/* Záznam vyhrává nad návrhem: když je věc zveřejněná, je to pokračování. */
const zaznamPodleUrl = new Map(incidenty.flatMap((i) => (i.zdroje ?? []).map((z) => [z.url, i.slug])));
const navrhoveUrl = new Set(navrhy.flatMap((n) => (n.zdroje ?? []).map((z) => z.url)));

const kdy = new Date().toISOString();
let odepsano = 0;
const vysledek = kandidati.map((k) => {
  if (k.stav !== "ceka") return k;
  const slug = zaznamPodleUrl.get(k.zdroj?.url);
  const duvod = slug ? "pokracovani" : navrhoveUrl.has(k.zdroj?.url) ? "zdroj-navrhu" : null;
  if (!duvod) return k;
  odepsano++;
  return { ...k, stav: "vyrizen", vyrizeni: { kdy, duvod, patriK: slug ?? null, poznamka: null } };
});

if (!odepsano) {
  console.log("[fronta] není co odepsat.");
  process.exit(0);
}

if (sucho) {
  console.log(`[fronta] nasucho: odepsalo by se ${odepsano} kandidátů.`);
  process.exit(0);
}

fs.writeFileSync(cesta("data/kandidati.json"), `${JSON.stringify(vysledek, null, 2)}\n`);
console.log(`[fronta] odepsáno ${odepsano} kandidátů, čeká dál ${vysledek.filter((k) => k.stav === "ceka").length}.`);
