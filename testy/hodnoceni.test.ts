import { describe, expect, it } from "vitest";
import { spocitejStav } from "../sber/hodnoceni";
import type { Incident } from "../src/lib/typy";

const TED = Date.parse("2026-09-23T12:00:00Z");
const z = (zavaznost: string, dniZpet: number, kod = "PL", extra: Partial<Incident> = {}) =>
  ({
    id: `${zavaznost}-${dniZpet}-${kod}`, zavaznost, kodZeme: kod, zeme: kod, druh: "pripad", lidskyOvereno: true,
    datumUdalosti: new Date(TED - dniZpet * 864e5).toISOString(), datumZjisteni: new Date(TED - dniZpet * 864e5).toISOString(),
    ...extra,
  }) as unknown as Incident;
const beh = new Date(TED - 3_600_000).toISOString();

describe("automatické celkové hodnocení", () => {
  it("jediná závažná událost hodnocení nezvedne", () => {
    const s = spocitejStav([z("R1", 1), z("Y1", 2), z("Y1", 3), z("Y1", 4)], TED, beh);
    expect(s.uroven).toBe("G3"); // Y1 v zahraničí = o stupeň níž
  });

  it("událost v Česku se nesnižuje", () => {
    expect(spocitejStav([z("Y2", 1, "CZ"), z("Y2", 2, "CZ"), z("Y2", 3, "CZ")], TED, beh).uroven).toBe("Y2");
  });

  it("neověřené úředně, reakce a staré záznamy nevstupují", () => {
    const s = spocitejStav([
      z("R3", 1, "PL", { lidskyOvereno: false, overeni: "neovereno" }),
      z("R3", 1, "PL", { druh: "reakce" }),
      z("R3", 30),
    ], TED, beh);
    expect(s.uroven).toBe("G2");
    expect(s.noveSignaly.celkem).toBe(0);
  });

  it("když sběr den neběžel, trend se nepočítá", () => {
    const s = spocitejStav([z("O1", 1), z("O1", 2), z("O1", 3)], TED, new Date(TED - 2 * 864e5).toISOString());
    expect(s.trend).toBeNull();
  });

  it("nárůst o čtvrtinu a aspoň o 3 body je trend nahoru", () => {
    const s = spocitejStav([z("O1", 1), z("O1", 2), z("O1", 3), z("Y1", 9)], TED, beh);
    expect(s.trend).toBe("nahoru");
  });
});
