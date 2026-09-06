import { describe, expect, it } from "vitest";
import { incidenty, nepotvrzene, opravy, opravyK } from "@/lib/data";

describe("opravy", () => {
  const slugy = new Set(incidenty().map((i) => i.slug));
  const neprosle = new Set(nepotvrzene().map((n) => `nepotvrzeno/${n.id}`));
  it("každá oprava má platné datum a existující cíl", () => {
    for (const o of opravy()) {
      expect(Number.isNaN(new Date(o.datum).getTime()), o.id).toBe(false);
      const ok = slugy.has(o.tykaSe) || neprosle.has(o.tykaSe) || o.tykaSe === "metodika" || o.tykaSe === "historicke-zaznamy";
      expect(ok, `${o.id} → ${o.tykaSe}`).toBe(true);
      expect(o.co.length, o.id).toBeGreaterThan(20);
      expect(o.proc.length, o.id).toBeGreaterThan(20);
    }
  });
  it("nejnovější první a oprava k záznamu je dohledatelná", () => {
    const d = opravy().map((o) => o.datum);
    expect([...d].sort().reverse()).toEqual(d);
    expect(opravyK("leipzig-halle-utok").length).toBeGreaterThan(0);
  });
});
