import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
  Adresa API.

  Vzniklo z konkrétní chyby: proměnná byla nastavená na
  „czechpatrol-api.neco.workers.dev" bez https://. Tím to přestala být adresa
  a stala se z toho relativní cesta — prohlížeč ji připojil k adrese webu
  a POST skončil na statickém hostingu, který odpověděl 405. Zvenčí to
  vypadalo jako rozbité přihlašování.

  Chování se tu ověřuje nad toutéž úpravou, kterou dělá config, protože
  config čte proměnnou prostředí při načtení modulu a v testu se nedá
  nastavovat po částech.
*/

function uprav(adresa: string): string {
  const a = adresa.trim().replace(/\/$/, "");
  if (a === "") return "";
  return /^https?:\/\//.test(a) ? a : `https://${a}`;
}

describe("adresa API", () => {
  it("bez schématu se doplní https", () => {
    expect(uprav("czechpatrol-api.neco.workers.dev")).toBe("https://czechpatrol-api.neco.workers.dev");
  });

  it("se schématem se nechá být", () => {
    expect(uprav("https://czechpatrol-api.neco.workers.dev")).toBe("https://czechpatrol-api.neco.workers.dev");
  });

  it("http se nepřepisuje na https", () => {
    /* Místní vývoj běží na http a nemá se mu do toho sahat. */
    expect(uprav("http://localhost:8787")).toBe("http://localhost:8787");
  });

  it("lomítko na konci a mezery se odstraní", () => {
    expect(uprav("  https://api.example.com/  ")).toBe("https://api.example.com");
  });

  it("prázdná adresa zůstane prázdná", () => {
    /* Prázdná znamená „účty vypnuté" — nesmí se z ní stát https:// */
    expect(uprav("")).toBe("");
    expect(uprav("   ")).toBe("");
  });

  it("config používá tutéž úpravu", () => {
    /* Kdyby se rozešly, test by hlídal něco, co v aplikaci neplatí. */
    const zdroj = readFileSync(new URL("../src/config/web.ts", import.meta.url), "utf-8");
    expect(zdroj).toContain("/^https?:\\/\\//.test(a)");
    expect(zdroj).toContain("`https://${a}`");
  });
});
