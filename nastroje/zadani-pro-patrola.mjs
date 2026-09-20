/**
 * Zadání pro externího ověřovatele z čekající fronty.
 *
 *   node nastroje/zadani-pro-patrola.mjs          zapíše zadání
 *   node nastroje/zadani-pro-patrola.mjs --sucho  jen vypíše, co by zapsal
 *
 * Proč to existuje
 * ----------------
 * Frontu kandidátů posuzoval denní audit modelem přes API. 20. 9. 2026 došel
 * kredit a placené volání se vyplo — jenže tím se fronta přestala hýbat
 * úplně. Posuzovat umí i Patrol, ten běží na vlastním serveru a neúčtuje se;
 * chybělo jediné: říct mu, co má vzít.
 *
 * Patrol nemá na repozitář API ani se mu nedá zavolat. Jediná cesta, jak mu
 * něco zadat, je zápis na jeho větev — proto tenhle skript nic nespouští,
 * jen připraví text úkolu. Doručí ho běh, který ho zapíše.
 *
 * Co se NEZADÁVÁ znovu
 * --------------------
 * Když předchozí zadání pořád čeká, nové se nepřidá. Jinak by se ve frontě
 * kupila hromada stejných úkolů a Patrol by nepoznal, který je ten platný.
 *
 * Čekat ale nesmí donekonečna. Zadání z 19. 9. 2026 zůstalo ve stavu „ceka"
 * i poté, co ho Patrol vyřídil — kdyby na tom stálo blokování, fronta by se
 * zasekla napořád kvůli jednomu neodepsanému příznaku. Po dvanácti hodinách
 * se proto zadání označí za propadlé a jede se dál.
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

/*
  Kolik kandidátů se vypíše jmenovitě.

  Celou frontu vypisovat nemá smysl: Patrol má data/kandidati.json u sebe
  a přečte si ji celou. Výpis je tu proto, aby bylo z úkolu poznat, o čem
  je — a aby šlo zpětně zjistit, co se kdy zadávalo.
*/
const VYPSAT = 25;

/*
  Jak dlouho se čeká na vyřízení zadání.

  Dvanáct hodin je víc než dost i na velkou frontu. Delší čekání by znamenalo,
  že jeden neodepsaný příznak umí zastavit celý provoz.
*/
const PLATNOST_HODIN = 12;

const sucho = process.argv.includes("--sucho");

const kandidati = cti("data/kandidati.json", []);
const audit = cti("data/fronta/audit.json", { rozhodnuti: [] });
const fronta = cti("data/fronta/pro-patrola.json", []);

const ceka = kandidati.filter((k) => k.stav === "ceka");

if (!ceka.length) {
  console.log("[zadani] fronta je prázdná, není co zadat");
  process.exit(0);
}

/*
  Nevyřízené zadání blokuje další. „Nevyřízené" je i to, které Patrol vzal
  a ještě neodepsal — dvě zadání na tutéž frontu by znamenala dvojí práci.
*/
const hranice = Date.now() - PLATNOST_HODIN * 3_600_000;
const puvodni = Array.isArray(fronta) ? fronta : [];
let propadlo = 0;
const ocistena = puvodni.map((z) => {
  if (z.stav !== "ceka") return z;
  if (new Date(z.zadano).getTime() >= hranice) return z;
  propadlo++;
  return { ...z, stav: "propadlo", propadloKdy: new Date().toISOString() };
});

const visi = ocistena.filter((z) => z.stav === "ceka");
if (visi.length) {
  console.log(`[zadani] předchozí zadání ještě čeká (${visi.length}), nové se nepřidává`);
  process.exit(0);
}
if (propadlo) console.log(`[zadani] ${propadlo} zadání propadlo bez vyřízení`);

/*
  Jednozdrojové napřed.

  U nich audit rozhodl, že jde o novou událost, a zastavilo je jediné:
  druhý zdroj není mezi zachycenými. To je přesně práce, kterou audit
  neuměl a Patrol ano — umí hledat i mimo frontu.
*/
const jednozdrojove = new Set(
  (audit.rozhodnuti ?? [])
    .filter((r) => typeof r.zahozeno === "string" && r.zahozeno.startsWith("hlásí to jen jeden zdroj"))
    .map((r) => r.id),
);

const prednost = ceka.filter((k) => jednozdrojove.has(k.id));
const zbytek = ceka.filter((k) => !jednozdrojove.has(k.id));

const radek = (k) =>
  `- ${k.id} · ${(k.publikovano ?? k.zachyceno).slice(0, 10)} · ${k.zeme ?? "—"} · ${k.titulek}\n  ${k.zdroj.url}`;

const casti = [
  `Posuď frontu zachycených zpráv: ${ceka.length} čeká na rozhodnutí.`,
  "",
  "Data máš u sebe v data/kandidati.json (stav = \"ceka\"). Zveřejněné záznamy",
  "jsou v data/incidenty.json, rozdělaná práce v data/navrhy.json.",
  "",
  "Pravidla se nemění — jsou v PATROL.md na tvé větvi. Připomínka toho,",
  "na čem to nejčastěji padá: dva nezávislé zdroje vždycky, datum události",
  "není datum článku, původce až po úředním závěru, [DOPLNIT] se nenahrazuje",
  "odhadem.",
];

if (prednost.length) {
  casti.push(
    "",
    `NEJDŘÍV — ${prednost.length} zpráv, kde chybí jen druhý zdroj:`,
    ...prednost.slice(0, VYPSAT).map(radek),
  );
  if (prednost.length > VYPSAT) casti.push(`  … a dalších ${prednost.length - VYPSAT}.`);
  casti.push(
    "",
    "U těchhle je rozhodnuto, že jde o novou událost. Chybí druhé nezávislé",
    "hlášení — a to smíš hledat i mimo frontu. Úřední zdroj má přednost před",
    "médiem: se dvěma zdroji, z nichž jeden je úřední, jde záznam na web sám.",
  );
}

if (zbytek.length) {
  casti.push("", `POTOM — ${zbytek.length} neposouzených:`, ...zbytek.slice(0, VYPSAT).map(radek));
  if (zbytek.length > VYPSAT) casti.push(`  … a dalších ${zbytek.length - VYPSAT}.`);
}

casti.push(
  "",
  "Výsledek dej do data/navrhy.json s lidskyOvereno: false. U zpráv, ze",
  "kterých návrh nevznikl, napiš proč — tichý zápor vypadá stejně jako",
  "porucha.",
);

const zadani = casti.join("\n").slice(0, 8000);

if (sucho) {
  console.log(zadani);
  process.exit(0);
}

fs.mkdirSync(cesta("data/fronta"), { recursive: true });
const nova = [...ocistena];
nova.push({
  id: `z-${Date.now().toString(36)}`,
  zadano: new Date().toISOString(),
  zadal: "fronta",
  stav: "ceka",
  zadani,
});
fs.writeFileSync(cesta("data/fronta/pro-patrola.json"), `${JSON.stringify(nova, null, 2)}\n`);
console.log(`[zadani] zapsáno: ${ceka.length} kandidátů, z toho ${prednost.length} jen o druhý zdroj`);
