import { describe, expect, it } from "vitest";
import { STAVY_UZITI, zpusobyVUziti } from "../src/lib/zpusoby";

/*
  Způsoby v užití.

  Nejdůležitější testy tady nehlídají, že čísla sedí — hlídají, že tabulka
  netvrdí víc, než na co má doklad. Je to jediná část webu, která se dá snadno
  přečíst jako předpověď, a právě proto se nesmí rozejít s daty.
*/
describe("způsoby v užití", () => {
  const radky = zpusobyVUziti();

  it("vrací všechny sledované způsoby včetně manipulací", () => {
    const klice = radky.map((z) => z.klic);
    expect(klice).toContain("sabotaz");
    expect(klice).toContain("drony");
    expect(klice).toContain("manipulace");
  });

  it("počet za období nikdy nepřeroste celkový počet", () => {
    for (const z of radky) expect(z.zaObdobi, z.klic).toBeLessThanOrEqual(z.celkem);
  });

  it("úředně přisouzeno Rusku se vejde do počtu za období", () => {
    // Kdyby tohle prasklo, tabulka by přisuzovala víc případů, než kolik jich má.
    for (const z of radky) expect(z.prisouzenoRusku, z.klic).toBeLessThanOrEqual(z.zaObdobi);
  });

  it("bez případu za období není stav „aktivní“ ani „právě probíhá“", () => {
    for (const z of radky) {
      if (z.zaObdobi === 0) expect(["utlumene", "bez-zaznamu"], z.klic).toContain(z.stav);
    }
  });

  it("„právě probíhá“ znamená doložený případ do dvou týdnů", () => {
    for (const z of radky) {
      if (z.stav === "prave-probiha") {
        expect(z.dniOdPosledniho, z.klic).not.toBeNull();
        expect(z.dniOdPosledniho!, z.klic).toBeLessThanOrEqual(14);
      }
    }
  });

  it("bez záznamu nemá datum posledního případu", () => {
    for (const z of radky) {
      if (z.naposledy === null) expect(z.dniOdPosledniho, z.klic).toBeNull();
    }
  });

  it("porovnání s průměrem je buď spočítané, nebo přiznaně chybějící", () => {
    // Nikdy se nedopočítává: málo historie = null, ne vymyšlená nula.
    /*
      Porovnání smí chybět ze dvou důvodů: málo historie na průměr, nebo
      nesrovnatelné období (pravidelný sběr běží kratší dobu než okno průměru).
      Když je spočítané, musí stát na kladném průměru.
    */
    for (const z of radky) {
      if (z.prumer === null) expect(z.porovnani, z.klic).toBeNull();
      else if (z.porovnani) expect(z.porovnani.prumer, z.klic).toBeGreaterThan(0);
    }
  });

  it("řadí se podle doloženého užití, ne podle závažnosti", () => {
    const vaha = { "prave-probiha": 0, aktivni: 1, utlumene: 2, "bez-zaznamu": 3 } as const;
    for (let i = 1; i < radky.length; i++) {
      expect(vaha[radky[i].stav]).toBeGreaterThanOrEqual(vaha[radky[i - 1].stav]);
    }
  });

  it("každý stav má vysvětlení, které přiznává mez poznání", () => {
    expect(STAVY_UZITI["bez-zaznamu"].popis).toMatch(/nemáme doložené/);
  });
});
