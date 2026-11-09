/**
 * Dvojí nezávislé zařazení vzorku událostí (metodika v2, plán ověření).
 *
 *   npm run metodika:vzorek -- vzorek 30        vzorek 30 událostí do CSV pro dva hodnotitele
 *   npm run metodika:vzorek -- shoda a.csv b.csv  shoda a neshody po polích
 *
 * Soubory jdou do .metodika-v2/ (git je ignoruje). Hodnotitelé vyplní sloupce
 * nezávisle, bez znalosti výsledku druhého a bez výstupu algoritmu.
 */
import fs from "node:fs";
import path from "node:path";
import { shodaPole } from "../src/lib/metodika2/shoda";
import type { Incident } from "../src/lib/typy";

const koren = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cil = path.join(koren, ".metodika-v2");
const POLE = ["vazba", "rozsah", "zasahFunkci", "stavHrozby", "dolozeni", "pasmo"];
const NAVOD = "vazba: prime-cr|zavislost|spojenci|kontext; rozsah: mistni|regionalni|celostatni|mezinarodni|nezname; zasahFunkci: ano|ne|nezname; stavHrozby: probiha|odvraceno|ukonceno|neznamo; dolozeni: dolozeno|predbezne|nepotvrzeno|sporne|vyvraceno; pasmo: omezeny|zvyseny|vysoky|mimoradny";
const csv = (x: string) => `"${String(x ?? "").replace(/"/g, '""')}"`;
const ctiCsv = (soubor: string): Record<string, string>[] => {
  const [hlavicka, ...radky] = fs.readFileSync(soubor, "utf-8").split(/\r?\n/).filter((r) => r.trim() && !r.startsWith("#"));
  const rozdel = (r: string) => (r.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
  const h = rozdel(hlavicka);
  return radky.map((r) => Object.fromEntries(rozdel(r).map((v, i) => [h[i], v])));
};

const [prikaz, ...arg] = process.argv.slice(2);
if (prikaz === "vzorek") {
  const pocet = Number(arg[0]) || 30;
  const zaznamy = (JSON.parse(fs.readFileSync(path.join(koren, "data", "incidenty.json"), "utf-8")) as Incident[])
    .filter((i) => (i.druh ?? "pripad") === "pripad" && !i.historicky && !i.archivniZaznam);
  /* Rovnoměrně přes čas, ne nejnovější: vzorek má zachytit různé situace. */
  const krok = Math.max(1, Math.floor(zaznamy.length / pocet));
  const vyber = zaznamy.sort((a, b) => a.datumUdalosti.localeCompare(b.datumUdalosti)).filter((_, i) => i % krok === 0).slice(0, pocet);
  fs.mkdirSync(cil, { recursive: true });
  const soubor = path.join(cil, `vzorek-${new Date().toISOString().slice(0, 10)}.csv`);
  const radky = [`# ${NAVOD}`, ["id", "titulek", "zeme", "datumUdalosti", "zdroje", ...POLE].join(","), ...vyber.map((i) => [i.slug, i.titulek, i.zeme, i.datumUdalosti.slice(0, 10), i.zdroje.map((z) => z.url).join(" "), ...POLE.map(() => "")].map(csv).join(","))];
  fs.writeFileSync(soubor, `${radky.join("\n")}\n`);
  console.log(`Vzorek ${vyber.length} událostí: ${path.relative(koren, soubor)}. Každý hodnotitel vyplní vlastní kopii.`);
} else if (prikaz === "shoda" && arg.length === 2) {
  const [a, b] = arg.map(ctiCsv);
  for (const pole of POLE) {
    const s = shodaPole(pole, a, b);
    if (!s.parovych) { console.log(`${pole}: bez vyplněných dvojic`); continue; }
    console.log(`${pole}: ${s.parovych} dvojic, shoda ${(s.shoda * 100).toFixed(0)} %, kappa ${s.kappa === null ? "—" : s.kappa.toFixed(2)}`);
    for (const x of s.neshody.slice(0, 10)) console.log(`   ${x.id}: ${x.a} × ${x.b}`);
  }
} else {
  console.log("Použití: vzorek [počet] | shoda a.csv b.csv");
}
