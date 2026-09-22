// @ts-nocheck — prostý .mjs modul; test hlídá chování.
import { describe, expect, it } from "vitest";
import { prohledej, zkontrolujZaznam } from "../nastroje/bezpecnost-obsahu.mjs";

describe("bezpečnost obsahu", () => {
  it("souřadnice a přístupové údaje jsou chyba", () => {
    expect(prohledej("Dron dopadl u 50.0755, 14.4378 nedaleko obce").map((n) => n.zavaznost)).toContain("chyba");
    expect(prohledej("50°04'32\"N 14°26'16\"E").some((n) => n.druh === "souradnice")).toBe(true);
    expect(prohledej("heslo: tajne123 do interního kanálu").some((n) => n.druh === "pristup")).toBe(true);
  });

  it("pohyb a rozmístění jednotek je varování, úřední oznámení bez detailu projde", () => {
    expect(prohledej("Přesun jednotek po dálnici D1 začne v 6:00").map((n) => n.zavaznost)).toContain("varovani");
    expect(prohledej("rozmístění hlídek u přechodů Náchod a Kudowa").some((n) => n.druh === "pohyb-jednotek")).toBe(true);
    expect(prohledej("Polsko: armáda posiluje hraniční přechody s Ukrajinou u Dorohuska")).toEqual([]);
    expect(prohledej("Policie zadržela podezřelého; datum 15. 9. 2026, 12,5 milionu korun")).toEqual([]);
  });

  it("prohledá všechny veřejné části záznamu včetně praktického dopadu", () => {
    const z = {
      slug: "x", titulek: "Titulek", fakta: ["v pořádku"],
      praktickyDopad: { coJePotvrzeno: [], coMuzeBytOvlivneno: [], coFunguje: [], coNefunguje: ["voda"], coDoporucujeUrad: [{ kdo: "obec", text: "trasa konvoje přes náměstí", url: "https://x" }], coUdelat: [], coNedelat: [], dalsiInfo: [], overeno: "2026-09-22" },
    };
    expect(zkontrolujZaznam(z).some((n) => n.druh === "pohyb-jednotek")).toBe(true);
  });

  it("ostrá data neobsahují souřadnice ani přístupové údaje", async () => {
    const fs = await import("node:fs");
    for (const f of ["incidenty.json", "navrhy.json", "nepotvrzeno.json"]) {
      const pole = JSON.parse(fs.readFileSync(`data/${f}`, "utf-8"));
      for (const z of pole) expect(zkontrolujZaznam(z).filter((n) => n.zavaznost === "chyba"), `${f}: ${z.slug ?? z.id}`).toEqual([]);
    }
  });
});
