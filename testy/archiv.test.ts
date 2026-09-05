import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KANALY } from "../src/config/web";
import type { Archiv } from "../src/lib/typy";

const cti = (p: string): Archiv =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", p), "utf-8"));

const archivy: [string, Archiv][] = [
  ["ostrý", cti("historie.json")],
  ["ukázkový", cti("ukazka/historie.json")],
];

describe("archiv v čase", () => {
  it.each(archivy)("%s archiv má snímky seřazené a bez duplicit", (_, a) => {
    const casy = a.snimky.map((s) => s.kdy);
    expect([...casy].sort()).toEqual(casy);
    expect(new Set(casy).size).toBe(casy.length);
  });

  it.each(archivy)("%s archiv zapisuje snímek jen při změně", (_, a) => {
    // Prázdný seznam změn by znamenal záznam, který nic neříká.
    for (const s of a.snimky) expect(s.zmeny.length, s.kdy).toBeGreaterThan(0);
  });

  it.each(archivy)("%s archiv nehlásí změnu, která žádná není", (_, a) => {
    // „Střední → Střední“ je pro čtenáře nesmysl: buď se změnilo něco, co vidí,
    // nebo se to popíše jako posun uvnitř úrovně.
    for (const s of a.snimky) {
      for (const z of s.zmeny) {
        const m = z.match(/^(.+): (.+) → (.+)$/);
        if (m) expect(m[2], z).not.toBe(m[3]);
      }
    }
  });

  it.each(archivy)("%s archiv začíná tam, kde tvrdí", (_, a) => {
    if (!a.snimky.length) {
      expect(a.zacatek).toBeNull();
      return;
    }
    expect(a.zacatek).toBe(a.snimky[0].kdy);
  });
});

describe("odběrové kanály", () => {
  it("nastavené kanály míří na https", () => {
    for (const [klic, url] of Object.entries(KANALY)) {
      if (!url) continue;
      expect(url.startsWith("https://"), klic).toBe(true);
    }
  });

  it("nenastavený kanál je prázdný řetězec, ne zástupný text", () => {
    // Zástupná adresa by se na webu tvářila jako funkční odkaz.
    for (const url of Object.values(KANALY)) {
      expect(url).not.toMatch(/example|TODO|DOPLNIT|#/);
    }
  });
});

import { lidskaZmena } from "../src/lib/archiv-text";

describe("lidský popis změn", () => {
  it("překládá klíče provozu i stavů na věty pro čtenáře", () => {
    expect(lidskaZmena("provoz — palivo: bez-zdroje → bezny")).toBe(
      "Palivo a čerpací stanice: bez ověřeného zdroje → běžný provoz",
    );
    expect(lidskaZmena("právní stav — valecny-stav: neověřeno → NE")).toBe("Válečný stav: neověřeno → NE");
    expect(lidskaZmena("NATO — clanek-4: neověřeno → NE")).toBe("NATO čl. 4 (konzultace): neověřeno → NE");
  });
  it("věty, které už jsou lidské, nechá být", () => {
    expect(lidskaZmena("celková úroveň: Střední → Vyšší")).toBe("Celková úroveň: Střední → Větší střední");
    expect(lidskaZmena("celková úroveň: Střední → Téměř oranžová")).toBe("Celková úroveň: Střední → Větší střední");
    expect(lidskaZmena("začátek archivu")).toBe("Začátek archivu");
  });
  it("v archivu nezůstává žádný surový klíč", () => {
    const a = JSON.parse(fs.readFileSync("data/historie.json", "utf8")) as { snimky: { zmeny: string[] }[] };
    for (const s of a.snimky) for (const z of s.zmeny) expect(lidskaZmena(z)).not.toMatch(/bez-zdroje|bezny\b| — [a-z0-9-]+:/);
  });
});
