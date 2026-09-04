import { describe, expect, it } from "vitest";
import { rozhodni, type Stazeno } from "../sber/rozhodovani";
import { ZDROJE } from "../sber/zdroje";
import type { RegistrZdroj } from "../sber/typy";

const zdroj = (
  klic: string, tyka: string[], klicova: string[], sledovana: string[] = [],
): RegistrZdroj => ({
  klic, nazev: klic, druh: "pravni", url: `https://example.invalid/${klic}`,
  format: "html", jazyk: "cs", primarni: true, klicova, sledovana, tyka, overenaAdresa: false,
});

const stazeno = (z: RegistrZdroj, text: string, ok = true): Stazeno => ({
  zdroj: z, ok, text, polozky: [], stav: ok ? 200 : 503,
});

const MOBILIZACE = zdroj(
  "urad",
  ["mobilizace"],
  ["naridil mobilizaci", "vyhlasil valecny stav"],
  ["mobilizace"],
);

describe("sběrač smí potvrdit jen zápor", () => {
  it("bez nálezu a s funkčním zdrojem potvrdí zápor", () => {
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, "Běžná tisková zpráva o ničem zvláštním.")]);
    expect(r.ciste).toBe(true);
    expect(r.nalezy).toHaveLength(0);
  });

  it("při frázi o vyhlášení zápor NEpotvrdí a založí položku do fronty", () => {
    const r = rozhodni("mobilizace", [
      stazeno(MOBILIZACE, "Prezident naridil mobilizaci ozbrojených sil."),
    ]);
    expect(r.ciste).toBe(false);
    expect(r.nalezy).toHaveLength(1);
    expect(r.nalezy[0].shody).toContain("naridil mobilizaci");
    expect(r.nalezy[0].polozka.shrnuti.length).toBeGreaterThan(0);
  });

  it("najde frázi i s diakritikou v textu", () => {
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, "Parlament VYHLÁSIL VÁLEČNÝ STAV.")]);
    expect(r.ciste).toBe(false);
    expect(r.nalezy[0].shody).toContain("vyhlasil valecny stav");
  });

  it("tematická zmínka jde do fronty, ale zápor neblokuje", () => {
    // Slovo „mobilizace“ je trvale v menu i v archivu úředních webů. Kdyby
    // blokovalo, web by hlásil „neověřeno“ napořád.
    const r = rozhodni("mobilizace", [
      stazeno(MOBILIZACE, "Sekce Obrana státu: mobilizace, branná povinnost, zálohy."),
    ]);
    expect(r.ciste).toBe(true);
    expect(r.nalezy).toHaveLength(1);
    expect(r.nalezy[0].shody).toContain("mobilizace");
  });

  it("při výpadku všech zdrojů zápor NEpotvrdí", () => {
    // Nedostupný úřední web nesmí vypadat jako „nic se neděje“.
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, "", false)]);
    expect(r.ciste).toBe(false);
    expect(r.selhalo).toEqual(["urad"]);
  });

  it("stačí jediný zdroj s frází, i když ostatní mlčí", () => {
    const druhy = zdroj("druhy", ["mobilizace"], ["naridil mobilizaci"]);
    const r = rozhodni("mobilizace", [
      stazeno(MOBILIZACE, "Nic zvláštního."),
      stazeno(druhy, "Prezident nařídil mobilizaci."),
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

  it("blokující fráze jsou fráze, ne jednotlivá témata", () => {
    // Jednoslovné „mobilizace“ nebo „article 5“ je v menu každého úředního
    // webu. Jako blokující klíč by zápor neumožnilo potvrdit nikdy.
    for (const z of ZDROJE) {
      for (const k of z.klicova ?? []) {
        expect(k.trim().split(/\s+/).length, `${z.klic}: „${k}“`).toBeGreaterThan(1);
      }
    }
  });
});
