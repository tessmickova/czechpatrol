import { describe, expect, it } from "vitest";
import { povolenePuvody, povolenyPuvod, rpIdProPuvod } from "../src/pomocne";
import type { Env } from "../src/typy";

/*
  Přechod z czechpatrol.pages.dev na czechpatrol.cz: obě adresy musí po
  nějakou dobu fungovat vedle sebe, včetně passkeyů, které jsou uvázané
  k doméně, na které vznikly. Rozhodování je tady, bez sítě a bez prohlížeče.
*/

const env = (dalsi?: string) => ({ PUVOD_WEBU: "https://czechpatrol.cz", RP_ID: "czechpatrol.cz", PUVOD_WEBU_DALSI: dalsi }) as unknown as Env;

describe("původy webu", () => {
  it("bez přechodné adresy platí jen hlavní", () => {
    expect(povolenePuvody(env())).toEqual(["https://czechpatrol.cz"]);
    expect(povolenyPuvod(env(), "https://czechpatrol.cz")).toBe("https://czechpatrol.cz");
    expect(povolenyPuvod(env(), "https://czechpatrol.pages.dev")).toBeNull();
  });

  it("přechodné adresy se povolí; prázdné položky, mezery a lomítko na konci nevadí", () => {
    const e = env(" https://czechpatrol.pages.dev/ , ,https://nahled.example.cz");
    expect(povolenePuvody(e)).toEqual(["https://czechpatrol.cz", "https://czechpatrol.pages.dev", "https://nahled.example.cz"]);
    expect(povolenyPuvod(e, "https://czechpatrol.pages.dev")).toBe("https://czechpatrol.pages.dev");
  });

  it("localhost projde vždy, cizí adresa nikdy", () => {
    expect(povolenyPuvod(env(), "http://localhost:3000")).toBe("http://localhost:3000");
    expect(povolenyPuvod(env(), "https://utocnik.example")).toBeNull();
    expect(povolenyPuvod(env(), null)).toBeNull();
  });
});

describe("RP ID podle původu", () => {
  it("hlavní adresa má RP ID z nastavení, bez původu také", () => {
    expect(rpIdProPuvod(env(), "https://czechpatrol.cz")).toBe("czechpatrol.cz");
    expect(rpIdProPuvod(env(), null)).toBe("czechpatrol.cz");
  });

  it("přechodná adresa má za RP ID svého hostitele", () => {
    expect(rpIdProPuvod(env("https://czechpatrol.pages.dev"), "https://czechpatrol.pages.dev")).toBe("czechpatrol.pages.dev");
  });

  it("lokální vývoj má localhost", () => {
    expect(rpIdProPuvod(env(), "http://localhost:3000")).toBe("localhost");
  });
});
