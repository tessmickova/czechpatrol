import { describe, expect, it } from "vitest";
import { coOhlasit } from "../src/hlidac";
import { minutBehu, spocitejSpotrebu, vyberKadenci, type Beh } from "../src/minuty";

const beh = (zacatek: string, sekund: number, conclusion = "success"): Beh => ({
  conclusion,
  run_started_at: zacatek,
  updated_at: new Date(new Date(zacatek).getTime() + sekund * 1000).toISOString(),
});

describe("minuty GitHub Actions", () => {
  it("odmítnutý běh (chyba do 15 s) se neúčtuje, běžný se zaokrouhlí nahoru", () => {
    expect(minutBehu(beh("2026-09-23T10:00:00Z", 3, "failure"))).toBe(0);
    expect(minutBehu(beh("2026-09-23T10:00:00Z", 61))).toBe(2);
  });

  it("pozná, že GitHub úlohy odmítá", () => {
    const b = [1, 2, 3].map((h) => beh(`2026-09-23T0${h}:00:00Z`, 2, "failure"));
    expect(spocitejSpotrebu(b, Date.parse("2026-09-23T05:00:00Z")).odmitaSe).toBe(true);
  });

  it("při tempu nad příděl zpomalí sběr, ale nezastaví", () => {
    const ted = Date.parse("2026-09-15T00:00:00Z");
    // 14 dní × 24 běhů × 4 min = 1 344 min za půl měsíce → na konci ~2 880
    const b: Beh[] = [];
    for (let d = 1; d <= 14; d++) for (let h = 0; h < 24; h++) b.push(beh(`2026-09-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00Z`, 200));
    const s = spocitejSpotrebu(b, ted);
    expect(s.naKonciMesice).toBeGreaterThan(2000);
    const k = vyberKadenci(s, ted);
    expect(k).toBeGreaterThan(60);
    expect(k).toBeLessThanOrEqual(240);
  });

  it("při nízké spotřebě sbírá každou hodinu", () => {
    const ted = Date.parse("2026-09-15T00:00:00Z");
    expect(vyberKadenci(spocitejSpotrebu([beh("2026-09-02T00:00:00Z", 60)], ted), ted)).toBe(60);
  });

  it("odmítání hlásí správci hned, ne po třech hodinách", () => {
    const ted = Date.parse("2026-09-23T03:00:00Z");
    const v = coOhlasit({ posledniUspech: "2026-09-23T02:30:00Z", chybnych: 3, odmitaSe: true }, ted, null);
    expect(v.komu).toEqual(["spravce"]);
  });
});
