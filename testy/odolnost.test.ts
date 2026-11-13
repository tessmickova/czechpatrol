import { describe, expect, it } from "vitest";
import { bodySelhani, coChybi, coDokoupit, doporucenaZasobaVody, KRAJE_ODOLNOSTI, TRIDY_SRAZEK, FUNKCE, hodnotFunkci, horizonty, lidskaDoba, PRAZDNY_PROFIL, souhrn, vydrze, ZAVISLOSTI, type Profil } from "../src/lib/odolnost";

/*
  Model odolnosti je deterministický a musí dávat stejný výsledek pro
  stejný vstup — jinak by doporučení nešlo vysvětlit. Testy hlídají hlavně
  to, co obyčejný checklist neumí: společný způsob selhání a jediný bod
  selhání, který vypne víc funkcí naráz.
*/

const profil = (cesty: Record<string, string[]>, dalsi: Partial<Profil> = {}): Profil => ({ ...PRAZDNY_PROFIL, cesty, ...dalsi });

describe("katalog", () => {
  it("každá cesta odkazuje jen na známé závislosti", () => {
    for (const f of FUNKCE) for (const c of f.cesty) for (const z of c.zavislosti) expect(ZAVISLOSTI[z], `${f.klic}/${c.klic}: ${z}`).toBeDefined();
  });

  it("každá funkce má rady za 0 Kč a kompenzace", () => {
    for (const f of FUNKCE) {
      expect(f.nulaKc.length, f.klic).toBeGreaterThan(0);
      expect(f.kompenzace.length, f.klic).toBeGreaterThan(0);
    }
  });
});

describe("redundance", () => {
  it("bez cesty 0, jedna cesta 1", () => {
    expect(hodnotFunkci(FUNKCE.find((f) => f.klic === "informace")!, profil({})).redundance).toBe(0);
    expect(hodnotFunkci(FUNKCE.find((f) => f.klic === "informace")!, profil({ informace: ["internet"] })).redundance).toBe(1);
  });

  it("internet v telefonu a pevný internet sdílejí napájení — je to záloha, ne nezávislá cesta", () => {
    const h = hodnotFunkci(FUNKCE.find((f) => f.klic === "informace")!, profil({ informace: ["internet", "pevny-internet"] }));
    expect(h.redundance).toBe(2);
    expect(h.spolecne.length).toBeGreaterThan(0);
  });

  it("rádio na baterie k internetu = dvě nezávislé cesty", () => {
    const h = hodnotFunkci(FUNKCE.find((f) => f.klic === "informace")!, profil({ informace: ["internet", "radio-baterie"] }));
    expect(h.redundance).toBe(3);
  });

  it("dva telefony u dvou operátorů nejsou nezávislé — oba stojí na síti i dobíjení", () => {
    const h = hodnotFunkci(FUNKCE.find((f) => f.klic === "komunikace")!, profil({ komunikace: ["mobil-a", "mobil-b"] }));
    expect(h.redundance).toBe(2);
    expect(h.spolecne).toContain("mobilni-sit");
  });
});

describe("jediný bod selhání", () => {
  it("elektřina, na které stojí studna, topení i světlo, je kritická závislost", () => {
    const p = profil({ "pitna-voda": ["studna-cerpadlo"], hygiena: ["studna-cerpadlo"], teplo: ["elektricke"], svetlo: ["sit"] });
    const body = bodySelhani(FUNKCE.map((f) => hodnotFunkci(f, p)));
    expect(body[0].zavislost).toBe("elektrina");
    expect(body[0].vypne.map((f) => f.klic)).toEqual(expect.arrayContaining(["pitna-voda", "hygiena", "teplo", "svetlo"]));
  });

  it("uložená voda kritickou závislost u pitné vody zruší", () => {
    const p = profil({ "pitna-voda": ["studna-cerpadlo", "zasoba"], teplo: ["elektricke"] });
    const body = bodySelhani(FUNKCE.map((f) => hodnotFunkci(f, p)));
    const el = body.find((b) => b.zavislost === "elektrina")!;
    expect(el.vypne.map((f) => f.klic)).not.toContain("pitna-voda");
  });
});

describe("horizonty a spotřeba", () => {
  it("voda se počítá z osob a zvířat s viditelným předpokladem", () => {
    const v = vydrze(profil({}, { osob: 2, zvirat: 1, zasoby: { pitnaVodaL: 35, uzitkovaVodaL: null, jidloDni: null, lekyDni: null } }));
    const voda = v.find((x) => x.klic === "pitna-voda")!;
    expect(voda.dni).toBe(5);
    expect(voda.predpoklad).toMatch(/3 l na osobu/);
  });

  it("bez údajů je horizont nehodnocený, ne připravený", () => {
    expect(horizonty(profil({})).every((h) => h.stav === "nehodnoceno")).toBe(true);
  });

  it("nula litrů je nula dní, ne „nezadáno“", () => {
    const h = horizonty(profil({}, { osob: 1, zasoby: { pitnaVodaL: 0, uzitkovaVodaL: null, jidloDni: null, lekyDni: null } }));
    expect(h.find((x) => x.dni === 3)!.stav).toBe("slabe");
  });

  it("horizonty začínají na 72 hodinách a končí u 60 dní", () => {
    const dni = horizonty(profil({})).map((h) => h.dni);
    expect(dni[0]).toBe(3);
    expect(dni[dni.length - 1]).toBe(60);
    expect(dni).not.toContain(1);
    expect(dni).toContain(45);
  });

  it("vysílačky platí od dvou kusů; rodina v dosahu plyne z kontextu", () => {
    const f = FUNKCE.find((x) => x.klic === "komunikace")!;
    expect(hodnotFunkci(f, profil({}, { vybaveni: { vysilacky: 1 } })).mam.map((c) => c.klic)).not.toContain("vysilacky");
    expect(hodnotFunkci(f, profil({}, { vybaveni: { vysilacky: 2 } })).mam.map((c) => c.klic)).toContain("vysilacky");
    const s = hodnotFunkci(f, profil({ komunikace: ["mobil-a"] }, { kontext: { ...PRAZDNY_PROFIL.kontext, rodinaVDosahu: true } }));
    expect(s.mam.map((c) => c.klic)).toContain("rodina-dosah");
    expect(s.redundance).toBe(3);
  });

  it("kraje: čtrnáct, každý se známou třídou; sušší kraj zvedne doporučenou rezervu vody", () => {
    expect(KRAJE_ODOLNOSTI.length).toBe(14);
    for (const k of KRAJE_ODOLNOSTI) expect(TRIDY_SRAZEK[k.trida], k.klic).toBeDefined();
    const zaklad = doporucenaZasobaVody(profil({}, { osob: 2 }), 7);
    const jm = doporucenaZasobaVody(profil({}, { osob: 2, kontext: { ...PRAZDNY_PROFIL.kontext, kraj: "jihomoravsky" } }), 7);
    expect(zaklad.litru).toBe(42);
    expect(jm.litru).toBe(Math.ceil(42 * TRIDY_SRAZEK.sussi.nasobekRezervy));
    expect(jm.predpoklad).toMatch(/orientační/);
    const lib = doporucenaZasobaVody(profil({}, { osob: 2, kontext: { ...PRAZDNY_PROFIL.kontext, kraj: "liberecky" } }), 7);
    expect(lib.litru).toBe(42);
  });

  it("v sušším kraji přibude doporučení na vodu, když zásoba nekryje 7 dní", () => {
    const d = coChybi(profil({ "pitna-voda": ["vodovod", "zasoba"] }, { osob: 2, zasoby: { pitnaVodaL: 30, uzitkovaVodaL: null, jidloDni: 10, lekyDni: null }, kontext: { ...PRAZDNY_PROFIL.kontext, kraj: "jihomoravsky" } }));
    expect(d.some((x) => x.druh === "zasoba" && /Jihomoravský/.test(x.nadpis))).toBe(true);
  });

  it("co dokoupit: věci bez značky, nejdřív k nejdůležitější funkci, nejvýš osm", () => {
    const n = coDokoupit(profil({}));
    expect(n.length).toBeLessThanOrEqual(8);
    expect(n[0].funkce).toMatch(/pitna-voda|teplo|komunikace|informace|zdravi|potraviny/);
    for (const x of n) expect(x.polozka).not.toMatch(/Kč|\d+ ?Kč/);
    expect(coDokoupit(profil({ "pitna-voda": ["vodovod", "zasoba"] })).some((x) => x.polozka.includes("nádoby na vodu"))).toBe(false);
  });

  it("vlastní zdroj energie sejme závislost telefonu na síti, pevný internet ji má dál", () => {
    const f = FUNKCE.find((x) => x.klic === "informace")!;
    const bez = hodnotFunkci(f, profil({ informace: ["internet", "pevny-internet"] }));
    const s = hodnotFunkci(f, profil({ informace: ["internet", "pevny-internet"] }, { energie: { kapacitaWh: 500, potrebaDenWh: 100, dobijeni: false } }));
    expect(bez.redundance).toBe(2);
    expect(s.redundance).toBe(3);
  });

  it("72 h připraveno, 7 dní částečně, když jídlo vydrží a voda ne", () => {
    const h = horizonty(profil({}, { osob: 1, zasoby: { pitnaVodaL: 12, uzitkovaVodaL: null, jidloDni: 10, lekyDni: null } }));
    expect(h.find((x) => x.dni === 3)!.stav).toBe("pripraveno");
    expect(h.find((x) => x.dni === 7)!.stav).toBe("castecne");
  });

  /*
    Do 13. 11. 2026 dávalo zaškrtnuté dobíjení „bez limitu kapacity“ i pro
    malý panel v listopadu. Teď: bez výkonu panelů jen kapacita (generátor
    a auto závisí na palivu, které neznáme), s panely zisk podle období.
  */
  it("dobíjení bez výkonu panelů: jen kapacita a věta proč", () => {
    const e = vydrze(profil({}, { energie: { kapacitaWh: 1000, potrebaDenWh: 500, dobijeni: true } })).find((x) => x.klic === "energie")!;
    expect(e.dni).toBe(1.7); // 1 000 Wh × 0,85 / 500 Wh
    expect(e.upozorneni).toMatch(/palivo|panel/);
  });
  it("solár v zimě: 100 Wp pokryje 70 Wh z 500 Wh denně; v létě 400 Wp pokryje vše", () => {
    const listopad = Date.parse("2026-11-13T12:00:00Z");
    const cervenec = Date.parse("2026-07-13T12:00:00Z");
    const zima = vydrze(profil({}, { energie: { kapacitaWh: 1000, potrebaDenWh: 500, dobijeni: true, solarWp: 100 } }), listopad).find((x) => x.klic === "energie")!;
    expect(zima.dni).toBe(1.9); // 850 Wh / (500 − 70) Wh
    const leto = vydrze(profil({}, { energie: { kapacitaWh: 1000, potrebaDenWh: 500, dobijeni: true, solarWp: 400 } }), cervenec).find((x) => x.klic === "energie")!;
    expect(leto.dni).toBe(Infinity); // 400 × 4,5 × 0,7 = 1 260 Wh
    expect(lidskaDoba(Infinity)).toMatch(/bez limitu/);
  });

  it("lidská doba: minuty, hodiny, dny", () => {
    expect(lidskaDoba(0.02)).toBe("29 min");
    expect(lidskaDoba(0.18)).toBe("4 h 19 min");
    expect(lidskaDoba(1.29)).toBe("1 d 7 h");
  });
});

describe("co mi ještě chybí", () => {
  it("nejdřív kritická závislost, ne další svítilna", () => {
    const p = profil({ "pitna-voda": ["studna-cerpadlo"], hygiena: ["studna-cerpadlo"], teplo: ["elektricke"], svetlo: ["sit", "baterky", "svicky", "dobijeci"] });
    const d = coChybi(p);
    expect(d[0].druh).toBe("kriticka-zavislost");
    expect(d.some((x) => x.funkce === "svetlo")).toBe(false);
  });

  it("nikdy víc než pět věcí a každá má vysvětlení", () => {
    const d = coChybi(profil({}));
    expect(d.length).toBeLessThanOrEqual(5);
    for (const x of d) { expect(x.proc).toBeTruthy(); expect(x.zaklad).toBeTruthy(); expect(x.kdyNeni).toBeTruthy(); }
  });

  it("neřešitelné se nepenalizuje, dostane kompenzace", () => {
    const p = profil({ teplo: ["elektricke"] }, { nemohu: { teplo: "najem" } });
    const d = coChybi(p);
    expect(d.some((x) => x.druh === "bez-zalohy" && x.funkce === "teplo")).toBe(false);
    expect(d.some((x) => x.druh === "kompenzace" && x.funkce === "teplo")).toBe(true);
  });

  it("souhrn počítá vyřešené funkce", () => {
    const s = souhrn(profil({ informace: ["internet", "radio-baterie"] }));
    expect(s.vyreseno.n).toBe(1);
    expect(s.nejslabsi).not.toBeNull();
  });
});

/*
  Hranice zdarma / Premium: bezpečnostní nálezy se nesmějí zamknout a
  souhrn zdarma musí počítat ze stejného hodnocení jako podrobný plán.
*/
import { bezpecnostniNalezy, pocty } from "../src/lib/odolnost";

describe("zdarma: nálezy a počty", () => {
  it("prázdný profil: nic v pořádku, nic slabého, vše nehodnoceno", () => {
    const s = souhrn(PRAZDNY_PROFIL);
    const p = pocty(s);
    expect(p.vPoradku).toBe(0);
    expect(p.slabin).toBe(0);
    expect(p.nehodnoceno).toBe(s.hodnoceni.length);
  });

  it("péče závislá na jediné cestě je nález; bez péče není", () => {
    const zdravi = FUNKCE.find((f) => f.klic === "zdravi")!;
    const cesta = zdravi.cesty.find((c) => c.zavislosti.includes("elektrina")) ?? zdravi.cesty[0];
    const profil = { ...PRAZDNY_PROFIL, cesty: { zdravi: [cesta.klic] }, kontext: { ...PRAZDNY_PROFIL.kontext, zavislyNaPeci: true } };
    const s = souhrn(profil);
    const n = bezpecnostniNalezy(profil, s.hodnoceni);
    if (cesta.zavislosti.length) expect(n.some((x) => x.klic === "pece-jedina-cesta")).toBe(true);
    const bez = bezpecnostniNalezy({ ...profil, kontext: { ...profil.kontext, zavislyNaPeci: false } }, s.hodnoceni);
    expect(bez.some((x) => x.klic === "pece-jedina-cesta")).toBe(false);
  });

  it("životně důležitá oblast bez cesty je nález, oblast „řešeno jinak“ ne", () => {
    const s = souhrn(PRAZDNY_PROFIL);
    const n = bezpecnostniNalezy(PRAZDNY_PROFIL, s.hodnoceni);
    expect(n.some((x) => x.klic === "bez-cesty-pitna-voda")).toBe(true);
    const jinak = { ...PRAZDNY_PROFIL, nemohu: { "pitna-voda": "jine" } };
    const s2 = souhrn(jinak);
    expect(bezpecnostniNalezy(jinak, s2.hodnoceni).some((x) => x.klic === "bez-cesty-pitna-voda")).toBe(false);
  });
});

import { skore } from "../src/lib/odolnost";

describe("skóre pro žebříček", () => {
  it("prázdný profil 0, plné zálohy blízko 70+, vždy v rozsahu 0–100", () => {
    expect(skore(souhrn(PRAZDNY_PROFIL))).toBe(0);
    const vse: Record<string, string[]> = {};
    for (const f of FUNKCE) vse[f.klic] = f.cesty.filter((c) => !c.kontext && !c.pocet).map((c) => c.klic);
    const s = skore(souhrn({ ...PRAZDNY_PROFIL, cesty: vse, zasoby: { pitnaVodaL: 500, uzitkovaVodaL: 500, jidloDni: 90, lekyDni: 90 } }));
    expect(s).toBeGreaterThanOrEqual(60);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe("jídlo podrobně — kolik vydrží živiny (26. 9. 2026)", () => {
  it("1 kg rýže pro 1 osobu: energie 1,8 dne, tuky dojdou nejdřív", async () => {
    const { PRAZDNY_PROFIL, rozpisJidla, vydrze } = await import("../src/lib/odolnost");
    const p = { ...PRAZDNY_PROFIL, osob: 1, zasoby: { ...PRAZDNY_PROFIL.zasoby, potraviny: { ryze: 1 } } };
    const r = rozpisJidla(p)!;
    const z = Object.fromEntries(r.zivin.map((x) => [x.klic, x.dni]));
    expect(z.kcal).toBe(1.8);      // 3 650 kcal / 2 000
    expect(z.bilkoviny).toBe(1.4); // 71 g / 50 g
    expect(z.tuky).toBe(0.1);      // 7 g / 70 g
    expect(z.sacharidy).toBe(3);   // 800 g / 260 g
    expect(r.nejdriv?.klic).toBe("tuky");
    expect(vydrze(p).find((v) => v.klic === "potraviny")?.dni).toBe(1.8);
  });
  it("bez zadaných potravin platí odhad ve dnech", async () => {
    const { PRAZDNY_PROFIL, rozpisJidla, vydrze } = await import("../src/lib/odolnost");
    const p = { ...PRAZDNY_PROFIL, osob: 2, zasoby: { ...PRAZDNY_PROFIL.zasoby, jidloDni: 5 } };
    expect(rozpisJidla(p)).toBeNull();
    expect(vydrze(p).find((v) => v.klic === "potraviny")?.dni).toBe(5);
  });
});

/*
  13. 11. 2026, z komentáře čtenářky: výsledek jen opakoval, co člověk
  napsal, a nereagoval na filtr a užitkovou vodu. Prepperská kontrola.
*/
describe("voda: filtr, užitková voda a studna", () => {
  const zasoby = (z: Partial<Profil["zasoby"]>) => ({ ...PRAZDNY_PROFIL.zasoby, ...z });
  const voda = (p: Profil) => Object.fromEntries(vydrze(p).map((v) => [v.klic, v]));

  it("bez filtru: užitková voda se k pití nepočítá a web nabídne zaškrtnout úpravu", () => {
    const v = voda(profil({ "pitna-voda": ["vodovod"] }, { osob: 1, zasoby: zasoby({ pitnaVodaL: 6, uzitkovaVodaL: 100 }) }));
    expect(v["pitna-voda"].dni).toBe(2);
    expect(v["pitna-voda"].upozorneni).toMatch(/filtr/);
    expect(v.hygiena.dni).toBe(10);
  });

  it("s filtrem: pití 6 l + 100 l užitkové = 35 dní; hygiena kratší, protože se z ní pije", () => {
    const v = voda(profil({ "pitna-voda": ["uprava"] }, { osob: 1, zasoby: zasoby({ pitnaVodaL: 6, uzitkovaVodaL: 100 }) }));
    expect(v["pitna-voda"].dni).toBe(35.3); // 106 l / 3 l
    expect(v["pitna-voda"].upozorneni).toMatch(/33,3 dne z užitkové/);
    expect(v.hygiena.dni).toBe(8.1);        // (6 + 100) / (3 + 10)
  });

  it("kapacita filtru je strop: 10 l filtru přidá 3,3 dne pití; pak se z užitkové už nepije", () => {
    const v = voda(profil({ "pitna-voda": ["uprava"] }, { osob: 1, zasoby: zasoby({ pitnaVodaL: 6, uzitkovaVodaL: 100, upravaL: 10 }) }));
    expect(v["pitna-voda"].dni).toBe(5.3);  // (6 + 10) / 3
    expect(v.hygiena.dni).toBe(9);          // (100 − 10) / 10
    // Při 30 l filtru dojde užitková voda dřív než filtr: obojí končí za (6 + 100) / 13 dne.
    expect(voda(profil({ "pitna-voda": ["uprava"] }, { osob: 1, zasoby: zasoby({ pitnaVodaL: 6, uzitkovaVodaL: 100, upravaL: 30 }) })).hygiena.dni).toBe(8.1);
  });

  it("studna s ruční pumpou: hygiena ze zdroje; pití jen s úpravou", () => {
    const bez = voda(profil({ "pitna-voda": ["studna-rucni"] }, { osob: 2, zasoby: zasoby({ pitnaVodaL: 12 }) }));
    expect(bez.hygiena.dni).toBe(Infinity);
    expect(bez["pitna-voda"].dni).toBe(2);
    expect(bez["pitna-voda"].upozorneni).toMatch(/rozbor/);
    const s = voda(profil({ "pitna-voda": ["studna-rucni", "uprava"] }, { osob: 2, zasoby: zasoby({ pitnaVodaL: 12 }) }));
    expect(s["pitna-voda"].dni).toBe(Infinity);
    expect(horizonty(profil({ "pitna-voda": ["studna-rucni", "uprava"] }, { osob: 2, zasoby: zasoby({ pitnaVodaL: 12 }) })).every((h) => !h.dojde.some((d) => d.klic === "pitna-voda"))).toBe(true);
  });
});

describe("jídlo: odhad není výsledek, syrová rýže není jídlo", () => {
  it("odhad ve dnech je označený a má kontrolu v kaloriích a kilech rýže", () => {
    const j = vydrze(profil({}, { osob: 2, zasoby: { ...PRAZDNY_PROFIL.zasoby, jidloDni: 14 } })).find((v) => v.klic === "potraviny")!;
    expect(j.dni).toBe(14);
    expect(j.puvod).toBe("odhad");
    expect(j.upozorneni).toMatch(/56\s000 kcal/);  // 14 × 2 × 2 000
    expect(j.upozorneni).toMatch(/15,3 kg rýže/);   // 56 000 / 3 650
  });

  it("bez vařiče, který jede bez proudu, se rýže a těstoviny do výdrže nepočítají", () => {
    const zas = { ...PRAZDNY_PROFIL.zasoby, potraviny: { ryze: 5, orechy: 1 } };
    const jenProud = vydrze(profil({ vareni: ["elektricky-sporak"] }, { osob: 1, zasoby: zas })).find((v) => v.klic === "potraviny")!;
    expect(jenProud.dni).toBe(2.8);                 // jen ořechy: 5 790 kcal / 2 000
    expect(jenProud.upozorneni).toMatch(/rýže/);
    const sKartusi = vydrze(profil({ vareni: ["elektricky-sporak", "kartuse"] }, { osob: 1, zasoby: zas })).find((v) => v.klic === "potraviny")!;
    expect(sKartusi.dni).toBe(12);                  // (18 250 + 5 790) / 2 000
    const nevyplneno = vydrze(profil({}, { osob: 1, zasoby: zas })).find((v) => v.klic === "potraviny")!;
    expect(nevyplneno.dni).toBe(12);
    expect(nevyplneno.upozorneni).toMatch(/bez vaření/);
  });

  it("plynový sporák ze sítě vaří i bez proudu; „jídlo bez vaření“ vařič není", async () => {
    const { vareniBezProudu } = await import("../src/lib/odolnost");
    expect(vareniBezProudu(profil({ vareni: ["plynovy-sporak"] }))).toBe(true);
    expect(vareniBezProudu(profil({ vareni: ["bez-vareni"] }))).toBe(false);
    expect(vareniBezProudu(profil({}))).toBeNull();
  });

  it("zvířata: krmivo se nepočítá a výsledek to říká", () => {
    const j = vydrze(profil({}, { osob: 1, zvirat: 1, zasoby: { ...PRAZDNY_PROFIL.zasoby, jidloDni: 5 } })).find((v) => v.klic === "potraviny")!;
    expect(j.predpoklad).toMatch(/Krmivo/);
  });
});
