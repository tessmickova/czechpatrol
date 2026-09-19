import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  Vnitřní názvy do veřejných textů nepatří.

  Čtenář webu nemá vědět, že se náš pomocník jmenuje Patrol nebo že krok
  uvnitř se jmenuje audit — ta jména mu nic neříkají a budí dojem, že jde
  o úřad nebo o zdroj. Věta má říct, CO se stalo (zachyceno sběrem, doložen
  druhý zdroj), ne KDO z našich nástrojů to udělal.

  Vzniklo z řádku „Zachyceno sběrem, druhý zdroj dohledal Patrol.", který
  takhle prošel až do zveřejněného záznamu.
*/

const ZAKAZANA = [/\bPatrol\b(?!\s*$)/, /\bauditem\b/i, /\bHaiku\b/i, /\bSonnet\b/i, /\bClaude\b/i, /\bGPT\b/i];

function texty(soubor: string): { kde: string; text: string }[] {
  const data = JSON.parse(readFileSync(path.join(process.cwd(), "data", soubor), "utf-8")) as Record<
    string,
    unknown
  >[];
  const ven: { kde: string; text: string }[] = [];
  for (const z of data) {
    const slug = String(z.slug ?? z.id ?? "?");
    for (const h of (z.historie ?? []) as { text?: string }[]) {
      if (h.text) ven.push({ kde: `${slug} → historie`, text: h.text });
    }
    for (const klic of ["titulek", "kratkyTitulek", "vyznam"]) {
      const v = z[klic];
      if (typeof v === "string") ven.push({ kde: `${slug} → ${klic}`, text: v });
    }
    for (const klic of ["fakta", "neznameho"]) {
      for (const v of (z[klic] ?? []) as string[]) ven.push({ kde: `${slug} → ${klic}`, text: v });
    }
  }
  return ven;
}

describe("veřejné texty", () => {
  for (const soubor of ["incidenty.json", "navrhy.json"]) {
    it(`${soubor} nejmenuje naše nástroje ani modely`, () => {
      for (const { kde, text } of texty(soubor)) {
        for (const vzor of ZAKAZANA) {
          expect(vzor.test(text), `${kde}: „${text}"`).toBe(false);
        }
      }
    });
  }
});
