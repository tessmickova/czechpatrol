import { describe, expect, it } from "vitest";
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
