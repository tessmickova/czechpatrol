import { describe, expect, it } from "vitest";
import { klicAdresy } from "../nastroje/klic-adresy.mjs";

describe("klíč adresy", () => {
  it("zahodí kotvu a sledovací parametry z RSS (případ iDNES a ČTK, 25. 9. 2026)", () => {
    expect(klicAdresy("https://www.idnes.cz/zpravy/a.A260925_1#utm_source=rss&utm_medium=feed"))
      .toBe(klicAdresy("https://www.idnes.cz/zpravy/a.A260925_1"));
    expect(klicAdresy("https://www.ceskenoviny.cz/zpravy/x/2879495?utm_source=rss&utm_medium=feed"))
      .toBe(klicAdresy("https://www.ceskenoviny.cz/zpravy/x/2879495"));
  });
  it("sjednotí www, http/https a koncové lomítko", () => {
    expect(klicAdresy("http://example.cz/a/")).toBe(klicAdresy("https://www.example.cz/a"));
  });
  it("parametry, které určují článek, nechá", () => {
    expect(klicAdresy("https://example.cz/clanek?id=1")).not.toBe(klicAdresy("https://example.cz/clanek?id=2"));
  });
  it("neplatnou adresu nezahodí", () => {
    expect(klicAdresy("nesmysl")).toBe("nesmysl");
    expect(klicAdresy(undefined)).toBe("");
  });
});
