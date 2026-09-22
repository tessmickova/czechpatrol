import { describe, expect, it } from "vitest";
import nastroje from "../data/oficialni-nastroje.json";
import { skorePripravenosti, vetaKeSkore } from "../src/lib/pripravenost";
import type { OficialniNastroj } from "../src/lib/typy";

const katalog = nastroje as OficialniNastroj[];

describe("katalog oficiálních nástrojů", () => {
  it("má jedinečná id, https adresy a odkazy do obchodů jen na App Store / Google Play", () => {
    const ids = katalog.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of katalog) {
      for (const u of [n.iosUrl, n.androidUrl, n.webUrl, n.oficialniZdroj]) if (u) expect(u, n.id).toMatch(/^https:\/\//);
      if (n.iosUrl) expect(n.iosUrl, n.id).toMatch(/^https:\/\/apps\.apple\.com\//);
      if (n.androidUrl) expect(n.androidUrl, n.id).toMatch(/^https:\/\/play\.google\.com\//);
    }
  });

  it("nic se nevydává za ověřené bez data; každá položka kromě obecné rady má oficiální zdroj", () => {
    for (const n of katalog) {
      if (n.stav === "overeno") expect(n.overeno, n.id).toMatch(/^\d{4}-\d{2}-\d{2}/);
      if (n.adresaOverena) expect(n.adresaOverena, n.id).toMatch(/^\d{4}-\d{2}-\d{2}/);
      if (n.stav !== "obecne") expect(n.oficialniZdroj, n.id).toBeTruthy();
      expect(n.provozovatel.length, n.id).toBeGreaterThan(3);
      expect(n.coNastavit.length, n.id).toBeGreaterThan(0);
      expect(JSON.stringify(n)).not.toContain("[DOPLNIT]");
      expect(n.kratce.split(/\s+/).length, `${n.id}: kratce`).toBeLessThanOrEqual(10);
      expect(n.ikona, n.id).toBeTruthy();
    }
  });

  it("nikdy netvrdí, že web vidí do telefonu", () => {
    const text = JSON.stringify(katalog);
    expect(text).not.toMatch(/zjist[íi]me, (co|jestli) máte nainstalov/i);
  });
});

describe("skóre připravenosti", () => {
  it("počítá jen „mám“ nad doporučenými; nevím není mám", () => {
    const s = skorePripravenosti(katalog, { zachranka: "mam", drozd: "nevim", "sireny-jsvv": "nemam" });
    expect(s.celkem).toBe(katalog.filter((n) => n.doporuceno).length);
    expect(s.mam).toBe(1);
    expect(s.chybi).toEqual(["sireny-jsvv"]);
    expect(s.nevim).toContain("drozd");
    expect(s.nevim).toContain("tisnove-linky");
  });

  it("věta ke skóre neradí ani nehodnotí člověka", () => {
    const s = skorePripravenosti(katalog, {});
    const v = vetaKeSkore(s);
    expect(v).toMatch(/nevíte/);
    expect(v).not.toMatch(/musíte|okamžitě|nebezpeč/i);
    const vse = Object.fromEntries(katalog.map((n) => [n.id, "mam" as const]));
    expect(vetaKeSkore(skorePripravenosti(katalog, vse))).toBe("Máte všechny doporučené služby.");
  });
});
