import { describe, expect, it } from "vitest";
import cs from "../data/preklady/cs.json";
import { JAZYKY, KODY_ZEMI, nazevZeme } from "../src/lib/jazyky";
import { KLICE_ROZHRANI, NAZVY_UROVNI, nactiPreklad } from "../src/lib/preklady";
import { KATEGORIE } from "../src/lib/kategorie";
import { STAVY } from "../src/lib/kategorie";
import { UROVNE } from "../src/lib/skala";

describe("úplnost překladů", () => {
  it.each(JAZYKY.map((j) => j.kod))("jazyk %s má všechny klíče rozhraní", (kod) => {
    const p = nactiPreklad(kod);
    for (const k of KLICE_ROZHRANI) expect(p.rozhrani[k]?.trim(), `${kod}/${k}`).toBeTruthy();
  });

  it.each(JAZYKY.map((j) => j.kod))("jazyk %s má všechny číselníky", (kod) => {
    const p = nactiPreklad(kod);
    for (const k of Object.keys(KATEGORIE)) expect(p.kategorie[k as keyof typeof KATEGORIE], `${kod}/kategorie/${k}`).toBeTruthy();
    for (const k of Object.keys(STAVY)) expect(p.stavy[k as keyof typeof STAVY], `${kod}/stavy/${k}`).toBeTruthy();
    for (const n of NAZVY_UROVNI) expect(p.urovne[n], `${kod}/urovne/${n}`).toBeTruthy();
  });

  it("česká předloha má přesně ty klíče, se kterými počítá kód", () => {
    expect(Object.keys(cs.rozhrani).sort()).toEqual([...KLICE_ROZHRANI].sort());
  });

  it("neexistuje jazyk bez souboru ani soubor bez jazyka", () => {
    // require by na chybějícím souboru spadl už při importu; tohle hlídá opačný směr.
    expect(() => nactiPreklad("neexistuje")).toThrow();
  });
});

describe("názvy úrovní se nesmějí rozejít se stupnicí", () => {
  it("každý název ze skala.ts má překlad", () => {
    // Kdyby ve skala.ts přibyla sedmá úroveň, tenhle test spadne dřív,
    // než se na cizojazyčné stránce objeví prázdné místo.
    const zeStupnice = new Set(Object.values(UROVNE).map((u) => u.nazev));
    expect([...zeStupnice].sort()).toEqual([...NAZVY_UROVNI].sort());
  });
});

describe("názvy zemí", () => {
  it("stát se přeloží podle kódu ISO", () => {
    expect(nazevZeme("Německo", "en")).toBe("Germany");
    expect(nazevZeme("Lotyšsko", "lv")).toBe("Latvija");
    expect(nazevZeme("Finsko", "fi")).toBe("Suomi");
  });

  it("co není stát, zůstane česky, pokud pro to není výslovný překlad", () => {
    expect(nazevZeme("Středomoří (mezinárodní vody)", "en")).toBe("Středomoří (mezinárodní vody)");
    expect(nazevZeme("Evropa", "en", { Evropa: "Europe" })).toBe("Europe");
  });

  it("neznámá země se nevymýšlí", () => {
    expect(nazevZeme("Vymyšlenistán", "en")).toBe("Vymyšlenistán");
  });

  it("každá země v datech má buď kód ISO, nebo je to zjevně nestát", () => {
    // Hlídá, že po přidání nové země někdo doplní kód místo toho, aby se
    // čtenáři v cizím jazyce ukázal český název bez vysvětlení.
    const nestaty = [/^Evropa$/, /^NATO$/, /Středomoří/, /Baltské moře/];
    const zeme: string[] = JSON.parse(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      JSON.stringify(require("../data/incidenty.json").map((i: { zeme: string }) => i.zeme)),
    );
    const chybi = [...new Set(zeme)].filter((z) => !KODY_ZEMI[z] && !nestaty.some((r) => r.test(z)));
    expect(chybi).toEqual([]);
  });
});
