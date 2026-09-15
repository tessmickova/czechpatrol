import { describe, expect, it } from "vitest";
import { porovnejSPrumerem, srovnatelneObdobi } from "../src/lib/porovnani";
import { cas, datum, datumCas, datumSlovy, pocet, rozsah } from "../src/lib/format";

describe("formátování času", () => {
  it("uvádí absolutní datum, ne relativní", () => {
    expect(datum("2026-09-04T13:22:00Z")).toBe("4. 9. 2026");
    expect(datumSlovy("2026-09-04T13:22:00Z")).toBe("4. září 2026");
  });

  it("spojuje datum a čas oddělovačem", () => {
    expect(datumCas("2026-09-04T13:22:00Z")).toBe("4. 9. 2026 · 13:22");
    expect(cas("2026-09-04T08:05:00Z")).toBe("08:05");
  });

  it("skládá rozsah týdne", () => {
    expect(rozsah("2026-08-31T00:00:00Z", "2026-09-06T23:59:59Z")).toBe("31. 8. – 6. 9.");
  });

  it("skloňuje počty", () => {
    expect(pocet(1, "signál", "signály", "signálů")).toBe("1 signál");
    expect(pocet(3, "signál", "signály", "signálů")).toBe("3 signály");
    expect(pocet(15, "signál", "signály", "signálů")).toBe("15 signálů");
  });
});

describe("porovnání s průměrem", () => {
  it("nesrovnatelné období nevrací hodnocení", () => {
    /*
      Pravidelný sběr běží od 07/2026. Dvouleté okno průměru tedy zasahuje do
      doby, kdy se zpětně doplňovalo jen to nejviditelnější. Vyšší dnešní číslo
      by měřilo náš sběr, ne skutečnost — a web z něj nesmí udělat závěr
      o růstu hrozby.
    */
    const ted = Date.parse("2026-09-15T00:00:00Z");
    expect(srovnatelneObdobi(ted, 2)).toBe(false);
    expect(porovnejSPrumerem(23, 5.9, 2, ted)).toBeNull();
  });

  it("jakmile je období srovnatelné, hodnocení se vrátí", () => {
    // Dva roky po zahájení pravidelného sběru už okno celé pokrývá.
    const ted = Date.parse("2028-09-15T00:00:00Z");
    expect(srovnatelneObdobi(ted, 2)).toBe(true);
    expect(porovnejSPrumerem(23, 5.9, 2, ted)?.smer).toBe("vyssi");
  });

  it("slovní popis netvrdí statistickou významnost", () => {
    // „Významně" je závěr z metody, kterou tu nemáme. Popisuje se poměr.
    const ted = Date.parse("2028-09-15T00:00:00Z");
    for (const h of [0, 1, 3, 6, 12, 30]) {
      const p = porovnejSPrumerem(h, 5.9, 2, ted);
      if (p) expect(p.slovo).not.toMatch(/významn/i);
    }
  });
});
