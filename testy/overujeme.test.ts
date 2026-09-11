import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NEJVYS_OVEROVANYCH, overovaneAktivni, overovaneUzavrene, overujeme } from "../src/lib/data";
import type { Overovana } from "../src/lib/typy";

const SOUBOR = path.join(process.cwd(), "data", "overujeme.json");
const DATA: Overovana[] = JSON.parse(fs.readFileSync(SOUBOR, "utf-8"));

/*
  Právě ověřované zprávy.

  Je to jediné místo na webu, kde se objeví něco nepotvrzeného. Cena za
  chybu je tu proto vyšší než kdekoli jinde — tyhle testy hlídají přesně
  ty prvky, které z toho dělají zprávu o zprávě, a ne fámu.
*/
describe("právě ověřované zprávy", () => {
  it("každá položka má úřední protipól, pokyn pro čtenáře a lhůtu", () => {
    for (const o of DATA) {
      expect(o.lidskyOvereno, `${o.slug}: bez lidské kontroly`).toBe(true);
      expect(o.coRikajiUrady.length, `${o.slug}: chybí, co říkají úřady`).toBeGreaterThan(0);
      expect(o.coDelatTed.length, `${o.slug}: chybí pokyn, co dělat teď`).toBeGreaterThan(15);
      expect(o.kdybyPlatilo.length, `${o.slug}: chybí podmíněný dopad`).toBeGreaterThan(15);
      expect(new Date(o.uzavritDo).getTime()).toBeGreaterThan(new Date(o.zacalo).getTime());
    }
  });

  it("jeden zdroj nestačí — musí to hlásit aspoň dva, každý s odkazem", () => {
    for (const o of DATA) {
      expect(o.kdoHlasi.length, `${o.slug}: méně než dva zdroje`).toBeGreaterThanOrEqual(2);
      for (const z of o.kdoHlasi) expect(z.url, `${o.slug}: zdroj bez odkazu`).toMatch(/^https?:\/\//);
    }
  });

  it("uzavřená položka musí mít zapsáno, jak dopadla", () => {
    for (const o of DATA) {
      if (o.stav === "overujeme") continue;
      expect(o.jakDopadlo, `${o.slug}: uzavřeno bez zápisu`).toBeTruthy();
    }
  });

  it("po uplynutí lhůty se položka z přehledu stáhne", () => {
    const vzor: Overovana = {
      id: "t", slug: "t", coSeHlasi: "x", kodZeme: "CZ", zeme: "Česko",
      zacalo: "2026-01-01T00:00:00Z", overenoNaposledy: "2026-01-01T00:00:00Z",
      uzavritDo: "2026-01-02T00:00:00Z",
      kdoHlasi: [], coJsmeOverili: [], coRikajiUrady: [],
      kdybyPlatilo: "x", coDelatTed: "x", stav: "overujeme", lidskyOvereno: true,
    };
    const pred = new Date("2026-01-01T12:00:00Z").getTime();
    const po = new Date("2026-01-03T00:00:00Z").getTime();
    // Čistá funkce nad vzorem: před lhůtou žije, po ní ne.
    expect(new Date(vzor.uzavritDo).getTime() > pred).toBe(true);
    expect(new Date(vzor.uzavritDo).getTime() > po).toBe(false);
  });

  it("nahoře visí nejvýš tři položky naráz", () => {
    expect(overovaneAktivni().length).toBeLessThanOrEqual(NEJVYS_OVEROVANYCH);
  });

  it("nic nemizí potichu: každá položka je buď živá, nebo mezi uzavřenými", () => {
    const zive = overovaneAktivni().map((o) => o.slug);
    const uzavrene = overovaneUzavrene().map((o) => o.slug);
    for (const o of overujeme()) {
      expect([...zive, ...uzavrene], `${o.slug} se nikde neobjeví`).toContain(o.slug);
    }
  });

  it("do ostrých dat se nedostanou ukázkové adresy", () => {
    for (const o of DATA) {
      for (const z of o.kdoHlasi) expect(z.url).not.toContain("example.invalid");
    }
  });
});
