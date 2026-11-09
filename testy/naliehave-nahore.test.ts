import { describe, expect, it } from "vitest";
import { naliehavaBezRedakci, naliehaveNahoru, naliehaveVOkne, naliehavostSkupiny, platiNaliehave, stupenNaliehave } from "../src/lib/naliehave";

/*
  Naléhavé nahoře, dokud je nebezpečí aktuální (9. 11. 2026, provozovatelka).
  Hlídá se: lhůta podle druhu, stupeň pro tloušťku rámečku, naléhavost
  události složené z víc zpráv a pořadí — naléhavé podle data nahoře,
  ostatní podle data pod nimi.
*/
const ted = new Date("2026-11-09T12:00:00Z").getTime();
const pred = (hodin: number) => new Date(ted - hodin * 3_600_000).toISOString();
let poradi = 0;
/* Každá zpráva z jiné redakce, ať je ve skupině víc nezávislých zdrojů. */
const zprava = (druh: string | null, hodin: number, stupen?: 1 | 2, domena = `redakce${++poradi}.cz`) => ({ zachyceno: pred(hodin), publikovano: pred(hodin), naliehave: druh ? { druh, stupen } : null, zdroj: { nazev: domena, url: `https://${domena}/clanek` } });

describe("naléhavé nahoře", () => {
  it("lhůta podle druhu: posílení hranice týden, narušení vzdušného prostoru tři dny, krizové vysílání dva dny", () => {
    expect(platiNaliehave(zprava("hranice-nato", 6 * 24), ted)).toBe(true);
    expect(platiNaliehave(zprava("hranice-nato", 8 * 24), ted)).toBe(false);
    expect(platiNaliehave(zprava("vzdusny-prostor-nato", 2 * 24), ted)).toBe(true);
    expect(platiNaliehave(zprava("vzdusny-prostor-nato", 4 * 24), ted)).toBe(false);
    expect(platiNaliehave(zprava("krizove-vysilani", 47), ted)).toBe(true);
    expect(platiNaliehave(zprava("krizove-vysilani", 49), ted)).toBe(false);
    expect(platiNaliehave(zprava("mobilizace-rusko", 13 * 24), ted)).toBe(true);
    expect(platiNaliehave(zprava(null, 1), ted)).toBe(false);
  });

  it("stupeň ze sběru, u starších zpráv podle druhu", () => {
    expect(stupenNaliehave({ druh: "hranice-nato", stupen: 2 })).toBe(2);
    expect(stupenNaliehave({ druh: "mobilizace-rusko" })).toBe(1);
    expect(stupenNaliehave({ druh: "vzdusny-prostor-nato" })).toBe(2);
    expect(stupenNaliehave({ druh: "neznamy-druh" })).toBe(2);
  });

  it("událost z víc zpráv: platí, dokud platí aspoň jedna; nejvyšší stupeň a nejpozdější konec", () => {
    const n = naliehavostSkupiny([zprava("hranice-nato", 4 * 24), zprava("hranice-nato", 7.5 * 24), zprava("krizove-vysilani", 10), zprava(null, 1)], ted);
    expect(n?.stupen).toBe(1);
    expect(n?.druh).toBe("krizove-vysilani");
    /* Nejpozdější konec: posílení hranice před 4 dny + 7 dní = za 3 dny. */
    expect(n?.platiDo).toBe(new Date(ted + 3 * 24 * 3_600_000).toISOString());
    /* Nová zpráva o téže věci lhůtu prodlouží, stará sama ne. */
    expect(naliehavostSkupiny([zprava("hranice-nato", 8 * 24)], ted)).toBeNull();
  });

  it("zvýrazní se jen s aspoň dvěma nezávislými redakcemi, s napadenou redakcí se třemi", () => {
    /* Jedna redakce: lhůta běží, ale zvýraznění ne; řádek řekne proč. */
    expect(naliehavostSkupiny([zprava("hranice-nato", 24)], ted)).toBeNull();
    expect(naliehavaBezRedakci([zprava("hranice-nato", 24)], ted)).toEqual({ druh: "hranice-nato", ma: 1, potreba: 2 });
    /* Dvě zprávy téže redakce jsou pořád jedna redakce. */
    expect(naliehavostSkupiny([zprava("hranice-nato", 24, 2, "novinky.cz"), zprava("hranice-nato", 20, 2, "novinky.cz")], ted)).toBeNull();
    /* Druhá redakce se počítá, i když její zprávu síto naléhavou neoznačilo. */
    expect(naliehavostSkupiny([zprava("hranice-nato", 24), zprava(null, 20)], ted)?.druh).toBe("hranice-nato");
    expect(naliehavaBezRedakci([zprava("hranice-nato", 24), zprava(null, 20)], ted)).toBeNull();
    /* Napadená redakce (PAP, data/napadane-redakce.json) mezi zdroji: dvě nestačí, tři ano. */
    const pap = zprava("hranice-nato", 24, 2, "pap.pl");
    expect(naliehavostSkupiny([pap, zprava(null, 20)], ted)).toBeNull();
    expect(naliehavostSkupiny([pap, zprava(null, 20), zprava(null, 10)], ted)?.stupen).toBe(2);
  });

  it("naléhavé podle data nahoře, ostatní podle data pod nimi", () => {
    const radky = [
      { id: "novy", kdy: pred(1), naliehavost: null },
      { id: "nal-starsi", kdy: pred(96), naliehavost: { druh: "hranice-nato", stupen: 2 as const, platiDo: pred(-72) } },
      { id: "stary", kdy: pred(50), naliehavost: null },
      { id: "nal-novejsi", kdy: pred(30), naliehavost: { druh: "mobilizace-rusko", stupen: 1 as const, platiDo: pred(-300) } },
    ];
    expect(naliehaveNahoru(radky).map((r) => r.id)).toEqual(["nal-novejsi", "nal-starsi", "novy", "stary"]);
  });

  it("souhrn bere stejné pravidlo: posílení hranice před pěti dny ještě platí", () => {
    const k = [{ id: "a", ...zprava("hranice-nato", 5 * 24) }, { id: "b", ...zprava("vzdusny-prostor-nato", 5 * 24) }];
    expect(naliehaveVOkne(k, ted).map((x) => x.id)).toEqual(["a"]);
    /* S pevným oknem se chová jako dřív. */
    expect(naliehaveVOkne(k, ted, 48)).toHaveLength(0);
  });
});
