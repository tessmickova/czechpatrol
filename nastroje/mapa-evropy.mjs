/*
  Obrysy států Evropy pro stránku Ochranné vazby (30. 9. 2026).

  Zdroj: Natural Earth 1:50m (volné dílo) přes balíček world-atlas.
  Mapa se vyrobí jednou tady a uloží jako hotové cesty SVG do
  data/mapa-evropy.json — prohlížeč nestahuje žádnou mapovou knihovnu
  a stránka nic nepočítá.

  Spuštění: node nastroje/mapa-evropy.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";
import { geoConicConformal, geoPath } from "d3-geo";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const topo = JSON.parse(fs.readFileSync(path.join(koren, "node_modules/world-atlas/countries-50m.json"), "utf-8"));
const svet = feature(topo, topo.objects.countries);

/* ISO 3166-1 číselný kód → dvoupísmenný (jen Evropa a nejbližší okolí). Kosovo nemá číselný kód, pozná se jménem. */
export const ISO = {
  "008": "AL", "040": "AT", "056": "BE", "070": "BA", "100": "BG", "112": "BY", "191": "HR", "196": "CY", "203": "CZ",
  "208": "DK", "233": "EE", "246": "FI", "250": "FR", "276": "DE", "300": "GR", "348": "HU", "352": "IS", "372": "IE",
  "380": "IT", "428": "LV", "440": "LT", "442": "LU", "470": "MT", "498": "MD", "499": "ME", "528": "NL", "807": "MK",
  "578": "NO", "616": "PL", "620": "PT", "642": "RO", "643": "RU", "688": "RS", "703": "SK", "705": "SI", "724": "ES",
  "752": "SE", "756": "CH", "792": "TR", "804": "UA", "826": "GB",
};

const SIRKA = 1000, VYSKA = 900;
const projekce = geoConicConformal().parallels([40, 65]).rotate([-15, 0]).center([0, 54])
  .fitExtent([[0, 0], [SIRKA, VYSKA]], { type: "MultiPoint", coordinates: [[-11, 35], [42, 35], [42, 71], [-11, 71], [15, 34], [15, 71]] })
  .clipExtent([[0, 0], [SIRKA, VYSKA]]);
const cesta = geoPath(projekce);
/* Celé pixely: na mapě 1000 px rozdíl nevidět, soubor výrazně menší. */
const zaokrouhli = (d) => d.replace(/-?\d+\.\d+/g, (x) => String(Math.round(Number(x))));

const staty = [];
for (const f of svet.features) {
  const kod = ISO[f.id] ?? (f.properties?.name === "Kosovo" ? "XK" : null);
  /* Jen co je ve výřezu a není menší než pixel (ostrůvky, státy mimo mapu). */
  const [[x0, y0], [x1, y1]] = cesta.bounds(f);
  if (!(x1 > 0 && y1 > 0 && x0 < SIRKA && y0 < VYSKA) || (x1 - x0) * (y1 - y0) < 4) continue;
  const d = cesta(f);
  if (!d) continue;
  staty.push({ kod, nazev: f.properties?.name ?? "", d: zaokrouhli(d) });
}
const vystup = { zdroj: "Natural Earth 1:50m (volné dílo), world-atlas", sirka: SIRKA, vyska: VYSKA, staty };
fs.writeFileSync(path.join(koren, "data", "mapa-evropy.json"), JSON.stringify(vystup) + "\n");
console.log(`[mapa] ${staty.length} obrysů, ${staty.filter((s) => s.kod).length} s kódem, ${Math.round(JSON.stringify(vystup).length / 1024)} kB`);

/*
  Obarvená mapa ochranných vazeb jako samostatný soubor (public/mapa-ochrany.svg).
  Vložená do stránky by se v HTML statického Next.js objevila dvakrát
  (stránka + data pro React) a stránka by měla 600 kB. Barvy jsou pevné
  a poloprůhledné, aby mapa fungovala ve světlém i tmavém motivu.
*/
const ochrana = JSON.parse(fs.readFileSync(path.join(koren, "data", "ochrana-zemi.json"), "utf-8"));
export const BARVY_MAPY = ["rgba(128,128,128,0.10)", "rgba(164,148,214,0.25)", "rgba(164,148,214,0.42)", "rgba(164,148,214,0.60)", "rgba(164,148,214,0.78)", "rgba(164,148,214,0.95)"];
const pocet = (kod) => ochrana.faktory.filter((f) => f.zeme.includes(kod)).length;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const radky = staty.map((s) => {
  const hodnocena = s.kod && ochrana.nazvy[s.kod] && !ochrana.mimo.includes(s.kod);
  const fill = hodnocena ? BARVY_MAPY[Math.min(pocet(s.kod), BARVY_MAPY.length - 1)] : "rgba(128,128,128,0.04)";
  const titulek = hodnocena ? `<title>${esc(ochrana.nazvy[s.kod])}: ${pocet(s.kod)}</title>` : "";
  return `<path d="${s.d}" fill="${fill}" stroke="rgba(128,128,128,0.45)" stroke-width="0.8">${titulek}</path>`;
});
const hranice = staty.filter((s) => s.kod && ochrana.hranice.zeme.includes(s.kod))
  .map((s) => `<path d="${s.d}" fill="none" stroke="#e8484f" stroke-width="2.2" stroke-dasharray="6 4"/>`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIRKA} ${VYSKA}" role="img" aria-label="Mapa Evropy podle počtu ochranných vazeb">${radky.join("")}${hranice.join("")}</svg>\n`;
fs.writeFileSync(path.join(koren, "public", "mapa-ochrany.svg"), svg);
console.log(`[mapa] public/mapa-ochrany.svg ${Math.round(svg.length / 1024)} kB`);
