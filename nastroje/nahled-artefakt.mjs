/**
 * Sestaví klikací náhled do jediného souboru.
 *
 * Není to slepenec vyexportovaného HTML — je to skutečná Reactová aplikace
 * postavená z týchž komponent jako web, jen bez serveru. Fungují v ní filtry,
 * rozbalování, nápovědy i parallax.
 *
 * Styly se přebírají z posledního `next build`, aby náhled používal přesně tu
 * CSS, kterou generuje ostrý web. Před spuštěním tedy musí existovat out/.
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const rezim = process.env.NEXT_PUBLIC_REZIM ?? "ostry";

/*
  CSS se hledá v celém out/_next, ne na jedné pevné cestě.

  Next 16 přestal generovat out/_next/static/css/ a odložil styly mezi ostatní
  kusy do .../chunks/. Skript to nepoznal a hlásil „chybí out/" i nad hotovým
  buildem — celá kontrola v CI kvůli tomu padala. Hledání stromem přežije
  i příští přesun.
*/
function najdiCss(adresar) {
  if (!fs.existsSync(adresar)) return [];
  return fs.readdirSync(adresar, { withFileTypes: true }).flatMap((polozka) => {
    const cesta = path.join(adresar, polozka.name);
    if (polozka.isDirectory()) return najdiCss(cesta);
    return polozka.name.endsWith(".css") ? [cesta] : [];
  });
}

const soubory = najdiCss("out/_next");
if (soubory.length === 0) {
  console.error("V out/ není žádná CSS. Spusťte nejdřív `npm run build` (nebo `npm run nahled`).");
  process.exit(1);
}
const css = soubory
  .sort()
  .map((f) => fs.readFileSync(f, "utf-8"))
  .join("\n")
  // Deklarace písem z buildu ukazují na soubory, které náhled nemá.
  // Písma sem dodává Google Fonts, tyhle pravidla by jen házela 404.
  .replace(/@font-face\s*{[^}]*\/_next\/[^}]*}/g, "");

const vysledek = await build({
  entryPoints: ["src/spa/main.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2021"],
  jsx: "automatic",
  write: false,
  tsconfig: "tsconfig.json",
  logLevel: "warning",
  alias: {
    "next/link": "./src/spa/shim-link.tsx",
    "next/navigation": "./src/spa/shim-navigation.ts",
  },
  define: {
    "process.env.NEXT_PUBLIC_REZIM": JSON.stringify(rezim),
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(process.env.NEXT_PUBLIC_API_URL ?? ""),
    "process.env.NODE_ENV": '"production"',
  },
});

const js = vysledek.outputFiles[0].text;

const stranka = `<meta charset="utf-8">
<title>CzechPatrol</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
${css}
/* Písma dodává v náhledu Google Fonts, ne balíček z buildu. */
:root { --font-chakra: "Chakra Petch"; --font-mono-web: "JetBrains Mono"; }
</style>

<div id="app"></div>

<script>${js}</script>`;

fs.writeFileSync("nahled.html", stranka, "utf-8");
console.log(
  `nahled.html: ${(stranka.length / 1024) | 0} KB (z toho JS ${(js.length / 1024) | 0} KB), režim ${rezim}`,
);
