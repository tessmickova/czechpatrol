import { describe, expect, it } from "vitest";
import { odhadniTemata, odhadniZemi, otisk, relevantni } from "../sber/udalosti";

describe("automatický sběr událostí — pravidla", () => {
  it("pozná zemi události, i když je zmíněné Rusko jako původce", () => {
    expect(odhadniZemi("Russian drone violates Romanian airspace near Tulcea")?.kod).toBe("RO");
    expect(odhadniZemi("Policie ČR zadržela v Praze muže podezřelého ze sabotáže")?.kod).toBe("CZ");
    expect(odhadniZemi("Kremlin comments on sanctions")?.kod).toBe("RU");
    expect(odhadniZemi("Weather forecast for tomorrow")).toBeNull();
  });
  it("přiřadí oblasti podle klíčových slov", () => {
    const t = odhadniTemata("Sabotage suspected after fire at substation; undersea cable also damaged");
    expect(t.kategorie).toEqual(expect.arrayContaining(["sabotaz", "infrastruktura"]));
  });
  it("relevantní je jen bezpečnostní zpráva, ne sport ani jeden slabý signál", () => {
    expect(relevantni("Arson attack on warehouse linked to Russian intelligence, police say")).toBe(true);
    expect(relevantni("NATO scrambled jets after airspace violation by drone")).toBe(true);
    expect(relevantni("Football club buys new drone for training videos")).toBe(false);
    expect(relevantni("New smartphone with better camera")).toBe(false);
    expect(relevantni("Drone show lights up the night sky at festival")).toBe(false);
  });
  it("otisk titulku srovná stejnou zprávu z různých redakcí", () => {
    expect(otisk("Copenhagen Airport closed as police investigate drone activity — Bloomberg")).toBe(otisk("Copenhagen airport closed as police investigate drone activity!"));
    expect(otisk("Munich airport drones")).not.toBe(otisk("Oslo airport drones"));
  });
});
