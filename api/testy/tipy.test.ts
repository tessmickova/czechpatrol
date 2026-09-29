import { describe, expect, it } from "vitest";
import { zpravaOTipu } from "../src/tipy";

/*
  Od 30. 9. 2026 jde správkyni do Telegramu jen upozornění — žádný text ani
  odkaz od odesílatele (po zveřejnění webu tam chodily cizí texty a odkazy).
*/
describe("hlášení — upozornění správci", () => {
  it("nenese text ani odkaz odesílatele", () => {
    const z = zpravaOTipu("Klikněte sem <a href='https://phish.example'>výhra</a> @nekdo https://podvod.example/login", "https://podvod.example/x");
    expect(z).not.toMatch(/phish|podvod|výhra|@nekdo|https?:\/\//);
    expect(z).toContain("Nové hlášení z webu");
    expect(z).toContain("s odkazem");
  });
  it("řekne délku a že je bez odkazu", () => {
    const z = zpravaOTipu("x".repeat(250), null);
    expect(z).toContain("250 znaků");
    expect(z).toContain("bez odkazu");
  });
});
