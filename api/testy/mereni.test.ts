import { describe, expect, it } from "vitest";
import { bunka, MRIZKA, ocistiCestu, ocistiPrvek, ocistiUdalost } from "../src/mereni";

/* Měření nesmí pustit dovnitř nic, z čeho by šel poznat člověk, ani rozbít tabulku. */
describe("měření návštěvnosti", () => {
  it("cesta bez dotazu a kotvy, správa se neměří", () => {
    expect(ocistiCestu("/udalosti/?tab=x#y")).toBe("/udalosti/");
    expect(ocistiCestu("/zeme/cz")).toBe("/zeme/cz/");
    expect(ocistiCestu("/sprava/opravy/")).toBeNull();
    expect(ocistiCestu("https://jinde.cz/")).toBeNull();
    expect(ocistiCestu("/" + "a".repeat(200))).toBeNull();
    expect(ocistiCestu("/<script>")).toBeNull();
  });
  it("prvek je krátký a bez řídicích znaků", () => {
    expect(ocistiPrvek("  Přihlásit\n  upozornění ")).toBe("Přihlásit upozornění");
    expect(ocistiPrvek("x".repeat(200)).length).toBe(80);
    expect(ocistiPrvek(42)).toBe("");
  });
  it("procenta padají do mřížky 20 × 20", () => {
    expect(bunka(0)).toBe(0);
    expect(bunka(100)).toBe(MRIZKA - 1);
    expect(bunka(50)).toBe(10);
    expect(bunka(-1)).toBeNull();
    expect(bunka("5")).toBeNull();
  });
  it("událost bez známého druhu nebo cesty se zahodí, cizí pole se nepřebírají", () => {
    expect(ocistiUdalost({ druh: "zobrazeni", cesta: "/", odkud: "socialni", zarizeni: "mobil", ip: "1.2.3.4" })).toEqual({ druh: "zobrazeni", cesta: "/", odkud: "socialni", zarizeni: "mobil" });
    expect(ocistiUdalost({ druh: "klik", cesta: "/", prvek: "Události", x: 12, y: 80 })).toEqual({ druh: "klik", cesta: "/", prvek: "Události", x: 12, y: 80 });
    expect(ocistiUdalost({ druh: "cokoli", cesta: "/" })).toBeNull();
    expect(ocistiUdalost({ druh: "klik" })).toBeNull();
  });
});
