// @ts-nocheck — skript je prostý ES modul bez typů; test hlídá chování, typy hlídá běh.
import { describe, expect, it } from "vitest";
import { klicovaVeta, legendaTecek, pruhTecek, sestavSouhrn, sestavTest, sestavZmenuStavu, sestavZpravu, vyberNove, vyberZmenyStavu } from "../nastroje/rozhlas.mjs";

const zaznam = (n: Record<string, unknown>) => ({
  id: "x", slug: "x", titulek: "Titulek <b>", zeme: "Německo", kodZeme: "DE", datumUdalosti: "2026-09-01T00:00:00Z",
  datumZjisteni: "2026-09-04T00:00:00Z", aktualizovano: "2026-09-04T00:00:00Z", zavaznost: "O1", jistota: "vysoka",
  atribuce: "vysetrovana", puvodce: "neznamy", druh: "pripad", fakta: ["První fakt."], historie: [{ kdy: "2026-09-04T00:00:00Z", text: "Událost." }],
  lidskyOvereno: true, ...n,
});

describe("rozhlas", () => {
  it("zpráva má titulek, závažnost i jistotu zvlášť, odkaz na celý záznam a únik HTML", () => {
    const z = sestavZpravu(zaznam({}));
    expect(z).toContain("🟠 <b>Titulek &lt;b&gt;</b>");
    expect(z).toContain("Závažnost: Vysoká");
    expect(z).toContain("Jistota: vysoká");
    expect(z).toContain("Pachatel: neznámý");
    expect(z).toContain("https://czechpatrol.pages.dev/incident/x/");
  });
  it("okamžitě jdou jen vážné případy a opatření, zbytek do souhrnu; každý záznam jednou", () => {
    const ted = new Date("2026-09-06T12:00:00Z").getTime();
    const vazny = zaznam({ id: "a", slug: "a" });
    const mirny = zaznam({ id: "b", slug: "b", zavaznost: "Y2" });
    const opatreni = zaznam({ id: "c", slug: "c", druh: "opatreni", puvodce: undefined, zavaznost: "Y1" });
    const stav = { zaznamy: {}, snimky: {}, prvniBeh: "2026-09-05T00:00:00Z" };
    const hned = vyberNove([vazny, mirny, opatreni], stav, { rezim: "okamzite", ted });
    expect(hned.map((x) => x.i.id)).toEqual(["a", "c"]);
    stav.zaznamy["a"] = { kdy: "x", historie: 1 };
    stav.zaznamy["c"] = { kdy: "x", historie: 1 };
    const souhrn = vyberNove([vazny, mirny, opatreni], stav, { rezim: "souhrn", ted });
    expect(souhrn.map((x) => x.i.id)).toEqual(["b"]);
    stav.zaznamy["b"] = { kdy: "x", historie: 1 };
    expect(vyberNove([vazny, mirny, opatreni], stav, { rezim: "souhrn", ted })).toEqual([]);
  });
  it("nová položka v historii případu = jedna zpráva aktualizace", () => {
    const ted = new Date("2026-09-06T12:00:00Z").getTime();
    const i = zaznam({ id: "a", slug: "a", historie: [{ kdy: "2026-09-04T00:00:00Z", text: "Událost." }, { kdy: "2026-09-06T00:00:00Z", text: "Obvinění." }] });
    const stav = { zaznamy: { a: { kdy: "x", historie: 1 } }, snimky: {}, prvniBeh: "2026-09-05T00:00:00Z" };
    const v = vyberNove([i], stav, { rezim: "okamzite", ted });
    expect(v).toHaveLength(1);
    expect(v[0].aktualizace).toBe(true);
    expect(sestavZpravu(i, { aktualizace: true })).toContain("Obvinění.");
  });
  it("první běh starší záznamy jen zaznamená, nepošle; zpětně doplněná osa se neposílá nikdy", () => {
    const ted = new Date("2026-09-06T12:00:00Z").getTime();
    const stary = zaznam({ id: "s", slug: "s", datumZjisteni: "2026-09-01T00:00:00Z" });
    const stav: { zaznamy: Record<string, unknown>; snimky: Record<string, unknown>; prvniBeh: string | null } = { zaznamy: {}, snimky: {}, prvniBeh: null };
    expect(vyberNove([stary], stav, { rezim: "okamzite", ted })).toEqual([]);
    expect(stav.zaznamy["s"]).toMatchObject({ ticho: true });
    const archivni = zaznam({ id: "h", slug: "h", historicky: true, datumZjisteni: "2026-09-06T00:00:00Z", aktualizovano: "2026-09-06T00:00:00Z" });
    const stav2 = { zaznamy: {}, snimky: {}, prvniBeh: "2026-09-05T00:00:00Z" };
    expect(vyberNove([archivni], stav2, { rezim: "okamzite", ted })).toEqual([]);
    const dnesni = zaznam({ id: "d", slug: "d", datumZjisteni: "2026-09-06T00:00:00Z" });
    expect(vyberNove([dnesni], stav2, { rezim: "okamzite", ted }).map((x) => x.i.id)).toEqual(["d"]);
  });
  it("změny oficiálních stavů: jen právní stav a NATO, ne provozní šum", () => {
    const archiv = { snimky: [
      { kdy: "2026-09-05T00:00:00Z", zmeny: ["provoz — palivo: bez-zdroje → bezny", "zveřejněné události: 1 → 2"] },
      { kdy: "2026-09-06T00:00:00Z", zmeny: ["právní stav — mobilizace: NE → ANO", "NATO — clanek-4: NE → ANO"] },
    ] };
    const v = vyberZmenyStavu(archiv, { zaznamy: {}, snimky: {}, prvniBeh: "x" });
    expect(v).toHaveLength(1);
    expect(v[0].zmeny).toHaveLength(2);
    expect(sestavZmenuStavu(v[0].snimek, v[0].zmeny)).toContain("Změna oficiálního stavu");
  });

  it("pruh puntíků: tolik puntíků, kolik je čeho ve zprávě, od nejnaléhavějšího", () => {
    const polozky = [
      zaznam({ zavaznost: "R1" }), zaznam({ zavaznost: "O1" }), zaznam({ zavaznost: "O2" }),
      zaznam({ zavaznost: "Y1" }), zaznam({ druh: "opatreni", puvodce: undefined }),
    ];
    expect(pruhTecek(polozky)).toBe("🔴🟠🟠🟡📋");
    expect(legendaTecek(polozky)).toBe("🔴 1× vážné · 🟠 2× vysoká závažnost · 🟡 1× střední závažnost · 📋 1× opatření");
    // Když je jednoho druhu hodně, místo řady puntíků se napíše počet.
    expect(pruhTecek(Array.from({ length: 9 }, () => zaznam({ zavaznost: "Y2" })))).toBe("🟡×9");
    expect(pruhTecek([zaznam({})])).toBe("🟠");
  });
  it("každá zpráva má tučně nejzásadnější větu pro čtenáře v Česku", () => {
    const doma = zaznam({ kodZeme: "CZ", zeme: "Česko" });
    const opatreniDoma = zaznam({ kodZeme: "CZ", zeme: "Česko", druh: "opatreni", puvodce: undefined, kratkyTitulek: "ČR: zákaz vstupu" });
    const venku = zaznam({ kodZeme: "PL", zeme: "Polsko" });
    expect(klicovaVeta(venku)).toBe("Stalo se v Polsku, ne v Česku. Žádné nové oficiální opatření pro Česko z toho neplyne.");
    expect(klicovaVeta(doma)).toContain("Týká se přímo Česka.");
    expect(klicovaVeta(opatreniDoma)).toBe("Platí v Česku: zákaz vstupu. Co přesně a od kdy, je v přehledu opatření.");
    for (const z of [doma, opatreniDoma, venku]) {
      expect(sestavZpravu(z)).toContain(`<b>${klicovaVeta(z)}</b>`);
    }
    expect(sestavZmenuStavu({ kdy: "2026-09-06T00:00:00Z" }, ["NATO — clanek-4: NE → ANO"])).toContain("<b>Mění se to, co oficiálně platí.");
    expect(sestavTest(venku)).toContain("<b>Kanál je propojený.");
  });
  it("zpráva je členěná: puntík a krátký titulek, co se stalo, co nevíme, hodnocení, odkaz", () => {
    const z = sestavZpravu(zaznam({ kratkyTitulek: "Krátce", neznameho: ["Nevíme kdo."] }));
    const radky = z.split("\n");
    expect(radky[0]).toBe("🟠 <b>Krátce</b>");
    expect(radky[1]).toBe("Německo · případ · 4. 9. 2026");
    expect(z).toContain("Co se stalo\n• Titulek &lt;b&gt;");
    expect(z).toContain("Co zatím nevíme\n• Nevíme kdo.");
    expect(z.trimEnd().endsWith("https://czechpatrol.pages.dev/incident/x/")).toBe(true);
  });
  it("souhrn: pruh a legenda nahoře, nejdřív opatření a české záznamy", () => {
    const polozky = [
      { i: zaznam({ id: "a", slug: "a", zavaznost: "Y2", kratkyTitulek: "Mírné" }), aktualizace: false },
      { i: zaznam({ id: "b", slug: "b", kodZeme: "CZ", zeme: "Česko", druh: "opatreni", puvodce: undefined, kratkyTitulek: "ČR: opatření" }), aktualizace: false },
      { i: zaznam({ id: "c", slug: "c", zavaznost: "R1", kratkyTitulek: "Vážné" }), aktualizace: false },
    ];
    const { kusy, razene } = sestavSouhrn(polozky, { ted: new Date("2026-09-06T17:00:00Z").getTime() });
    expect(razene.map((x: { i: { id: string } }) => x.i.id)).toEqual(["b", "c", "a"]);
    // Pruh je barevná škála (nejzávažnější vlevo), pořadí položek pod ním je podle naléhavosti pro čtenáře.
    expect(kusy[0].startsWith("🔴🟡📋\n<b>CzechPatrol · souhrn 6. 9. 2026</b>")).toBe(true);
    expect(kusy[0]).toContain("3 nové záznamy · <i>🔴 1× vážné · 🟡 1× střední závažnost · 📋 1× opatření</i>");
    expect(kusy[0]).toContain("<b>Platí v Česku: opatření.");
  });
  it("dlouhý souhrn se rozdělí, každý kus zůstane pod limitem Telegramu", () => {
    const polozky = Array.from({ length: 8 }, (_, n) => ({ i: zaznam({ id: `i${n}`, slug: `i${n}` }), aktualizace: false }));
    const { kusy } = sestavSouhrn(polozky, { ted: Date.now(), limit: 900 });
    expect(kusy.length).toBeGreaterThan(1);
    for (const k of kusy) expect(k.length).toBeLessThanOrEqual(4096);
  });
});
