import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  Web do 26. 9. 2026 na šesti místech tvrdil „sběr každých 30 minut“, ale
  worker spouští sběr nejdřív po 60 minutách (api/src/minuty.ts, KADENCE).
  Kadence se na webu píše jen přes SBER_JAK_CASTO (src/config/web.ts).
*/
const soubory = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? soubory(p) : /\.(tsx?|mdx?)$/.test(e.name) ? [p] : [];
  });

describe("texty o tom, jak často běží sběr", () => {
  it("nikde netvrdí pevných 30 minut", () => {
    const spatne = soubory(path.join(process.cwd(), "src"))
      .filter((f) => !f.endsWith(path.join("config", "web.ts")))
      .filter((f) => /(každých|kazdych|po)\s+30\s+min/i.test(fs.readFileSync(f, "utf-8")));
    expect(spatne).toEqual([]);
  });
  it("text odpovídá nejkratší kadenci workeru", async () => {
    const { KADENCE } = await import("../api/src/minuty");
    const { SBER_JAK_CASTO } = await import("../src/config/web");
    expect(KADENCE[0]).toBe(60);
    expect(SBER_JAK_CASTO).toMatch(/hodinu/);
  });
});
