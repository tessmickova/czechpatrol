/**
 * Kmitočty Radiožurnálu po krajích z oficiálních dat Českého rozhlasu.
 *
 *   npm run kmitocty                 stáhne data a přepíše kraje v data/krizove-vysilani.json
 *   npm run kmitocty -- --nacisto    jen vypíše, co by zapsal
 *   npm run kmitocty -- --ze-souboru cesta.json   místo stahování čte uložený JSON
 *
 * Zdroj: stránka „Vysílače a frekvence“ (https://portal.rozhlas.cz/vysilace/)
 * čte totéž rozhraní bridge.rozhlas.cz. Nic se nevymýšlí: do souboru jde jen
 * to, co rozhraní vrátí, s datem stažení a odkazem na stránku. Spouští se
 * ručně (5. 11. 2026, provozovatelka) — v CI neběží, síť by to vázala na cizí službu.
 *
 * Regiony Českého rozhlasu nejsou kraje: každý vysílač nese region studia
 * (ČRo Sever, ČRo Region…). Převod na kraj je tady, v jedné tabulce.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOUBOR = path.join(koren, "data", "krizove-vysilani.json");
const STRANKA = "https://portal.rozhlas.cz/vysilace/";
const ROZHRANI = "https://bridge.rozhlas.cz/vysilace/get-transmitters/?format=rscr-json&sortBy=location&sortDir=asc&";
const RADIOZURNAL = 1; // id stanice v rozhraní ČRo

/* Region studia ČRo (label z rozhraní) → klíč kraje v data/krizove-vysilani.json. */
const REGION_NA_KRAJ = {
  "ČRo Regina": "praha",
  "ČRo Region, Středočeský kraj": "stredocesky",
  "ČRo České Budějovice": "jihocesky",
  "ČRo Plzeň": "plzensky",
  "ČRo Karlovy vary": "karlovarsky",
  "ČRo Sever": "ustecky",
  "ČRo Liberec": "liberecky",
  "ČRo Hradec Králové": "kralovehradecky",
  "ČRo Pardubice": "pardubicky",
  "ČRo Region, Vysočina": "vysocina",
  "ČRo Brno": "jihomoravsky",
  "ČRo Olomouc": "olomoucky",
  "ČRo Zlín": "zlinsky",
  "ČRo Ostrava": "moravskoslezsky",
};

const cislo = (s) => { const n = Number(String(s ?? "").replace(",", ".").trim()); return Number.isFinite(n) ? n : null; };

export function sestavKraje(vysilace, stavajici, { stazeno }) {
  const zdroj = { nazev: "Český rozhlas — Vysílače a frekvence", url: STRANKA };
  const fm = new Map(); const dab = new Map(); const varovani = [];
  for (const v of vysilace) {
    const region = v.region?.label ?? null;
    const kraj = region ? REGION_NA_KRAJ[region] : null;
    for (const f of v.frequencies ?? []) {
      if (f.station?.id !== RADIOZURNAL) continue;
      const misto = [v.location, v.locality].filter(Boolean).map((x) => String(x).trim());
      const vysilac = misto.length > 1 ? `${misto[0]} (${misto[1]})` : misto[0] ?? "?";
      if (!kraj) { varovani.push(`bez kraje: ${vysilac} ${f.band} ${f.frequence} (region ${region ?? "—"})`); continue; }
      if (f.status !== 0) { varovani.push(`mimo provoz (status ${f.status}): ${vysilac} ${f.band} ${f.frequence}`); continue; }
      if (f.band === "vkv") {
        const mhz = cislo(f.frequence);
        if (mhz === null || mhz < 87.5 || mhz > 108) { varovani.push(`divný kmitočet: ${vysilac} ${f.frequence}`); continue; }
        const polozka = { vysilac, mhz, zdroj };
        const kw = cislo(f.output);
        if (kw !== null) polozka.vykonKw = kw;
        (fm.get(kraj) ?? fm.set(kraj, []).get(kraj)).push(polozka);
      } else if (f.band === "dab") {
        (dab.get(kraj) ?? dab.set(kraj, new Set()).get(kraj)).add(String(f.frequence).trim());
      }
    }
  }
  const kraje = stavajici.kraje.map((k) => ({
    ...k,
    fm: (fm.get(k.klic) ?? []).sort((a, b) => (b.vykonKw ?? 0) - (a.vykonKw ?? 0) || a.mhz - b.mhz),
    dab: [...(dab.get(k.klic) ?? [])].sort(),
  }));
  return { kraje, stazeno, varovani };
}

/* Node fetch nerespektuje HTTPS_PROXY; když selže, zkusí se curl, který ho umí. */
async function stahni(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": "CzechPatrol (kmitocty-cro)" } });
    if (!r.ok) throw new Error(`rozhraní ČRo odpovědělo ${r.status}`);
    return await r.json();
  } catch (e) {
    const { execFileSync } = await import("node:child_process");
    try {
      return JSON.parse(execFileSync("curl", ["-sS", "-L", "--max-time", "60", "-A", "CzechPatrol (kmitocty-cro)", url], { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }));
    } catch {
      throw new Error(`stažení selhalo (${e.message}); uložený JSON lze předat přes --ze-souboru`);
    }
  }
}

async function hlavni() {
  const arg = process.argv.slice(2);
  const nacisto = arg.includes("--nacisto");
  const iSoubor = arg.indexOf("--ze-souboru");
  let vysilace;
  if (iSoubor !== -1) {
    vysilace = JSON.parse(fs.readFileSync(arg[iSoubor + 1], "utf-8"));
  } else {
    vysilace = await stahni(ROZHRANI);
  }
  if (!Array.isArray(vysilace) || !vysilace.length) throw new Error("rozhraní nevrátilo seznam vysílačů");
  const stavajici = JSON.parse(fs.readFileSync(SOUBOR, "utf-8"));
  const { kraje, stazeno, varovani } = sestavKraje(vysilace, stavajici, { stazeno: new Date().toISOString().slice(0, 10) });
  for (const v of varovani) console.log(`  ! ${v}`);
  for (const k of kraje) console.log(`${k.nazev.padEnd(16)} FM: ${k.fm.map((f) => `${f.vysilac} ${String(f.mhz).replace(".", ",")}`).join("; ") || "—"} | DAB+: ${k.dab.join(", ") || "—"}`);
  const prazdne = kraje.filter((k) => !k.fm.length).map((k) => k.nazev);
  if (prazdne.length) console.log(`  ! kraje bez kmitočtu FM: ${prazdne.join(", ")}`);
  if (nacisto) return;
  const novy = { ...stavajici, kmitocty: { stazeno, zdroj: { nazev: "Český rozhlas — Vysílače a frekvence", url: STRANKA }, rozhrani: ROZHRANI }, kraje };
  fs.writeFileSync(SOUBOR, `${JSON.stringify(novy, null, 2)}\n`, "utf-8");
  console.log(`Zapsáno do ${path.relative(koren, SOUBOR)} (staženo ${stazeno}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  hlavni().catch((e) => { console.error(`[kmitocty] ${e.message}`); process.exit(1); });
}
