// @ts-nocheck — nástroje jsou prosté ES moduly.
import { describe, expect, it } from "vitest";
import { jeSankcionovane, nalepkyVTextu, POKYNY_TEXTU } from "../nastroje/zasady-textu.mjs";

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
});
