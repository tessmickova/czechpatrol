import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  Postranní menu (9. 11. 2026). Pevný pás dole (Zavřít, tísňová čísla) musí
  zůstat nízký: 5. 11. se do něj dostal blok „Co naladit a co dělat“ s kraji
  a scénáři, vytlačil celý seznam stránek a z menu zbyl useknutý první řádek.
  Hlídá se, že dlouhý obsah je v posouvatelné části, ne v pevném pásu.
*/
describe("postranní menu", () => {
  const zdroj = fs.readFileSync(path.join(__dirname, "..", "src", "components", "postranni-panel.tsx"), "utf-8");
  const pevnyPas = zdroj.slice(zdroj.indexOf("vždy dole"));
  it("pevný pás dole nenese blok Co naladit ani jiný dlouhý obsah", () => {
    expect(zdroj.indexOf("vždy dole")).toBeGreaterThan(0);
    expect(pevnyPas).not.toContain("<CoNaladitVMenu");
    expect(pevnyPas).not.toContain("<Scenare");
  });
  it("blok Co naladit je v posouvatelné části menu", () => {
    const posuv = zdroj.slice(zdroj.indexOf("overflow-y-auto"), zdroj.indexOf("vždy dole"));
    expect(posuv).toContain("<CoNaladitVMenu");
  });
});
