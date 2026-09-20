import { describe, expect, it } from "vitest";
import { datumZTextu, polozkyZeStranky } from "../sber/nacti";

/*
  Datum z výpisu na stránce.

  Proč: filtr na stáří zpráv se uplatňoval jen tam, kde zdroj datum uvedl.
  Výpisy na stránkách úřadů ho nemají, takže jim filtr nikdy nezabránil —
  20. 9. 2026 se tak do fronty dostalo hlášení estonské policie z 5. 9. 2024
  a na webu se tvářilo jako zpráva toho dne. To je přesně ten druh chyby,
  kterou má projekt stavěný na „datum události není datum článku" vylučovat.
*/

const DNES = new Date("2026-09-20T12:00:00Z");

describe("datum z textu", () => {
  it("přečte běžné tvary", () => {
    expect(datumZTextu("Zveřejněno 2024-09-05 v sekci", DNES)?.slice(0, 10)).toBe("2024-09-05");
    expect(datumZTextu("05.09.2024 Kybernetické útoky", DNES)?.slice(0, 10)).toBe("2024-09-05");
    expect(datumZTextu("5. 9. 2024 hlášení", DNES)?.slice(0, 10)).toBe("2024-09-05");
    expect(datumZTextu("5. září 2024", DNES)?.slice(0, 10)).toBe("2024-09-05");
    expect(datumZTextu("05 September 2024", DNES)?.slice(0, 10)).toBe("2024-09-05");
    expect(datumZTextu("September 5, 2024", DNES)?.slice(0, 10)).toBe("2024-09-05");
  });

  it("den je první, jak se píše v Evropě", () => {
    /* 05.09. je pátý září, ne devátý květen. Úřední weby jsou evropské. */
    expect(datumZTextu("05.09.2024", DNES)?.slice(5, 10)).toBe("09-05");
  });

  it("nesmysl raději neurčí, než aby ho vymyslel", () => {
    for (const t of ["bez data", "verze 2.0.1", "32.13.2024", "2099-01-01", "1812", ""]) {
      expect(datumZTextu(t, DNES), t).toBeNull();
    }
  });

  it("budoucí datum není datum vydání", () => {
    expect(datumZTextu("2027-01-01", DNES)).toBeNull();
  });

  it("vytáhne datum z okolí odkazu ve výpisu", () => {
    const html = `
      <li><span class="datum">05.09.2024</span>
        <a href="/uudised/gru">A GRU military unit launched cyberattacks against Estonian authorities</a>
      </li>`;
    const p = polozkyZeStranky(html, "https://www.politsei.ee/en/news");
    expect(p).toHaveLength(1);
    expect(p[0].publikovano?.slice(0, 10)).toBe("2024-09-05");
  });

  it("když datum u odkazu není, zůstane prázdné", () => {
    /* Prázdné, ne dnešní. Neznámé datum se nesmí vydávat za čerstvost. */
    const html = `<a href="/x">Police to temporarily close Narva border crossing point</a>`;
    expect(polozkyZeStranky(html, "https://www.politsei.ee/en/news")[0].publikovano).toBeNull();
  });
});
