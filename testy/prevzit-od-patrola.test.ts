// @ts-nocheck — prostý ES modul, test hlídá chování
import { describe, expect, it } from "vitest";
import { sloucitNavrhy, sloucitZadani, vycistiNavrh } from "../nastroje/prevzit-od-patrola.mjs";

const media = [{ url: "https://www.idnes.cz/a" }, { url: "https://www.seznamzpravy.cz/b" }];

describe("převzetí od Patrola", () => {
  it("Patrol nemůže nic označit za lidsky ověřené ani automaticky zveřejněné", () => {
    const x = vycistiNavrh({ id: "a", lidskyOvereno: true, overeni: "lidske", zdroje: media });
    expect(x.lidskyOvereno).toBe(false);
    expect(x.overeni).toBeUndefined();
  });

  it("bez úředního zdroje nejvýš střední jistota a žádná úřední atribuce", () => {
    const x = vycistiNavrh({ id: "a", jistota: "potvrzeno", atribuce: "oficialni", zdroje: media });
    expect(x.jistota).toBe("stredni");
    expect(x.atribuce).toBe("nepotvrzena");
  });

  it("slučuje po id, nemaže a nevrací zveřejněné ani zamítnuté", () => {
    const main = [{ id: "a", t: 1 }, { id: "b", t: 1 }];
    const patrol = [{ id: "a", t: 2, zdroje: media }, { id: "c", t: 1, zdroje: media }, { id: "z", zdroje: media }, { id: "p", zdroje: media }];
    const r = sloucitNavrhy(main, patrol, { zverejnene: new Set(["p"]), zamitnute: new Set(["z"]) });
    expect(r.navrhy.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
    expect(r.novych).toBe(1);
    expect(r.upravenych).toBe(1);
  });

  it("odpovědi jen k existujícím zadáním, nová zadání ne", () => {
    const r = sloucitZadani([{ id: "z1", stav: "ceka", zadani: "x" }], [{ id: "z1", stav: "hotovo", odpoved: "ok", zadani: "PODVRH" }, { id: "z2", stav: "ceka" }]);
    expect(r.zadani).toEqual([{ id: "z1", stav: "hotovo", odpoved: "ok", zadani: "x" }]);
  });
});
