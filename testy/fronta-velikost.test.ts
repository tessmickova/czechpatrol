import { describe, expect, it } from "vitest";
import { GET } from "@/app/fronta.json/route";
import { GET as RUTINA } from "@/app/rutina.json/route";

/*
  Velikost veřejné fronty.

  Soubor /fronta.json čtou denní rutiny — jazykové modely, kterým se obsah
  předává jako text. Když je dlouhý, ořízne se a rutině zbude rozbitý JSON;
  ohlásí chybu, přestože server odpověděl správně.

  20. 9. 2026 se to stalo: k frontě přibyly nepotvrzené záznamy se všemi
  zdroji a soubor vyskočil z 9 kB na 74 kB. Osmdesát osm procent tvořily
  adresy z Google News, dlouhé i přes čtyři sta znaků.

  Strop je proto hlídaný. Když se sem bude chtít přidat další pole, musí se
  vejít — nebo se musí zkrátit něco jiného.
*/
const STROP_KB = 24;

describe("veřejná fronta pro rutiny", () => {
  it(`se vejde do ${STROP_KB} kB`, async () => {
    const text = await GET().text();
    const kb = text.length / 1024;
    expect(kb, `fronta.json má ${kb.toFixed(1)} kB`).toBeLessThan(STROP_KB);
  });

  it("nese, co rutina potřebuje, a nic navíc", async () => {
    const j = JSON.parse(await GET().text());
    expect(j.sberNaposledy, "kdy naposledy běžel sběr").toBeTruthy();
    expect(Array.isArray(j.zachyceno)).toBe(true);
    expect(Array.isArray(j.nepotvrzeno)).toBe(true);

    for (const z of j.nepotvrzeno) {
      /* Rutina hledá úřední zdroj — musí poznat, komu chybí. */
      expect(typeof z.maUredniZdroj, z.id).toBe("boolean");
      expect(z.zdrojuCelkem, z.id).toBeGreaterThan(0);
      /* Celý seznam zdrojů sem nepatří: je to ta položka, která soubor nafoukla. */
      expect(z.zdroje, `${z.id} veze celý seznam zdrojů`).toBeUndefined();
    }
  });

  it("rutina.json se vejde do 8 kB", async () => {
    /*
      Soubor psaný přímo pro rutinu. Je malý schválně: čte ho jazykový model
      a dlouhý text se ořízne. Kdo sem bude chtít přidat pole, musí se vejít.
    */
    const kb = (await RUTINA().text()).length / 1024;
    expect(kb, `rutina.json má ${kb.toFixed(1)} kB`).toBeLessThan(8);
  });

  it("rutina.json odpovídá na to, na co se rutina ptá", async () => {
    const j = JSON.parse(await RUTINA().text());
    expect(j.provoz.sberNaposledy, "kdy naposledy běžel sběr").toBeTruthy();
    expect(typeof j.provoz.veFronte).toBe("number");
    expect(typeof j.provoz.nepotvrzenych).toBe("number");
    expect(Array.isArray(j.chybiUredniZdroj)).toBe(true);
    for (const z of j.chybiUredniZdroj) expect(z.zdroj, z.id).toBeTruthy();
  });

  it("žádná zachycená zpráva není bez odkazu", async () => {
    const j = JSON.parse(await GET().text());
    for (const k of j.zachyceno) expect(k.zdroj?.url, k.id).toBeTruthy();
  });
});
