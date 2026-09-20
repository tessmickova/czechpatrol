import { describe, expect, it } from "vitest";
import { posudDavku, trideni, zdrojeNavrhu } from "../nastroje/audit";

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

/*
  Dělení dávek.

  Proč: 20. 9. 2026 se odpověď modelu na šedesát kandidátů nevešla do stropu,
  JSON se utnul uprostřed řetězce a běh přišel o celou dávku — fronta se
  nepohnula o jedinou položku, přestože model běžel tři minuty. Od té doby se
  dávka při nezdaru půlí. Tenhle blok hlídá, že se tím výsledek neztrácí.
*/
const kandidat = (i: number) =>
  ({
    id: `k-${i}`,
    zachyceno: "2026-09-19T00:00:00Z",
    publikovano: null,
    titulek: `zpráva ${i}`,
    shrnuti: "",
    kodZeme: "CZ",
    zeme: "Česko",
    kategorie: [],
    zdroj: { nazev: "zdroj", url: `https://priklad.cz/${i}`, typ: "media", primarni: false },
    stav: "ceka" as const,
  });

const polozka = (id: string) => ({ id }) as never;

describe("dělení dávky při nezdaru", () => {
  it("celá dávka projde napoprvé a nedělí se", async () => {
    const velikosti: number[] = [];
    const r = await posudDavku([...Array(60).keys()].map(kandidat), [], async (z) => {
      velikosti.push((z.vstup as { kandidati: unknown[] }).kandidati.length);
      return { polozky: [polozka("k-0")] };
    });
    expect(velikosti).toEqual([60]);
    expect(r.neposouzeno).toBe(0);
  });

  it("když se velká dávka neposoudí, menší půlky se zachrání", async () => {
    const velikosti: number[] = [];
    const r = await posudDavku([...Array(60).keys()].map(kandidat), [], async (z) => {
      const n = (z.vstup as { kandidati: { id: string }[] }).kandidati;
      velikosti.push(n.length);
      // Nad třicítku se odpověď utne — přesně jako 20. 9.
      if (n.length > 30) return null;
      return { polozky: n.map((k) => polozka(k.id)) };
    });
    expect(velikosti).toEqual([60, 30, 30]);
    expect(r.polozky).toHaveLength(60);
    expect(r.neposouzeno).toBe(0);
  });

  it("pod nejmenší dávkou se přestane dělit a zbytek zůstane ve frontě", async () => {
    let volani = 0;
    const r = await posudDavku([...Array(16).keys()].map(kandidat), [], async () => {
      volani++;
      return null;
    });
    // 16 → 8 + 8, a níž už ne.
    expect(volani).toBe(3);
    expect(r.polozky).toHaveLength(0);
    expect(r.neposouzeno).toBe(16);
  });
});
