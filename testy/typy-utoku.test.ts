// @ts-nocheck — nástroje bezpečnosti obsahu jsou prosté ES moduly.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { prohledej } from "../nastroje/bezpecnost-obsahu.mjs";
import { PORADI_KATEGORII } from "../src/lib/kategorie";
import { sestavPrehledTypu, TYPY_UTOKU, typProKategorie, typProKyber } from "../src/lib/typy-utoku";

/*
  Katalog typů útoků (3. 11. 2026). Hlídá se trojí: obsah nesmí radit
  nic, co webu nepřísluší (dávky, úprava vody, elektřina); odkazy vedou
  jen na úřady, které web používá i jinde (jiné se tu neověřují); a každý
  zveřejněný případ s kategorií útoku má svůj typ, jinak by u něj chyběla rada.
*/
const DOMENY = ["hzscr.cz", "nukib.gov.cz", "mvcr.cz", "drozd.mzv.cz", "mzv.gov.cz", "rozhlas.cz", "obcan.portal.gov.cz", "chmi.cz"];
const MIMO_RADY = /\b(\d+\s?(mg|ml)\b|dávk|jodid|tablet|chlor\b|savo|převař|jistič|rozvaděč|pojistk|agregát)/i;

const texty = (t) => [t.nazev, t.kratce, t.coToJe, t.proObcana, ...t.predem, ...t.kdyzNastane];

describe("katalog typů útoků", () => {
  it("má jedinečné klíče a úplný obsah bez zástupných textů", () => {
    const klice = TYPY_UTOKU.map((t) => t.klic);
    expect(new Set(klice).size).toBe(klice.length);
    for (const t of TYPY_UTOKU) {
      expect(t.predem.length, t.klic).toBeGreaterThan(0);
      expect(t.kdyzNastane.length, t.klic).toBeGreaterThan(0);
      expect(t.odkazy.length, t.klic).toBeGreaterThan(0);
      expect(t.kategorie.length + t.druhyKyber.length, t.klic).toBeGreaterThan(0);
      expect(t.kratce.split(/\s+/).length, `${t.klic}: kratce`).toBeLessThanOrEqual(10);
      expect(JSON.stringify(t)).not.toContain("[DOPLNIT]");
    }
  });

  it("odkazuje jen na úřady, které web používá jinde, nebo na vlastní stránky", () => {
    for (const t of TYPY_UTOKU) for (const o of t.odkazy) {
      if (o.url.startsWith("/")) continue;
      expect(o.url, `${t.klic}: ${o.url}`).toMatch(/^https:\/\//);
      const h = new URL(o.url).hostname.replace(/^www\./, "");
      expect(DOMENY.some((d) => h === d || h.endsWith(`.${d}`)), `${t.klic}: neznámá doména ${h}`).toBe(true);
    }
  });

  it("neradí nic mimo to, co webu přísluší, a neporušuje bezpečnost obsahu", () => {
    for (const t of TYPY_UTOKU) for (const text of texty(t)) {
      expect(MIMO_RADY.test(text), `${t.klic}: „${text}“`).toBe(false);
      expect(prohledej(text), `${t.klic}: „${text}“`).toEqual([]);
      expect(text.length, `${t.klic}: příliš dlouhé`).toBeLessThanOrEqual(260);
    }
  });

  it("kategorie, které jsou útokem, mají typ; souvislosti (ČR, NATO, Rusko, vyšetřování, právo, diplomacie) ne", () => {
    for (const k of ["drony", "sabotaz", "infrastruktura", "kyber", "hybridni", "hranice", "zpravodajske"]) expect(typProKategorie([k])?.klic, k).toBe(k);
    for (const k of ["cr", "nato", "rusko", "vysetrovani", "pravo", "diplomacie"]) expect(typProKategorie([k]), k).toBeNull();
    for (const k of PORADI_KATEGORII) expect(typeof typProKategorie([k])).not.toBe("undefined");
    for (const d of ["ddos", "podvod", "vypadek", "utok"]) expect(typProKyber(d), d).not.toBeNull();
  });

  it("o typu rozhoduje skutek, ne souvislost", () => {
    expect(typProKategorie(["drony", "infrastruktura"])?.klic).toBe("drony");
    expect(typProKategorie(["sabotaz", "infrastruktura", "rusko"])?.klic).toBe("sabotaz");
    expect(typProKategorie(["kyber", "infrastruktura"])?.klic).toBe("kyber");
    expect(typProKategorie(["hranice", "hybridni"])?.klic).toBe("hybridni");
    expect(typProKategorie(["zpravodajske", "nato", "rusko"])?.klic).toBe("zpravodajske");
  });

  it("každý zveřejněný případ s kategorií útoku dostane radu", () => {
    const pole = JSON.parse(fs.readFileSync("data/incidenty.json", "utf-8"));
    const utokove = new Set(TYPY_UTOKU.flatMap((t) => t.kategorie));
    for (const z of pole) {
      if (!z.kategorie.some((k) => utokove.has(k))) continue;
      expect(typProKategorie(z.kategorie), z.slug).not.toBeNull();
    }
  });

  it("pořadí jde podle doložených záznamů, zprávy z médií jsou zvlášť a příklady jsou nejnovější", () => {
    const zaznam = (slug, kategorie, datum) => ({ slug, titulek: slug, kategorie, datumUdalosti: datum, kodZeme: "PL", zeme: "Polsko", zdroje: [{ nazev: "Zdroj" }], druh: "pripad" });
    const prehled = sestavPrehledTypu(
      [zaznam("a", ["drony"], "2026-10-01T00:00:00Z"), zaznam("b", ["drony", "nato"], "2026-10-05T00:00:00Z"), zaznam("c", ["sabotaz"], "2026-09-01T00:00:00Z"), { ...zaznam("d", ["drony"], "2026-10-09T00:00:00Z"), druh: "reakce" }],
      [
        { id: "m1", druh: "utok", titulek: "Kyberútok na supermarkety", odkaz: "https://example.org/1", vydavatel: "iDNES.cz", kdy: "2026-10-12T11:00:00Z" },
        { id: "m1", druh: "utok", titulek: "dvakrát", odkaz: "https://example.org/1", vydavatel: null, kdy: "2026-10-12T11:00:00Z" },
        { id: "m2", druh: "utok", titulek: "Týž den, jiná redakce", odkaz: "https://example.org/2", vydavatel: "Novinky", kdy: "2026-10-12T09:00:00Z" },
        { id: "m3", druh: "utok", titulek: "Starší", odkaz: "https://example.org/3", vydavatel: "Lupa", kdy: "2026-10-01T09:00:00Z" },
      ],
      1,
    );
    expect(prehled.map((p) => p.typ.klic).slice(0, 2)).toEqual(["drony", "sabotaz"]);
    const drony = prehled.find((p) => p.typ.klic === "drony");
    expect(drony.zaznamu).toBe(2); // reakce se nepočítá
    expect(drony.prikladyZaznamu.map((p) => p.klic)).toEqual(["z-b"]);
    expect(drony.prikladyMedii).toEqual([]);
    const kyber = prehled.find((p) => p.typ.klic === "kyber");
    expect(kyber.zaznamu).toBe(0);
    expect(kyber.zprav).toBe(3); // stejná zpráva v archivu i ve snímku se počítá jednou
    expect(kyber.prikladyZaznamu).toEqual([]);
    expect(kyber.prikladyMedii.map((p) => p.klic)).toEqual(["m-m1"]); // max 1; z téhož dne jen jedna
    expect(kyber.prikladyMedii[0]).toMatchObject({ doklad: "media", ven: true, zdroj: "iDNES.cz" });
    expect(kyber.posledni).toBe("2026-10-12T11:00:00Z");
  });
});
