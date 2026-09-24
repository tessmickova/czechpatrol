import { describe, expect, it } from "vitest";
import { FUNKCE } from "../src/lib/odolnost";
import { NAZVY_HROZEB, pripravitTed, seznamy, SEZNAMY_S_AI, tlakHrozeb } from "../src/lib/priprava";

describe("Připravit teď", () => {
  it("seznamy mají čtyři části; každá položka odpovídá na známou hrozbu a míří na známou oblast kalkulačky", () => {
    const s = seznamy();
    expect(s.map((x) => x.klic)).toEqual(["72h", "rozsireny", "pokrocile", "ai"]);
    const klice = new Set<string>();
    for (const x of s) {
      for (const p of x.polozky) {
        expect(p.hrozby.length, `${x.klic}/${p.klic}`).toBeGreaterThan(0);
        for (const h of p.hrozby) expect(NAZVY_HROZEB[h], `${x.klic}/${p.klic}: ${h}`).toBeDefined();
        if (p.funkce) expect(FUNKCE.some((f) => f.klic === p.funkce), `${x.klic}/${p.klic}: ${p.funkce}`).toBe(true);
        expect(klice.has(p.klic), `duplicitní klíč ${p.klic}`).toBe(false);
        klice.add(p.klic);
      }
    }
  });

  it("seznamy sepsané s pomocí AI to říkají v popisu (AI Act, čl. 50)", () => {
    for (const x of seznamy()) {
      if (SEZNAMY_S_AI.includes(x.klic)) expect(x.popis, x.klic).toMatch(/AI/);
    }
    expect(SEZNAMY_S_AI).toContain("pokrocile");
  });

  it("tipy pro pokročilé nedávají zdravotní, chemické ani elektrikářské postupy", () => {
    const text = JSON.stringify(seznamy().find((x) => x.klic === "pokrocile")!.polozky);
    expect(text).not.toMatch(/dávk|mg\b|chlor|savo|jodov|rozvaděč|přepoj|zapojit generátor/i);
  });
  it("tlak je seřazený a informace jsou vždy v základu", () => {
    const t = tlakHrozeb();
    for (let i = 1; i < t.length; i++) expect(t[i - 1].skore).toBeGreaterThanOrEqual(t[i].skore);
    expect(t.some((x) => x.klic === "informace")).toBe(true);
  });
  it("vybere tři položky, každou z jiné oblasti a k jiné hrozbě, s důvodem", () => {
    const v = pripravitTed();
    expect(v.polozky).toHaveLength(3);
    expect(new Set(v.polozky.map((p) => p.hrozba)).size).toBe(3);
    expect(new Set(v.polozky.map((p) => p.funkce ?? p.klic)).size).toBe(3);
    for (const p of v.polozky) expect(p.duvod.length).toBeGreaterThan(5);
  });
});
