import { describe, expect, it } from "vitest";
import { incidenty, kandidati, nepotvrzeneZaznamy } from "../src/lib/data";

/*
  Nepotvrzené záznamy na webu.

  Od 20. 9. 2026 se návrhy čekající na schválení ukazují veřejně. Důvod je
  poctivost v druhou stranu: dokud byly jen ve Správě, vypadal web během
  čekání, jako by se nic nedělo.

  Celá věc ale stojí na jediné hranici — nepotvrzené se nesmí počítat mezi
  ověřené. Kdyby prosákly, projekt by tvrdil něco, co si nikdo nepřečetl,
  a přitom by to vypadalo jako ověřený záznam. Tenhle soubor hlídá tu hranici.
*/

describe("nepotvrzené záznamy", () => {
  it("nikdy nejsou mezi ověřenými", () => {
    const overene = new Set(incidenty().map((i) => i.id));
    for (const n of nepotvrzeneZaznamy()) {
      expect(overene.has(n.id), `${n.id} je zároveň mezi ověřenými`).toBe(false);
    }
  });

  it("žádný z nich neprošel člověkem", () => {
    for (const n of nepotvrzeneZaznamy()) {
      expect(n.lidskyOvereno, `${n.id} tvrdí lidské ověření`).toBe(false);
    }
  });

  it("každý má aspoň jeden zdroj s odkazem", () => {
    /* Zpráva bez odkazu se nedá ověřit ani vyvrátit — na web nepatří ani jako nepotvrzená. */
    for (const n of nepotvrzeneZaznamy()) {
      expect(n.zdroje.length, `${n.id} nemá zdroj`).toBeGreaterThan(0);
      for (const z of n.zdroje) expect(z.url, `${n.id} má zdroj bez adresy`).toBeTruthy();
    }
  });

  it("nesplétají se se zachycenými zprávami", () => {
    /*
      Zachycená zpráva je holý titulek, nepotvrzený záznam je zpracovaná věc
      se zdroji. Kdyby se tytéž položky objevily v obou záložkách, čtenář by
      tentýž případ počítal dvakrát.
    */
    const vNavrzich = new Set(nepotvrzeneZaznamy().flatMap((n) => n.zdroje.map((z) => z.url)));
    for (const k of kandidati()) {
      expect(vNavrzich.has(k.zdroj.url), `${k.id} visí ve frontě, přestože je zdrojem návrhu`).toBe(false);
    }
  });

  it("nenese zástupný text", () => {
    /* „[DOPLNIT]" se jednou dostalo na živý web. Veřejné je teď i tohle. */
    for (const n of nepotvrzeneZaznamy()) {
      const text = [n.titulek, n.vyznam ?? "", ...n.fakta, ...n.neznameho].join(" ");
      expect(text, `${n.id} obsahuje zástupný text`).not.toContain("[DOPLNIT]");
    }
  });
});
