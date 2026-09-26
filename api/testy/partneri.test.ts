import { describe, expect, it } from "vitest";
import { zkontrolujPoptavku } from "../src/partneri";

const platna = { firma: "Zásoby s.r.o.", web: "zasoby.cz", email: "Info@Zasoby.cz", kategorie: "pripravenost", umisteni: "paticka", obdobi: "mesic", zprava: "  Nabízíme balíčky na 72 hodin. " };

describe("poptávka partnera", () => {
  it("doplní https, sjednotí e-mail a ořízne zprávu", () => {
    const p = zkontrolujPoptavku(platna);
    expect(p.web).toBe("https://zasoby.cz");
    expect(p.email).toBe("info@zasoby.cz");
    expect(p.zprava).toBe("Nabízíme balíčky na 72 hodin.");
  });
  it("odmítne chybějící firmu, web bez domény, špatný e-mail a neznámé volby", () => {
    expect(() => zkontrolujPoptavku({ ...platna, firma: "" })).toThrow();
    expect(() => zkontrolujPoptavku({ ...platna, web: "localhost" })).toThrow();
    expect(() => zkontrolujPoptavku({ ...platna, email: "nic" })).toThrow();
    expect(() => zkontrolujPoptavku({ ...platna, kategorie: "hazard" })).toThrow();
    expect(() => zkontrolujPoptavku({ ...platna, umisteni: "vyskakovaci-okno" })).toThrow();
  });
  it("prázdná zpráva je null a dlouhá se zkrátí", () => {
    expect(zkontrolujPoptavku({ ...platna, zprava: "" }).zprava).toBeNull();
    expect(zkontrolujPoptavku({ ...platna, zprava: "x".repeat(2000) }).zprava).toHaveLength(800);
  });
});
