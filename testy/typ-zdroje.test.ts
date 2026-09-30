import fs from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error — .mjs nástroj bez typů
import { sjednotZdroje, TYPY_ZDROJU as TYPY_SPRAVCE } from "../nastroje/spravce.mjs";
import { TYPY_ZDROJU } from "../src/lib/kategorie";

/*
  30. 9. 2026 automat zveřejnil zdroj typu „uredni“ a sestavení webu
  spadlo. Typ se sjednotí při zveřejnění a web neznámý typ vydrží.
*/
describe("typ zdroje", () => {
  it("seznam ve správci je přesně ten webový", () => {
    expect([...TYPY_SPRAVCE].sort()).toEqual(Object.keys(TYPY_ZDROJU).sort());
  });
  it("synonyma a neznámé typy se sjednotí", () => {
    const z = sjednotZdroje([{ typ: "uredni" }, { typ: "Agentura" }, { typ: "něco" }, { typ: "wire" }, {}]);
    expect(z.map((x: { typ: string }) => x.typ)).toEqual(["primary", "wire", "media", "wire", "media"]);
  });
  it("žádný zveřejněný záznam nemá neznámý typ zdroje", () => {
    const inc = JSON.parse(fs.readFileSync("data/incidenty.json", "utf-8"));
    const spatne = inc.flatMap((i: { slug: string; zdroje?: { typ: string }[] }) => (i.zdroje ?? []).filter((z) => !(z.typ in TYPY_ZDROJU)).map(() => i.slug));
    expect(spatne).toEqual([]);
  });
});
