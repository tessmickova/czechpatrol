import { describe, expect, it } from "vitest";
import { PASMA, UROVNE, pasmo, rozdil, tokeny } from "../src/lib/skala";
import type { Uroven } from "../src/lib/typy";

const VSECHNY = Object.keys(UROVNE) as Uroven[];

describe("stupnice závažnosti", () => {
  it("má souvislé pořadí 1–13 bez děr a duplicit", () => {
    const poradi = VSECHNY.map((u) => UROVNE[u].poradi).sort((a, b) => a - b);
    expect(poradi).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
  });

  it("řadí pásma vzestupně — zelená nikdy nesmí být výš než červená", () => {
    const nejvyssiVPasmu = (p: string) =>
      Math.max(...VSECHNY.filter((u) => UROVNE[u].pasmo === p).map((u) => UROVNE[u].poradi));
    expect(nejvyssiVPasmu("zelena")).toBeLessThan(nejvyssiVPasmu("zluta"));
    expect(nejvyssiVPasmu("zluta")).toBeLessThan(nejvyssiVPasmu("prechod"));
    expect(nejvyssiVPasmu("prechod")).toBeLessThan(nejvyssiVPasmu("oranzova"));
    expect(nejvyssiVPasmu("oranzova")).toBeLessThan(nejvyssiVPasmu("cervena"));
  });

  it("každá úroveň má vizuální tokeny", () => {
    for (const u of VSECHNY) {
      expect(tokeny(u).plna).toMatch(/^#[0-9a-f]{6}$/i);
      expect(PASMA[pasmo(u)]).toBeDefined();
    }
  });

  it("rozdíl úrovní je kladný při zhoršení", () => {
    expect(rozdil("O1", "Y1")).toBeGreaterThan(0);
    expect(rozdil("Y1", "O1")).toBeLessThan(0);
    expect(rozdil("Y2", "Y2")).toBe(0);
  });

  it("u každé úrovně kromě nejvyšších je uvedeno, co NEznamená", () => {
    // Věta „neznamená“ je to hlavní, co brání zbytečnému strachu.
    for (const u of VSECHNY) {
      if (UROVNE[u].pasmo === "cervena") continue;
      expect(UROVNE[u].neznamena.length).toBeGreaterThan(10);
    }
  });
});
