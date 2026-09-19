import { describe, expect, it } from "vitest";
import { trideni } from "../nastroje/audit";

/*
  Audit posuzuje zachycené zprávy a připravuje návrhy pro člověka. Tenhle
  soubor hlídá jedinou věc: aby se práce nezahazovala potichu.

  Proč vznikl: 19. 9. 2026 audit posoudil 12 zpráv, čtyři označil za novou
  událost a vyrobil nula návrhů. Zahazovala je podmínka, která od modelu
  vyžadovala neprázdný seznam nedoloženého — a report to nikam nenapsal,
  takže to zvenčí vypadalo stejně jako porucha modelu.
*/

const ZNAME = new Set(["nemecko-zeleznice-2022", "polsko-drony-2025"]);

describe("třídění auditu", () => {
  it("nová událost s fakty projde jako návrh", () => {
    const r = trideni({ novaUdalost: true, duplikatSlugu: null, fakta: ["dva mrtví"] }, ZNAME);
    expect(r.zahozeno).toBeNull();
  });

  it("úplně doložená zpráva se nezahazuje kvůli prázdnému nedoloženo", () => {
    // Přesně případ, kvůli kterému tenhle soubor vznikl.
    const r = trideni({ novaUdalost: true, duplikatSlugu: null, fakta: ["zasažen ropovod"] }, ZNAME);
    expect(r.zahozeno).toBeNull();
  });

  it("bez jediného doloženého faktu návrh nevzniká", () => {
    const r = trideni({ novaUdalost: true, duplikatSlugu: null, fakta: [] }, ZNAME);
    expect(r.zahozeno).toBe("z textu neplyne žádné doložené faktum");
  });

  it("pokračování známého záznamu se zahodí a řekne se který", () => {
    const r = trideni({ novaUdalost: true, duplikatSlugu: "polsko-drony-2025", fakta: ["x"] }, ZNAME);
    expect(r.duplikat).toBe("polsko-drony-2025");
    expect(r.zahozeno).toBe("pokračování záznamu polsko-drony-2025");
  });

  it("odkaz na neexistující záznam návrh nezahodí a zůstane po něm stopa", () => {
    const r = trideni({ novaUdalost: true, duplikatSlugu: "vymysleny-zaznam", fakta: ["x"] }, ZNAME);
    expect(r.duplikat).toBeNull();
    expect(r.neznamySlug).toBe("vymysleny-zaznam");
    expect(r.zahozeno).toBeNull();
  });

  it("každé zahození má vždy napsaný důvod", () => {
    const r = trideni({ novaUdalost: false, duplikatSlugu: null, fakta: ["x"] }, ZNAME);
    expect(r.zahozeno).toBe("není nová událost");
  });
});
