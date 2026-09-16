import { describe, expect, it } from "vitest";
import { naliehaveVOkne } from "../src/components/urgentni";
import type { Kandidat } from "../src/lib/typy";

/*
  Sekce „Urgentní upozornění" na úvodní straně.

  Hlídá se tu jediná věc, na které to slovo stojí: čas. Týden stará
  zachycená zpráva pod nadpisem „urgentní" naučí čtenáře nadpis přehlížet,
  a pak ho nepřečte ani ve chvíli, kdy tam bude patřit.
*/

const ted = new Date("2026-09-16T09:00:00Z").getTime();

function kandidat(publikovano: string, naliehave: boolean): Kandidat {
  return {
    id: `k-${publikovano}`,
    zachyceno: publikovano,
    publikovano,
    zdroj: { nazev: "Zdroj", url: "https://example.org/a", typ: "medium", primarni: false },
    titulek: "Titulek",
    titulekPuvodni: "Titulek",
    shrnuti: "",
    kodZeme: "CZ",
    zeme: "Česko",
    kategorie: [],
    druhOdhad: "pripad",
    klasifikace: "pravidla",
    shody: [],
    naliehave: naliehave ? { druh: "krizove-vysilani", slovo: "krizové vysílání" } : null,
  } as unknown as Kandidat;
}

describe("urgentní upozornění", () => {
  it("bere jen naléhavé z posledních 48 hodin", () => {
    const v = naliehaveVOkne(
      [
        kandidat("2026-09-15T20:00:00Z", true),
        kandidat("2026-09-08T10:00:00Z", true), // týden stará: sem nepatří
        kandidat("2026-09-16T08:00:00Z", false), // čerstvá, ale ne naléhavá
      ],
      ted,
    );
    expect(v.map((k) => k.publikovano)).toEqual(["2026-09-15T20:00:00Z"]);
  });

  it("hranici okna drží na 48 hodinách", () => {
    const tesne = new Date(ted - 47.5 * 3_600_000).toISOString();
    const pozde = new Date(ted - 48.5 * 3_600_000).toISOString();
    expect(naliehaveVOkne([kandidat(tesne, true)], ted)).toHaveLength(1);
    expect(naliehaveVOkne([kandidat(pozde, true)], ted)).toHaveLength(0);
  });

  it("ukazuje nejvýš tři, nejnovější první", () => {
    const v = naliehaveVOkne(
      ["2026-09-16T08:00:00Z", "2026-09-16T07:00:00Z", "2026-09-16T06:00:00Z", "2026-09-16T05:00:00Z"].map((d) =>
        kandidat(d, true),
      ),
      ted,
    );
    expect(v).toHaveLength(3);
    expect(v[0].publikovano).toBe("2026-09-16T08:00:00Z");
  });
});
