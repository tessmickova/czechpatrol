/*
  PDF k tisku: Zkušenosti z Ukrajiny (28. 9. 2026, přání provozovatelky).

  Všechny útržky ze stránky /zkusenosti/ na A4 — nadpis a pod ním drobně
  co se stalo, co následovalo, jak si lidé poradili a co z toho plyne pro
  domácnost. Pro lidi, kteří chtějí mít papír v šuplíku, až nepůjde proud.

  Proč se PDF generuje tady a ukládá do repozitáře, a ne při sestavení
  webu: sestavení běží na runneru bez prohlížeče a PDF se mění jen se
  změnou útržků. Aby nezůstalo staré, ukládá se vedle něj otisk dat
  a testy/zkusenosti-pdf.test.ts spadne, když data a PDF nesedí.

  Spuštění:  node nastroje/zkusenosti-pdf.mjs
  (Chromium: PLAYWRIGHT_CHROMIUM, jinak /opt/pw-browsers/chromium, jinak výchozí Playwright.)
*/
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(koren, "data", "zkusenosti.json");
export const PDF = path.join(koren, "public", "zkusenosti-z-ukrajiny.pdf");
export const OTISK = PDF + ".otisk";

/** Otisk dat, ze kterých PDF vzniklo. Změna útržků = nové PDF. */
export function otiskDat(text = fs.readFileSync(DATA, "utf-8")) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/* Názvy témat — tytéž jako TEMATA v src/lib/zkusenosti.ts (skript neumí TypeScript); hlídá test. */
export const NAZVY_TEMAT = {
  elektrina: "Elektřina a spojení",
  "voda-teplo": "Voda a teplo",
  "penize-zasoby": "Peníze, jídlo, léky",
  "doprava-palivo": "Doprava a palivo",
  "poplach-kryt": "Poplach a úkryt",
  evakuace: "Odchod z domova",
  informace: "Informace a lidé",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const domena = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const pismo = (balik, soubor) => `file://${path.join(koren, "node_modules", "@fontsource", balik, "files", soubor)}`;

export function sestavHtml(data) {
  const polozky = data.polozky;
  const temata = Object.keys(NAZVY_TEMAT).filter((t) => polozky.some((p) => p.tema === t));
  const utrzek = (p) => `
    <article>
      <h3>${esc(p.nadpis)}</h3>
      <p class="kdy">${esc(p.kdyKde)}</p>
      <p><b>Co se stalo.</b> ${esc(p.coSeStalo)}</p>
      <p><b>Co následovalo.</b> ${esc(p.coNasledovalo)}</p>
      <p><b>Jak si lidé poradili.</b> ${esc(p.jakToLideResili)}</p>
      <p class="pouceni"><b>Pro domácnost u nás:</b> ${esc(p.pouceni)}</p>
      <p class="zdroj">Zdroj: ${p.zdroje.map((z) => `${esc(z.nazev.split(" — ")[0])} (${esc(domena(z.url))})`).join("; ")}</p>
    </article>`;
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Zkušenosti z války na Ukrajině — CzechPatrol</title>
<style>
@font-face { font-family: Archivo; font-weight: 400; src: url("${pismo("archivo", "archivo-latin-ext-400-normal.woff2")}"); }
@font-face { font-family: Archivo; font-weight: 400; src: url("${pismo("archivo", "archivo-latin-400-normal.woff2")}"); unicode-range: U+0000-00FF; }
@font-face { font-family: Archivo; font-weight: 700; src: url("${pismo("archivo", "archivo-latin-ext-700-normal.woff2")}"); }
@font-face { font-family: Archivo; font-weight: 700; src: url("${pismo("archivo", "archivo-latin-700-normal.woff2")}"); unicode-range: U+0000-00FF; }
@font-face { font-family: Plex; font-weight: 400; src: url("${pismo("ibm-plex-mono", "ibm-plex-mono-latin-ext-400-normal.woff2")}"); }
@font-face { font-family: Plex; font-weight: 600; src: url("${pismo("ibm-plex-mono", "ibm-plex-mono-latin-ext-600-normal.woff2")}"); }
@page { size: A4; margin: 14mm 12mm 16mm; }
* { box-sizing: border-box; }
body { font-family: Archivo, sans-serif; color: #111; font-size: 8.4pt; line-height: 1.36; margin: 0; }
header { border-bottom: 2px solid #c1272d; padding-bottom: 4mm; margin-bottom: 4mm; }
.stitek { font-family: Plex, monospace; font-size: 7pt; letter-spacing: .08em; text-transform: uppercase; color: #c1272d; font-weight: 600; }
h1 { font-size: 18pt; margin: 1mm 0 1.5mm; line-height: 1.1; }
header p { margin: 0; font-size: 8.6pt; color: #333; max-width: 170mm; }
.sloupce { column-count: 2; column-gap: 7mm; }
h2 { font-family: Plex, monospace; font-size: 8pt; letter-spacing: .08em; text-transform: uppercase; color: #c1272d; margin: 3mm 0 1.5mm; break-after: avoid; column-span: none; }
article { break-inside: avoid; border-left: 1.5px solid #ddd; padding: 0 0 0 2.5mm; margin: 0 0 3mm; }
h3 { font-size: 9.6pt; line-height: 1.2; margin: 0 0 .5mm; }
article p { margin: 0 0 .8mm; }
.kdy { font-family: Plex, monospace; font-size: 6.8pt; color: #666; }
.pouceni { background: #f6e9e9; padding: .8mm 1.5mm; border-radius: 1mm; }
.zdroj { font-size: 6.6pt; color: #666; }
footer { margin-top: 4mm; border-top: 1px solid #ccc; padding-top: 2mm; font-size: 7pt; color: #555; }
</style></head><body>
<header>
  <div class="stitek">CzechPatrol · Zkušenosti z Ukrajiny</div>
  <h1>Jak to bylo doopravdy</h1>
  <p>Všední život ve válce: co přestalo fungovat, co následovalo a jak si lidé poradili. Útržky ze zveřejněných reportáží, úřadů a organizací — přebíráme fakta, ne znění. Česko není Ukrajina; berte to jako zkušenost, ne jako předpověď. Stav k ${esc(data.aktualizovano.split("-").reverse().map((x) => String(Number(x))).join(". "))}. Plné znění se zdroji: czechpatrol.cz/zkusenosti</p>
</header>
<main class="sloupce">
${temata.map((t) => `<h2>${esc(NAZVY_TEMAT[t])}</h2>${polozky.filter((p) => p.tema === t).map(utrzek).join("")}`).join("\n")}
</main>
<footer>V nouzi volejte 112. CzechPatrol je nezávislý projekt, ne úřední zdroj — v krizi se řiďte pokyny úřadů.</footer>
</body></html>`;
}

async function main() {
  const text = fs.readFileSync(DATA, "utf-8");
  const data = JSON.parse(text);
  const { chromium } = await import(path.join(koren, "node_modules", "playwright", "index.mjs"));
  const cesta = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  const prohlizec = await chromium.launch(cesta ? { executablePath: cesta } : {});
  const stranka = await prohlizec.newPage();
  const docasny = path.join(koren, ".zkusenosti-tisk.html");
  fs.writeFileSync(docasny, sestavHtml(data));
  try {
    await stranka.goto(`file://${docasny}`, { waitUntil: "load" });
    await stranka.evaluate(() => document.fonts.ready);
    await stranka.pdf({
      path: PDF, format: "A4", printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true, headerTemplate: "<span></span>",
      footerTemplate: `<div style="font-size:7px;width:100%;padding:0 12mm;color:#777;display:flex;justify-content:space-between;font-family:sans-serif"><span>czechpatrol.cz/zkusenosti</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
  } finally {
    fs.rmSync(docasny, { force: true });
    await prohlizec.close();
  }
  fs.writeFileSync(OTISK, otiskDat(text) + "\n");
  console.log(`[zkusenosti-pdf] ${path.relative(koren, PDF)}: ${data.polozky.length} útržků, ${Math.round(fs.statSync(PDF).size / 1024)} kB`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error("[zkusenosti-pdf] selhalo:", e); process.exit(1); });
}
