import { describe, expect, it } from "vitest";
import { kPrekladu, NASTROJ, zapisPreklady } from "../nastroje/preklad/fronta";
import { vetaPrekladu, zJazyka } from "../src/lib/preklad";

/*
  Strojový překlad zachycených zpráv (20. 11. 2026, provozovatelka: „k čemukoliv
  v jiném jazyce napsat ‚přeloženo:‘ a přeložit do češtiny“). Testy hlídají,
  že se překládá jen cizí jazyk, původní znění se neztratí a nepovedený
  překlad se nezapíše.
*/
const TED = Date.parse("2026-11-20T12:00:00Z");
const k = (id: string, titulek: string, dalsi: Record<string, unknown> = {}) => ({ id, titulek, titulekPuvodni: titulek, shrnuti: `${titulek}.`, zachyceno: "2026-11-20T10:00:00Z", publikovano: null, stav: "ceka", ...dalsi });

describe("fronta k překladu", () => {
  it("jen cizí jazyk, nevyřízené, ještě nepřeložené; nejnovější první", () => {
    const fronta = [
      k("cz", "Ruské útoky vyvolaly poplach v Polsku"),
      k("en", "Poland was aware of Russian border sabotage plot", { publikovano: "2026-11-19T10:00:00Z" }),
      k("pl", "Rosja atakuje mosty w Kijowie", { publikovano: "2026-11-20T09:00:00Z" }),
      k("sk", "Poľsko posilňuje hranicu s Kaliningradom", { stav: "vyrizen" }),
      k("hotovo", "Estonia closes border crossings", { preklad: { z: "en", nastroj: NASTROJ, kdy: "2026-11-20T00:00:00Z" } }),
    ];
    expect(kPrekladu(fronta, TED).map((x) => x.id)).toEqual(["pl", "en"]);
  });

  it("nepovedený překlad se 24 hodin nezkouší", () => {
    expect(kPrekladu([k("a", "Drone over Vilnius", { prekladSelhal: "2026-11-20T06:00:00Z" })], TED)).toHaveLength(0);
    expect(kPrekladu([k("a", "Drone over Vilnius", { prekladSelhal: "2026-11-19T06:00:00Z" })], TED)).toHaveLength(1);
  });
});

describe("zápis překladů", () => {
  it("český titulek a shrnutí, původní znění zůstává, zpráva nese značku překladu", () => {
    const fronta = [k("en", "Poland was aware of the plot")];
    const s = zapisPreklady(fronta, { en: { jazyk: "en", titulek: "Polsko o plánu vědělo", shrnuti: "Polsko o plánu vědělo." } }, TED);
    expect(s).toEqual({ prelozeno: 1, selhalo: 0 });
    expect(fronta[0].titulek).toBe("Polsko o plánu vědělo");
    expect(fronta[0].titulekPuvodni).toBe("Poland was aware of the plot");
    expect((fronta[0] as { shrnutiPuvodni?: string }).shrnutiPuvodni).toBe("Poland was aware of the plot.");
    expect((fronta[0] as { preklad?: { z: string } }).preklad?.z).toBe("en");
  });

  it("chyba překladu nic nepřepíše, jen si poznamená čas", () => {
    const fronta = [k("pl", "Rosja atakuje mosty w Kijowie")];
    zapisPreklady(fronta, { pl: { chyba: "titulek z pl neprošel" } }, TED);
    expect(fronta[0].titulek).toBe("Rosja atakuje mosty w Kijowie");
    expect((fronta[0] as { preklad?: unknown }).preklad).toBeUndefined();
    expect((fronta[0] as { prekladSelhal?: string }).prekladSelhal).toBe("2026-11-20T12:00:00.000Z");
  });

  it("bez přeloženého shrnutí zůstane původní shrnutí", () => {
    const fronta = [k("en", "Drone over Vilnius")];
    zapisPreklady(fronta, { en: { jazyk: "en", titulek: "Dron nad Vilniusem", shrnuti: null } }, TED);
    expect(fronta[0].shrnuti).toBe("Drone over Vilnius.");
    expect((fronta[0] as { shrnutiPuvodni?: string }).shrnutiPuvodni).toBeUndefined();
  });
});

describe("věta o překladu", () => {
  it("jazyk ve 2. pádě; neznámý jako „cizího jazyka“", () => {
    expect(zJazyka("en")).toBe("angličtiny");
    expect(zJazyka("xx")).toBe("cizího jazyka");
    expect(vetaPrekladu("pl")).toMatch(/^Přeloženo strojově z polštiny/);
  });
});
