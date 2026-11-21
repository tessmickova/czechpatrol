import { describe, expect, it } from "vitest";
import { poradiSloupcu } from "../src/components/aktuality-sloupce";

/* Mobil (21. 11. 2026): sloupce s nejaktuálnějším varováním nahoře. */
const r = (kdy: string, dulezite = false) => ({ kdy, naliehavost: dulezite ? { druh: "x", stupen: 2, platiDo: "2026-11-30" } : null });

describe("pořadí sloupců na mobilu", () => {
  it("sloupec s platnou důležitou zprávou je první, i když jinde je novější obyčejná", () => {
    const p = poradiSloupcu({ signaly: [r("2026-11-21T20:00:00Z")], hranice: [r("2026-11-19T10:00:00Z", true)], vody: [r("2026-11-21T08:00:00Z")] });
    expect(p).toEqual({ hranice: "max-md:order-1", signaly: "max-md:order-2", vody: "max-md:order-3" });
  });
  it("bez důležitých podle nejnovější zprávy; prázdný sloupec poslední", () => {
    const p = poradiSloupcu({ signaly: [r("2026-11-20T10:00:00Z")], hranice: [], vody: [r("2026-11-21T10:00:00Z")] });
    expect(p).toEqual({ vody: "max-md:order-1", signaly: "max-md:order-2", hranice: "max-md:order-3" });
  });
});
