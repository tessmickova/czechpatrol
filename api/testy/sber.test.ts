import { describe, expect, it, vi } from "vitest";
import { kopniDoSberu, maSeSbirat } from "../src/sber";
import type { Env } from "../src/typy";

const cas = (h: number, m: number) => Date.UTC(2026, 8, 13, h, m, 0);

function prostredi(navic: Partial<Env> = {}): Env {
  return { GH_TOKEN_SBER: "x", SBER_REPO: "tessmickova/czechpatrol", ...navic } as Env;
}

describe("kdy se sbírá", () => {
  /*
    Od 19. 9. 2026 jednou za hodinu, dřív dvakrát — repozitář je soukromý
    a běhy na GitHubu se účtují z měsíčního přídělu. Test popisuje pravidlo,
    ne konkrétní číslo: tik chodí po deseti minutách, sbírá se v prvním
    tiku hodiny.
  */
  it("jednou za hodinu, protože tik chodí po deseti minutách", () => {
    const sbira = [0, 10, 20, 30, 40, 50].filter((m) => maSeSbirat(cas(9, m)));
    expect(sbira).toEqual([0]);
  });

  it("zpožděný tik okno nemine", () => {
    // Kvůli pár sekundám zpoždění nechceme sběr vynechat na celou hodinu.
    expect(maSeSbirat(cas(9, 1))).toBe(true);
    expect(maSeSbirat(cas(10, 9))).toBe(true);
  });

  it("mimo okno se nesbírá", () => {
    expect(maSeSbirat(cas(9, 15))).toBe(false);
    expect(maSeSbirat(cas(9, 30))).toBe(false);
    expect(maSeSbirat(cas(9, 45))).toBe(false);
  });

  it("delší kadence než hodina opravdu zpomalí", () => {
    /*
      Kdyby příděl minut nestačil, je zpomalení sběru jediná páka bez
      placení (docs/PROVOZ.md). Dřív nefungovala: okno se počítalo ze
      zbytku minut v rámci hodiny, a ten je pro 120 stejný jako pro 60,
      takže se sbíralo dál každou hodinu. Sousední hodiny se proto musí
      lišit.
    */
    const hodiny = [8, 9, 10, 11].map((h) => maSeSbirat(cas(h, 0), 120));
    expect(hodiny.filter(Boolean)).toHaveLength(2);
    expect(hodiny[0]).not.toBe(hodiny[1]);
    expect(hodiny[1]).not.toBe(hodiny[2]);
  });
});

describe("kopnutí do sběru", () => {
  it("pošle dispatch na správný workflow a větev", async () => {
    const volani: [string, RequestInit][] = [];
    vi.stubGlobal("fetch", async (u: string, o: RequestInit) => {
      volani.push([u, o]);
      return new Response(null, { status: 204 });
    });

    await expect(kopniDoSberu(prostredi(), cas(9, 0))).resolves.toEqual({ spusteno: true });
    expect(volani).toHaveLength(1);
    expect(volani[0][0]).toBe("https://api.github.com/repos/tessmickova/czechpatrol/actions/workflows/sber.yml/dispatches");
    expect(JSON.parse(String(volani[0][1].body))).toEqual({ ref: "main" });
    vi.unstubAllGlobals();
  });

  it("mimo okno se na GitHub vůbec nesáhne", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(kopniDoSberu(prostredi(), cas(9, 30))).resolves.toEqual({ spusteno: false, duvod: "není čas" });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("bez tokenu nic nespadne, jen se nesbírá odsud", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const v = await kopniDoSberu(prostredi({ GH_TOKEN_SBER: undefined }), cas(9, 0));
    expect(v.spusteno).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("chybu GitHubu ohlásí, ale nevyhodí výjimku", async () => {
    vi.stubGlobal("fetch", async () => new Response("Bad credentials", { status: 401 }));
    const v = await kopniDoSberu(prostredi(), cas(9, 0));
    expect(v.spusteno).toBe(false);
    expect(v.duvod).toContain("401");
    vi.unstubAllGlobals();
  });

  it("token se posílá v hlavičce, ne v adrese", async () => {
    let adresa = "";
    let hlavicky: Record<string, string> = {};
    vi.stubGlobal("fetch", async (u: string, o: RequestInit) => {
      adresa = u;
      hlavicky = o.headers as Record<string, string>;
      return new Response(null, { status: 204 });
    });
    await kopniDoSberu(prostredi({ GH_TOKEN_SBER: "tajne" }), cas(9, 0));
    expect(adresa).not.toContain("tajne");
    expect(hlavicky.authorization).toBe("Bearer tajne");
    vi.unstubAllGlobals();
  });
});
