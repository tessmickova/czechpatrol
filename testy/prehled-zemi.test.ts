import { describe, expect, it } from "vitest";
import { novaZjisteni } from "../src/lib/agregace";
import { spocitejOkna } from "../src/components/pocitadla-zive";
import type { Zaznam } from "../src/lib/agregace";

const zaznam = (n: Partial<Zaznam> & Record<string, unknown>) => ({
  id: "x", slug: "x", titulek: "T", kratkyTitulek: "T", zeme: "Německo", kodZeme: "DE",
  kategorie: [], datumUdalosti: "2026-09-01T00:00:00Z", datumZjisteni: "2026-09-01T00:00:00Z",
  aktualizovano: "2026-09-01T00:00:00Z", zavaznost: "O1", jistota: "vysoka", stav: "neuvedeno",
  atribuce: "vysetrovana", puvodce: "neznamy", druh: "pripad", fakta: [], neznameho: [], vyznam: "",
  eskalacniSpousteče: [], deeskalacniSignaly: [], zdroje: [], souvisejici: [], historie: [],
  novy: false, zapocitanoTyden: "", aiZpracovano: false, lidskyOvereno: true, ...n,
}) as unknown as Zaznam;

describe("nová zjištění", () => {
  it("bere posuny ve vyšetřování, ne prohlášení ani opatření", () => {
    const vse = [
      zaznam({ slug: "obvineni", stav: "obvineni", datumZjisteni: "2026-09-05T00:00:00Z" }),
      zaznam({ slug: "aktualizace", druh: "aktualizace", datumZjisteni: "2026-09-04T00:00:00Z" }),
      zaznam({ slug: "potvrzen", atribuce: "oficialni", datumZjisteni: "2026-09-03T00:00:00Z" }),
      zaznam({ slug: "reakce", druh: "reakce", puvodce: null, atribuce: "oficialni", datumZjisteni: "2026-09-06T00:00:00Z" }),
      zaznam({ slug: "opatreni", druh: "opatreni", puvodce: null, atribuce: "oficialni", datumZjisteni: "2026-09-06T00:00:00Z" }),
      zaznam({ slug: "bezniceho", datumZjisteni: "2026-09-02T00:00:00Z" }),
    ];
    const v = novaZjisteni(vse, 10);
    expect(v.map((x) => x.zaznam.slug)).toEqual(["obvineni", "aktualizace", "potvrzen"]);
    expect(v[0].duvod).toBe("podáno obvinění");
    expect(v[1].duvod).toBe("nové zjištění k případu");
  });
});

describe("počítadla oken", () => {
  const ted = new Date("2026-09-07T10:00:00Z").getTime();
  const den = (d: string, cz = false) => ({ kdy: `${d}T08:00:00Z`, cz });

  it("počítá dnešek podle pražského dne, ne podle 24 hodin zpět", () => {
    const o = spocitejOkna([den("2026-09-07"), den("2026-09-06"), den("2026-08-20"), den("2025-12-31")], ted);
    expect(o.dnes).toBe(1);
    expect(o.tyden).toBe(2);
    expect(o.mesic).toBe(3);
    expect(o.rok).toBe(3);
    expect(o.celkem).toBe(4);
    expect(o.nazevRoku).toBe("2026");
  });
  it("české případy za 30 dní počítá zvlášť", () => {
    const o = spocitejOkna([den("2026-09-06", true), den("2026-09-06"), den("2026-01-01", true)], ted);
    expect(o.cesko30).toBe(1);
  });
});
