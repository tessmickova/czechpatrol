import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { kampane } from "../src/lib/data";

/*
  Na přání provozovatelky (30. 9. 2026): web nemá obsahovat nic, co zbytečně
  provokuje a dělá z projektu nebo jeho lidí terč. Fakta se zdroji zůstávají;
  odchází vlastní hodnocení cizích států a připisování viny bez úředního závěru.
*/
describe("bez zbytečné provokace", () => {
  it("původce kampaně jen s úředním závěrem (vysoká jistota)", () => {
    for (const k of kampane()) {
      if (k.puvodce.koho) expect(["vysoka", "potvrzeno"], `${k.slug}: původce bez úředního závěru`).toContain(k.puvodce.jistota);
    }
  });
  it("stránka Aktéři a cíle je jen přesměrování, data a hodnocení Ruska nejsou v repozitáři", () => {
    expect(fs.readFileSync("src/app/svet/page.tsx", "utf-8")).toContain("Presmerovani");
    for (const f of ["data/svet.json", "data/rusko.json", "data/ukazka/rusko.json", "src/components/podobnost-2022.tsx"]) {
      expect(fs.existsSync(f), f).toBe(false);
    }
  });
  it("vlastní texty kampaní nehodnotí „kremelskou linii“", () => {
    for (const k of kampane()) {
      const vlastni = JSON.stringify({ ...k, zdroje: [] });
      expect(vlastni, k.slug).not.toMatch(/kremelsk/i);
    }
  });
});
