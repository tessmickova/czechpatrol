import { describe, expect, it } from "vitest";
import { odchylkySkupiny, sOdchylkami } from "../src/lib/odchylky";
import { naliehavostSkupiny } from "../src/lib/naliehave";
import { seskupSignaly } from "../src/lib/signaly";

/*
  Odchylky mezi zdroji (9. 11. 2026): napadený web hlásí jaderný útok, nebo
  naopak „nic se nestalo“, a seriózní zdroje píšou jinak → označit. Hlavní
  riziko je opačné: označit seriózní redakci omylem. Proto tu je víc
  případů „neoznačit“ než „označit“.
*/
const TED = Date.parse("2026-11-09T12:00:00Z");
let n = 0;
const zprava = (domena: string, titulek: string, shrnuti = "", dalsi: Record<string, unknown> = {}) => ({
  id: `k${++n}`,
  titulek,
  shrnuti,
  kodZeme: "PL",
  publikovano: "2026-11-09T10:00:00Z",
  zachyceno: "2026-11-09T10:05:00Z",
  zdroj: { nazev: domena, url: `https://www.${domena}/clanek-${n}`, primarni: false },
  ...dalsi,
});
const BEZ_NAPADENYCH = { redakce: [], falesne: [] };

describe("odchylky mezi zdroji", () => {
  it("napadený web hlásí jaderný útok, dva jiné zdroje ne → podezřelé", () => {
    const g = [
      zprava("seznamzpravy.cz", "Výbuch ve skladu u Řešova, hasiči zasahují"),
      zprava("ct24.cz", "U Řešova vybuchl sklad, příčinu zjišťují hasiči"),
      zprava("divny-web.pl", "Jaderný útok na Řešov, Polsko ve válce"),
    ];
    const o = odchylkySkupiny(g, TED, BEZ_NAPADENYCH);
    expect(o.size).toBe(1);
    expect(o.get(g[2].id)?.uroven).toBe("podezrele");
    expect(o.get(g[2].id)?.duvody[0]).toMatch(/jaderný útok/);
  });

  it("slovo na „ne-“ (Německo, neděle) zápor není", () => {
    const g = [zprava("ct24.cz", "Výbuch v Berlíně"), zprava("irozhlas.cz", "Berlín: výbuch v metru"), zprava("divny.de", "Německo: jaderný útok na Berlín")];
    expect(odchylkySkupiny(g, TED, BEZ_NAPADENYCH).get(g[2].id)?.uroven).toBe("podezrele");
  });

  it("proti jedinému jinému zdroji je to jen „liší se“", () => {
    const g = [zprava("ct24.cz", "U Řešova vybuchl sklad"), zprava("divny-web.pl", "Nuclear strike on Rzeszów")];
    expect(odchylkySkupiny(g, TED, BEZ_NAPADENYCH).get(g[1].id)?.uroven).toBe("odlisne");
  });

  it("„nic se nestalo“ proti dvěma zdrojům, které událost uvádějí → liší se", () => {
    const g = [
      zprava("ct24.cz", "Dron narušil polský vzdušný prostor u Lublinu"),
      zprava("irozhlas.cz", "Polsko: nad Lublinem letěl ruský dron"),
      zprava("jiny-web.cz", "Dron nad Lublinem? Nic se nestalo, uklidňuje web"),
    ];
    const o = odchylkySkupiny(g, TED, BEZ_NAPADENYCH);
    expect(o.get(g[2].id)?.uroven).toBe("odlisne");
    expect(o.get(g[0].id)).toBeUndefined();
  });

  it("úřední zdroj se neoznačí, ani když popírá", () => {
    const g = [
      zprava("ct24.cz", "Dron nad Lublinem"),
      zprava("irozhlas.cz", "Dron nad Lublinem"),
      zprava("gov.pl", "Nic se nestalo, žádné nebezpečí nehrozí", "", { zdroj: { nazev: "Vláda PL", url: "https://www.gov.pl/x", primarni: true } }),
    ];
    expect(odchylkySkupiny(g, TED, BEZ_NAPADENYCH).size).toBe(0);
  });

  it("hrozba, zápor, cvičení ani výročí nejsou tvrzení", () => {
    for (const t of [
      "Medveděv hrozí jaderným úderem na Varšavu",
      "Armáda: nejde o jaderný útok, ale o výbuch plynu",
      "Polsko nacvičuje jaderný útok – cvičení civilní ochrany",
      "Před 81 lety: jaderný útok na Hirošimu",
      "Experts warn a nuclear strike could follow",
    ]) {
      const g = [zprava("ct24.cz", "Výbuch v Řešově"), zprava("irozhlas.cz", "Výbuch v Řešově"), zprava("jiny.cz", t)];
      expect(odchylkySkupiny(g, TED, BEZ_NAPADENYCH).size, t).toBe(0);
    }
  });

  it("„ruská invaze na Ukrajinu“ je kontext, ne nové tvrzení (první průchod 9. 11. jím omylem označil 14 zpráv ČTK)", () => {
    const g = [
      zprava("ceskenoviny.cz", "Zelenskyj: Rusko zesílilo útoky", "Rusko zahájilo invazi na Ukrajinu v únoru 2022."),
      zprava("ct24.cz", "Zelenskyj: Rusko zesílilo útoky"),
      zprava("irozhlas.cz", "Rusko zesílilo útoky, říká Zelenskyj"),
    ];
    expect(odchylkySkupiny(g, TED, BEZ_NAPADENYCH).size).toBe(0);
  });

  it("když ostatní totéž zmíní aspoň v textu článku, zdroj se neoznačí", () => {
    const g = [
      zprava("ct24.cz", "Výbuch v Řešově", "", { vyrez: { text: "Někteří svědci mluvili o jaderném výbuchu, úřady to vyvrátily." } }),
      zprava("irozhlas.cz", "Výbuch v Řešově", "", { vyrez: { text: "Šířila se zpráva o jaderném výbuchu." } }),
      zprava("jiny.cz", "Jaderný výbuch v Řešově?"),
    ];
    expect(odchylkySkupiny(g, TED, BEZ_NAPADENYCH).size).toBe(0);
  });

  it("dvě zprávy z téže domény nejsou dva nezávislé zdroje", () => {
    const g = [zprava("ct24.cz", "Výbuch v Řešově"), zprava("divny-web.pl", "Jaderný útok na Řešov"), zprava("divny-web.pl", "Jaderný útok na Řešov: první oběti")];
    const o = odchylkySkupiny(g, TED, BEZ_NAPADENYCH);
    expect(o.get(g[1].id)?.uroven).toBe("odlisne");
    expect(o.get(g[1].id)?.duvody[0]).toMatch(/jiný zdroj/);
  });

  it("mimořádné tvrzení z jediného zdroje: liší se, „zatím jen z jednoho zdroje“", () => {
    const g = [zprava("jiny.cz", "NATO aktivovalo článek 5")];
    const o = odchylkySkupiny(g, TED, BEZ_NAPADENYCH).get(g[0].id);
    expect(o?.uroven).toBe("odlisne");
    expect(o?.duvody[0]).toMatch(/jen z jednoho zdroje/);
  });

  it("napadená redakce s vlastním odlišným tvrzením je podezřelá; bez něj se neoznačí", () => {
    const data = { redakce: [{ nazev: "Napadená", domena: "napadena.pl", duvod: "test", kampan: "test", od: "2026-08-01", do: null }], falesne: [] };
    const sOdchylkou = [zprava("ct24.cz", "Výbuch v Řešově"), zprava("napadena.pl", "Nuclear attack on Rzeszów")];
    expect(odchylkySkupiny(sOdchylkou, TED, data).get(sOdchylkou[1].id)?.uroven).toBe("podezrele");
    const bez = [zprava("ct24.cz", "Výbuch v Řešově"), zprava("napadena.pl", "Explosion in Rzeszów")];
    expect(odchylkySkupiny(bez, TED, data).size).toBe(0);
  });

  it("napodobenina redakce je vždy podezřelá", () => {
    const data = { redakce: [], falesne: [{ domena: "ct24-zpravy.eu", napodobuje: "ČT24", kampan: "test" }] };
    const g = [zprava("ct24.cz", "Výbuch v Řešově"), zprava("ct24-zpravy.eu", "Výbuch v Řešově")];
    expect(odchylkySkupiny(g, TED, data).get(g[1].id)?.uroven).toBe("podezrele");
  });
});

describe("odchylky na webu", () => {
  it("výřez článku do prohlížeče nejde a každá zpráva nese odchylku nebo null", () => {
    const vys = sOdchylkami([zprava("ct24.cz", "Výbuch", "", { vyrez: { text: "dlouhý text" } })], TED);
    expect("vyrez" in vys[0]).toBe(false);
    expect(vys[0].odchylka).toBeNull();
  });

  it("podezřelá zpráva nezvýrazní událost a řádek nezastupuje", () => {
    const nal = { naliehave: { druh: "clanek-5-nato", proc: "test", stupen: 1 } };
    const g = [
      { ...zprava("ct24.cz", "Polsko: výbuch u Řešova vyšetřují hasiči"), odchylka: null },
      { ...zprava("irozhlas.cz", "Polsko: výbuch u Řešova vyšetřují hasiči a policie"), odchylka: null },
      { ...zprava("divny-web.pl", "Polsko: NATO aktivovalo článek 5 po výbuchu u Řešova", "", nal), publikovano: "2026-11-09T11:00:00Z", odchylka: { uroven: "podezrele" as const, duvody: ["test"] } },
    ];
    expect(naliehavostSkupiny(g, TED)).toBeNull();
    expect(naliehavostSkupiny(g.map((p) => ({ ...p, odchylka: null })), TED)).not.toBeNull();
    const [skupina] = seskupSignaly(g);
    expect(skupina.polozky).toHaveLength(3);
    expect(skupina.hlavni.zdroj.url).not.toMatch(/divny-web/);
  });

  it("řádek zastupuje střízlivá zpráva i tehdy, když za signál prošla jen ta podezřelá", () => {
    const g = [
      { ...zprava("ct24.cz", "Polsko: u Řešova vybuchl muniční sklad, hasiči zasahují"), odchylka: null },
      { ...zprava("irozhlas.cz", "Polsko: muniční sklad u Řešova vybuchl, policie vyšetřuje"), odchylka: null },
      { ...zprava("divny-web.pl", "Polsko: muniční sklad u Řešova zničil jaderný útok"), publikovano: "2026-11-09T11:00:00Z", odchylka: { uroven: "podezrele" as const, duvody: ["test"] } },
    ];
    const [skupina] = seskupSignaly(g);
    expect(skupina.polozky).toHaveLength(3);
    expect(skupina.hlavni.zdroj.url).not.toMatch(/divny-web/);
  });
});
