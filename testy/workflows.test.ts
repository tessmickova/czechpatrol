import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  Běhy v GitHub Actions.

  Vznikl kvůli jedné konkrétní chybě: workflow `schvaleni.yml` dostává id
  návrhu a důvod zamítnutí z webu a původně je vkládalo rovnou do textu
  příkazu. Kdo umí odeslat rozhodnutí, mohl tím na běžci spustit cokoli —
  a běžec má zapisovací právo do repozitáře.

  Vstupy proto patří do proměnných prostředí, ne do textu příkazu. Tohle je
  pravidlo pro všechny workflow, ne jen pro ten jeden.
*/

const SLOZKA = path.join(process.cwd(), ".github/workflows");
const soubory = readdirSync(SLOZKA).filter((f) => f.endsWith(".yml"));

describe("workflow", () => {
  it("vůbec nějaké jsou", () => {
    expect(soubory.length).toBeGreaterThan(0);
  });

  it("nevkládá vstupy ani text zvenčí do příkazu", () => {
    /*
      Nebezpečné jsou hodnoty, které píše člověk zvenčí: vstupy ručního
      spuštění a údaje z událostí GitHubu. Zbytek (secrets, vars, steps)
      sem nepatří — ty si nastavuje provozovatel sám.
    */
    const zavadne = /\$\{\{\s*(inputs|github\.event)\./;
    for (const f of soubory) {
      const radky = readFileSync(path.join(SLOZKA, f), "utf-8").split("\n");
      let vPrikazu = false;
      radky.forEach((radek, i) => {
        if (/^\s*(run:|- run:)/.test(radek)) vPrikazu = true;
        else if (/^\s*(-?\s*(name|uses|with|env|id|if|shell):)/.test(radek)) vPrikazu = false;
        if (vPrikazu && zavadne.test(radek)) {
          expect.fail(`${f}:${i + 1} vkládá vstup zvenčí přímo do příkazu: ${radek.trim()}`);
        }
      });
    }
  });
});
