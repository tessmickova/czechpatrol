import { describe, expect, it } from "vitest";
import seznamy from "../data/odolnost/seznamy.json";
import { jeRadio } from "../src/components/tip-asa";
import { ODBERY } from "../src/lib/pripravenost";

describe("TIP ASA u rádia (26. 9. 2026)", () => {
  it("pozná rádio v názvu položky", () => {
    expect(jeRadio("Rádio na baterie nebo kliku")).toBe(true);
    expect(jeRadio("Autorádio jako záložní rádio")).toBe(true);
    expect(jeRadio("Nabitá powerbanka a kabely")).toBe(false);
  });
  it("každý seznam s rádiem ho dostane", () => {
    const nazvy = Object.values(seznamy.seznamy).flatMap((s) => s.polozky.map((p) => p.nazev)).filter(jeRadio);
    expect(nazvy.length).toBeGreaterThanOrEqual(3);
    expect(ODBERY.some((q) => jeRadio(q.nazev))).toBe(true);
  });
});
