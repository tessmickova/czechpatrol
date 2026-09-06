/**
 * Převezme automaticky zachyceného kandidáta do kostry záznamu.
 *
 *   node nastroje/prijmi-kandidata.mjs <id-kandidata> [slug]
 *
 * Vypíše JSON kostry záznamu pro data/incidenty.json. Člověk doplní
 * fakta, závažnost a jistotu, nastaví lidskyOvereno: true a kandidáta
 * tím zveřejní; sběr ho pak z fronty sám odstraní (stejná adresa zdroje).
 */
import fs from "node:fs";

const [, , id, slugArg] = process.argv;
if (!id) { console.error("Použití: node nastroje/prijmi-kandidata.mjs <id> [slug]"); process.exit(1); }
const kandidati = JSON.parse(fs.readFileSync("data/kandidati.json", "utf-8"));
const k = kandidati.find((x) => x.id === id);
if (!k) { console.error(`Kandidát ${id} nenalezen.`); process.exit(1); }

const den = (k.publikovano ?? k.zachyceno).slice(0, 10);
const slug = slugArg ?? k.titulek.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const kostra = {
  id: `i-${den}-${slug.slice(0, 24)}`,
  slug,
  titulek: k.titulek,
  kratkyTitulek: k.titulek.slice(0, 60),
  zeme: k.zeme ?? "[DOPLNIT]",
  kodZeme: k.kodZeme ?? "[DOPLNIT]",
  kategorie: k.kategorie.length ? k.kategorie : ["hybridni"],
  datumUdalosti: `${den}T00:00:00Z`,
  datumZjisteni: `${den}T00:00:00Z`,
  aktualizovano: new Date().toISOString(),
  zavaznost: "[DOPLNIT: G1–R3]",
  jistota: k.zdroj.primarni ? "vysoka" : "stredni",
  stav: "neuvedeno",
  atribuce: "neznama",
  puvodce: k.druhOdhad === "pripad" ? "neznamy" : undefined,
  druh: k.druhOdhad === "neurceno" ? "[DOPLNIT: pripad|opatreni|reakce]" : k.druhOdhad,
  fakta: [k.shrnuti],
  neznameho: ["[DOPLNIT]"],
  vyznam: "[DOPLNIT]",
  eskalacniSpousteče: [],
  deeskalacniSignaly: [],
  zdroje: [{ nazev: k.zdroj.nazev, url: k.zdroj.url, typ: k.zdroj.typ, publikovano: k.publikovano ?? k.zachyceno, primarni: k.zdroj.primarni, jazyk: "cs" }],
  souvisejici: [],
  historie: [{ kdy: new Date().toISOString(), text: "Převzato z automatického sběru a ověřeno člověkem.", novySignal: true }],
  novy: true,
  zapocitanoTyden: den,
  aiZpracovano: k.klasifikace === "model",
  lidskyOvereno: false,
};
console.log(JSON.stringify(kostra, null, 2));
console.error("\nDoplňte [DOPLNIT], nastavte lidskyOvereno: true a vložte do data/incidenty.json. Pak: npm run kontrola:data");
