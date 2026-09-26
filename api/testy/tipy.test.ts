import { describe, expect, it } from "vitest";
import { zpravaOTipu } from "../src/tipy";

describe("hlášení — zpráva správci", () => {
  it("escapuje HTML a nese odkaz", () => {
    const z = zpravaOTipu("Dron <b>nad</b> Prahou & okolím, 26. 9. ráno", "https://policie.cz/x?a=1&b=2");
    expect(z).toContain("Dron &lt;b&gt;nad&lt;/b&gt; Prahou &amp; okolím");
    expect(z).toContain("https://policie.cz/x?a=1&amp;b=2");
  });
  it("dlouhý text zkrátí a bez odkazu to řekne", () => {
    const z = zpravaOTipu("x".repeat(2000), null);
    expect(z).toContain("x".repeat(900) + "…");
    expect(z).toContain("Bez odkazu na zdroj.");
  });
});
