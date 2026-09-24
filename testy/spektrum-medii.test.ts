// @ts-nocheck — skripty v nastroje/ jsou prosté ES moduly bez typů.
import { describe, expect, it } from "vitest";
import { radekSpektra, spektrumZdroje } from "../nastroje/spektrum-medii.mjs";
import { sestavZpravu } from "../nastroje/rozhlas.mjs";

describe("spektrum médií", () => {
  it("zařadí podle adresy, nejdelší doména vyhrává", () => {
    expect(spektrumZdroje("https://tass.com/society/1")).toBe("ruska-statni");
    expect(spektrumZdroje("https://ru.themoscowtimes.com/2026/09/21/x")).toBe("ruska-nezavisla");
    expect(spektrumZdroje("https://news.err.ee/1610144281/x")).toBe("zapadni");
    expect(spektrumZdroje("https://english.nv.ua/x")).toBe("ukrajinska");
    expect(spektrumZdroje("https://www.policie.cz/clanek")).toBe("uredni");
    expect(spektrumZdroje("https://neznamy-web.example/x")).toBe("ostatni");
  });

  it("řádek je drobný a spočítá skupiny", () => {
    const r = radekSpektra([{ url: "https://news.err.ee/a" }, { url: "https://meduza.io/b" }, { url: "https://themoscowtimes.com/c" }]);
    expect(r).toBe("<i>Kde se to píše: západní 1 · ruská nezávislá (exil) 2</i>");
  });

  it("upozorní, když zprávu nesou jen ruská státní média", () => {
    expect(radekSpektra([{ url: "https://tass.com/a" }, { url: "https://ria.ru/b" }])).toContain("jen ruská státní média");
  });

  it("řádek je ve zprávě do kanálu", () => {
    const z = sestavZpravu({
      slug: "x", titulek: "Titulek", zeme: "Estonsko", kodZeme: "EE", zavaznost: "Y1", jistota: "vysoka", stav: "probiha",
      datumUdalosti: "2026-09-21T00:00:00Z", fakta: ["Fakt."], kategorie: [], druh: "opatreni",
      zdroje: [{ nazev: "ERR", url: "https://news.err.ee/a", typ: "media" }],
    });
    expect(z).toContain("<i>Kde se to píše: západní 1</i>");
  });
});

describe("zachycené přes Google News", () => {
  it("pozná médium podle koncovky titulku, ne podle textu", async () => {
    const { spektrumKandidata } = await import("../nastroje/spektrum-medii.mjs");
    const gn = (titulek: string) => ({ titulek, zdroj: { url: "https://news.google.com/rss/articles/abc" } });
    expect(spektrumKandidata(gn("NATO Airspace Breached - UNITED24 Media"))).toBe("ukrajinska");
    expect(spektrumKandidata(gn("TASS says drones downed - Reuters"))).toBe("zapadni");
    expect(spektrumKandidata(gn("Something happened - Neznámý Blog"))).toBe("ostatni");
  });
});
