import { describe, expect, it } from "vitest";
import konfigurace from "../data/cerstvost-zdroju.json";
import { prijmiSnimek, sestavPrehled, slucStavZdroju, vysledekPokusu, vztahKLokalite, type KonfiguraceCerstvosti } from "../src/lib/prehled/model";
import { ZAKAZANE_FORMULACE } from "../src/lib/prehled/texty";
import type { InformaceVstup, Lokalita, SnimekPrehledu, ZdrojVeSnimku } from "../src/lib/prehled/typy";

/*
  Scénáře ze zadání 26. 9. 2026 (docs/RYCHLY-PREHLED.md, kapitola Ověření).
  Čas je pevný; „posun hodin“ simuluje stránku, která visí v prohlížeči
  nebo v cache, zatímco sběr stojí.
*/

const K = konfigurace as unknown as KonfiguraceCerstvosti;
const TED = Date.parse("2026-09-26T06:40:00Z");
const pred = (min: number) => new Date(TED - min * 60_000).toISOString();
const za = (min: number) => new Date(TED + min * 60_000).toISOString();
const JMK: Lokalita = { druh: "kraj", kraj: "Jihomoravský" };
const ZLK: Lokalita = { druh: "kraj", kraj: "Zlínský" };
const NIC: Lokalita = { druh: "nenastaveno" };

const vsechnyKlice = K.skupiny.flatMap((s) => s.zdroje);
const BLOKOVANE = new Set(["e-sbirka", "hrad", "sshr", "dopravni-info", "bmi-de"]);

function zdroj(klic: string, uspechPredMin: number | null, vysledek: ZdrojVeSnimku["posledniVysledek"] = "ok"): ZdrojVeSnimku {
  return {
    klic, nazev: klic.toUpperCase(), odkaz: `https://${klic}.example`, blokovany: BLOKOVANE.has(klic),
    posledniUspech: uspechPredMin === null ? null : pred(uspechPredMin),
    posledniPokus: pred(Math.min(uspechPredMin ?? 20, 20)),
    posledniVysledek: vysledek, chyba: vysledek === "ok" ? null : "HTTP 503", neuspechuZaSebou: vysledek === "ok" ? 0 : 1,
  };
}

function snimek(upravy: Partial<SnimekPrehledu> & { zdrojePredMin?: number; zmenZdroj?: Record<string, ZdrojVeSnimku> } = {}): SnimekPrehledu {
  const predMin = upravy.zdrojePredMin ?? 20;
  const zdroje = vsechnyKlice.map((k) => upravy.zmenZdroj?.[k] ?? zdroj(k, predMin));
  return {
    verze: 1,
    generovano: pred(15),
    beh: { kdy: pred(predMin), zdroju: zdroje.length, ok: zdroje.length },
    zdroje,
    sluzby: { aktualizovano: pred(predMin) },
    palivo: { aktualizovano: pred(600) },
    informace: upravy.informace ?? [],
    neovereno: { signalu24h: 4, vyvracenych: 1, oznacenoUradem: 0 },
    ...(upravy.beh ? { beh: upravy.beh } : {}),
  };
}

function vystraha(upravy: Partial<InformaceVstup> = {}): InformaceVstup {
  return {
    id: "v1", typ: "oficialni-vystraha", titulek: "Silné bouřky", text: "Znění vydavatele.", textJe: "zneni-vydavatele", pokyn: null,
    vydavatel: "ČHMÚ", odkaz: "https://www.chmi.cz/vystraha", vydano: pred(60), platiOd: pred(30), platiDo: za(600),
    odvolano: null, opraveno: null, uzemi: { druh: "kraje", kraje: ["Jihomoravský"] }, coNevime: [], jistota: null, puvod: null, detail: null,
    ...upravy,
  };
}

const prehled = (s: SnimekPrehledu, l: Lokalita = JMK, ted = TED) => sestavPrehled(s, l, K, ted);

describe("1. všechny běhy úspěšné, žádná relevantní výstraha", () => {
  const p = prehled(snimek());
  it("říká, co jsme nenašli, kdy a s jakým pokrytím — v nadpisu i větě", () => {
    expect(p.hlavni.druh).toBe("bez-vystrahy");
    expect(p.hlavni.nadpis).toContain("které čteme");
    expect(p.hlavni.veta).toContain("Poslední úspěšná kontrola: dnes");
    expect(p.hlavni.veta).toContain("Pokrytí je omezené");
    expect(p.stavDat).toBe("aktualni");
  });
  it("ton není „zelený“ — neutrální", () => expect(p.hlavni.ton).toBe("neutralni"));
  it("čas kontroly je čas zdrojů, ne buildu", () => expect(p.posledniKontrola).toBe(pred(20)));
  it("přiznává, co vůbec nečteme", () => expect(p.pokryti.necteme.join(" ")).toContain("ČHMÚ"));
});

describe("2. běh vynechal, v cache zůstala minulá odpověď", () => {
  it("po 3 h je přehled zpožděný — a první věta to říká", () => {
    const p = prehled(snimek({ zdrojePredMin: 180 }));
    expect(p.hlavni.druh).toBe("zpozdeni");
    expect(p.hlavni.nadpis).not.toContain("nenašli");
  });
  it("po 6 h aktuálnost nelze potvrdit", () => {
    const p = prehled(snimek({ zdrojePredMin: 360 }));
    expect(p.hlavni.druh).toBe("nelze-potvrdit");
    expect(p.hlavni.nadpis).toBe("Aktuálnost přehledu nelze potvrdit.");
  });
});

describe("3. HTTP 200 s chybným nebo neočekávaným obsahem", () => {
  it("prázdné RSS ani krátká stránka nejsou úspěch", () => {
    expect(vysledekPokusu({ ok: true, format: "rss", polozek: 0, znaku: 5000 }, 400)).toBe("obsah");
    expect(vysledekPokusu({ ok: true, format: "html", polozek: 0, znaku: 120 }, 400)).toBe("obsah");
    expect(vysledekPokusu({ ok: true, format: "html", polozek: 0, znaku: 9000 }, 400)).toBe("ok");
    expect(vysledekPokusu({ ok: false, format: "html", polozek: 0, znaku: 0 }, 400)).toBe("chyba");
  });
  it("zdroj s nečekaným obsahem je neúplný a z „nic tam není“ se nedělá závěr", () => {
    const p = prehled(snimek({ zmenZdroj: { hzs: zdroj("hzs", 90, "obsah") } }));
    expect(p.zdroje.find((z) => z.klic === "hzs")!.stav).toBe("neuplny");
    expect(p.hlavni.druh).toBe("vypadek-zasadniho");
    expect(p.hlavni.nadpis).toContain("HZS");
    expect(p.hlavni.veta).toContain("neznamená to, že nic nevydal");
  });
});

describe("4. částečný výpadek zdrojů", () => {
  it("výpadek zásadního zdroje: částečný stav s konkrétním omezením", () => {
    const p = prehled(snimek({ zmenZdroj: { chmi: zdroj("chmi", 500, "chyba") } }));
    expect(p.hlavni.druh).toBe("vypadek-zasadniho");
    expect(p.hlavni.nadpis).toContain("CHMI");
    expect(p.pokryti.nelzeOverit).toContain("CHMI");
  });
  it("jeden zpožděný zásadní zdroj při jinak dostupném přehledu", () => {
    const p = prehled(snimek({ zmenZdroj: { policie: zdroj("policie", 200) } }));
    expect(p.hlavni.druh).toBe("zpozdeni");
    expect(p.hlavni.nadpis).toContain("POLICIE je zpožděný");
  });
  it("výpadek jen nezásadního zdroje hlavní stav nemění, ale v pokrytí je vidět", () => {
    const p = prehled(snimek({ zmenZdroj: { "bmi-at": zdroj("bmi-at", null, "chyba") } }));
    expect(p.hlavni.druh).toBe("bez-vystrahy");
    expect(p.pokryti.nelzeOverit).toContain("BMI-AT");
  });
  it("trvale blokovaný zdroj je neověřitelný, ne výpadek", () => {
    const p = prehled(snimek({ zmenZdroj: { hrad: zdroj("hrad", null, "chyba") } }));
    expect(p.zdroje.find((z) => z.klic === "hrad")!.stav).toBe("neoveritelny");
    expect(p.hlavni.druh).toBe("bez-vystrahy");
  });
  it("polovina zásadních zdrojů mimo provoz = aktuálnost nelze potvrdit", () => {
    const zasadni = K.skupiny.filter((s) => s.zasadni).flatMap((s) => s.zdroje).filter((k) => !BLOKOVANE.has(k));
    const zmen = Object.fromEntries(zasadni.slice(0, Math.ceil(zasadni.length / 2)).map((k) => [k, zdroj(k, 2000, "chyba")]));
    expect(prehled(snimek({ zmenZdroj: zmen })).hlavni.druh).toBe("nelze-potvrdit");
  });
});

describe("5. úplný výpadek zdrojů", () => {
  it("všechny zásadní zdroje při posledním pokusu selhaly", () => {
    const zmen = Object.fromEntries(vsechnyKlice.map((k) => [k, zdroj(k, 400, "chyba")]));
    const p = prehled(snimek({ zmenZdroj: zmen }));
    expect(p.hlavni.druh).toBe("vypadek-vseho");
    expect(p.hlavni.nadpis).toBe("Zdroje teď nedokážeme zkontrolovat.");
  });
  it("bez jakýchkoli dat nic neuklidňuje", () => {
    const p = prehled(snimek({ beh: { kdy: null, zdroju: 0, ok: 0 }, zmenZdroj: Object.fromEntries(vsechnyKlice.map((k) => [k, zdroj(k, null, "chyba")])) }));
    expect(["vypadek-vseho", "nelze-potvrdit"]).toContain(p.hlavni.druh);
    expect(p.posledniKontrola).toBeNull();
  });
});

describe("6. výstraha: nová, změna rozsahu, oprava, odvolání, konec platnosti", () => {
  it("nová výstraha pro zvolený kraj je hlavní sdělení s vydavatelem a platností", () => {
    const p = prehled(snimek({ informace: [vystraha()] }));
    expect(p.hlavni.druh).toBe("vystraha");
    expect(p.hlavni.nadpis).toContain("Silné bouřky");
    expect(p.hlavni.veta).toContain("Vydal: ČHMÚ");
    expect(p.hlavni.veta).toContain("Platí od");
    expect(p.hlavni.ton).toBe("vystraha");
  });
  it("změna rozsahu mimo kraj čtenáře: výstraha odejde z nadpisu do počtu „mimo oblast“", () => {
    const p = prehled(snimek({ informace: [vystraha({ opraveno: pred(5), uzemi: { druh: "kraje", kraje: ["Zlínský"] } })] }));
    expect(p.hlavni.druh).toBe("bez-vystrahy");
    expect(p.mimoOblast).toBe(1);
    expect(prehled(snimek({ informace: [vystraha({ opraveno: pred(5), uzemi: { druh: "kraje", kraje: ["Zlínský"] } })] }), ZLK).oficialni[0].stav).toBe("opravena");
  });
  it("odvolaná výstraha: není hlavním sdělením, ale den je vidět jako odvolaná", () => {
    const p = prehled(snimek({ informace: [vystraha({ odvolano: pred(10) })] }));
    expect(p.hlavni.druh).toBe("bez-vystrahy");
    expect(p.oficialni[0].stav).toBe("odvolana");
  });
  it("výstraha po konci platnosti je ukončená — i když ji nikdo nesundal", () => {
    const p = prehled(snimek({ informace: [vystraha({ platiDo: pred(5) })] }));
    expect(p.oficialni[0].stav).toBe("ukoncena");
    expect(p.hlavni.druh).toBe("bez-vystrahy");
  });
  it("nadcházející výstraha se ukáže jako nadcházející", () => {
    const p = prehled(snimek({ informace: [vystraha({ platiOd: za(120) })] }));
    expect(p.oficialni[0].stav).toBe("nadchazejici");
    expect(p.hlavni.veta).toContain("Začne platit");
  });
  it("„oficiální“ výstraha bez vydavatele nebo originálu je nejasná", () => {
    expect(prehled(snimek({ informace: [vystraha({ vydavatel: null })] })).oficialni[0].stav).toBe("nejasna");
  });
});

describe("7. sousední území, nejasná hranice, neznámá lokalita", () => {
  it("výstraha pro sousední kraj je mimo", () => {
    expect(vztahKLokalite({ druh: "kraje", kraje: ["Zlínský"] }, JMK)).toBe("mimo");
  });
  it("část kraje (okres) nelze přesně určit → výstraha s nejasným územím", () => {
    const p = prehled(snimek({ informace: [vystraha({ uzemi: { druh: "cast", popis: "okres Hodonín", kraje: ["Jihomoravský"] } })] }));
    expect(p.hlavni.druh).toBe("vystraha-nejasna");
    expect(p.hlavni.veta).toContain("okres Hodonín");
  });
  it("bez zvolené lokality se regionální výstraha nepřiřadí ani nezahodí", () => {
    const p = prehled(snimek({ informace: [vystraha()] }), NIC);
    expect(p.hlavni.druh).toBe("vystraha-nejasna");
    expect(p.hlavni.nadpis).toContain("vašeho místa");
  });
  it("celostátní výstraha platí i bez zvolené lokality", () => {
    expect(prehled(snimek({ informace: [vystraha({ uzemi: { druh: "cr" } })] }), NIC).hlavni.druh).toBe("vystraha");
  });
  it("neznámé území = nelze určit", () => expect(vztahKLokalite({ druh: "nezname" }, JMK)).toBe("nelze-urcit"));
  it("bez lokality se nepředpokládá Praha: oblast je „nezvolena“", () => expect(prehled(snimek(), NIC).oblastText).toBe("Oblast nezvolena"));
});

describe("8. zpožděná odpověď po novější a souběžné běhy", () => {
  it("výsledek staršího běhu nepřepíše novější stav zdroje", () => {
    const po = slucStavZdroju({}, [{ klic: "hzs", vysledek: "chyba", chyba: "HTTP 503" }], pred(10));
    const pozdni = slucStavZdroju(po, [{ klic: "hzs", vysledek: "ok" }], pred(40));
    expect(pozdni.hzs.posledniVysledek).toBe("chyba");
    expect(pozdni.hzs.posledniPokus).toBe(pred(10));
  });
  it("neúspěch zachová čas posledního úspěchu a počítá neúspěchy za sebou", () => {
    let s = slucStavZdroju({}, [{ klic: "chmi", vysledek: "ok" }], pred(120));
    s = slucStavZdroju(s, [{ klic: "chmi", vysledek: "chyba" }], pred(60));
    s = slucStavZdroju(s, [{ klic: "chmi", vysledek: "obsah" }], pred(0));
    expect(s.chmi.posledniUspech).toBe(pred(120));
    expect(s.chmi.neuspechuZaSebou).toBe(2);
    expect(s.chmi.chyba).toBe("nečekaný obsah");
  });
  it("prohlížeč nepřijme starší snímek po novějším", () => {
    const novy = snimek({ zdrojePredMin: 10 });
    const stary = snimek({ zdrojePredMin: 70 });
    expect(prijmiSnimek(novy, stary)).toBe(novy);
    expect(prijmiSnimek(stary, novy)).toBe(novy);
  });
  it("chybný obsah staženého snímku se nepoužije", () => {
    const s = snimek();
    expect(prijmiSnimek(s, { chyba: "HTML stránka místo JSON" })).toBe(s);
    expect(prijmiSnimek(s, null)).toBe(s);
  });
});

describe("9. obnovení po výpadku", () => {
  it("během výpadku je platná výstraha „poslední známá“, po obnovení zase běžná", () => {
    const behem = prehled(snimek({ zdrojePredMin: 400, informace: [vystraha({ platiDo: za(1200) })] }));
    expect(behem.hlavni.druh).toBe("posledni-znama");
    expect(behem.hlavni.veta).toContain("teď neověříme");
    expect(behem.oficialni[0].zmenuNelzeOverit).toBe(true);
    const po = prehled(snimek({ zdrojePredMin: 5, informace: [vystraha({ platiDo: za(1200) })] }));
    expect(po.hlavni.druh).toBe("vystraha");
    expect(po.oficialni[0].zmenuNelzeOverit).toBe(false);
  });
  it("výstraha, která během výpadku vypršela, se neukazuje jako platná", () => {
    const p = prehled(snimek({ zdrojePredMin: 400, informace: [vystraha({ platiDo: pred(30) })] }));
    expect(p.hlavni.druh).toBe("nelze-potvrdit");
    expect(p.oficialni[0].stav).toBe("ukoncena");
  });
});

describe("10. stará stránka z cache po změně stavu backendu", () => {
  it("týž snímek se s plynoucím časem sám zhorší — bez nového buildu", () => {
    const s = snimek({ zdrojePredMin: 20 });
    expect(prehled(s, JMK, TED).hlavni.druh).toBe("bez-vystrahy");
    expect(prehled(s, JMK, TED + 3 * 3_600_000).hlavni.druh).toBe("zpozdeni");
    expect(prehled(s, JMK, TED + 6 * 3_600_000).hlavni.druh).toBe("nelze-potvrdit");
  });
});

describe("texty", () => {
  it("žádný stav nepoužije zakázanou formulaci", () => {
    const scenare = [
      snimek(), snimek({ zdrojePredMin: 180 }), snimek({ zdrojePredMin: 400 }),
      snimek({ zmenZdroj: { hzs: zdroj("hzs", 500, "chyba") } }),
      snimek({ zmenZdroj: Object.fromEntries(vsechnyKlice.map((k) => [k, zdroj(k, 400, "chyba")])) }),
      snimek({ informace: [vystraha()] }), snimek({ zdrojePredMin: 400, informace: [vystraha()] }),
      snimek({ informace: [vystraha({ uzemi: { druh: "cast", popis: "okres Znojmo", kraje: ["Jihomoravský"] } })] }),
    ];
    for (const s of scenare) for (const l of [JMK, NIC, { druh: "cr" } as Lokalita]) {
      const p = prehled(s, l);
      const text = `${p.hlavni.nadpis} ${p.hlavni.veta}`.toLowerCase();
      for (const z of ZAKAZANE_FORMULACE) expect(text).not.toContain(z);
    }
  });
});
