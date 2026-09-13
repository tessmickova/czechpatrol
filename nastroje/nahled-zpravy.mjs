/**
 * Náhled podoby zprávy pro konkrétní záznam. Nic neodesílá, nic nezapisuje.
 *
 *   node nastroje/nahled-zpravy.mjs <slug> [<slug>…]
 *   node nastroje/nahled-zpravy.mjs --nejdelsi 3
 *
 * `rozhlas.mjs --nacisto` ukáže jen to, co ještě neodešlo. Když chceme
 * posoudit podobu zprávy u záznamu, který už jednou odešel — třeba před
 * změnou formátu — potřebujeme vykreslit libovolný záznam na vyžádání.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sestavZpravu } from "./rozhlas.mjs";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vse = JSON.parse(fs.readFileSync(path.join(koren, "data", "incidenty.json"), "utf-8"));

const arg = process.argv.slice(2);
const holy = arg.includes("--holy"); // bez HTML značek, pro čtení v terminálu
const souhrn = arg.includes("--souhrn");

let vybrane;
const iNej = arg.indexOf("--nejdelsi");
if (iNej >= 0) {
  const kolik = Number(arg[iNej + 1]) || 3;
  vybrane = [...vse]
    .map((i) => ({ i, delka: sestavZpravu(i, { souhrn }).length }))
    .sort((a, b) => b.delka - a.delka)
    .slice(0, kolik)
    .map((x) => x.i);
} else {
  const slugy = arg.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));
  vybrane = slugy.map((s) => vse.find((x) => x.slug === s)).filter(Boolean);
  const chybi = slugy.filter((s) => !vse.some((x) => x.slug === s));
  for (const s of chybi) console.log(`!! záznam ${s} neexistuje`);
}

for (const i of vybrane) {
  const text = sestavZpravu(i, { souhrn });
  console.log(`\n${"=".repeat(74)}`);
  console.log(`${i.slug}  —  ${text.length} znaků${souhrn ? " (souhrn)" : ""}`);
  console.log("=".repeat(74));
  console.log(holy ? text.replace(/<[^>]+>/g, "") : text);
}
