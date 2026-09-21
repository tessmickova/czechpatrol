import { describe, expect, it } from "vitest";
import { prectiStatuspage, SLUZBY } from "../src/lib/sluzby";

describe("stav služeb", () => {
  const ted = "2026-09-21T10:00:00Z";

  it("registr má jedinečné klíče, https adresy Statuspage a vazbu jen na položky mřížky", () => {
    const klice = SLUZBY.map((s) => s.klic);
    expect(new Set(klice).size).toBe(klice.length);
    for (const s of SLUZBY) {
      expect(s.url.startsWith("https://"), s.klic).toBe(true);
      expect(s.url.endsWith("/api/v2/summary.json"), s.klic).toBe(true);
      expect(s.odkaz.startsWith("https://"), s.klic).toBe(true);
      if (s.tyka) expect(["komunikace", "banky", "elektrina", "plyn", "hranice", "palivo", "vycestovani", "bezny-zivot"]).toContain(s.tyka);
    }
  });

  it("převádí indikátor provozovatele na tři stavy", () => {
    expect(prectiStatuspage("x", { status: { indicator: "none", description: "All Systems Operational" } }, ted).stav).toBe("provoz");
    expect(prectiStatuspage("x", { status: { indicator: "minor" } }, ted).stav).toBe("omezeni");
    expect(prectiStatuspage("x", { status: { indicator: "major" } }, ted).stav).toBe("vypadek");
    expect(prectiStatuspage("x", { status: { indicator: "critical" } }, ted).stav).toBe("vypadek");
  });

  it("nečekaná odpověď nikdy neznamená provoz", () => {
    for (const telo of [null, "text", {}, { status: {} }, { status: { indicator: "weird" } }]) {
      const s = prectiStatuspage("x", telo, ted);
      expect(s.stav).toBe("nezjisteno");
      expect(s.chyba).toBeTruthy();
    }
  });

  it("bere jen otevřené incidenty a postižené součásti", () => {
    const s = prectiStatuspage("x", {
      status: { indicator: "major", description: "Partial System Outage" },
      incidents: [
        { name: "Message delivery delays", status: "investigating", shortlink: "https://stspg.io/abc", updated_at: "2026-09-21T09:50:00Z" },
        { name: "Old one", status: "resolved" },
      ],
      components: [{ name: "Messaging", status: "partial_outage" }, { name: "Website", status: "operational" }],
    }, ted);
    expect(s.incidenty).toEqual([{ nazev: "Message delivery delays", odkaz: "https://stspg.io/abc", aktualizovano: "2026-09-21T09:50:00Z" }]);
    expect(s.postizene).toEqual(["Messaging"]);
    expect(s.popis).toBe("Partial System Outage");
    expect(s.zkontrolovano).toBe(ted);
  });
});
