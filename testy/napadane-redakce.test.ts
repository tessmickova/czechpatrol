// @ts-nocheck — nástroj je prostý ES modul.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { dostRedakci, jeFalesnaRedakce, jeNapadenaRedakce, nactiNapadane, nezavisleRedakce, potrebnychRedakci } from "../nastroje/napadane-redakce.mjs";

/*
  Napadené redakce (4. 11. 2026, provozovatelka): zpráva o útoku stojí na
  dvou redakcích, s napadenou redakcí mezi zdroji na třech; napodobenina
  redakce není zdroj nikdy.
*/
const data = {
  redakce: [
    { nazev: "Polská tisková agentura PAP", domena: "pap.pl", duvod: "x", kampan: "k", od: "2024-05-31", do: null },
    { nazev: "Polský rozhlas PiK", domena: null, duvod: "x", kampan: "k", od: "2026-08-17", do: null },
    { nazev: "Stará", domena: "stara.example", duvod: "x", kampan: "k", od: "2024-01-01", do: "2024-06-01" },
  ],
  falesne: [{ domena: "lrozhlas.cz", napodobuje: "irozhlas.cz", kampan: "k" }],
};
const ted = Date.parse("2026-11-04T12:00:00Z");
const z = (url, nazev = "Zdroj") => ({ nazev, url });

describe("napadené redakce", () => {
  it("dvě redakce stačí; s napadenou mezi zdroji tři", () => {
    const bezne = [z("https://www.novinky.cz/a"), z("https://www.idnes.cz/b")];
    expect(potrebnychRedakci(bezne, data, ted)).toBe(2);
    expect(dostRedakci(bezne, data, ted)).toBe(true);
    const sPap = [z("https://www.pap.pl/a"), z("https://www.idnes.cz/b")];
    expect(potrebnychRedakci(sPap, data, ted)).toBe(3);
    expect(dostRedakci(sPap, data, ted)).toBe(false);
    expect(dostRedakci([...sPap, z("https://www.novinky.cz/c")], data, ted)).toBe(true);
  });
  it("redakce bez domény se pozná podle jména; po konci rizika už ne", () => {
    expect(jeNapadenaRedakce(z("https://example.pl/x", "Polský rozhlas PiK — zprávy"), data, ted)).toBe(true);
    expect(jeNapadenaRedakce(z("https://stara.example/x"), data, ted)).toBe(false);
    expect(jeNapadenaRedakce(z("https://stara.example/x"), data, Date.parse("2024-03-01T00:00:00Z"))).toBe(true);
  });
  it("napodobenina redakce se nepočítá a Google News také ne", () => {
    expect(jeFalesnaRedakce(z("https://lrozhlas.cz/zprava"), data)).toBe(true);
    expect(jeFalesnaRedakce(z("https://www.irozhlas.cz/zprava"), data)).toBe(false);
    expect(nezavisleRedakce([z("https://lrozhlas.cz/a"), z("https://news.google.com/b"), z("https://www.idnes.cz/c")], data)).toBe(1);
  });
  it("ostrý seznam: každá položka se opírá o rozebranou operaci a napodobenina nemíří na sebe", () => {
    const ostre = nactiNapadane();
    const kampane = new Set(JSON.parse(fs.readFileSync("data/kampane.json", "utf-8")).map((k) => k.slug));
    for (const r of ostre.redakce) {
      expect(kampane.has(r.kampan), `${r.nazev}: kampaň ${r.kampan}`).toBe(true);
      expect(r.od).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(r.nazev.length).toBeGreaterThan(2);
      expect(JSON.stringify(r)).not.toContain("[DOPLNIT]");
    }
    for (const f of ostre.falesne) {
      expect(kampane.has(f.kampan), f.domena).toBe(true);
      expect(f.domena).not.toBe(f.napodobuje);
    }
  });
});
