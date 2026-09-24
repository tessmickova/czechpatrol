// @ts-nocheck — nástroje jsou prosté ES moduly.
import { describe, expect, it } from "vitest";
import { chybySouhrnu, jeCerstvy } from "../nastroje/souhrn-situace.mjs";
import { prevzitSouhrn } from "../nastroje/prevzit-od-patrola.mjs";

const ted = Date.parse("2026-09-24T10:00:00Z");
const dobry = {
  veta: "V úředních zdrojích Česka dnes neplatí žádné mimořádné omezení. V okolí evidujeme za týden pět doložených záznamů, hlavně narušení vzdušného prostoru drony v Polsku a Pobaltí.",
  aktualizovano: "2026-09-24T09:00:00Z",
  napsal: "patrol",
  podklady: ["a", "b"],
};

describe("souhrn situace", () => {
  it("střízlivá věta projde", () => { expect(chybySouhrnu(dobry, ted)).toEqual([]); });
  it("prázdný souhrn je platný", () => { expect(chybySouhrnu({ veta: null }, ted)).toEqual([]); });
  it("panika, vykřičník, odkaz a předpověď neprojdou", () => {
    expect(chybySouhrnu({ ...dobry, veta: `${dobry.veta} Hrozí válka!` }, ted).length).toBeGreaterThan(0);
    expect(chybySouhrnu({ ...dobry, veta: `${dobry.veta} Viz https://x.cz.` }, ted)).toContain("věta obsahuje odkaz");
    expect(chybySouhrnu({ ...dobry, veta: `${dobry.veta} Brzy to přijde.` }, ted).some((c) => c.startsWith("předpověď"))).toBe(true);
  });
  it("bez podkladů a bez autora neprojde", () => {
    expect(chybySouhrnu({ ...dobry, podklady: [] }, ted).some((c) => c.startsWith("chybí podklady"))).toBe(true);
    expect(chybySouhrnu({ ...dobry, napsal: "sber" }, ted)).toContain("napsal musí být „patrol“");
  });
  it("čerstvost končí po 30 hodinách", () => {
    expect(jeCerstvy(dobry, ted)).toBe(true);
    expect(jeCerstvy(dobry, ted + 31 * 3_600_000)).toBe(false);
    expect(jeCerstvy({ veta: null }, ted)).toBe(false);
  });
  it("převzetí: jen novější a platná; smazat nejde", () => {
    const stary = { veta: "x", aktualizovano: "2026-09-24T08:00:00Z" };
    expect(prevzitSouhrn(stary, dobry, ted)?.veta).toBe(dobry.veta);
    expect(prevzitSouhrn({ veta: "x", aktualizovano: "2026-09-24T09:30:00Z" }, dobry, ted)).toBeNull();
    expect(prevzitSouhrn(stary, { ...dobry, veta: "Panika, utečte!" }, ted)).toBeNull();
    expect(prevzitSouhrn(stary, { veta: null }, ted)).toBeNull();
  });
});
