import { describe, expect, it } from "vitest";
import { faktory, hranice, mapaEvropy, nejmeneChranene, ochranaZemi } from "../src/lib/ochrana";
import { DALSI_STRANKY } from "../src/components/postranni-panel";

/* Ochranné vazby zemí (30. 9. 2026): jen fakta se zdrojem, každá země je na mapě. */
describe("ochranné vazby zemí", () => {
  it("každý faktor má zdroj na https a známé země", () => {
    const kody = new Set(ochranaZemi().map((z) => z.kod));
    for (const f of [...faktory(), hranice()]) {
      expect(f.zdroje.length, f.nazev).toBeGreaterThan(0);
      for (const z of f.zdroje) expect(z.url).toMatch(/^https:\/\//);
      for (const k of f.zeme) expect(kody.has(k), `${f.nazev}: ${k}`).toBe(true);
    }
  });
  it("každá hodnocená země má obrys na mapě", () => {
    const naMape = new Set(mapaEvropy().staty.map((s) => s.kod));
    for (const z of ochranaZemi()) expect(naMape.has(z.kod), z.kod).toBe(true);
  });
  it("počty odpovídají faktům (NATO 30 evropských, EU 27, JEF 10, předsunuté 8)", () => {
    const n = Object.fromEntries(faktory().map((f) => [f.klic, f.zeme.length]));
    expect(n).toMatchObject({ nato: 30, eu: 27, jef: 10, predsunute: 8, jaderne: 2 });
    expect(ochranaZemi().find((z) => z.kod === "CZ")).toMatchObject({ pocet: 2, hranice: false });
  });
  it("nahoře jsou země s hranicí, od nejméně vazeb", () => {
    const p = nejmeneChranene();
    expect(p[0]).toMatchObject({ kod: "UA", pocet: 0, hranice: true });
  });
  it("stránka je v rozbalovacím menu", () => {
    expect(DALSI_STRANKY.some((s) => s.href === "/ochrana/")).toBe(true);
  });
});

describe("obrázek mapy odpovídá datům (jinak: node nastroje/mapa-evropy.mjs)", () => {
  it("u každé hodnocené země sedí počet vazeb v obrázku", async () => {
    const fs = await import("node:fs");
    const svg = fs.readFileSync("public/mapa-ochrany.svg", "utf-8");
    for (const z of ochranaZemi()) expect(svg, z.nazev).toContain(`<title>${z.nazev}: ${z.pocet}</title>`);
  });
});
