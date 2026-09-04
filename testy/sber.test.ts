import { describe, expect, it } from "vitest";
import { rozhodni, type Stazeno } from "../sber/rozhodovani";
import { ZDROJE } from "../sber/zdroje";
import type { RegistrZdroj } from "../sber/typy";

const zdroj = (klic: string, tyka: string[], klicova: string[]): RegistrZdroj => ({
  klic, nazev: klic, druh: "pravni", url: `https://example.invalid/${klic}`,
  format: "html", jazyk: "cs", primarni: true, klicova, tyka, overenaAdresa: false,
});

const stazeno = (z: RegistrZdroj, text: string, ok = true): Stazeno => ({
  zdroj: z, ok, text, polozky: [], stav: ok ? 200 : 503,
});

const MOBILIZACE = zdroj("urad", ["mobilizace"], ["mobilizace", "valecny stav"]);

describe("sběrač smí potvrdit jen zápor", () => {
  it("bez nálezu a s funkčním zdrojem potvrdí zápor", () => {
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, "Běžná tisková zpráva o ničem zvláštním.")]);
    expect(r.ciste).toBe(true);
    expect(r.nalezy).toHaveLength(0);
  });

  it("při nálezu klíčového slova zápor NEpotvrdí a založí položku do fronty", () => {
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, "Vláda projednala návrh na mobilizace ozbrojených sil.")]);
    expect(r.ciste).toBe(false);
    expect(r.nalezy).toHaveLength(1);
    expect(r.nalezy[0].shody).toContain("mobilizace");
    expect(r.nalezy[0].polozka.shrnuti.length).toBeGreaterThan(0);
  });

  it("najde klíčové slovo i s diakritikou v textu", () => {
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, "Byl vyhlášen VÁLEČNÝ STAV.")]);
    expect(r.ciste).toBe(false);
    expect(r.nalezy[0].shody).toContain("valecny stav");
  });

  it("při výpadku všech zdrojů zápor NEpotvrdí", () => {
    // Nedostupný úřední web nesmí vypadat jako „nic se neděje“.
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, "", false)]);
    expect(r.ciste).toBe(false);
    expect(r.selhalo).toEqual(["urad"]);
  });

  it("stačí jediný zdroj s nálezem, i když ostatní mlčí", () => {
    const druhy = zdroj("druhy", ["mobilizace"], ["mobilizace"]);
    const r = rozhodni("mobilizace", [
      stazeno(MOBILIZACE, "Nic zvláštního."),
      stazeno(druhy, "Prezident nařídil mobilizace."),
    ]);
    expect(r.ciste).toBe(false);
    expect(r.nalezy).toHaveLength(1);
  });

  it("bez relevantního zdroje se nic nepotvrzuje", () => {
    const jiny = zdroj("jiny", ["elektrina"], ["stav nouze"]);
    const r = rozhodni("mobilizace", [stazeno(jiny, "Nic zvláštního.")]);
    expect(r.ciste).toBe(false);
    expect(r.overeno).toHaveLength(0);
  });
});

describe("registr zdrojů", () => {
  it("nemá duplicitní klíče", () => {
    const klice = ZDROJE.map((z) => z.klic);
    expect(new Set(klice).size).toBe(klice.length);
  });

  it("používá jen https", () => {
    for (const z of ZDROJE) expect(z.url.startsWith("https://"), z.klic).toBe(true);
  });

  it("každý zdroj s klíčovými slovy říká, čeho se týká", () => {
    for (const z of ZDROJE) {
      if (z.klicova?.length) expect(z.tyka?.length, z.klic).toBeGreaterThan(0);
    }
  });
});
