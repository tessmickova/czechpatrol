/*
  Kontrola odkazů v sestaveném webu (26. 9. 2026): vede každý interní
  odkaz na všech stránkách tam, kam má? Existuje cílová stránka, a má-li
  odkaz kotvu (#…), je v cílové stránce prvek s tím id? Přesměrování
  z public/_redirects se sledují.

  Použití: npx next build && node nastroje/kontrola-odkazu.mjs
  Kotvy, které vzniknou až v prohlížeči (klientské komponenty), statická
  kontrola nevidí — ty vypíše zvlášť jako „kotva jen v prohlížeči?“.
*/
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "out");
const stranky = [];
(function projdi(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== "_next") projdi(p); } else if (e.name.endsWith(".html")) stranky.push(p); } })(OUT);

const presmerovani = new Map();
for (const r of fs.readFileSync(path.join(process.cwd(), "public/_redirects"), "utf-8").split("\n")) {
  const [z, na] = r.trim().split(/\s+/);
  if (z && na && !r.startsWith("#") && !z.includes("*")) presmerovani.set(z.replace(/\/$/, "") || "/", na);
}
const soubor = (cesta) => {
  const c = decodeURIComponent(cesta).replace(/\/$/, "");
  for (const f of [path.join(OUT, c, "index.html"), path.join(OUT, c + ".html"), path.join(OUT, c)]) if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  return null;
};
const cache = new Map();
const idcka = (f) => { if (!cache.has(f)) cache.set(f, new Set([...fs.readFileSync(f, "utf-8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); return cache.get(f); };

const chyby = [], klient = [];
for (const f of stranky) {
  const html = fs.readFileSync(f, "utf-8");
  const odkud = "/" + path.relative(OUT, f).replace(/index\.html$/, "").replace(/\.html$/, "");
  for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    if (!href.startsWith("/") && !href.startsWith("#")) continue;
    let [cesta, kotva] = (href.startsWith("#") ? odkud + href : href).split("#");
    cesta = cesta.split("?")[0] || "/";
    let hop = 0;
    while (presmerovani.has(cesta.replace(/\/$/, "") || "/") && hop++ < 3) {
      const [c2, k2] = presmerovani.get(cesta.replace(/\/$/, "") || "/").split("#");
      cesta = c2.split("?")[0] || "/"; if (k2) kotva = k2;
    }
    const cil = cesta === "/" ? path.join(OUT, "index.html") : soubor(cesta);
    if (!cil) { chyby.push(`${odkud} → ${href}: stránka neexistuje`); continue; }
    if (kotva && !idcka(cil).has(kotva)) klient.push(`${odkud} → ${href}: kotva #${kotva} v HTML není`);
  }
}
const uniq = (a) => [...new Set(a)];
console.log(`stránek: ${stranky.length}`);
console.log(`CHYBY (${uniq(chyby).length}):`); for (const c of uniq(chyby).slice(0, 80)) console.log("  " + c);
console.log(`kotva jen v prohlížeči? (${uniq(klient).length}):`); for (const c of uniq(klient).slice(0, 80)) console.log("  " + c);
process.exitCode = chyby.length ? 1 : 0;
