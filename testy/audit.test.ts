import { describe, expect, it } from "vitest";
import { trideni, zdrojeNavrhu } from "../nastroje/audit";

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

/*
  Jeden zdroj nestačí — platí to u záznamů i u právě ověřovaných. Audit
  vyráběl návrhy z jediného článku; schválit by je nešlo a fronta by se jimi
  jen plnila. Hlídá to i testy/navrhy.test.ts nad hotovou frontou, tady jde
  o to, aby se dva otisky jednoho článku nepočítaly jako dvě hlášení.
*/
describe("zdroje návrhu", () => {
  const k = (url: string, nazev: string) => ({
    titulek: "Sabotáž na trati",
    zachyceno: "2026-09-18T10:00:00Z",
    zdroj: { nazev, url, primarni: false },
  });

  it("dvě nezávislá hlášení dají dva zdroje", () => {
    expect(zdrojeNavrhu([k("https://a.cz/1", "A"), k("https://b.cz/2", "B")])).toHaveLength(2);
  });

  it("týž článek dvakrát je pořád jeden zdroj", () => {
    expect(zdrojeNavrhu([k("https://a.cz/1", "A"), k("https://a.cz/1", "A přetisk")])).toHaveLength(1);
  });

  it("datum zdroje se bere ze zveřejnění, ne ze zachycení", () => {
    const z = zdrojeNavrhu([{ ...k("https://a.cz/1", "A"), publikovano: "2026-09-17T06:00:00Z" }]);
    expect(z[0].publikovano).toBe("2026-09-17T00:00:00Z");
  });
});
