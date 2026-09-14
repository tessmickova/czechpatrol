import { describe, expect, it } from "vitest";
import { naText, vyrezZeStranky, ZNAKU_VYREZU } from "../sber/text-zdroje";

/*
  Výřez ze zdroje.

  Vznikl proto, že ověřovací rutina nedosáhne na zpravodajské weby a její
  zadání jí správně zakazuje převzít kandidáta, jehož zdroj neotevřela. Tyhle
  testy hlídají dvě věci: že se z HTML dostane čitelný text, a hlavně že se
  neúspěch přizná místo toho, aby vypadal jako prázdný článek.
*/
describe("HTML na text", () => {
  it("zahodí skripty, styly a navigaci", () => {
    const html = `<html><head><style>.a{color:red}</style></head><body>
      <nav>Menu Domů Kontakt</nav>
      <script>var x = "Ukrajina";</script>
      <p>V Polsku vzlétly stíhačky.</p></body></html>`;
    const t = naText(html);
    expect(t).toContain("V Polsku vzlétly stíhačky.");
    expect(t).not.toContain("color:red");
    expect(t).not.toContain("var x");
    expect(t).not.toContain("Menu");
  });

  it("nedovolí slepení vět přes hranici odstavce", () => {
    // Bez tohohle vznikne „stíhačky.Sirény“ a model i člověk čtou nesmysl.
    expect(naText("<p>Vzlétly stíhačky.</p><p>Zněly sirény.</p>")).toBe("Vzlétly stíhačky.\nZněly sirény.");
  });

  it("přeloží entity zpět na znaky", () => {
    expect(naText("<p>Rusko &amp; Bělorusko &#8212; hranice</p>")).toContain("Rusko & Bělorusko");
  });
});

describe("stažení výřezu", () => {
  it("nedosažitelný zdroj vrátí důvod, ne prázdný text", async () => {
    // Právě tenhle případ rutinu roky tiše zastavoval. Musí být poznat.
    const v = await vyrezZeStranky("https://neexistujici.domena.invalid/clanek");
    expect(v.text).toBe("");
    expect(v.chyba).toBeTruthy();
    expect(v.stazeno).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("strop délky je tvrdý — ukládá se citace, ne článek", () => {
    // Autorské právo: výřez pro ověření, ne náhrada zdroje.
    expect(ZNAKU_VYREZU).toBeLessThanOrEqual(1500);
  });
});
