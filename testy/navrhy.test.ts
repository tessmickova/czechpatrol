import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { Incident } from "../src/lib/typy";

/*
  Fronta návrhů.

  Návrh je hotový záznam, který čeká na schválení člověkem. Na web se
  nedostane — to hlídá testy/data.test.ts, které u zveřejněných záznamů
  vyžaduje `lidskyOvereno`. Tady se hlídá druhá strana téhož: že návrh je
  hotový, a ne poloviční, aby schválení nebylo schvalováním nevědomky.
*/

type Navrh = Incident & { kam?: "zaznam" | "overujeme"; pripravil?: string };
const vse: Navrh[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/navrhy.json"), "utf-8"),
);
/* Návrh do „právě ověřovaných" má jinou stavbu — hlídá ho testy/overujeme.test.ts po schválení. */
const navrhy = vse.filter((n) => (n.kam ?? "zaznam") === "zaznam");

describe("fronta návrhů", () => {
  it("návrh má fakta, nedoložené i zdroje s adresou", () => {
    for (const n of navrhy) {
      expect(n.fakta.length, `${n.slug} bez fakt`).toBeGreaterThan(0);
      /*
        Ve frontě smí být návrh, u kterého model nic nedoloženého neoznačil.
        Vynutit tu neprázdný seznam by znamenalo buď zahodit dobře doloženou
        zprávu, nebo do ní dopsat vatu. Brána je až u schválení: `spravce
        schval` zveřejnit bez téhle věty nedovolí a člověk ji napíše.

        Proč to nestačí nechat na testu: tenhle test běží i v hodinovém sběru,
        takže jeden takový návrh zastavil nasazení celého webu.
      */
      expect(n.zdroje.length, `${n.slug} má méně než dva zdroje`).toBeGreaterThanOrEqual(2);
      for (const z of n.zdroje) {
        expect(z.url, `${n.slug}: zdroj ${z.nazev} bez adresy`).toMatch(/^https?:\/\//);
      }
    }
  });

  it("návrh není označený jako ověřený člověkem", () => {
    /* Kdyby byl, `schval` by nic nepřidával a kontrola by byla jen na papíře. */
    for (const n of vse) expect(n.lidskyOvereno, `${n.slug}`).toBe(false);
  });

  it("zdroj není starší než událost, kterou dokládá", () => {
    /* Tahle chyba tu už jednou byla: zdroj z roku 2025 „potvrzoval" událost 2026. */
    for (const n of navrhy) {
      const udalost = new Date(n.datumUdalosti).getTime();
      for (const z of n.zdroje) {
        if (!z.publikovano) continue;
        const rozdil = (udalost - new Date(z.publikovano).getTime()) / 86_400_000;
        expect(rozdil, `${n.slug}: zdroj ${z.nazev} je o ${Math.round(rozdil)} dní starší než událost`)
          .toBeLessThanOrEqual(7);
      }
    }
  });

  it("návrh ještě není mezi zveřejněnými záznamy", () => {
    const zverejnene: Incident[] = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data/incidenty.json"), "utf-8"),
    );
    const id = new Set(zverejnene.map((i) => i.id));
    for (const n of vse) expect(id.has(n.id), `${n.slug} už je zveřejněný`).toBe(false);
  });
});
