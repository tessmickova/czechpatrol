import { describe, expect, it } from "vitest";
import { svet } from "@/lib/data";

describe("svět: cíle mocností", () => {
  const s = svet();
  it("každé tvrzení má aspoň jeden existující zdroj s adresou", () => {
    for (const a of s.aktori) {
      for (const t of [...a.deklarovane, ...a.postup]) {
        expect(t.zdroje.length, `${a.klic}: ${t.text.slice(0, 40)}`).toBeGreaterThan(0);
        for (const i of t.zdroje) expect(a.zdroje[i]?.url, `${a.klic} [${i + 1}]`).toMatch(/^https?:\/\//);
      }
    }
  });
  it("stupeň přiblížení leží na stupnici a postoje sedí na otázky", () => {
    for (const a of s.aktori) {
      expect(a.priblizeni.stupen).toBeGreaterThanOrEqual(0);
      expect(a.priblizeni.stupen).toBeLessThan(s.stupne.length);
      expect(s.stret.postoje[a.klic]).toHaveLength(s.stret.otazky.length);
    }
  });
});
