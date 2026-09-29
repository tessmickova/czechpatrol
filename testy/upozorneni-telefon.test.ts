import fs from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error — .mjs nástroj bez typů
import { doTelefonu, podpisProTelefon, sestavKratky, sestavMimoradnou, sestavPrazdnyPrehled, sestavTip, sestavZpravu } from "../nastroje/rozhlas.mjs";
import { DRUHY_UPOZORNENI } from "../src/lib/push";

/*
  Upozornění do telefonu (29. 9. 2026). Telefon ukáže titulek a pár řádků:
  titulek musí nést obsah (ne jen štítek nebo pruh puntíků), text nesmí
  obsahovat HTML ani holé adresy a odkaz vede jen na náš web.
*/
type Upozorneni = { titulek: string; text: string; odkaz: string };
const zaznamy = JSON.parse(fs.readFileSync("data/incidenty.json", "utf-8")).filter((i: { lidskyOvereno?: boolean }) => i.lidskyOvereno).slice(-5);
const tipy = JSON.parse(fs.readFileSync("data/tipy.json", "utf-8"));

function zkontroluj(u: Upozorneni) {
  expect(u.titulek.length).toBeGreaterThan(10);
  expect(u.titulek.length).toBeLessThanOrEqual(120);
  expect(u.text.length).toBeLessThanOrEqual(300);
  expect(/\p{L}/u.test(u.titulek)).toBe(true);
  for (const t of [u.titulek, u.text]) {
    expect(t).not.toMatch(/<[a-z/]/i);
    expect(t).not.toMatch(/https?:\/\//);
    expect(t).not.toMatch(/&(amp|lt|gt|quot);/);
  }
  expect(u.odkaz.startsWith("https://czechpatrol.cz/")).toBe(true);
}

describe("text upozornění v telefonu", () => {
  it("každý druh zprávy dá čitelný titulek a text", () => {
    for (const i of zaznamy) {
      zkontroluj(doTelefonu(sestavZpravu(i)));
      zkontroluj(doTelefonu(sestavKratky(i)));
      zkontroluj(doTelefonu(sestavMimoradnou(i)));
    }
    zkontroluj(doTelefonu(sestavTip((tipy.tipy ?? tipy)[0])));
    zkontroluj(doTelefonu(sestavPrazdnyPrehled({})));
  });
  it("štítek na začátku se spojí s obsahem", () => {
    const u = doTelefonu("<b>📋 Oficiální opatření</b>\nPolsko zavřelo přechod\n\nDalší text.");
    expect(u.titulek).toBe("📋 Oficiální opatření · Polsko zavřelo přechod");
    expect(u.text).toBe("Další text.");
  });
  it("cizí odkaz se do upozornění nedostane", () => {
    expect(doTelefonu('<a href="https://zlo.example/">klik</a>\nNadpis zprávy tady').odkaz).toBe("https://czechpatrol.cz/");
  });
});

describe("shoda webu a API", () => {
  it("druhy upozornění na webu jsou přesně ty, které zná API", () => {
    const api = fs.readFileSync("api/src/push.ts", "utf-8").match(/DRUHY_PUSH = \[([^\]]+)\]/)![1].match(/"(\w+)"/g)!.map((s) => s.slice(1, -1));
    expect(DRUHY_UPOZORNENI.map((d) => d.klic)).toEqual(api);
  });
  it("podpis rozhlasu je deterministický a závisí na tokenu", () => {
    expect(podpisProTelefon("a", "1", "{}")).toBe(podpisProTelefon("a", "1", "{}"));
    expect(podpisProTelefon("a", "1", "{}")).not.toBe(podpisProTelefon("b", "1", "{}"));
  });
});
