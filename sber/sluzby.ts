import fs from "node:fs";
import path from "node:path";
import { stahni } from "./nacti";
import { prectiStatuspage, SLUZBY, type SnimekSluzeb } from "../src/lib/sluzby";

/*
  Snímek stavu služeb pro web.

  Prohlížeč si stav čte sám, tohle je záloha: aby stránka nikdy nebyla
  prázdná (první vykreslení, blokovaný prohlížeč, výpadek stavové stránky)
  a aby u každé služby byl čas posledního čtení. Běží s každým sběrem —
  jsou to tři malé JSONy, žádný úřad se tím neobtěžuje.
*/

const SOUBOR = path.join(process.cwd(), "data", "sluzby.json");

export async function sbirejSluzby(): Promise<void> {
  const ted = new Date().toISOString();
  const stavy = await Promise.all(
    SLUZBY.map(async (s) => {
      try {
        const { stav, telo } = await stahni(s.url, 2);
        if (stav >= 400) return { ...prectiStatuspage(s.klic, null, ted), chyba: `HTTP ${stav}` };
        let json: unknown;
        try { json = JSON.parse(telo); } catch { return { ...prectiStatuspage(s.klic, null, ted), chyba: "odpověď není JSON" }; }
        return prectiStatuspage(s.klic, json, ted);
      } catch (e) {
        return { ...prectiStatuspage(s.klic, null, ted), chyba: String(e instanceof Error ? e.message : e) };
      }
    }),
  );
  const snimek: SnimekSluzeb = { aktualizovano: ted, stavy };
  fs.writeFileSync(SOUBOR, JSON.stringify(snimek, null, 2) + "\n", "utf-8");
  const chyb = stavy.filter((s) => s.chyba).length;
  console.log(`[sber] služby: ${stavy.length} přečteno, ${chyb} bez údaje${chyb ? ` (${stavy.filter((s) => s.chyba).map((s) => `${s.klic}: ${s.chyba}`).join("; ")})` : ""}`);
}
