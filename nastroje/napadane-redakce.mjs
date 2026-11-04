/**
 * Napadené redakce a napodobeniny redakcí (4. 11. 2026, provozovatelka).
 *
 * Zpráva o útoku stojí na dvou nezávislých redakcích. Když je mezi zdroji
 * redakce, do které někdo prokazatelně pronikl (data/napadane-redakce.json),
 * chce to tři: text na jejím webu mohl napsat útočník. Napodobenina redakce
 * (lrozhlas.cz místo irozhlas.cz) se jako zdroj nepočítá nikdy.
 *
 * Čisté funkce nad daty: totéž pravidlo pro zveřejnění, kontrolu dat
 * i rozhlas do kanálů.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOUBOR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "napadane-redakce.json");

export function nactiNapadane(soubor = SOUBOR) {
  try { return JSON.parse(fs.readFileSync(soubor, "utf-8")); } catch { return { redakce: [], falesne: [] }; }
}

export function domenaZdroje(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

const sedi = (host, domena) => Boolean(host && domena) && (host === domena || host.endsWith(`.${domena}`));

/** Napodobenina redakce: nikdy není zdroj. */
export function jeFalesnaRedakce(zdroj, data = nactiNapadane()) {
  const host = domenaZdroje(zdroj?.url);
  return (data.falesne ?? []).some((f) => sedi(host, f.domena));
}

/** Redakce s doloženým průnikem, dokud riziko nepominulo (`do`). Pozná se podle domény, nebo podle jména zdroje. */
export function jeNapadenaRedakce(zdroj, data = nactiNapadane(), ted = Date.now()) {
  const host = domenaZdroje(zdroj?.url);
  const nazev = String(zdroj?.nazev ?? "").toLowerCase();
  return (data.redakce ?? []).some((r) => {
    if (r.do && new Date(r.do).getTime() < ted) return false;
    if (r.od && new Date(r.od).getTime() > ted) return false;
    if (r.domena) return sedi(host, r.domena);
    return Boolean(r.nazev) && nazev.includes(String(r.nazev).toLowerCase());
  });
}

/** Kolik nezávislých redakcí zpráva potřebuje: dvě; s napadenou redakcí mezi zdroji tři. */
export function potrebnychRedakci(zdroje, data = nactiNapadane(), ted = Date.now()) {
  return (zdroje ?? []).some((z) => jeNapadenaRedakce(z, data, ted)) ? 3 : 2;
}

/** Počet různých domén mezi zdroji; Google News a napodobeniny se nepočítají. */
export function nezavisleRedakce(zdroje, data = nactiNapadane()) {
  const domeny = new Set();
  for (const z of zdroje ?? []) {
    const d = domenaZdroje(z?.url);
    if (d && d !== "news.google.com" && !jeFalesnaRedakce(z, data)) domeny.add(d);
  }
  return domeny.size;
}

/** Má zpráva dost nezávislých redakcí? Jedno místo pro pravidlo. */
export function dostRedakci(zdroje, data = nactiNapadane(), ted = Date.now()) {
  return nezavisleRedakce(zdroje, data) >= potrebnychRedakci(zdroje, data, ted);
}
