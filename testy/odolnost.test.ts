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

  it("energie s dobíjením nemá limit kapacity", () => {
    const v = vydrze(profil({}, { energie: { kapacitaWh: 1000, potrebaDenWh: 500, dobijeni: true } }));
    expect(v.find((x) => x.klic === "energie")!.dni).toBe(Infinity);
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
