import { describe, expect, it } from "vitest";
import { ctiRss } from "../sber/nacti";

// 23. 9. 2026 se na úvodu ukázalo „Russia&#x27;s Bashkortostan“ — číselné entity se nerozkódovaly.
describe("titulky z RSS", () => {
  it("rozkóduje číselné entity (hex i desítkové)", () => {
    const xml = `<rss><channel><item><title>Russia&#x27;s refinery &#8211; smoke</title><link>https://example.com/a</link><pubDate>Tue, 23 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
    const [p] = ctiRss(xml);
    expect(p.nadpis).toBe("Russia's refinery – smoke");
  });
});
