import { describe, expect, it } from "vitest";
import { TEMATA, zkusenosti } from "../src/lib/zkusenosti";
import { HLAVNI_STRANKY } from "../src/components/postranni-panel";

/*
  Zkušenosti z Ukrajiny (28. 9. 2026). Útržek bez zdroje je vyprávění, ne
  zkušenost — a na webu, který se hlásí k doloženým faktům, nemá co dělat.
  Hlídá se i to, aby nic nebylo „na doplnění“ a aby odkazy vedly ven
  na skutečné adresy, ne do vyhledávače nebo agregátoru.
*/
describe("zkušenosti z Ukrajiny", () => {
  const polozky = zkusenosti();

  it("každý útržek je úplný a má zdroj", () => {
    expect(polozky.length).toBeGreaterThan(0);
    const id = new Set<string>();
    for (const p of polozky) {
      expect(id.has(p.id), `duplicitní id ${p.id}`).toBe(false);
      id.add(p.id);
      expect(p.tema in TEMATA, `${p.id}: neznámé téma ${p.tema}`).toBe(true);
      for (const k of ["nadpis", "coSeStalo", "kdyKde", "coNasledovalo", "jakToLideResili", "pouceni"] as const) {
        expect(p[k]?.trim().length, `${p.id}: prázdné ${k}`).toBeGreaterThan(5);
        expect(p[k], `${p.id}: zástupný text v ${k}`).not.toMatch(/\[DOPLNIT\]|\bTODO\b|lorem ipsum/);
      }
      expect(p.zdroje.length, `${p.id}: bez zdroje`).toBeGreaterThan(0);
      for (const z of p.zdroje) {
        expect(z.url, `${p.id}: zdroj není adresa`).toMatch(/^https:\/\//);
        const host = new URL(z.url).hostname.replace(/^www\./, "");
        expect(host, `${p.id}: zdroj vede přes vyhledávač nebo sociální síť`).not.toMatch(/(^|\.)(google\.[a-z.]+|bing\.com|facebook\.com|x\.com|twitter\.com|tiktok\.com|instagram\.com)$/);
        expect(z.nazev.trim().length).toBeGreaterThan(3);
      }
    }
  });

  it("stránka je v hlavním menu", () => {
    expect(HLAVNI_STRANKY.some((s) => s.href === "/zkusenosti/")).toBe(true);
  });
});
