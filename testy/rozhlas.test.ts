// @ts-nocheck — skript je prostý ES modul bez typů; test hlídá chování, typy hlídá běh.
import { describe, expect, it } from "vitest";
import { klicovaVeta, legendaTecek, pocetZdroju, pruhTecek, rozdelZpravu, sestavSouhrn, sestavTest, sestavZdroje, sestavZmenuStavu, sestavZpravu, vyberNove, vyberZmenyStavu, zahlavi } from "../nastroje/rozhlas.mjs";
import { UROVNE, zDeseti } from "../src/lib/skala";
import type { Uroven } from "../src/lib/typy";

const zaznam = (n: Record<string, unknown>) => ({
  id: "x", slug: "x", titulek: "Titulek <b>", zeme: "Německo", kodZeme: "DE", datumUdalosti: "2026-09-01T00:00:00Z",
  datumZjisteni: "2026-09-04T00:00:00Z", aktualizovano: "2026-09-04T00:00:00Z", zavaznost: "O1", jistota: "vysoka",
  atribuce: "vysetrovana", puvodce: "neznamy", druh: "pripad", fakta: ["První fakt."], historie: [{ kdy: "2026-09-04T00:00:00Z", text: "Událost." }],
  lidskyOvereno: true, ...n,
});

describe("rozhlas", () => {
  it("zpráva má titulek, závažnost i jistotu zvlášť, odkaz na celý záznam a únik HTML", () => {
    const z = sestavZpravu(zaznam({}));
    expect(z).toContain("🟠 Závažnost: 7 z 10 · vysoká\n<b>Titulek &lt;b&gt;</b>");
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
    expect(sestavZmenuStavu(v[0].snimek, v[0].zmeny)).toContain("Změna úředního stavu");
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
    expect(klicovaVeta(venku)).toBe("Událost nastala v Polsku, nikoli v České republice. Pro Českou republiku z toho neplyne žádné nové úřední opatření.");
    expect(klicovaVeta(doma)).toContain("Záznam se týká území České republiky.");
    expect(klicovaVeta(opatreniDoma)).toBe("V České republice bylo přijato úřední opatření: zákaz vstupu. Rozsah a platnost uvádí přehled opatření.");
    for (const z of [doma, opatreniDoma, venku]) {
      expect(sestavZpravu(z)).toContain(`<b>${klicovaVeta(z)}</b>`);
    }
    expect(sestavZmenuStavu({ kdy: "2026-09-06T00:00:00Z" }, ["NATO — clanek-4: NE → ANO"])).toContain("<b>Mění se rozsah toho, co úředně platí.");
    expect(sestavTest(venku)).toContain("<b>Kanál je funkční.");
  });
  it("zpráva je členěná: puntík a krátký titulek, co se stalo, co nevíme, hodnocení, odkaz", () => {
    const z = sestavZpravu(zaznam({ kratkyTitulek: "Krátce", neznameho: ["Nevíme kdo."] }));
    const radky = z.split("\n");
    expect(radky[0]).toBe("🟠 Závažnost: 7 z 10 · vysoká");
    expect(radky[1]).toBe("<b>Krátce</b>");
    expect(radky[2]).toBe("Německo · případ · 4. 9. 2026");
    expect(z).toContain("Co se stalo\n• Titulek &lt;b&gt;");
    expect(z).toContain("Co nebylo potvrzeno\n• Nevíme kdo.");
    // Patička dělá ze zprávy citovatelný dokument.
    expect(z).toContain("Úplný záznam a zdroje: https://czechpatrol.pages.dev/incident/x/");
    expect(z.trimEnd().endsWith("CzechPatrol · záznam x · aktualizováno 4. 9. 2026")).toBe(true);
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
    expect(kusy[0].startsWith("🔴🟡📋\n<b>CzechPatrol · denní přehled 6. 9. 2026</b>")).toBe(true);
    expect(kusy[0]).toContain("3 nové záznamy · nejvýše 9 z 10");
    expect(kusy[0]).toContain("<i>🔴 1× vážné · 🟡 1× střední závažnost · 📋 1× opatření</i>");
    expect(kusy[0]).toContain("<b>V České republice bylo přijato úřední opatření: opatření.");
  });
  it("dlouhý souhrn se rozdělí, každý kus zůstane pod limitem Telegramu", () => {
    const polozky = Array.from({ length: 8 }, (_, n) => ({ i: zaznam({ id: `i${n}`, slug: `i${n}` }), aktualizace: false }));
    const { kusy } = sestavSouhrn(polozky, { ted: Date.now(), limit: 900 });
    expect(kusy.length).toBeGreaterThan(1);
    for (const k of kusy) expect(k.length).toBeLessThanOrEqual(4096);
  });

  it("zpráva začíná puntíkem a závažností číslem; číslo je totéž co na webu", () => {
    expect(zahlavi(zaznam({ zavaznost: "R3" }))).toBe("🔴 Závažnost: 10 z 10 · vážná");
    expect(zahlavi(zaznam({ zavaznost: "G1" }))).toBe("🟢 Závažnost: 1 z 10 · nízká");
    expect(zahlavi(zaznam({ druh: "opatreni", puvodce: undefined }))).toBe("📋 Oficiální opatření");
    expect(zahlavi(zaznam({ druh: "reakce", puvodce: undefined }))).toBe("💬 Prohlášení nebo reakce");
    // Tabulka v rozhlas.mjs se nesmí rozejít se stupnicí webu.
    const kody = Object.keys(UROVNE) as Uroven[];
    for (const kod of kody) {
      expect(zahlavi(zaznam({ zavaznost: kod }))).toContain(`Závažnost: ${zDeseti(kod)} z 10`);
    }
    // Číslo s rostoucí úrovní nikdy neklesá a drží se v rozsahu 1–10.
    const cisla = [...kody].sort((a, b) => UROVNE[a].poradi - UROVNE[b].poradi).map((k) => zDeseti(k));
    expect(cisla).toEqual([...cisla].sort((a, b) => a - b));
    expect(Math.min(...cisla)).toBe(1);
    expect(Math.max(...cisla)).toBe(10);
  });
  it("souhrn hlásí nejvyšší závažnost číslem, jen když obsahuje případ", () => {
    const ted = new Date("2026-09-06T17:00:00Z").getTime();
    const sPripadem = sestavSouhrn([
      { i: zaznam({ id: "a", slug: "a", zavaznost: "R1" }), aktualizace: false },
      { i: zaznam({ id: "b", slug: "b", zavaznost: "Y2" }), aktualizace: false },
    ], { ted });
    expect(sPripadem.kusy[0]).toContain("2 nové záznamy · nejvýše 9 z 10");
    const bezPripadu = sestavSouhrn([
      { i: zaznam({ id: "c", slug: "c", druh: "opatreni", puvodce: undefined }), aktualizace: false },
      { i: zaznam({ id: "d", slug: "d", druh: "reakce", puvodce: undefined }), aktualizace: false },
    ], { ted });
    expect(bezPripadu.kusy[0]).toContain("2 nové záznamy\n");
    expect(bezPripadu.kusy[0]).not.toContain("z 10");
  });

  const zdroj = (n: Record<string, unknown>) => ({
    nazev: "Zdroj", url: "https://priklad.cz/a", typ: "media", publikovano: "2026-09-04T00:00:00Z",
    primarni: false, jazyk: "cs", ...n,
  });

  it("zpráva vypisuje všechna fakta i všechno, co nevíme — nic se neuřízne", () => {
    const z = sestavZpravu(zaznam({
      fakta: ["První fakt.", "Druhý fakt.", "Třetí fakt."],
      neznameho: ["Nevíme kdo.", "Nevíme proč."],
      vyznam: "Hodnocení projektu k případu.",
      stav: "probiha",
    }));
    for (const t of ["První fakt.", "Druhý fakt.", "Třetí fakt.", "Nevíme kdo.", "Nevíme proč."]) {
      expect(z).toContain(`• ${t}`);
    }
    expect(z).toContain("Hodnocení CzechPatrol (nejde o zjištěný fakt)\nHodnocení projektu k případu.");
    expect(z).toContain("Stav: vyšetřování pokračuje");
  });

  it("vypíše všechny zdroje po skupinách a řekne, kolik z nich je od úřadů", () => {
    const i = zaznam({ zdroje: [
      zdroj({ nazev: "Tagesschau", typ: "media", jazyk: "de", url: "https://ts.de/a" }),
      zdroj({ nazev: "Policie ČR", typ: "primary", primarni: true, url: "https://policie.cz/b" }),
      zdroj({ nazev: "Reuters", typ: "wire", jazyk: "en", url: "https://reuters.com/c" }),
      zdroj({ nazev: "Bez odkazu", typ: "media", url: "" }),
    ] });
    expect(pocetZdroju(i)).toMatchObject({ celkem: 3, uredni: 1 });
    const radky = sestavZdroje(i);
    expect(radky[0]).toBe("Zdroje (3): úřady 1 · agentury 1 · média 1");
    // Úřady první, pak agentury, pak noviny — od nejsilnějšího dokladu.
    expect(radky.join("\n")).toContain('Úřady a primární zdroje\n• <a href="https://policie.cz/b">Policie ČR</a> · 4. 9. 2026');
    expect(radky.join("\n")).toContain('Agentury\n• <a href="https://reuters.com/c">Reuters</a> · 4. 9. 2026 · en');
    expect(radky.join("\n")).toContain("Noviny a zpravodajství");
    expect(radky.join("\n")).not.toContain("Bez odkazu");
    expect(sestavZpravu(i)).toContain("Zdroje (3): úřady 1");
  });

  it("bez úředního zdroje to zpráva přizná, ale mluví jen o svých odkazech", () => {
    const bezUradu = sestavZdroje(zaznam({ zdroje: [zdroj({ nazev: "Deník" })] })).join("\n");
    expect(bezUradu).toContain("Zdroje (1): úřady 0 · média 1");
    expect(bezUradu).toContain("Mezi zdroji není přímý odkaz na úřední oznámení");
    const sUradem = sestavZdroje(zaznam({ zdroje: [zdroj({ nazev: "Vláda", typ: "primary" })] })).join("\n");
    expect(sUradem).not.toContain("není přímý odkaz");
    expect(sestavZdroje(zaznam({ zdroje: [] }))[0]).toContain("žádný odkaz");
  });

  it("v souhrnu je u položky počet zdrojů, ale výpis ne — souhrn je přehled", () => {
    const i = zaznam({ zdroje: [zdroj({ typ: "primary" }), zdroj({})] });
    const kratka = sestavZpravu(i, { souhrn: true });
    expect(kratka).toContain("Zdroje: 2 (úřady 1)");
    expect(kratka).not.toContain("Úřady a primární zdroje");
  });

  it("dlouhá zpráva se rozdělí mezi odstavci a díly se očíslují", () => {
    const kratka = "první\n\ndruhý";
    expect(rozdelZpravu(kratka)).toEqual([kratka]);
    const dlouha = ["a".repeat(300), "b".repeat(300), "c".repeat(300)].join("\n\n");
    const dily = rozdelZpravu(dlouha, { limit: 400 });
    expect(dily).toHaveLength(3);
    expect(dily[1].startsWith("↳ pokračování 2/3")).toBe(true);
    for (const d of dily) expect(d.length).toBeLessThanOrEqual(4096);
  });
});
