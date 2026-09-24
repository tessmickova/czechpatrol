// @ts-nocheck — nástroje jsou prosté ES moduly.
import { describe, expect, it } from "vitest";
import { jeJenProjev, jeSankcionovane, nalepkyVTextu, POKYNY_TEXTU } from "../nastroje/zasady-textu.mjs";

describe("zásady textu", () => {
  it("pozná sankcionovaná média i subdomény, jiná ne", () => {
    expect(jeSankcionovane("https://www.rt.com/news/1")).toBe(true);
    expect(jeSankcionovane("https://francais.rt.com/x")).toBe(true);
    expect(jeSankcionovane("https://ria.ru/2026/x")).toBe(true);
    expect(jeSankcionovane("https://www.themoscowtimes.com/x")).toBe(false);
    expect(jeSankcionovane("https://art.com/x")).toBe(false);
  });
  it("najde nálepku od začátku slova, ne uvnitř jiného", () => {
    expect(nalepkyVTextu("ruské ponorky u Špicberk")).toEqual([]);
    expect(nalepkyVTextu("Orky zaútočili")).toEqual(["orky"]);
    expect(nalepkyVTextu("ruští okupanti")).toContain("okupant");
  });
  it("pokyny pro model zakazují nová tvrzení a nálepky", () => {
    expect(POKYNY_TEXTU).toContain("Nepřidávej žádné nové tvrzení");
    expect(POKYNY_TEXTU).toContain("nálepky");
  });

  it("řeč bez skutku pozná, čin nechá projít", () => {
    expect(jeJenProjev("Agresivní postoj Ruska představuje přímou hrozbu pro bezpečnost Evropy, uvedl Pavel v OSN")).toBe(true);
    expect(jeJenProjev("Čína může přispívat k ukončení válek, připomněl Petr Pavel v OSN")).toBe(true);
    expect(jeJenProjev("Prezident vyhlásil nouzový stav, uvedl úřad vlády")).toBe(false);
    expect(jeJenProjev("Litva uzavřela hranici s Běloruskem")).toBe(false);
    expect(jeJenProjev("Polish PM said the government banned drone flights near the border")).toBe(false);
    expect(jeJenProjev("Bavme se o bezpečnostní situaci v Evropě, žádá Rakušan Babiše, ať svolá strany")).toBe(true);
    expect(jeJenProjev("")).toBe(false);
  });
});
