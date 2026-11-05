import { describe, expect, it } from "vitest";
import { KRAJE } from "../src/config/web";
import { KRIZOVE_VYSILANI, krajVysilani, mhz } from "../src/lib/krizove-vysilani";

/*
  Co naladit v krizi (5. 11. 2026). Hlídá se: čtrnáct krajů jako jinde na
  webu, kmitočet jen s číslem a zdrojem, a žádný zástupný text — prázdné
  pole web přizná, vymyšlené číslo by bylo horší než žádné.
*/
describe("co naladit v krizi", () => {
  it("má všech čtrnáct krajů s jedinečným klíčem a jménem", () => {
    const d = KRIZOVE_VYSILANI;
    expect(d.kraje).toHaveLength(KRAJE.length);
    expect(new Set(d.kraje.map((k) => k.klic)).size).toBe(d.kraje.length);
    for (const k of d.kraje) {
      expect(k.klic).toMatch(/^[a-z]+$/);
      expect(k.nazev.length).toBeGreaterThan(3);
      expect(KRAJE.some((n) => n === k.nazev || n.endsWith(k.nazev)), k.nazev).toBe(true);
    }
  });
  it("kmitočet je vždy číslo z pásma FM se zdrojem; nikde zástupný text", () => {
    for (const k of KRIZOVE_VYSILANI.kraje) for (const v of k.fm) {
      expect(v.mhz).toBeGreaterThanOrEqual(87.5);
      expect(v.mhz).toBeLessThanOrEqual(108);
      expect(v.vysilac.length).toBeGreaterThan(1);
      expect(v.zdroj?.url, `${k.klic}: ${v.vysilac} bez zdroje`).toMatch(/^https:\/\/[a-z.]*rozhlas\.cz\//);
    }
    expect(JSON.stringify(KRIZOVE_VYSILANI)).not.toContain("[DOPLNIT]");
    expect(KRIZOVE_VYSILANI.stanice).toBe("ČRo Radiožurnál");
    expect(KRIZOVE_VYSILANI.celostatni.map((c) => c.cesta)).toEqual(["DAB+", "Televize", "Online"]);
    expect(KRIZOVE_VYSILANI.krizoveVysilani.zdroj.url).toMatch(/^https:\/\//);
  });
  it("kraj se najde podle klíče a kmitočet se píše česky", () => {
    expect(krajVysilani("praha")?.nazev).toBe("Praha");
    expect(krajVysilani("nic")).toBeNull();
    expect(krajVysilani(null)).toBeNull();
    expect(mhz(94.6)).toBe("94,6 MHz");
    expect(mhz(101)).toBe("101,0 MHz");
  });
});
