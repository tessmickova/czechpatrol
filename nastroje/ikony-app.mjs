/**
 * Vyrobí PNG ikony aplikace z public/ikona.svg.
 * Spouští se ručně, výsledek se commituje — build na ně jen odkazuje.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const svg = fs.readFileSync("public/ikona.svg", "utf-8");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [nazev, velikost, maskovana] of [
  ["ikona-192.png", 192, false],
  ["ikona-512.png", 512, false],
  ["ikona-maskovana-512.png", 512, true],
  ["apple-touch-icon.png", 180, false],
]) {
  const p = await b.newPage({ viewport: { width: velikost, height: velikost }, deviceScaleFactor: 1 });
  // Maskovaná ikona: bezpečná zóna je 80 % — obsah se zmenší a rohy se nezaoblují.
  const obsah = maskovana
    ? svg.replace('rx="112"', 'rx="0"').replace("<svg ", '<svg style="transform:scale(0.8);transform-origin:center" ')
    : svg;
  await p.setContent(
    `<body style="margin:0;background:${maskovana ? "#060a13" : "transparent"}">${obsah.replace("<svg ", `<svg width="${velikost}" height="${velikost}" `)}</body>`,
  );
  await p.screenshot({ path: `public/${nazev}`, omitBackground: !maskovana });
  await p.close();
  console.log("ikona", nazev);
}
await b.close();
