// @ts-nocheck — nástroj je prostý ES modul bez typů.
import { describe, expect, it } from "vitest";
import { podobnaUdalost } from "../nastroje/podobna-udalost.mjs";
import { casyProPanel } from "../src/lib/casy-panelu";

/*
  Tatáž událost dvakrát (31. 10. 2026): polský Starlink a lotyšské kabely
  se 24. 9. zveřejnily dvakrát. Titulky jsou převzaté ze skutečných záznamů.
*/
const z = (id: string, kod: string, den: string, titulek: string, zdroje: string[] = [], druh = "pripad") =>
  ({ id, slug: id, kodZeme: kod, druh, datumUdalosti: `${den}T00:00:00Z`, titulek, zdroje: zdroje.map((url) => ({ url })) });

// Pozadí: běžné titulky, aby „dron“ nebo „Polsko“ byla častá slova a nerozhodovala.
const pozadi = Array.from({ length: 40 }, (_, n) =>
  z(`p${n}`, n % 2 ? "PL" : "MD", "2026-08-01", `${n % 2 ? "Polsko" : "Moldavsko"}: dron dopadl a explodoval u vesnice, pohraniční policie zajistila místo, požár služby sabotáž`));

describe("stejná událost podruhé", () => {
  const starlink = z("a", "PL", "2026-09-23", "Polsko: požár v pozemní stanici Starlinku ve Wole Krobowské u Varšavy; vicepremiér mluví o sabotáži", ["https://www.euronews.com/x"]);
  it("pozná tutéž událost z jiných redakcí", () => {
    const druhy = z("b", "PL", "2026-09-23", "Polsko: požár poškodil rozvodnu a generátor pozemní stanice služby Starlink ve Woli Krobowské", ["https://space24.pl/y"]);
    expect(podobnaUdalost(druhy, [...pozadi, starlink])?.slug).toBe("a");
  });
  it("různé drony v téže zemi téhož dne nesloučí", () => {
    const d1 = z("m1", "MD", "2026-09-24", "Moldavsko: dron Geran-4 dopadl a explodoval u vesnice Cotiujeni v okrese Briceni");
    const d2 = z("m2", "MD", "2026-09-24", "Moldavsko: dron s kamerou dopadl a explodoval u vesnice Cernița v okrese Florești");
    expect(podobnaUdalost(d2, [...pozadi, d1])).toBeNull();
  });
  it("společný článek o dvou událostech sám nestačí", () => {
    const t = z("t", "DE", "2026-09-01", "Turnow-Preilack: poškození vedení a nálezy zápalných zařízení u energetického uzlu", ["https://x.de/clanek"]);
    const b = z("b2", "DE", "2026-09-01", "Bergheim-Rheidt: úmyslný zkrat u rozvodny vyřadil bloky o výkonu 4,2 GW", ["https://x.de/clanek"]);
    expect(podobnaUdalost(b, [...pozadi, t])).toBeNull();
  });
  it("jiná země, vzdálené datum nebo aktualizace se neporovnávají", () => {
    const lt = z("c", "LT", "2026-09-23", starlink.titulek);
    const pozde = z("d", "PL", "2026-10-10", starlink.titulek);
    const akt = z("e", "PL", "2026-09-23", starlink.titulek, [], "aktualizace");
    for (const n of [lt, pozde, akt]) expect(podobnaUdalost(n, [...pozadi, starlink])).toBeNull();
  });
});

describe("panel počítá jen ověřené případy (31. 10. 2026)", () => {
  it("záznam „neověřeno úředně“ do časů panelu nevstupuje", () => {
    const vse = [
      { ...z("o", "CZ", "2026-10-09", "A"), lidskyOvereno: true },
      { ...z("n", "CZ", "2026-10-09", "B"), overeni: "neovereno" },
      { ...z("l", "LT", "2026-10-18", "C"), overeni: "neovereno" },
    ];
    const { casy, casyCz } = casyProPanel(vse, []);
    expect(casy).toHaveLength(1);
    expect(casyCz).toHaveLength(1);
  });
});
