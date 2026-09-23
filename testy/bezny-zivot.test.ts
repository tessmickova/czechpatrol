import { describe, expect, it } from "vitest";
import { stavObcanuZ } from "../src/lib/data";

/*
  Audit 23. 9. 2026:
  P0-5 — zelený klid nesmí vzniknout z toho, že nic není ověřené.
  P0-7 — opatření v ČR (třeba povodňový nouzový stav) nesmí na budíku
  běžného života vyvolat text o ozbrojeném incidentu.
*/
const pravni = (plati: boolean | null, overeno: string | null = null) => ({ nazev: "Nouzový stav", plati, overeno });
const sluzba = (stav: "bezny" | "narusen" | "sledujeme" | "bez-zdroje", overeno: string | null = null) => ({ nazev: "Mobilní síť", stav, overeno });

describe("budík Běžný život", () => {
  it("bez věcného ověření není klid, jen „nic nenalezeno“ v neutrální barvě", () => {
    const s = stavObcanuZ([pravni(false)], [sluzba("bezny")]);
    expect(s.slovo).toBe("Nic nenalezeno");
    expect(s.neutralni).toBe(true);
    expect(s.slovo).not.toMatch(/bez omezení/i);
  });

  it("zelené „Bez omezení“ jen s věcně ověřenou položkou", () => {
    const s = stavObcanuZ([pravni(false, "2026-09-23T10:00:00Z")], [sluzba("bezny")]);
    expect(s.slovo).toBe("Bez omezení");
    expect(s.neutralni).toBe(false);
  });

  it("nouzový stav neříká nic o ozbrojeném incidentu", () => {
    const s = stavObcanuZ([pravni(true, "2026-09-23T10:00:00Z")], [sluzba("bezny")]);
    expect(s.slovo).toBe("Platí opatření");
    expect(`${s.slovo} ${s.popis}`).not.toMatch(/ozbrojen|incident|NATO/i);
  });
});
