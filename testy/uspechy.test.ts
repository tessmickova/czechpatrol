import { describe, expect, it } from "vitest";
import { vOblasti, vyberUspechy } from "../src/lib/uspechy";
import type { Incident } from "../src/lib/typy";

const TED = Date.parse("2026-09-26T12:00:00Z");
const z = (x: Partial<Incident>) => ({
  slug: "a", titulek: "", kratkyTitulek: "", kodZeme: "DE", zeme: "Německo", kategorie: ["vysetrovani"], fakta: [""], lidskyOvereno: true,
  datumUdalosti: "2026-09-20T00:00:00Z", datumZjisteni: "2026-09-20T10:00:00Z", ...x,
}) as unknown as Incident;
const bez = { vyloucene: [], slozka: {} };

describe("úspěchy složek", () => {
  it("zadržení policií je úspěch policie", () => {
    const u = vyberUspechy([z({ titulek: "Německo: policie zadržela podezřelého z útoků na rozvodny" })], TED, bez);
    expect(u).toHaveLength(1);
    expect(u[0].slozka).toBe("policie");
  });
  it("vyhoštění je diplomacie, špionážní síť zpravodajské, sestřelení armáda", () => {
    const u = vyberUspechy([
      z({ slug: "d", titulek: "Maďarsko vyhostilo 10 ruských diplomatů", kategorie: ["diplomacie", "zpravodajske"] }),
      z({ slug: "s", titulek: "Kontrarozvědka odhalila síť agentů GRU", kategorie: ["zpravodajske"] }),
      z({ slug: "a", titulek: "Polské stíhačky sestřelily drony nad Lublinem", kategorie: ["drony"] }),
    ], TED, bez);
    expect(Object.fromEntries(u.map((x) => [x.slug, x.slozka]))).toEqual({ d: "diplomacie", s: "zpravodajske", a: "armada" });
  });
  it("krok protivníka, neověřené, staré a mimo témata úspěch není", () => {
    expect(vyberUspechy([
      z({ slug: "ru", kodZeme: "RU", titulek: "Rusko: zadržen strážný britské ambasády" }),
      z({ slug: "no", lidskyOvereno: false, titulek: "Policie zadržela muže" }),
      z({ slug: "old", datumZjisteni: "2025-01-01T00:00:00Z", titulek: "Policie zadržela muže" }),
      z({ slug: "tema", kategorie: ["nato"], titulek: "Policie zadržela muže" }),
      z({ slug: "bezskutku", titulek: "Policie vyšetřuje požár skladu" }),
    ], TED, bez)).toEqual([]);
  });
  it("ruční výjimka a ruční zařazení mají přednost", () => {
    const zaznamy = [z({ slug: "x", titulek: "Policie zadržela muže" }), z({ slug: "y", titulek: "Policie zadržela agenta" })];
    const u = vyberUspechy(zaznamy, TED, { vyloucene: ["x"], slozka: { y: "zpravodajske" } });
    expect(u.map((x) => [x.slug, x.slozka])).toEqual([["y", "zpravodajske"]]);
  });
});

describe("úspěchy složek — Česko a Evropa", () => {
  it("český záznam platí i starý a archivní, evropský jen půl roku", () => {
    const u = vyberUspechy([
      z({ slug: "cz", kodZeme: "CZ", zeme: "Česko", titulek: "Praha: pachatel odsouzen za žhářský útok", archivniZaznam: true, datumUdalosti: "2021-06-09T00:00:00Z", datumZjisteni: "2025-06-09T00:00:00Z" }),
      z({ slug: "de", titulek: "Policie zadržela muže", datumUdalosti: "2025-06-09T00:00:00Z", datumZjisteni: "2025-06-09T00:00:00Z" }),
    ], TED, bez);
    expect(u.map((x) => x.slug)).toEqual(["cz"]);
  });
  it("filtr oblasti dělí Česko, ostatní Evropu a zbytek světa", () => {
    expect(vOblasti({ kodZeme: "CZ" }, "cr")).toBe(true);
    expect(vOblasti({ kodZeme: "CZ" }, "evropa")).toBe(false);
    expect(vOblasti({ kodZeme: "PL" }, "evropa")).toBe(true);
    expect(vOblasti({ kodZeme: "PL" }, "cr")).toBe(false);
    expect(vOblasti({ kodZeme: "PL" }, "vse")).toBe(true);
    // Mimoevropský stát jen pod „Vše“.
    expect(vOblasti({ kodZeme: "US" }, "evropa")).toBe(false);
    expect(vOblasti({ kodZeme: "US" }, "vse")).toBe(true);
  });
});

describe("úspěchy složek — karta ukazuje úspěch, ne čin", () => {
  it("krátký titulek bez skutku nahradí plný titulek a fakt se skutkem", () => {
    const [u] = vyberUspechy([z({ kratkyTitulek: "Autobusy Klíčov", titulek: "Praha-Klíčov: pachatel odsouzen za teroristický útok", fakta: ["Zapálil tři autobusy.", "Soud ho odsoudil k 13 letům."] })], TED, bez);
    expect(u.titulek).toBe("Praha-Klíčov: pachatel odsouzen za teroristický útok");
    expect(u.coSeStalo).toBe("Soud ho odsoudil k 13 letům.");
  });
});
