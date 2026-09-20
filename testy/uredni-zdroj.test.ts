import { describe, expect, it } from "vitest";
import { falesneUredni, jeUredniZdroj, maUredniZdroj } from "../nastroje/uredni-zdroj.mjs";
import { incidenty } from "../src/lib/data";

/*
  Úřední zdroj se pozná podle adresy.

  Proč to vzniklo: pravidlo pro automatické zveřejnění chce dva nezávislé
  zdroje, z nichž aspoň jeden je úřední. „Úřední" ale bylo tvrzení toho, kdo
  záznam připravil — stačilo napsat typ: "primary". 20. 9. 2026 se tak samy
  zveřejnily dva záznamy: jeden doložený zrcadlem tiskové zprávy rumunského
  ministerstva na globalsecurity.org, druhý článkem Českého rozhlasu.
  Oba se musely stáhnout.
*/

describe("co je úřední zdroj", () => {
  it("úřad ano", () => {
    for (const u of [
      "https://nukib.gov.cz/cs/infoservis/",
      "https://www.mapn.ro/comunicate/",
      "https://www.gov.uk/government/announcements",
      "https://nsm.no/aktuelt/",
      "https://www.consilium.europa.eu/en/press/",
      "https://shape.nato.int/nieco",
      "https://www.bsi.bund.de/DE/Service-Navi/Presse/",
    ]) {
      expect(jeUredniZdroj(u), u).toBe(true);
    }
  });

  it("zrcadlo, distribuce ani vysílatel ne", () => {
    /* Přesně ty tři adresy, na kterých se to zlomilo. */
    for (const u of [
      "https://www.globalsecurity.org/military/library/news/2026/09/mil-260914-ro-mnd01.htm",
      "https://www.mynewsdesk.com/forsvarsmakten/pressreleases/x-3463274",
      "https://www.irozhlas.cz/zpravy-svet/cokoli_2609160616_aru",
      "https://news.google.com/rss/articles/CBMiabc?oc=5",
      "https://kyivindependent.com/neco/",
    ]) {
      expect(jeUredniZdroj(u), u).toBe(false);
    }
  });

  it("nesmysl místo adresy neprojde", () => {
    for (const u of ["", "ne-adresa", "gov.cz", null, undefined]) {
      expect(jeUredniZdroj(u as string), String(u)).toBe(false);
    }
  });

  it("maUredniZdroj hledá jen mezi těmi, co se za úřední vydávají", () => {
    /* Úřední adresa označená jako médium se nepočítá — rozhoduje obojí naráz. */
    expect(maUredniZdroj([{ typ: "media", primarni: false, url: "https://nukib.gov.cz/x" }])).toBe(false);
    expect(maUredniZdroj([{ typ: "primary", primarni: true, url: "https://nukib.gov.cz/x" }])).toBe(true);
    expect(maUredniZdroj([{ typ: "primary", primarni: true, url: "https://globalsecurity.org/x" }])).toBe(false);
  });
});

describe("zveřejněné záznamy", () => {
  it("žádný automaticky zveřejněný nestojí na falešně úředním zdroji", () => {
    /*
      Tohle je ta hranice, kvůli které celé pravidlo existuje. Záznam, který
      nikdo nečetl, je na webu jen díky úřednímu zdroji — když ten neobstojí,
      nemá tam co dělat.
    */
    for (const i of incidenty()) {
      if (i.overeni !== "automaticke") continue;
      expect(falesneUredni(i.zdroje).map((z) => z.url), i.slug).toEqual([]);
    }
  });
});
