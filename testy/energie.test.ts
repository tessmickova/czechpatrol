import { describe, expect, it } from "vitest";
import { bateriePro, nejvetsiSpotrebitele, panelyWp, SPOTREBICE, spickaW, spotrebaPoRezimech, vydrzHodin, zPredvolby } from "../src/lib/energie";

/*
  Rozpočet energie musí být prostá aritmetika s viditelnými předpoklady:
  W × hodiny, tři režimy, ztráty, slunečné hodiny. Testy hlídají, že
  režimy do sebe zapadají a že se nikde nedopočítává něco z ničeho.
*/
const vyber = (klice: string[]) => SPOTREBICE.filter((s) => klice.includes(s.klic)).map(zPredvolby);

describe("rozpočet energie", () => {
  it("předvolby mají kladný příkon, hodiny a prioritu", () => {
    for (const s of SPOTREBICE) {
      expect(s.w, s.klic).toBeGreaterThan(0);
      expect(s.hodin, s.klic).toBeGreaterThan(0);
      expect(["kriticke", "nutne", "pohodli"]).toContain(s.priorita);
    }
  });

  it("režimy se vnořují: kritické ≤ nutné ≤ vše", () => {
    const r = spotrebaPoRezimech(vyber(["telefony", "router", "lednice", "tv"]));
    expect(r["jen-kriticke"]).toBeLessThanOrEqual(r.nutne);
    expect(r.nutne).toBeLessThanOrEqual(r.vse);
    expect(r["jen-kriticke"]).toBe(30);
    expect(r.vse).toBe(30 + 288 + 1080 + 240);
  });

  it("vydrž počítá se ztrátami a bez spotřeby nic netvrdí", () => {
    const r = spotrebaPoRezimech(vyber(["telefony"]));
    const v = vydrzHodin(1000, r, 0.15);
    expect(v["jen-kriticke"]).toBe(680);
    expect(vydrzHodin(1000, spotrebaPoRezimech([]))["vse"]).toBeNull();
  });

  it("největší spotřebitelé a špička", () => {
    const v = vyber(["konvice", "telefony", "lednice"]);
    expect(nejvetsiSpotrebitele(v, 1)[0].nazev).toBe("Lednice s mrazákem");
    expect(spickaW(v, "vse")).toBe(2055);
    expect(spickaW(v, "jen-kriticke")).toBe(10);
  });

  it("panely: potřeba / (slunečné hodiny × účinnost), zaokrouhleno na desítky", () => {
    expect(panelyWp(1000, 4.5, 0.7)).toBe(320);
    expect(panelyWp(1000, 1, 0.7)).toBe(1430);
    expect(panelyWp(0, 4.5)).toBeNull();
    expect(panelyWp(500, 0)).toBeNull();
  });

  it("baterie na dny bez slunce", () => {
    expect(bateriePro(2, 1000, 0.15)).toBe(2400);
    expect(bateriePro(0, 1000)).toBeNull();
  });
});
