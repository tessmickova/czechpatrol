import { describe, expect, it } from "vitest";
import { coObnovit, coOhlasit, ctiNahlaseno, OPAKOVAT_PO_H, PRAH_KANAL_H, PRAH_SPRAVCE_H, type StavSberu } from "../src/hlidac";

/*
  Hlídač se v praxi spustí jednou za měsíc a nejde si ho vyzkoušet „až to
  nastane" — když to nastane, je pozdě. Rozhodování je proto oddělené od
  sítě a od Telegramu a hlídá se tady.
*/

const ted = new Date("2026-09-18T02:00:00Z").getTime();
const pred = (h: number) => new Date(ted - h * 3_600_000).toISOString();
const stav = (h: number | null, chybnych = 0): StavSberu => ({
  posledniUspech: h === null ? null : pred(h),
  chybnych,
});

describe("hlídač sběru", () => {
  it("mlčí, dokud sběr běží", () => {
    expect(coOhlasit(stav(PRAH_SPRAVCE_H - 0.5), ted, null).komu).toEqual([]);
  });

  it("po třech hodinách se ozve správci, kanál zatím ne", () => {
    expect(coOhlasit(stav(PRAH_SPRAVCE_H + 0.5), ted, null).komu).toEqual(["spravce"]);
  });

  it("po dvanácti hodinách se to dozví i veřejný kanál", () => {
    const v = coOhlasit(stav(PRAH_KANAL_H + 1), ted, null);
    expect(v.komu).toEqual(["spravce", "kanal"]);
    expect(Math.round(v.hodin)).toBe(PRAH_KANAL_H + 1);
  });

  it("neopakuje hlášení každých deset minut", () => {
    const nedavno = new Date(ted - (OPAKOVAT_PO_H - 1) * 3_600_000).toISOString();
    expect(coOhlasit(stav(30), ted, nedavno).komu).toEqual([]);
  });

  it("po uplynutí odstupu připomene znovu", () => {
    const davno = new Date(ted - (OPAKOVAT_PO_H + 1) * 3_600_000).toISOString();
    expect(coOhlasit(stav(30), ted, davno).komu).toEqual(["spravce", "kanal"]);
  });

  it("bez jediného úspěchu v historii výpadek nepodcení", () => {
    /* Přesnější údaj nemáme; mlčet kvůli tomu by byla ta nejhorší volba. */
    expect(coOhlasit(stav(null, 20), ted, null).komu).toEqual(["spravce", "kanal"]);
  });
});

describe("obnovení sběru (26. 9. 2026)", () => {
  const vypadekOhlasen = { kdy: pred(2), komu: ["spravce", "kanal"] as ("spravce" | "kanal")[] };
  it("po obnovení to řekne právě těm, kdo slyšeli o výpadku", () => {
    expect(coObnovit(stav(0.5), ted, vypadekOhlasen)).toEqual(["spravce", "kanal"]);
    expect(coObnovit(stav(0.5), ted, { ...vypadekOhlasen, komu: ["spravce"] })).toEqual(["spravce"]);
  });
  it("bez předchozího hlášení se o obnovení nic neposílá", () => {
    expect(coObnovit(stav(0.5), ted, null)).toEqual([]);
  });
  it("úspěch starší než hlášení výpadku není obnovení", () => {
    expect(coObnovit(stav(2.5), ted, { kdy: pred(1), komu: ["spravce"] })).toEqual([]);
  });
  it("starý zápis (jen čas) se čte jako hlášení správci i kanálu", () => {
    expect(ctiNahlaseno("2026-09-18T01:00:00.000Z")).toEqual({ kdy: "2026-09-18T01:00:00.000Z", komu: ["spravce", "kanal"] });
    expect(ctiNahlaseno(JSON.stringify(vypadekOhlasen))).toEqual(vypadekOhlasen);
    expect(ctiNahlaseno(null)).toBeNull();
  });
});
