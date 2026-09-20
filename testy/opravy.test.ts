import { describe, expect, it } from "vitest";
import { incidenty, nepotvrzene, nepotvrzeneZaznamy, opravy, opravyK } from "@/lib/data";

describe("opravy", () => {
  const slugy = new Set(incidenty().map((i) => i.slug));
  const neprosle = new Set(nepotvrzene().map((n) => `nepotvrzeno/${n.id}`));
  /*
    Stažený záznam mezi zveřejněnými není, ale nezmizel: je z něj nepotvrzený
    návrh a na webu je dál vidět. Oprava, která vysvětluje, proč byl stažen,
    na něj musí smět ukázat — jinak by se stažení nedalo zveřejnit.
  */
  const nepotvrzeneSlugy = new Set(nepotvrzeneZaznamy().map((n) => n.slug));
  it("každá oprava má platné datum a existující cíl", () => {
    for (const o of opravy()) {
      expect(Number.isNaN(new Date(o.datum).getTime()), o.id).toBe(false);
      const ok = slugy.has(o.tykaSe) || nepotvrzeneSlugy.has(o.tykaSe) || neprosle.has(o.tykaSe)
        || o.tykaSe === "metodika" || o.tykaSe === "historicke-zaznamy";
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
