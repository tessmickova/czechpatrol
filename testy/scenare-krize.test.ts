import { describe, expect, it } from "vitest";
import { SCENARE_KRIZE, scenareTed } from "../src/lib/scenare-krize";
import { TYPY_UTOKU } from "../src/lib/typy-utoku";

/*
  Scénáře k boxu „Co naladit a co dělat“ (5. 11. 2026). Hlídá se: každý
  scénář má body předem i když nastane, odkazy vedou na https nebo na
  stránku webu, typ existuje, a nic, co web radit nesmí (dávky léků).
*/
describe("scénáře krize", () => {
  it("má jedinečné klíče, body a odkazy", () => {
    expect(SCENARE_KRIZE.length).toBeGreaterThanOrEqual(5);
    expect(new Set(SCENARE_KRIZE.map((s) => s.klic)).size).toBe(SCENARE_KRIZE.length);
    for (const s of SCENARE_KRIZE) {
      expect(s.nazev.length, s.klic).toBeGreaterThan(5);
      expect(s.kratce.length, s.klic).toBeGreaterThan(10);
      expect(s.predem.length, `${s.klic}: předem`).toBeGreaterThanOrEqual(2);
      expect(s.kdyzNastane.length, `${s.klic}: když nastane`).toBeGreaterThanOrEqual(2);
      expect(s.odkazy.length, `${s.klic}: odkazy`).toBeGreaterThan(0);
      for (const o of s.odkazy) expect(o.url, `${s.klic}: ${o.nazev}`).toMatch(/^(https:\/\/|\/)/);
      if (s.typ) expect(TYPY_UTOKU.some((t) => t.klic === s.typ), `${s.klic}: typ ${s.typ}`).toBe(true);
      if (s.signaly) expect(() => new RegExp(s.signaly as string, "i")).not.toThrow();
    }
    const text = JSON.stringify(SCENARE_KRIZE);
    expect(text).not.toContain("[DOPLNIT]");
    /* Dávky léků a úprava vody na web nepatří (docs/BEZPECNOST-OBSAHU.md). */
    expect(text).not.toMatch(/\d+\s?(mg|ml)\b/);
    expect(text).not.toMatch(/chlor|savo/i);
  });
  it("scénář, který se právě hlásí, jde nahoru a nese řádky z boxu Internet", () => {
    const radky = [
      { kodZeme: "FR", co: "útok na krevní banky", pocet: 2 },
      { kodZeme: null, co: "útok na chlazení v obchodech", pocet: 1 },
    ];
    const s = scenareTed(radky);
    expect(s.slice(0, 2).map((x) => x.klic).sort()).toEqual(["chlazeni", "zdravotnictvi"]);
    expect(s.find((x) => x.klic === "zdravotnictvi")?.ted).toEqual([radky[0]]);
    expect(s.find((x) => x.klic === "evakuace")?.ted).toEqual([]);
    /* „krevní banky“ nejsou banky: scénář o platbách se k nim nesmí přihlásit. */
    expect(s.find((x) => x.klic === "site")?.ted).toEqual([]);
    expect(scenareTed([{ kodZeme: "CZ", co: "útok na banky", pocet: 1 }])[0].klic).toBe("site");
    expect(scenareTed([]).map((x) => x.klic)).toEqual(SCENARE_KRIZE.map((x) => x.klic));
  });
});
