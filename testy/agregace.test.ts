import { describe, expect, it } from "vitest";
import { aktivniHrozby, aktualizaceK, dolozeno, jistotaZobrazena, pocty, podlePuvodce, podleZemi, pripadyPoMesicich, pripady, posledniZmeny } from "../src/lib/agregace";
import { incidenty, nepotvrzene } from "../src/lib/data";
import { cerstvost, datumCasPraha, datumPraha, maCas } from "../src/lib/cas";

const vse = incidenty();
const TED = new Date("2026-09-06T12:00:00Z").getTime();

describe("případy a aktualizace", () => {
  it("aktualizace starého případu nezvyšuje počet případů", () => {
    const leipzig = vse.find((i) => i.slug === "leipzig-halle-utok")!;
    const nasledne = aktualizaceK("leipzig-halle-utok", vse);
    expect(nasledne.length).toBeGreaterThan(0);
    expect(pripady(vse).some((i) => i.slug === "leipzig-podezreli")).toBe(false);
    expect(pripady(vse).some((i) => i.slug === leipzig.slug)).toBe(true);
  });
  it("nová atribuce Vrbětic je aktualizace původního případu z roku 2014", () => {
    const a = aktualizaceK("vrbetice-2014", vse);
    expect(a.map((x) => x.slug)).toContain("cr-vrbetice-reakce-2021");
    expect(pripady(vse).filter((i) => i.slug.startsWith("vrbetice") || i.slug.includes("vrbetice")).length).toBe(1);
  });
  it("prohlášení a reakce nejsou případy", () => {
    const p = pocty(vse, "vše");
    expect(p.pripady + p.aktualizace + p.opatreni + p.reakce).toBe(p.celkem);
    expect(pripady(vse).every((i) => i.puvodce)).toBe(true);
  });
});

describe("aktivní hrozby", () => {
  it("nikdy neobsahují vyvrácené ani nepotvrzené záznamy", () => {
    const slugy = new Set(aktivniHrozby(vse, TED).map((i) => i.slug));
    for (const n of nepotvrzene()) expect(slugy.has(n.id)).toBe(false);
  });
  it("jsou jen z posledních 90 dnů a jen případy", () => {
    for (const i of aktivniHrozby(vse, TED)) {
      expect(TED - new Date(i.datumZjisteni ?? i.datumUdalosti).getTime()).toBeLessThanOrEqual(90 * 86_400_000);
      expect(i.druh ?? "pripad").toBe("pripad");
    }
  });
});

describe("shoda agregací", () => {
  it("součet zemí odpovídá celku a rozpad původců odpovídá počtu případů", () => {
    const zeme = podleZemi(vse);
    expect(zeme.reduce((n, z) => n + z.celkem, 0)).toBe(vse.length);
    expect(zeme.reduce((n, z) => n + z.pripady, 0)).toBe(pripady(vse).length);
    const pv = podlePuvodce(vse);
    expect(pv.skupiny.reduce((n, s) => n + s.pocet, 0)).toBe(pv.celkem);
    expect(pv.celkem).toBe(pripady(vse).length);
  });
  it("potvrzený pachatel se počítá jen mezi případy", () => {
    for (const z of podleZemi(vse)) expect(z.pripadyPotvrzenyPachatel).toBeLessThanOrEqual(z.pripady);
  });
  it("záznam bez odkazu na zdroj nesmí být zobrazen jako potvrzený", () => {
    for (const i of vse) {
      if (!dolozeno(i)) expect(["nizka", "stredni"]).toContain(jistotaZobrazena(i));
    }
  });
  it("poslední změny neobsahují reakce, dokud jsou k dispozici činy a opatření", () => {
    const z = posledniZmeny(5, vse, TED);
    expect(z.length).toBe(5);
    expect(z.every((i) => (i.druh ?? "pripad") !== "reakce")).toBe(true);
  });
  it("měsíce před začátkem monitoringu nejsou nula, ale prázdné", () => {
    const m = pripadyPoMesicich(vse, "2014-01", "2026-07");
    expect(m.find((x) => x.mesic === "2015-03")?.pripady).toBeNull();
    expect(m.find((x) => x.mesic === "2026-07")?.pripady).not.toBeNull();
  });
});

describe("čas", () => {
  it("datum bez času se neukazuje s vymyšleným 00:00", () => {
    expect(maCas("2026-08-04T00:00:00Z")).toBe(false);
    expect(datumCasPraha("2026-08-04T00:00:00Z")).toBe("4. 8. 2026");
    expect(datumPraha("2026-01-05T00:00:00Z")).toBe("5. 1. 2026");
  });
  it("skutečný čas se převádí do pražského času včetně letního posunu", () => {
    expect(datumCasPraha("2026-09-05T08:53:00Z")).toBe("5. 9. 2026 · 10:53");
    expect(datumCasPraha("2026-01-05T08:53:00Z")).toBe("5. 1. 2026 · 09:53");
  });
  it("neověřené nikdy nevypadá jako čerstvé", () => {
    expect(cerstvost(null)).toBe("nezname");
    expect(cerstvost("2026-09-06T10:00:00Z", TED)).toBe("cerstve");
    expect(cerstvost("2026-09-01T10:00:00Z", TED)).toBe("zastarale");
  });
});
