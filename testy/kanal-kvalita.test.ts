import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  Co odchází lidem do telefonu, musí být bez vady.

  Vzniklo ze tří chyb, které se ve veřejném kanálu sešly najednou:
  useknutý titulek uprostřed slova („…přechody s Ukra"), zástupný text
  [DOPLNIT] na živém webu a táž zpráva dvakrát.

  První dvě jsou vada dat a hlídají se tady. Třetí byla vada běhu — stav
  odeslaných zpráv se nezapisoval zpět do repozitáře — a hlídá ji
  testy/workflows.test.ts.
*/

function nacti(soubor: string): Record<string, unknown>[] {
  return JSON.parse(readFileSync(path.join(process.cwd(), "data", soubor), "utf-8"));
}

describe("kvalita toho, co jde ven", () => {
  for (const soubor of ["incidenty.json", "navrhy.json"]) {
    it(`${soubor}: krátký titulek není useknuté slovo`, () => {
      for (const z of nacti(soubor)) {
        const kratky = z.kratkyTitulek as string | undefined;
        const plny = z.titulek as string | undefined;
        if (!kratky || !plny || kratky === plny) continue;
        /*
          Předpona plného titulku znamená slepé krácení. Skutečný krátký
          titulek je jinak formulovaný, ne uříznutý.
        */
        expect(plny.startsWith(kratky), `${z.slug}: „${kratky}" je jen useknutý začátek`).toBe(false);
      }
    });

    it(`${soubor}: žádný zástupný text`, () => {
      for (const z of nacti(soubor)) {
        expect(JSON.stringify(z).includes("[DOPLNIT]"), `${z.slug} má nevyplněný zástupný text`).toBe(false);
      }
    });
  }
});
