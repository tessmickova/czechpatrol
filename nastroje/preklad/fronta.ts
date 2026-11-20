/*
  Fronta pro strojový překlad (20. 11. 2026, viz nastroje/preklad/preloz.py).

    tsx nastroje/preklad/fronta.ts vyber vstup.json   — co přeložit
    tsx nastroje/preklad/fronta.ts zapis vystup.json  — zapsat překlady

  Překládá se titulek a shrnutí zachycených zpráv, které nejsou česky a ještě
  přeložené nejsou; nejnovější první. Původní znění zůstává (titulekPuvodni,
  shrnutiPuvodni) a zpráva nese `preklad` — web podle něj píše „přeloženo:“.
  Co se nepovedlo, se 24 hodin nezkouší znovu.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jeCesky } from "../../src/lib/jazyk";

const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOUBOR = path.join(KOREN, "data", "kandidati.json");
const ZNOVU_PO_H = 24;
export const NASTROJ = "Argos Translate (OPUS-MT), strojově";

type K = {
  id: string; titulek: string; titulekPuvodni?: string; shrnuti?: string | null; stav?: string; publikovano?: string | null; zachyceno: string;
  preklad?: { z: string; nastroj: string; kdy: string } | null; shrnutiPuvodni?: string | null; prekladSelhal?: string | null;
};
type Vysledek = { jazyk: string; titulek: string; shrnuti: string | null } | { chyba: string };

export function kPrekladu(fronta: readonly K[], ted = Date.now(), nejvic = 60): { id: string; titulek: string; shrnuti: string }[] {
  return fronta
    .filter((k) => k.stav !== "vyrizen" && !k.preklad && !jeCesky(k.titulek))
    .filter((k) => !k.prekladSelhal || ted - new Date(k.prekladSelhal).getTime() > ZNOVU_PO_H * 3_600_000)
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, nejvic)
    .map((k) => ({ id: k.id, titulek: k.titulekPuvodni || k.titulek, shrnuti: k.shrnuti ?? "" }));
}

export function zapisPreklady<T extends K>(fronta: T[], vysledky: Record<string, Vysledek>, ted = Date.now()): { prelozeno: number; selhalo: number } {
  let prelozeno = 0, selhalo = 0;
  const kdy = new Date(ted).toISOString();
  for (const k of fronta) {
    const v = vysledky[k.id];
    if (!v) continue;
    if ("chyba" in v) { k.prekladSelhal = kdy; selhalo++; continue; }
    if (!v.titulek?.trim()) continue;
    k.titulekPuvodni = k.titulekPuvodni || k.titulek;
    k.titulek = v.titulek.trim();
    if (v.shrnuti?.trim()) { k.shrnutiPuvodni = k.shrnuti ?? null; k.shrnuti = v.shrnuti.trim(); }
    k.preklad = { z: v.jazyk, nastroj: NASTROJ, kdy };
    delete k.prekladSelhal;
    prelozeno++;
  }
  return { prelozeno, selhalo };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [rezim, soubor] = process.argv.slice(2);
  const fronta = JSON.parse(fs.readFileSync(SOUBOR, "utf-8")) as K[];
  if (rezim === "vyber" && soubor) {
    const prace = kPrekladu(fronta, Date.now(), Number(process.env.PREKLAD_NEJVIC ?? 60));
    fs.writeFileSync(soubor, JSON.stringify(prace, null, 2));
    console.log(`[preklad] k překladu ${prace.length} zpráv`);
  } else if (rezim === "zapis" && soubor) {
    if (!fs.existsSync(soubor)) { console.log("[preklad] výstup chybí — nic se nezapisuje"); process.exit(0); }
    const vysledky = JSON.parse(fs.readFileSync(soubor, "utf-8")) as Record<string, Vysledek>;
    const s = zapisPreklady(fronta, vysledky);
    fs.writeFileSync(SOUBOR, JSON.stringify(fronta, null, 2) + "\n", "utf-8");
    console.log(`[preklad] zapsáno ${s.prelozeno}, nepovedlo se ${s.selhalo}`);
  } else {
    console.log("použití: fronta.ts vyber|zapis soubor.json");
  }
}
