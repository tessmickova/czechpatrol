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
 *
 * Druhá půlka: rozhodnutí ověřovatele
 * -----------------------------------
 * Zamítnutá zpráva žádný návrh nevytvoří, takže podle zdrojů se odepsat
 * nedá — a vracela se ověřovateli v každém dalším zadání dokola. Sám na ni
 * sáhnout nesmí; do fronty kandidátů nezapisuje.
 *
 * Píše proto ke každé položce strojově čitelné rozhodnutí do svého zadání
 * (pole `rozhodnuti`) a tenhle nástroj je provede. Dělba práce zůstává
 * stejná: on rozhoduje a zdůvodňuje, zápis dělá kód. Důvod se ukládá k
 * položce, takže se dá zpětně přečíst, proč zpráva z fronty zmizela.
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
const zadani = cti("data/fronta/pro-patrola.json", []);

/*
  Rozhodnutí ověřovatele podle id kandidáta.

  Bere se z posledního zadání, ve kterém se o té položce rozhodlo. „Odloženo"
  se nepočítá — to znamená, že rozhodnuto NENÍ a má se vrátit.
*/
const ODLOZENE = new Set(["odlozeno", "ponechano-bez-uredniho-zdroje"]);
const rozhodnuti = new Map();
for (const z of Array.isArray(zadani) ? zadani : []) {
  for (const r of z.rozhodnuti ?? []) {
    if (r.druh !== "kandidat" || !r.id || !r.rozhodnuti) continue;
    if (ODLOZENE.has(r.rozhodnuti)) continue;
    rozhodnuti.set(r.id, { duvod: r.rozhodnuti, poznamka: String(r.duvod ?? "").slice(0, 300) });
  }
}

/* Záznam vyhrává nad návrhem: když je věc zveřejněná, je to pokračování. */
const zaznamPodleUrl = new Map(incidenty.flatMap((i) => (i.zdroje ?? []).map((z) => [z.url, i.slug])));
const navrhoveUrl = new Set(navrhy.flatMap((n) => (n.zdroje ?? []).map((z) => z.url)));

const kdy = new Date().toISOString();
let odepsano = 0;
let zRozhodnuti = 0;
const vysledek = kandidati.map((k) => {
  if (k.stav !== "ceka") return k;
  const slug = zaznamPodleUrl.get(k.zdroj?.url);
  if (slug) {
    odepsano++;
    return { ...k, stav: "vyrizen", vyrizeni: { kdy, duvod: "pokracovani", patriK: slug, poznamka: null } };
  }
  if (navrhoveUrl.has(k.zdroj?.url)) {
    odepsano++;
    return { ...k, stav: "vyrizen", vyrizeni: { kdy, duvod: "zdroj-navrhu", patriK: null, poznamka: null } };
  }
  const r = rozhodnuti.get(k.id);
  if (r) {
    odepsano++;
    zRozhodnuti++;
    return { ...k, stav: "vyrizen", vyrizeni: { kdy, duvod: r.duvod, patriK: null, poznamka: r.poznamka || null } };
  }
  return k;
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
console.log(
  `[fronta] odepsáno ${odepsano} kandidátů (z toho ${zRozhodnuti} podle rozhodnutí ověřovatele), ` +
  `čeká dál ${vysledek.filter((k) => k.stav === "ceka").length}.`,
);
