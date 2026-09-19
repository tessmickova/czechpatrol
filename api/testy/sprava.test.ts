import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/*
  Od 19. 9. 2026 je repozitář veřejný.

  Do té doby chránila citlivé koncové body i neznalost — nikdo zvenčí
  nevěděl, že existují ani jak se jmenují. Teď si to může kdokoli přečíst,
  takže každý krok, kde se něco hádá nebo zkouší, musí mít brzdu. Tenhle
  test hlídá, že se na ni nezapomene.
*/

const zdroj = (f: string) => fs.readFileSync(path.join(process.cwd(), "src", f), "utf-8");

describe("brzda na krocích, kde se dá hádat", () => {
  it("zavedení prvního správce je omezené", () => {
    const s = zdroj("sprava.ts");
    const telo = s.slice(s.indexOf("export async function bootstrap"));
    expect(telo, "bootstrap bez brzdy — kód by šlo hádat donekonečna").toContain("omez(env, req");
  });

  it("registrace i přihlášení mají brzdu", () => {
    const s = zdroj("auth.ts");
    expect(s).toContain('omez(env, req, "registrace"');
    expect(s).toContain('omez(env, req, "prihlaseni"');
  });

  it("kód správce se porovnává v konstantním čase", () => {
    /* Obyčejné === prozradí délku shody podle doby odpovědi. */
    expect(zdroj("sprava.ts")).toContain("stejne(");
  });
});
