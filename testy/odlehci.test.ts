import { describe, expect, it } from "vitest";
import { incidenty } from "../src/lib/data";
import { dolozeno, uredniZdroj } from "../src/lib/agregace";
import { odlehciProUvod, proPocty } from "../src/lib/odlehci";

/*
  Zeštíhlené záznamy pro úvod a Analýzy (výkon, 26. 9. 2026) nesmí změnit
  nic, co se z nich počítá nebo ukazuje: počet zdrojů, doloženo/úřední,
  první a úřední zdroj.
*/
describe("odlehčené záznamy dávají stejné výsledky", () => {
  const ted = Date.now();
  for (const [jmeno, f] of [["úvod", (i: ReturnType<typeof incidenty>[number]) => odlehciProUvod(i, ted)], ["počty", proPocty]] as const) {
    it(jmeno, () => {
      for (const i of incidenty()) {
        const l = f(i);
        expect(l.zdroje.length).toBe(i.zdroje.length);
        expect(dolozeno(l)).toBe(dolozeno(i));
        expect(uredniZdroj(l)).toBe(uredniZdroj(i));
        if (i.zdroje[0]) expect(l.zdroje[0].url).toBe(i.zdroje[0].url);
        const u = i.zdroje.find((s) => s.primarni);
        if (u) expect(l.zdroje.find((s) => s.primarni)?.url).toBe(u.url);
        expect(l.slug).toBe(i.slug);
        expect(l.zavaznost).toBe(i.zavaznost);
      }
    });
  }
});
