import { describe, expect, it } from "vitest";
import { KVIZ, NALEZ_KROKY, PRIRUCKY, TONY_SIREN, VYSTRAHA_KROKY, ZDROJE_LETAKU } from "../src/lib/letaky";

/*
  Letáky „Co dělat“ (3. 10. 2026): český postup HZS ČR a Policie ČR,
  ne polský nebo švédský. Testy hlídají, aby se do letáků nedostalo
  „jděte do úkrytu“ ani neoficiální překlady na cizích discích.
*/
describe("letáky", () => {
  it("tři tóny sirén s českým postupem", () => {
    expect(TONY_SIREN.map((t) => t.nazev)).toEqual(["Zkouška sirén", "Všeobecná výstraha", "Požární poplach"]);
    expect(TONY_SIREN[1].co).toContain("dovnitř");
    expect(TONY_SIREN[1].popis).toContain("kolísavý");
  });
  it("při výstraze dovnitř, zavřít, rádio — ne do sklepa ani úkrytu", () => {
    const text = VYSTRAHA_KROKY.map((k) => `${k.nadpis} ${k.text}`).join(" ");
    expect(text).toMatch(/dovnitř/);
    expect(text).toMatch(/Zavřete okna/);
    expect(text).toMatch(/rádio/);
    expect(text).not.toMatch(/úkryt/i);
    expect(text).toMatch(/ne ve sklepě/);
  });
  it("při nálezu nesahat a volat 158", () => {
    const text = NALEZ_KROKY.map((k) => `${k.nadpis} ${k.text}`).join(" ");
    expect(text).toMatch(/Nesahejte/);
    expect(text).toMatch(/158/);
  });
  it("každý leták má úřední zdroj; příručky jen od vydavatelů", () => {
    for (const z of Object.values(ZDROJE_LETAKU)) expect(z.every((x) => /\.gov\.cz\//.test(x.url))).toBe(true);
    for (const p of PRIRUCKY) expect(p.url).not.toMatch(/drive\.google|1drv\.ms|onedrive|dropbox/);
  });
  it("kvíz má jednu správnou odpověď v rozsahu", () => {
    for (const q of KVIZ) expect(q.spravne).toBeLessThan(q.moznosti.length);
  });
});
