import { describe, expect, it } from "vitest";
import { seznamy } from "../src/lib/priprava";
import { pripravitTed, tlakHrozeb, type NoveRiziko } from "../src/lib/priprava-ted";

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
  /* Nové riziko z platného tipu (23. 11. 2026): jisté místo v kartě, dokud tip platí. */
  const riziko: NoveRiziko = { hrozba: "satelity", nadpis: "Zkušební riziko", kdy: "2026-11-23", odkaz: "/vesmir/" };
  it("nové riziko z tipu má v kartě místo a nese odkaz", () => {
    const v = pripravitTed(Date.parse("2026-11-24T12:00:00Z"), [riziko]);
    expect(v.polozky).toHaveLength(3);
    const p = v.polozky.find((x) => x.hrozba === "satelity");
    expect(p?.hrozby).toContain("satelity");
    expect(p?.duvod).toContain("nové riziko");
    expect(v.noveRiziko?.odkaz).toBe("/vesmir/");
    expect(new Set(v.polozky.map((x) => x.hrozba)).size).toBe(3);
    expect(new Set(v.polozky.map((x) => x.funkce ?? x.klic)).size).toBe(3);
  });
  it("bez nového rizika karta počítá jen z doloženého", () => {
    const v = pripravitTed(Date.parse("2026-11-24T12:00:00Z"), []);
    expect(v.noveRiziko).toBeNull();
    expect(v.polozky.some((x) => x.hrozba === "satelity")).toBe(false);
  });
});
