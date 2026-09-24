import { describe, expect, it } from "vitest";
import { pripravitTed, seznamy, tlakHrozeb } from "../src/lib/priprava";

describe("Připravit teď", () => {
  it("seznamy mají tři části a každá položka odpovídá na aspoň jednu hrozbu", () => {
    const s = seznamy();
    expect(s.map((x) => x.klic)).toEqual(["72h", "rozsireny", "ai"]);
    for (const x of s) for (const p of x.polozky) expect(p.hrozby.length).toBeGreaterThan(0);
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
