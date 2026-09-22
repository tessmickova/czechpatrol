import { describe, expect, it } from "vitest";
import { smerCeny, smerZmeny } from "../src/lib/smer";

/*
  Směr změny musí být určený stupnicí, ne slovy. Kdyby se hádal z textu,
  „narušeno → běžný provoz“ by se dalo přečíst i jako zhoršení kvůli slovu
  „narušeno“ v něm.
*/
describe("směr změny úředního stavu", () => {
  it("návrat k běžnému provozu je zlepšení", () => {
    expect(smerZmeny("Palivo a čerpací stanice: narušeno → běžný provoz")).toBe("zlepseni");
    expect(smerZmeny("Mobilní síť: sledujeme → běžný provoz")).toBe("zlepseni");
  });

  it("vyhlášení a aktivace jsou zhoršení", () => {
    expect(smerZmeny("Mobilizace: NE → ANO")).toBe("zhorseni");
    expect(smerZmeny("NATO čl. 4 (konzultace): neaktivní → aktivováno")).toBe("zhorseni");
    expect(smerZmeny("Hodnocení: Nízká → Zvýšená")).toBe("zhorseni");
  });

  it("snížení úrovně je zlepšení, i když cílový stupeň zní vážně", () => {
    expect(smerZmeny("Hodnocení: Vysoká → Zvýšená")).toBe("zlepseni");
    expect(smerZmeny("Hodnocení: Vážná → Mírně zvýšená")).toBe("zlepseni");
  });

  it("bez stupnice nebo mimo ni je bez směru", () => {
    expect(smerZmeny("Palivo: bez ověřeného zdroje → běžný provoz")).toBe("neutral");
    expect(smerZmeny("zveřejněné události: 10 → 12")).toBe("neutral");
    expect(smerZmeny("cokoli bez šipky")).toBe("neutral");
  });

  it("cena: nad práh podle znaménka, pod prahem nic", () => {
    expect(smerCeny(0.8, 0.5)).toBe("zhorseni");
    expect(smerCeny(-0.6, 0.5)).toBe("zlepseni");
    expect(smerCeny(0.2, 0.5)).toBe("neutral");
  });
});
