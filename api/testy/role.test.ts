import { describe, expect, it } from "vitest";
import { overNastaveni } from "../src/ja";
import { maRoli, smiZmenitRoli } from "../src/role";

describe("role", () => {
  it("správce má všechno, čtenář jen své", () => {
    expect(maRoli("admin", "izs")).toBe(true);
    expect(maRoli("obcan", "izs")).toBe(false);
    expect(maRoli("izs", "podporovatel")).toBe(true);
  });
  it("vlastní roli si správce nemění a poslední správce nejde odebrat", () => {
    expect(smiZmenitRoli("a", "a", "obcan", "admin", 2)).toMatch(/vlastní/i);
    expect(smiZmenitRoli("a", "b", "obcan", "admin", 1)).toMatch(/poslední/i);
    expect(smiZmenitRoli("a", "b", "obcan", "admin", 2)).toBeNull();
  });
});

describe("ověření nastavení", () => {
  it("cizí hodnoty zahodí a doplní výchozí", () => {
    const n = overNastaveni({ frekvence: "kazdou-vterinu", minZavaznost: "kriticka", ticho: { od: "25:00", do: "07:00" }, oblasti: ["kyber", "DROP TABLE"], zpravyIzs: "ano", kraj: 42 });
    expect(n.frekvence).toBe("ihned");
    expect(n.minZavaznost).toBe("kriticka");
    expect(n.ticho).toBeNull();
    expect(n.oblasti).toEqual(["kyber"]);
    expect(n.zpravyIzs).toBe(true);
    expect(n.kraj).toBeNull();
  });
});
