import { describe, expect, it } from "vitest";
import { dalsiSouhrn, konecTicha, naplanuj, rozdilStavu, textZpravy, vTichu, zPrahy } from "../src/upozorneni";
import { VYCHOZI_NASTAVENI as VYCHOZI, type NovaZprava, type StavWebu } from "../src/typy";

/** Výchozí je týdenní souhrn; okamžité doručení se v testech plánování volí výslovně. */
const VYCHOZI_NASTAVENI = { ...VYCHOZI, frekvence: "ihned" as const };

const zaklad: StavWebu = {
  verze: 1, web: "https://czechpatrol.cz", generovano: "2026-09-05T10:00:00Z", overeno: null,
  uroven: "Y2", nazev: "Střední", pasmo: "zluta", trend: "beze-zmeny", hybridni: "Y3", primy: "G2",
  pravni: { mobilizace: false, "valecny-stav": false, hranice: null },
  nato: { "clanek-4": false, "clanek-5": false },
  provoz: { palivo: "bezny", banky: "bez-zdroje" },
  udalosti: [{ slug: "a", titulek: "A", zavaznost: "Y1", pasmo: "zluta", kategorie: ["sabotaze"], zeme: "Německo", kodZeme: "DE", datumUdalosti: "2026-09-01", datumZjisteni: null, aktualizovano: "2026-09-01", odkaz: "https://czechpatrol.cz/incident/a/" }],
};

describe("rozdíl stavů", () => {
  it("první stav nic negeneruje", () => {
    expect(rozdilStavu(null, zaklad)).toEqual([]);
  });
  it("stejný stav nic negeneruje", () => {
    expect(rozdilStavu(zaklad, zaklad)).toEqual([]);
  });
  it("vyhlášená mobilizace je kritická, ověření záporu se neposílá", () => {
    const novy = { ...zaklad, pravni: { ...zaklad.pravni, mobilizace: true, hranice: false } };
    const z = rozdilStavu(zaklad, novy);
    expect(z).toHaveLength(1);
    expect(z[0]).toMatchObject({ druh: "pravni", zavaznost: "kriticka", titulek: "Mobilizace" });
  });
  it("nová událost nese kategorie a závažnost podle pásma", () => {
    const novy = { ...zaklad, udalosti: [{ ...zaklad.udalosti[0], slug: "b", titulek: "B", pasmo: "oranzova", kategorie: ["kyber"], datumZjisteni: "2026-09-05T09:00:00Z" }, ...zaklad.udalosti] };
    const z = rozdilStavu(zaklad, novy, Date.parse("2026-09-05T12:00:00Z"));
    expect(z).toHaveLength(1);
    expect(z[0]).toMatchObject({ druh: "udalost", zavaznost: "vysoka", kategorie: ["kyber"] });
  });
  it("provoz se změnou přes 'bez zdroje' nic neposílá", () => {
    const novy = { ...zaklad, provoz: { palivo: "narusen", banky: "bezny" } };
    const z = rozdilStavu(zaklad, novy);
    expect(z).toHaveLength(1);
    expect(z[0]).toMatchObject({ druh: "provoz", zavaznost: "vysoka" });
  });
  it("změna našeho hodnocení je analýza s nízkou závažností, i do červené (26. 9. 2026)", () => {
    const novy = { ...zaklad, uroven: "R1", nazev: "Kritická", pasmo: "cervena" };
    const z = rozdilStavu(zaklad, novy)[0];
    expect(z).toMatchObject({ druh: "uroven", zavaznost: "nizka" });
    expect(z.text).toContain("Není to výstraha ani pokyn");
  });
});

describe("zastaralý, pozdní a opakovaný stav", () => {
  const TED = Date.parse("2026-09-05T12:00:00Z");
  const platiMobilizace = { ...zaklad, pravni: { ...zaklad.pravni, mobilizace: true } };
  it("„Ukončeno“ se neodvodí ze stavu, jehož sběr je starší než 5 h", () => {
    const novy = { ...zaklad, generovano: "2026-09-05T11:00:00Z", beh: "2026-09-05T05:00:00Z" };
    expect(rozdilStavu(platiMobilizace, novy, TED)).toEqual([]);
  });
  it("s čerstvým sběrem se ukončení pošle", () => {
    const novy = { ...zaklad, generovano: "2026-09-05T11:00:00Z", beh: "2026-09-05T11:00:00Z" };
    expect(rozdilStavu(platiMobilizace, novy, TED)[0]).toMatchObject({ druh: "pravni", text: expect.stringContaining("Ukončeno") });
  });
  it("vyhlášení se pošle i ze starého stavu — zmeškat ho je horší než opozdit", () => {
    const novy = { ...platiMobilizace, generovano: "2026-09-05T11:00:00Z", beh: "2026-09-05T01:00:00Z" };
    expect(rozdilStavu(zaklad, novy, TED)).toHaveLength(1);
  });
  it("po obnovení se nepošle dávka dávno zjištěných událostí", () => {
    const stara = { ...zaklad.udalosti[0], slug: "stara", datumZjisteni: "2026-09-03T10:00:00Z" };
    const nova = { ...zaklad.udalosti[0], slug: "nova", datumZjisteni: "2026-09-05T10:00:00Z" };
    const z = rozdilStavu(zaklad, { ...zaklad, udalosti: [stara, nova, ...zaklad.udalosti] }, TED);
    expect(z.map((x) => x.klic)).toEqual(["udalost:nova"]);
  });
  it("týž rozdíl dává týž klíč — opakované zpracování nic nezdvojí", () => {
    const novy = { ...platiMobilizace, generovano: "2026-09-05T11:00:00Z" };
    expect(rozdilStavu(zaklad, novy, TED)[0].klic).toBe(rozdilStavu(zaklad, novy, TED)[0].klic);
  });
});

const zprava = (z: Partial<NovaZprava> = {}): NovaZprava => ({
  druh: "udalost", zavaznost: "vysoka", oblast: null, kategorie: ["sabotaze"], titulek: "T", text: "x", odkaz: null, ...z,
});

describe("plánování", () => {
  const poledne = new Date("2026-09-05T10:00:00Z"); // 12:00 v Praze (léto)
  it("skutečné výchozí nastavení je týdenní souhrn — nic nejde hned", () => {
    expect(VYCHOZI.frekvence).toBe("tydne");
    expect(naplanuj(zprava(), VYCHOZI, poledne)?.toISOString()).not.toBe(poledne.toISOString());
  });
  it("okamžité doručení: vysoká hned, střední ne", () => {
    expect(naplanuj(zprava(), VYCHOZI_NASTAVENI, poledne)).toEqual(poledne);
    expect(naplanuj(zprava({ zavaznost: "stredni" }), VYCHOZI_NASTAVENI, poledne)).toBeNull();
  });
  it("jen kritické: vysoká nejde, kritická oficiální hned, kritická naše událost ne", () => {
    const n = { ...VYCHOZI_NASTAVENI, frekvence: "jen-kriticke" as const };
    expect(naplanuj(zprava(), n, poledne)).toBeNull();
    expect(naplanuj(zprava({ druh: "pravni", kategorie: null, zavaznost: "kriticka" }), n, poledne)).toEqual(poledne);
    expect(naplanuj(zprava({ zavaznost: "kriticka" }), n, poledne)).toBeNull();
  });
  it("naše analýza (změna hodnocení) jde jen do souhrnu, nikdy hned", () => {
    const u = zprava({ druh: "uroven", zavaznost: "nizka", kategorie: null });
    expect(naplanuj(u, VYCHOZI_NASTAVENI, poledne)?.toISOString()).toBe("2026-09-05T16:00:00.000Z");
    expect(naplanuj(u, { ...VYCHOZI_NASTAVENI, frekvence: "jen-kriticke" }, poledne)).toBeNull();
  });
  it("oblasti filtrují události, ne stavové zprávy", () => {
    const n = { ...VYCHOZI_NASTAVENI, oblasti: ["kyber"] };
    expect(naplanuj(zprava(), n, poledne)).toBeNull();
    expect(naplanuj(zprava({ druh: "pravni", kategorie: null }), n, poledne)).toEqual(poledne);
  });
  it("tiché hodiny odloží nekritické na ráno, kritické ne", () => {
    const noc = new Date("2026-09-05T23:30:00Z"); // 01:30 v Praze
    const n = { ...VYCHOZI_NASTAVENI, ticho: { od: "22:00", do: "07:00" } };
    expect(vTichu(noc, n.ticho)).toBe(true);
    expect(naplanuj(zprava(), n, noc)).toEqual(zPrahy(2026, 9, 6, 7, 0));
    expect(naplanuj(zprava({ druh: "nato", kategorie: null, zavaznost: "kriticka" }), n, noc)).toEqual(noc);
    // Naše kritická událost nikoho nevzbudí — přijde ráno.
    expect(naplanuj(zprava({ zavaznost: "kriticka" }), n, noc)).toEqual(zPrahy(2026, 9, 6, 7, 0));
    expect(konecTicha(noc, n.ticho!).toISOString()).toBe("2026-09-06T05:00:00.000Z");
  });
  it("denní souhrn míří na 18:00 pražského času", () => {
    expect(dalsiSouhrn(poledne, "denne").toISOString()).toBe("2026-09-05T16:00:00.000Z");
    const vecer = new Date("2026-09-05T17:00:00Z");
    expect(dalsiSouhrn(vecer, "denne").toISOString()).toBe("2026-09-06T16:00:00.000Z");
  });
  it("týdenní souhrn míří na neděli 18:00", () => {
    expect(dalsiSouhrn(poledne, "tydne").toISOString()).toBe("2026-09-06T16:00:00.000Z");
  });
  it("zpráva partnera IZS respektuje kraj a vypnutí, jinak jde hned", () => {
    const izs = zprava({ druh: "izs", oblast: "Vysočina", kategorie: null });
    expect(naplanuj(izs, VYCHOZI_NASTAVENI, poledne)).toBeNull();
    expect(naplanuj(izs, { ...VYCHOZI_NASTAVENI, kraj: "Vysočina" }, poledne)).toEqual(poledne);
    expect(naplanuj({ ...izs, oblast: "Celá ČR" }, VYCHOZI_NASTAVENI, poledne)).toEqual(poledne);
    expect(naplanuj({ ...izs, oblast: "Celá ČR" }, { ...VYCHOZI_NASTAVENI, zpravyIzs: false }, poledne)).toBeNull();
  });
});

describe("text zprávy", () => {
  it("zpráva partnera nese označení a není úřední varování", () => {
    const t = textZpravy({ druh: "izs", zavaznost: "vysoka", titulek: "HZS Kraje Vysočina", text: "Uzavírka <D1>", odkaz: null, oblast: "Vysočina" });
    expect(t).toContain("Zpráva partnera IZS");
    expect(t).toContain("&lt;D1&gt;");
    expect(t).toContain("Není to úřední varování");
  });
  it("běžná zpráva má patičku o povaze webu", () => {
    expect(textZpravy({ druh: "uroven", zavaznost: "kriticka", titulek: "Změna", text: "a → b", odkaz: "https://x", oblast: null })).toContain("ne úřední varování");
  });
});
