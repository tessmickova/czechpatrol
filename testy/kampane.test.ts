import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { kampanePodleZemi, kampane, kampaneZeme, pocetZemeObdobi, urovenZemeObdobi, zapocitatelne } from "../src/lib/data";
import { METODY } from "../src/lib/metody";
import type { Kampan } from "../src/lib/typy";

const KAMPANE: Kampan[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "kampane.json"), "utf-8"),
);

/*
  Pojistky nad kampaněmi. Kampaň je tvrzení o tom, že někdo cíleně lhal —
  a u takového tvrzení je cena za chybu vyšší než jinde na webu.
*/
describe("manipulační kampaně", () => {
  it("každá kampaň má zdroje, lidskou kontrolu a všech šest částí", () => {
    for (const k of KAMPANE) {
      expect(k.zdroje.length, `kampaň ${k.slug} bez zdroje`).toBeGreaterThan(0);
      expect(k.lidskyOvereno, `kampaň ${k.slug} bez lidské kontroly`).toBe(true);
      for (const cast of ["tvrzeni", "kanaly", "skutecnost", "reakce", "coByPotvrdilo"] as const) {
        expect(k[cast].length, `kampaň ${k.slug} nemá část ${cast}`).toBeGreaterThan(0);
      }
      expect(k.ucel.length, `kampaň ${k.slug} bez výkladu účelu`).toBeGreaterThan(30);
      expect(k.kodyZemi.length, `kampaň ${k.slug} bez cílové země`).toBeGreaterThan(0);
    }
  });

  it("každý zdroj má adresu a datum aspoň na měsíc", () => {
    for (const k of KAMPANE) {
      for (const z of k.zdroje) {
        expect(z.url, `kampaň ${k.slug}: zdroj ${z.nazev} bez adresy`).toMatch(/^https?:\/\//);
        // Celé datum, měsíc, nebo jen rok. Přesnost se nikdy nedomýšlí nahoru.
        expect(z.publikovano, `kampaň ${k.slug}: zdroj ${z.nazev} má divné datum`).toMatch(/^\d{4}(-\d{2}(-\d{2})?)?$/);
      }
    }
  });

  it("připsání státu bez úředního doložení zůstává jen podezřením", () => {
    // Jádro redakčního pravidla: kdo za kampaní stojí, smí web tvrdit jako
    // jisté teprve tehdy, když to někdo veřejně doložil.
    for (const k of KAMPANE) {
      if (!k.puvodce.koho) continue;
      const jisteA = k.puvodce.jistota === "potvrzeno" || k.puvodce.jistota === "vysoka";
      if (jisteA) {
        expect(
          k.zdroje.some((z) => z.primarni),
          `kampaň ${k.slug} připisuje původce jistě, ale nemá primární zdroj`,
        ).toBe(true);
      }
      expect(k.puvodce.duvod.length, `kampaň ${k.slug}: chybí zdůvodnění u původce`).toBeGreaterThan(20);
    }
  });

  it("jistota manipulace a jistota původce jsou dva nezávislé údaje", () => {
    // Test hlídá strukturu, ne hodnoty: obojí musí být uložené zvlášť.
    for (const k of KAMPANE) {
      expect(k).toHaveProperty("jistotaManipulace");
      expect(k.puvodce).toHaveProperty("jistota");
    }
  });

  it("jedna kampaň se počítá u každé cílové země", () => {
    const podleZemi = kampanePodleZemi();
    const soucet = podleZemi.reduce((s, z) => s + z.pocet, 0);
    const ocekavany = kampane().reduce((s, k) => s + k.kodyZemi.length, 0);
    expect(soucet).toBe(ocekavany);
    for (const k of kampane()) {
      for (const kod of k.kodyZemi) {
        expect(kampaneZeme(kod).map((x) => x.slug)).toContain(k.slug);
      }
    }
  });
});

describe("kampaně se počítají jako incidenty", () => {
  it("každá kampaň má závažnost, cíl v názvu, označení a aspoň jednu metodu", () => {
    for (const k of KAMPANE) {
      expect(k.zavaznost, `kampaň ${k.slug} bez závažnosti`).toBeTruthy();
      expect(k.oznaceni.length, `kampaň ${k.slug} bez krátkého označení`).toBeGreaterThan(1);
      // Název je cíl operace, ne krycí jméno — proto musí být delší než označení.
      expect(k.nazev.length, `kampaň ${k.slug}: název není popsaný cíl`).toBeGreaterThan(20);
      expect(k.metody.length, `kampaň ${k.slug} bez metody`).toBeGreaterThan(0);
      expect(k.zasazeni.length, `kampaň ${k.slug} bez zasaženého subjektu`).toBeGreaterThan(0);
    }
  });

  it("metody jsou jen z číselníku, aby se daly porovnat napříč zeměmi", () => {
    for (const k of KAMPANE) {
      for (const m of k.metody) {
        expect(Object.keys(METODY), `kampaň ${k.slug}: neznámá metoda ${m}`).toContain(m);
      }
    }
  });

  it("každý zasažený subjekt říká i JAK byl zasažen", () => {
    for (const k of KAMPANE) {
      for (const z of k.zasazeni) {
        expect(z.jak.length, `kampaň ${k.slug}: u ${z.nazev} chybí, jak byl zasažen`).toBeGreaterThan(15);
      }
    }
  });

  it("kampaň se propíše do úrovně i počtu země, na kterou míří", () => {
    for (const k of kampane()) {
      for (const kod of k.kodyZemi) {
        const dni = Math.ceil((Date.now() - new Date(k.odhaleno).getTime()) / 86_400_000) + 1;
        expect(pocetZemeObdobi(kod, dni).kampani, `kampaň ${k.slug} se nepočítá u ${kod}`).toBeGreaterThan(0);
        expect(urovenZemeObdobi(kod, dni), `kampaň ${k.slug} nezvedla úroveň u ${kod}`).not.toBeNull();
      }
    }
  });

  it("započitatelné položky obsahují případy i kampaně", () => {
    const vse = zapocitatelne();
    expect(vse.filter((x) => x.kampan).length).toBe(kampane().length);
    expect(vse.filter((x) => !x.kampan).length).toBeGreaterThan(0);
  });
});
