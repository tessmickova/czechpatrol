/**
 * Strážce dat ve sběru (25. 9. 2026).
 *
 *   node nastroje/strazce-dat.mjs
 *
 * Proč: 24. a 25. 9. se dvakrát stalo, že automatický běh uložil data, která
 * neprošla kontrolou (osiřelá aktualizace Nord Stream, neznámý důvod
 * odmítnutí). Kontrola pak shodila sběr i nasazení a web stál hodiny, přestože
 * chyba byla v jediném záznamu.
 *
 * Teď se kontrola pouští HNED po sběru, před uložením, a když neprojde:
 *   1. vrátí se jen automatické zveřejnění (incidenty, návrhy, souhrn,
 *      ověřujeme) na stav z posledního commitu a kontrola se zopakuje;
 *   2. když ani to nepomůže, vrátí se celý adresář data/ — tenhle běh se
 *      neuloží, web zůstane na poslední dobré verzi a nic chybného se
 *      nezveřejní.
 * V obou případech vznikne zpráva pro správce (.strazce/zprava.txt), kterou
 * pošle upozorni-spravce.mjs. Skript sám nikdy nekončí chybou: rozhodnutí
 * „co uložit“ je jeho výsledek, ne pád.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZVEREJNENI = ["data/incidenty.json", "data/navrhy.json", "data/souhrn-situace.json", "data/overujeme.json"];

function kontrola() {
  const r = spawnSync(process.execPath, [path.join(koren, "nastroje/kontrola-dat.mjs")], { cwd: koren, encoding: "utf-8" });
  const chyby = (r.stdout + r.stderr).split("\n").filter((l) => l.includes("CHYBA:")).map((l) => l.trim());
  return { ok: r.status === 0, chyby };
}
function vrat(soubory) {
  for (const s of soubory) {
    try { execFileSync("git", ["checkout", "HEAD", "--", s], { cwd: koren, stdio: "ignore" }); } catch { /* soubor v HEAD nemusí být */ }
  }
}
function vystup(klic, hodnota) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${klic}=${hodnota}\n`);
}
function zprava(text) {
  fs.mkdirSync(path.join(koren, ".strazce"), { recursive: true });
  fs.appendFileSync(path.join(koren, ".strazce/zprava.txt"), `${text}\n`);
  console.log(text);
}

const prvni = kontrola();
if (prvni.ok) {
  console.log("[strážce] data prošla kontrolou");
  vystup("stav", "ok");
  process.exit(0);
}

vrat(ZVEREJNENI);
const druha = kontrola();
if (druha.ok) {
  vystup("stav", "vraceno-zverejneni");
  zprava(`Strážce dat: automatické zveřejnění vráceno, neprošlo kontrolou. Sběr uložen, web se nasadí.\n${prvni.chyby.slice(0, 6).join("\n")}`);
  process.exit(0);
}

vrat(["data"]);
const treti = kontrola();
vystup("stav", treti.ok ? "vraceno-vse" : "chyba-i-v-main");
zprava(treti.ok
  ? `Strážce dat: celý běh sběru vrácen, data neprošla kontrolou. Web zůstává na poslední dobré verzi.\n${druha.chyby.slice(0, 6).join("\n")}`
  : `Strážce dat: kontrola neprochází ani na datech v main — chyba je už v repozitáři a potřebuje člověka.\n${treti.chyby.slice(0, 6).join("\n")}`);
process.exit(0);
