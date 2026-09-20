import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Incident, PravniStav } from "../src/lib/typy";

const KOREN = path.join(process.cwd(), "data");
const cti = <T,>(p: string): T => JSON.parse(fs.readFileSync(path.join(KOREN, p), "utf-8"));

describe("produkční data", () => {
  it("každá zveřejněná událost má zdroj a prošla kontrolou — lidskou, nebo doloženou", () => {
    /*
      Pojistka proti tomu, aby se na web dostalo neověřené tvrzení.

      Od 20. 9. 2026 se zveřejňuje dvěma cestami: schválením člověkem, nebo
      automaticky, když záznam stojí na dvou nezávislých zdrojích a aspoň
      jeden z nich je úřední. Druhá cesta je slabší, proto MUSÍ být
      u záznamu označená — čtenář má poznat, co nikdo nečetl.
    */
    for (const i of cti<Incident[]>("incidenty.json")) {
      expect(i.zdroje.length, `událost ${i.slug} bez zdroje`).toBeGreaterThan(0);

      if (i.lidskyOvereno) continue;

      expect(i.overeni, `událost ${i.slug} není označená, jak byla ověřena`).toBe("automaticke");
      expect(i.zdroje.length, `${i.slug}: automatické zveřejnění chce dva zdroje`).toBeGreaterThanOrEqual(2);
      expect(
        i.zdroje.some((z) => z.primarni === true || z.typ === "primary"),
        `${i.slug}: automatické zveřejnění chce aspoň jeden úřední zdroj`,
      ).toBe(true);
      /* Bez lidského čtení se nezveřejňuje hodnocení projektu, jen doložená fakta. */
      expect(i.vyznam ?? "", `${i.slug}: automatický záznam nesmí nést hodnocení`).toBe("");
    }
  });

  it("právní položky mají vysvětlení, právní základ a primární zdroj", () => {
    for (const p of cti<PravniStav>("pravni-stav.json").polozky) {
      expect(p.vysvetleni.length).toBeGreaterThan(30);
      expect(p.zdroje.some((z) => z.primarni), `${p.klic} bez primárního zdroje`).toBe(true);
    }
  });

  it("ukázková data jsou oddělená od produkčních", () => {
    const ukazka = path.join(KOREN, "ukazka");
    if (!fs.existsSync(ukazka)) return;
    const ostre = cti<Incident[]>("incidenty.json").map((i) => i.slug);
    const ukazkove: Incident[] = JSON.parse(
      fs.readFileSync(path.join(ukazka, "incidenty.json"), "utf-8"),
    );
    for (const u of ukazkove) {
      expect(ostre, `ukázkový slug ${u.slug} je i v produkčních datech`).not.toContain(u.slug);
      // Ukázka nesmí odkazovat na skutečné adresy — nesmí vypadat jako doložená.
      for (const z of u.zdroje) expect(z.url).toContain("example.invalid");
    }
  });
});
