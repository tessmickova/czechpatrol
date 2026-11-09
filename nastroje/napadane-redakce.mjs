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

import * as P from "./redakce-pravidla.mjs";

/* Pravidla jsou v redakce-pravidla.mjs (bez čtení souborů, použije je i web); tady jen s daty ze souboru. */
export const domenaZdroje = P.domenaZdroje;
export const jeFalesnaRedakce = (zdroj, data = nactiNapadane()) => P.jeFalesnaRedakce(zdroj, data);
export const jeNapadenaRedakce = (zdroj, data = nactiNapadane(), ted = Date.now()) => P.jeNapadenaRedakce(zdroj, data, ted);
export const potrebnychRedakci = (zdroje, data = nactiNapadane(), ted = Date.now()) => P.potrebnychRedakci(zdroje, data, ted);
export const nezavisleRedakce = (zdroje, data = nactiNapadane()) => P.nezavisleRedakce(zdroje, data);
export const dostRedakci = (zdroje, data = nactiNapadane(), ted = Date.now()) => P.dostRedakci(zdroje, data, ted);
