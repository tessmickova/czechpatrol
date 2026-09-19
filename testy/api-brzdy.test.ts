import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
  Brzdy na krocích API, kde se dá něco hádat.

  Od 19. 9. 2026 je repozitář veřejný. Do té doby chránila citlivé koncové
  body i neznalost — nikdo zvenčí nevěděl, že existují ani jak se jmenují.
  Teď si to může přečíst kdokoli, takže každý krok, kde se něco zkouší,
  musí mít brzdu.

  Proč tenhle test stojí tady a ne v api/testy: tsconfig workeru zná typy
  Cloudflare, ne Node. To je záměr — brání tomu, aby se do workeru omylem
  dostal `node:fs`, který tam neexistuje. Test čte soubory, takže Node
  potřebuje, a patří proto do kořenové sady.
*/

const zdroj = (f: string) => readFileSync(new URL(`../api/src/${f}`, import.meta.url), "utf-8");

describe("brzdy v API", () => {
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

  it("do workeru se nedostal node:fs", () => {
    /* Ve Workeru neexistuje. Kdyby se tam dostal, spadne to až za běhu. */
    for (const f of ["index.ts", "sber.ts", "hlidac.ts", "sprava.ts", "navrhy.ts", "auth.ts"]) {
      expect(zdroj(f), `${f} importuje node:fs`).not.toContain("node:fs");
    }
  });
});
