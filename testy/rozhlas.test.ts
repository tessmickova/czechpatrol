// @ts-nocheck — skript je prostý ES modul bez typů; test hlídá chování, typy hlídá běh.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { klicovaVeta, legendaTecek, pocetZdroju, pruhTecek, PUVODCI, radekPokryti, jeArchivni, radekData, rozdelZpravu, sestavPalivo, sestavSouhrn, sestavPrehledZachycenych, sestavSignal, sestavTest, sestavVystrahu, sestavZdroje, sestavZmenuStavu, sestavZpravu, vyberDoPrehledu, vyberNove, vyberPalivo, vyberSignaly, vyberVystrahu, vyberZmenyStavu, zahlavi, sestavVaznyNavrh, vyberVazneNavrhy } from "../nastroje/rozhlas.mjs";
import { UROVNE, zDeseti } from "../src/lib/skala";
import { PUVODCI as PUVODCI_WEB } from "../src/lib/kategorie";
import type { Uroven } from "../src/lib/typy";

const zaznam = (n: Record<string, unknown>) => ({
  id: "x", slug: "x", titulek: "Titulek <b>", zeme: "Německo", kodZeme: "DE", datumUdalosti: "2026-09-01T00:00:00Z",
  datumZjisteni: "2026-09-04T00:00:00Z", aktualizovano: "2026-09-04T00:00:00Z", zavaznost: "O1", jistota: "vysoka",
  atribuce: "vysetrovana", puvodce: "neznamy", druh: "pripad", fakta: ["První fakt."], historie: [{ kdy: "2026-09-04T00:00:00Z", text: "Událost." }],
  lidskyOvereno: true, ...n,
});

describe("rozhlas", () => {
  it("zpráva má titulek, závažnost, odkaz na celý záznam a únik HTML", () => {
    const z = sestavZpravu(zaznam({}));
    // Nadpis nese datum v závorce; řádek „země · případ · datum" pod ním zanikl.
    expect(z).toContain("🟠 Závažnost: 7 z 10 · vysoká\n<b>Titulek &lt;b&gt; (1. 9. 2026)</b>");
    expect(z).toContain("<b>Původce: zatím neurčen.</b>");
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
  it("zpráva je členěná: puntík a krátký titulek, co se stalo, co nevíme, odkaz", () => {
    const z = sestavZpravu(zaznam({ kratkyTitulek: "Krátce", fakta: ["První fakt."], neznameho: ["Nevíme kdo."] }));
    const radky = z.split("\n");
    expect(radky[0]).toBe("🟠 Závažnost: 7 z 10 · vysoká");
    expect(radky[1]).toBe("<b>Krátce (1. 9. 2026)</b>");
    /*
      Třetí řádek zprávy už není „Německo · případ · 1. 9. 2026". Země stála
      v nadpisu podruhé, slovo „případ" bylo skoro v každé zprávě a datum se
      přesunulo do závorky za nadpis. Datum je pořád datum UDÁLOSTI, ne zápisu.
    */
    expect(radky[1]).toContain("(1. 9. 2026)");
    expect(radky[2]).toBe("");
    expect(z).toContain("První fakt.");
    expect(z).toContain("<b>Nepotvrzeno:</b> Nevíme kdo.");
    // Patička říká, kdo zprávu vydal a kdy. Vnitřní označení záznamu v ní
    // není — čtenáři nic neříká a odkaz na záznam je o řádek výš.
    expect(z).toContain("Všechna fakta, hodnocení a všechny zdroje: https://czechpatrol.pages.dev/incident/x/");
    expect(z.trimEnd().endsWith("CzechPatrol · aktualizováno 4. 9. 2026")).toBe(true);
    expect(z).not.toContain("záznam x");
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

  it("do kanálu jde jedna věta co se stalo a jedna co potvrzené není; zbytek je na webu", () => {
    const z = sestavZpravu(zaznam({
      fakta: ["První fakt.", "Druhý fakt.", "Třetí fakt."],
      neznameho: ["Nevíme kdo.", "Nevíme proč."],
      vyznam: "Hodnocení projektu k případu.",
      stav: "probiha",
    }));
    expect(z).toContain("První fakt.");
    expect(z).not.toContain("Druhý fakt.");
    // Jedna věta o nepotvrzeném musí zůstat: bez ní si čtenář vyvodí víc,
    // než data ukazují (pravidlo č. 6).
    expect(z).toContain("<b>Nepotvrzeno:</b> Nevíme kdo.");
    expect(z).not.toContain("Nevíme proč.");
    // Hodnocení se nezkracuje — zkrácené hodnocení bez podkladu je horší
    // než žádné. Patří na web, kam zpráva odkazuje.
    expect(z).not.toContain("Hodnocení projektu k případu.");
    expect(z).toContain("<b>Stav:</b> vyšetřování pokračuje");
  });

  it("žádná zpráva se nevejde mimo jednu zprávu Telegramu", () => {
    // Kanál je upozornění, ne archiv. Dělení na díly „pokračování“ u běžného
    // záznamu znamenalo, že je zpráva moc dlouhá.
    const dlouhy = zaznam({
      fakta: Array.from({ length: 12 }, (_, n) => `Fakt číslo ${n} s poměrně dlouhým popisem události.`),
      neznameho: Array.from({ length: 6 }, (_, n) => `Nevíme ${n}.`),
      zdroje: Array.from({ length: 10 }, (_, n) => zdroj({ nazev: `Zdroj ${n}`, url: `https://z.example/${n}` })),
    });
    expect(sestavZpravu(dlouhy).length).toBeLessThan(1500);
    expect(rozdelZpravu(sestavZpravu(dlouhy))).toHaveLength(1);
  });

  it("zpráva nese poměr zdrojů, ne jejich výpis — výpis je na webu", () => {
    const i = zaznam({ zdroje: [
      zdroj({ nazev: "Tagesschau", typ: "media", jazyk: "de", url: "https://ts.de/a" }),
      zdroj({ nazev: "Policie ČR", typ: "primary", primarni: true, url: "https://policie.cz/b" }),
      zdroj({ nazev: "Reuters", typ: "wire", jazyk: "en", url: "https://reuters.com/c" }),
    ] });
    const z = sestavZpravu(i);
    expect(z).toContain("Zdroje: 3 (úřady 1 · agentury 1 · média 1)");
    expect(z).not.toContain("Policie ČR");
    expect(z).not.toContain("Úřady a primární zdroje");
  });

  it("úplný výpis zdrojů po skupinách zůstává dostupný mimo kanál", () => {
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
  });

  it("bez úředního zdroje to zpráva přizná, ale mluví jen o svých odkazech", () => {
    const vKanalu = sestavZpravu(zaznam({ zdroje: [zdroj({ nazev: "Deník" })] }));
    expect(vKanalu).toContain("Zdroje: 1 (úřady 0 · média 1)");
    expect(vKanalu).toContain("Mezi zdroji není přímý odkaz na úřední oznámení");
    const bezUradu = sestavZdroje(zaznam({ zdroje: [zdroj({ nazev: "Deník" })] })).join("\n");
    expect(bezUradu).toContain("Zdroje (1): úřady 0 · média 1");
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

describe("číselníky v rozhlasu se nesmí rozejít s daty", () => {
  it("každý původce použitý v datech má v kanálu svůj název", () => {
    // Skript je prostý .mjs a nese kopii číselníku. Když se na webu přidá
    // hodnota a tady ne, projde do kanálu „Pachatel: undefined“ — což se
    // jednou stalo u nestátní skupiny.
    const data = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "incidenty.json"), "utf-8"),
    ) as { puvodce?: string | null }[];
    const pouzite = new Set(data.map((i) => i.puvodce).filter((p): p is string => Boolean(p)));
    for (const p of pouzite) {
      expect(Object.keys(PUVODCI), `původce „${p}“ nemá v rozhlasu název`).toContain(p);
    }
  });

  it("žádná sestavená zpráva neobsahuje undefined ani null", () => {
    const data = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "incidenty.json"), "utf-8"),
    ) as Parameters<typeof sestavZpravu>[0][];
    for (const i of data) {
      const z = sestavZpravu(i);
      expect(z, `záznam ${(i as { slug: string }).slug}`).not.toContain("undefined");
      expect(z).not.toContain("null");
    }
  });
});

/*
  „Kde se to stalo“ versus „týká se to nás“.

  Tohle byly dřív jedno a totéž a zpráva o ruském dronu, který zasáhl vlak na
  Ukrajině, tvrdila odběratelům „Záznam se týká území České republiky“ — jen
  proto, že měl oblast „cr“ kvůli českému politikovi ve vlaku. Nepravda
  v kanálu je to nejhorší, co tenhle projekt může vypustit.
*/
describe("místo události se nesmí plést s významem pro Česko", () => {
  const zaklad = {
    id: "i-test", slug: "test", titulek: "Zkouška", kratkyTitulek: "Zkouška",
    datumUdalosti: "2026-09-13T00:00:00Z", datumZjisteni: "2026-09-13T00:00:00Z",
    aktualizovano: "2026-09-14T00:00:00Z", zavaznost: "O1", jistota: "vysoka",
    stav: "probiha", atribuce: "vysetrovana", puvodce: "rusko", druh: "pripad",
    fakta: ["Něco se stalo."], neznameho: [], vyznam: "", zdroje: [],
  };

  it("událost mimo ČR netvrdí, že se stala u nás — ani když je vedená jako významná pro Česko", () => {
    const z = sestavZpravu({ ...zaklad, zeme: "Ukrajina", kodZeme: "UA", kategorie: ["drony", "cr"] }, {});
    expect(z).not.toContain("týká území České republiky");
    expect(z).toContain("nikoli v České republice");
    // Vazba na Česko se přitom nesmí ztratit.
    expect(z).toContain("Pro Česko je podstatná");
  });

  it("událost v ČR se pozná podle země, ne podle oblasti", () => {
    const z = sestavZpravu({ ...zaklad, zeme: "Česko", kodZeme: "CZ", kategorie: ["sabotaz"] }, {});
    expect(z).toContain("týká území České republiky");
  });
});

describe("skokový pohyb ceny paliv", () => {
  const zprava = {
    tyden: "2026-W37",
    text: [
      "Skokový pohyb ceny pohonných hmot",
      "",
      "Nafta 38,79 Kč/l · za týden +2,10 Kč · nejvýš za 14 měsíců.",
      "",
      "Průměrné spotřebitelské ceny za týden do 7. 9. 2026 podle týdenního šetření Českého statistického úřadu.",
      "Je to změřený údaj za uplynulý týden, ne předpověď. Kam ceny půjdou dál, nevíme a netvrdíme to.",
    ].join("\n"),
  };

  it("zpráva nese změřená čísla a odkaz na web", () => {
    const z = sestavPalivo(zprava);
    expect(z).toContain("Nafta 38,79 Kč/l");
    expect(z).toContain("za týden +2,10 Kč");
    expect(z).toContain("czechpatrol");
  });

  it("zpráva nikdy neradí natankovat ani nevěští", () => {
    /*
      Tohle je ten nejdůležitější test v souboru. Zpráva jde tisícům lidí
      najednou; věta „bude dráž, natankujte" by z kanálu udělala spouštěč
      nájezdu na čerpací stanice. Doložit ji navíc nemáme čím.
    */
    const z = sestavPalivo(zprava);
    expect(z).not.toMatch(/natankuj|předzásob|zásobte|bude dráž|poroste|zdraží|očekáv|dokud je čas/i);
    // Slovo „předpověď" smí padnout jedině v popření; tvrdit se nesmí nikdy.
    expect(z).not.toMatch(/(?<!ne )předpověď|předpovídáme/i);
    expect(z).toContain("ne předpověď");
  });

  it("bez naměřeného skoku se neposílá nic", () => {
    expect(vyberPalivo(null, { palivo: {} })).toBeNull();
    expect(vyberPalivo({ zprava: null }, { palivo: {} })).toBeNull();
    expect(vyberPalivo({ zprava: { tyden: "", text: "" } }, { palivo: {} })).toBeNull();
  });

  it("týž týden neodejde dvakrát", () => {
    const stav = { palivo: { "2026-W37": { kdy: "2026-09-08T00:00:00Z" } } };
    expect(vyberPalivo({ zprava }, stav)).toBeNull();
    expect(vyberPalivo({ zprava }, { palivo: {} })).toEqual(zprava);
  });
});

describe("slovníky se nesmějí rozejít", () => {
  it("původci v rozhlasu odpovídají webu", () => {
    // rozhlas.mjs je prostý ES modul bez typů a číselník má vlastní kopii.
    // Kdyby se rozešly, kanál by psal o jiném původci než web.
    expect(PUVODCI).toEqual(PUVODCI_WEB);
  });
});

describe("stará událost se nesmí tvářit jako nová", () => {
  const stary = {
    id: "i-archiv", slug: "archiv", titulek: "Sabotáž z roku 2024", kratkyTitulek: "Sabotáž 2024",
    zeme: "Polsko", kodZeme: "PL", kategorie: ["sabotaz"],
    datumUdalosti: "2024-05-10T00:00:00Z",
    // Do přehledu ho doplňujeme teprve teď — datum zjištění je dnešní.
    datumZjisteni: "2026-09-15T00:00:00Z", aktualizovano: "2026-09-15T00:00:00Z",
    zavaznost: "O2", jistota: "vysoka", stav: "uzavreno", atribuce: "oficialni",
    puvodce: "rusko", druh: "pripad", fakta: ["Něco se stalo."], neznameho: [], vyznam: "", zdroje: [],
    historie: [],
  };
  const ted = Date.parse("2026-09-15T12:00:00Z");

  it("pozná archivní záznam podle data události, ne podle data zápisu", () => {
    expect(jeArchivni(stary, ted)).toBe(true);
    expect(jeArchivni({ ...stary, datumUdalosti: "2026-09-14T00:00:00Z" }, ted)).toBe(false);
  });

  it("zpráva nese obě data, když se liší", () => {
    const z = sestavZpravu(stary, {});
    expect(z).toContain("stalo se");
    expect(z).toContain("vyšlo najevo");
    expect(z).toContain("10. 5. 2024");
  });

  it("zpráva o archivu to říká hned, ne až v odkazu", () => {
    /*
      Bez tohohle by „závažnost 8 z 10" u dvouleté události vypadala jako
      hrozba, která probíhá právě teď. Přesně to vyvolá paniku.
    */
    const z = sestavZpravu(stary, {});
    expect(z).toContain("ARCHIV");
    expect(z).toContain("neděje se teď");
  });

  it("čerstvá událost žádné archivní označení nedostane", () => {
    const novy = { ...stary, datumUdalosti: "2026-09-14T00:00:00Z", datumZjisteni: "2026-09-15T00:00:00Z" };
    const z = sestavZpravu(novy, {});
    expect(z).not.toContain("ARCHIV");
    expect(z).not.toContain("vyšlo najevo");
  });

  it("archivní záznam se do kanálu neposílá, jen se zapamatuje", () => {
    const stav = { zaznamy: {}, snimky: {}, palivo: {}, prvniBeh: "2026-09-01T00:00:00Z" };
    const vybrane = vyberNove([{ ...stary, lidskyOvereno: true }], stav, { rezim: "okamzite", ted });
    expect(vybrane).toHaveLength(0);
    expect(stav.zaznamy["i-archiv"]?.ticho).toBe(true);
  });

  it("nové zjištění ke starému případu novinka je", () => {
    // Úřední atribuce po dvou letech je aktuální zpráva, i když událost je stará.
    const stav = {
      zaznamy: { "i-archiv": { kdy: "2026-09-01T00:00:00Z", historie: 0 } },
      snimky: {}, palivo: {}, prvniBeh: "2026-09-01T00:00:00Z",
    };
    const sNovym = { ...stary, lidskyOvereno: true, historie: [{ kdy: "2026-09-15T00:00:00Z", text: "Obžaloba podána.", novySignal: true }] };
    const vybrane = vyberNove([sNovym], stav, { rezim: "okamzite", ted });
    expect(vybrane).toHaveLength(1);
    expect(vybrane[0].aktualizace).toBe(true);
  });
});

describe("mimořádná výstraha v kanálu", () => {
  const V = {
    klic: "v-2026-09-15",
    nadpis: "Rusko vyhlásilo mobilizaci",
    text: "Co se ví, ve dvou větách.",
    kdy: "2026-09-15T08:00:00Z",
    overeno: "2026-09-15T09:00:00Z",
    overil: "jméno",
    zdroje: [
      { nazev: "Zdroj A", url: "https://a.example/1" },
      { nazev: "Zdroj B", url: "https://b.example/2" },
    ],
    coToZnamena: ["Něco doložitelného."],
    coToNeznamena: ["Něco, co z toho neplyne."],
  };

  it("zpráva nese i to, co z výstrahy NEPLYNE", () => {
    /*
      Do Telegramu chodí lidé s telefonem v ruce a přeposílají první odstavec.
      Kdyby v něm stálo jen „Rusko vyhlásilo mobilizaci“, šířilo by se dál
      jenom to.
    */
    const z = sestavVystrahu(V);
    expect(z).toContain("MIMOŘÁDNÁ VÝSTRAHA");
    expect(z).toContain("Co to neznamená");
    expect(z).toContain("Něco, co z toho neplyne.");
  });

  it("nese obě adresy zdrojů a podpis toho, kdo ověřil", () => {
    const z = sestavVystrahu(V);
    expect(z).toContain("https://a.example/1");
    expect(z).toContain("https://b.example/2");
    expect(z).toContain("jméno");
  });

  it("táž výstraha se neodešle dvakrát", () => {
    // Klíčem je klic, ne text — oprava překlepu nesmí být nový poplach.
    expect(vyberVystrahu(V, { vystrahy: {} })?.klic).toBe("v-2026-09-15");
    expect(vyberVystrahu(V, { vystrahy: { "v-2026-09-15": { kdy: "…" } } })).toBeNull();
  });

  it("bez výstrahy se neposílá nic", () => {
    expect(vyberVystrahu(null, { vystrahy: {} })).toBeNull();
  });
});

describe("neověřené signály do kanálu", () => {
  const signal = (id: string, stupen: 1 | 2, kdy = new Date().toISOString()) => ({
    id,
    titulek: "Rusko vyhlásilo všeobecnou mobilizaci",
    shrnuti: "Oznámil to Kreml.",
    zeme: "Rusko",
    zdroj: { nazev: "iROZHLAS", url: "https://www.irozhlas.cz/x" },
    naliehave: { druh: "mobilizace-rusko", stupen, proc: "vyhlasil+mobilizac" },
    publikovano: kdy,
    zachyceno: kdy,
  });

  it("zpráva začíná tím, že jde o NEOVĚŘENÝ signál", () => {
    /*
      Tohle je jediné místo, kde do kanálu jde nepotvrzená zpráva. Kdyby to
      z ní nebylo poznat hned v prvním řádku, přeposílala by se dál jako fakt
      — a přesně takové případy tenhle web dokumentuje u jiných.
    */
    const z = sestavSignal(signal("k-1", 1));
    expect(z.startsWith("⚠️ <b>NEOVĚŘENO")).toBe(true);
    expect(z).toContain("Neověřil to zatím člověk");
    expect(z).toContain("https://www.irozhlas.cz/x");
  });

  it("posílá se jen stupeň 1", () => {
    // Přípravy mobilizace a drony nad Aliancí se dějí opakovaně; v kanálu by z nich byl šum.
    expect(vyberSignaly([signal("k-1", 1)], { signaly: {} })).toHaveLength(1);
    expect(vyberSignaly([signal("k-2", 2)], { signaly: {} })).toHaveLength(0);
  });

  it("týž kandidát se neposílá dvakrát", () => {
    expect(vyberSignaly([signal("k-1", 1)], { signaly: { "k-1": { kdy: "…" } } })).toHaveLength(0);
  });

  it("starý signál se neposílá", () => {
    // Kandidát může doputovat se zpožděním; rozeslat ho jako naléhavý by bylo horší než mlčet.
    const stary = signal("k-3", 1, "2026-09-01T00:00:00Z");
    expect(vyberSignaly([stary], { signaly: {} }, { ted: new Date("2026-09-15T12:00:00Z").getTime() })).toHaveLength(0);
  });

  it("víc než dva signály za běh neodejde", () => {
    const hodne = [1, 2, 3, 4, 5].map((i) => signal(`k-${i}`, 1));
    expect(vyberSignaly(hodne, { signaly: {} }).length).toBeLessThanOrEqual(2);
  });
});

describe("denní přehled zachyceného", () => {
  /*
    Kanál dosud mlčel vždy, když pár dní nikdo nic nezveřejnil — přestože sběr
    mezitím zachytil desítky zpráv. Zvenčí to vypadá jako klid, a to je to
    poslední, co má bezpečnostní přehled předstírat.
  */
  const ted = new Date("2026-09-15T20:00:00Z").getTime();
  const kandidat = (id: string, hodinZpet: number) => ({
    id,
    titulek: `Zpráva ${id}`,
    zeme: "Nizozemsko",
    zdroj: { nazev: "zdroj", url: `https://e.example/${id}` },
    publikovano: new Date(ted - hodinZpet * 3_600_000).toISOString(),
    zachyceno: new Date(ted - hodinZpet * 3_600_000).toISOString(),
  });

  it("bere jen zprávy za posledních 24 hodin a nejvýš pět", () => {
    const vstup = [1, 2, 3, 4, 5, 6, 7].map((i) => kandidat(`n${i}`, i)).concat(kandidat("stara", 40));
    const v = vyberDoPrehledu(vstup, { ted });
    expect(v).toHaveLength(5);
    expect(v.some((k: { id: string }) => k.id === "stara")).toBe(false);
  });

  it("přehled hned v úvodu říká, že to nikdo neověřil", () => {
    const z = sestavPrehledZachycenych([kandidat("a", 2)], { ted });
    expect(z).toContain("Co zachytil sběr");
    expect(z).toContain("Nic z toho zatím neověřil člověk");
    expect(z).toContain("https://e.example/a");
  });
});

describe("původce se nepřipisuje dřív, než je doložený", () => {
  /*
    Ve zprávě stálo „Jistota: vysoká · Pachatel: Rusko (nepotvrzeno)". Čtenář
    to přečte jako jednu větu a vyjde mu „s vysokou jistotou to udělalo Rusko".
    Ta jistota se přitom týká jen toho, že se událost stala.

    U čerstvého případu je to nejcitlivější místo: viníka lze ukázat hned,
    doložit až za měsíce — a tenhle web sám dokumentuje případy, kdy se rychlé
    připsání ukázalo jako mylné.
  */
  const zaznam = (atribuce: string) => ({
    id: "x", slug: "moldavsko-dron",
    titulek: "Moldavsko: dron uzavřel vzdušný prostor",
    kratkyTitulek: "Moldavsko: dron uzavřel vzdušný prostor",
    zeme: "Moldavsko", kodZeme: "MD", zavaznost: "O1", jistota: "vysoka",
    puvodce: "rusko", atribuce, stav: "probiha",
    datumUdalosti: "2026-09-09", datumZjisteni: "2026-09-09", druh: "pripad",
    fakta: ["Úlomky odpovídají typu Geran."], neznameho: ["Kdo dron vypustil."],
    zdroje: [{ typ: "media", url: "https://a" }, { typ: "media", url: "https://b" }],
    aktualizovano: "2026-09-15",
  });

  it("bez úředního závěru se Rusko neuvádí jako původce", () => {
    const z = sestavZpravu(zaznam("vysetrovana"));
    expect(z).toContain("<b>Původce: zatím neurčen.</b>");
    expect(z).toContain("Média a komentáře uvádějí Rusko");
    expect(z).toContain("úřední potvrzení k tomu není");
    // Tohle je ta věta, která tam nesmí být.
    expect(z).not.toContain("Původce: Rusko");
  });

  it("s úředním závěrem se původce uvede i s tím, že je potvrzený", () => {
    const z = sestavZpravu(zaznam("oficialni"));
    expect(z).toContain("<b>Původce:</b> Rusko — potvrzeno úředním závěrem");
  });

  it("jistota se do kanálu nepíše vůbec", () => {
    /*
      Do kanálu jde jen to, co prošlo lidským ověřením. Věta „střední jistota,
      že se to stalo" u takové zprávy čtenáře mate — zní, jako bychom si
      nebyli jistí, jestli publikujeme skutečnost. Na webu u záznamu jistota
      zůstává, tam ji lze číst vedle fakt a zdrojů.

      Co platit nepřestává: jistota a původce se nesmějí slít do jedné věty.
      Proto se hlídá, že o původci se pořád mluví odděleně a opatrně.
    */
    const z = sestavZpravu(zaznam("vysetrovana"));
    expect(z).not.toContain("Jistota");
    expect(z).toContain("<b>Původce: zatím neurčen.</b>");
  });

  it("země se popisuje jednotně, i když chybí ve slovníku tvarů", () => {
    const z = sestavZpravu({ ...zaznam("vysetrovana"), kodZeme: "ZZ", zeme: "Vymyšlensko" });
    expect(z).toContain("Událost nastala v zemi Vymyšlensko, nikoli v České republice.");
  });
});

/*
  Vážné případy doložené i úředním zdrojem.

  Jediná cesta, kterou se do kanálu dostane něco neschváleného kromě
  naléhavých signálů. U takhle doložené zprávy je čekání na schválení dražší
  než ta nejistota — schválením se obvykle nezmění, jen se zdrží.

  Podmínky jsou proto úzké a tenhle test je hlídá. Kdyby se rozvolnily,
  začalo by do kanálu chodit neschválené běžné zpravodajství a z projektu by
  byl agregátor titulků.
*/
describe("vážné případy z úředního zdroje", () => {
  const ted = new Date("2026-09-19T12:00:00Z").getTime();
  const navrh = (zmeny: Record<string, unknown>) => ({
    id: "n1",
    kam: "zaznam",
    zavaznost: "O2",
    titulek: "Případ",
    datumUdalosti: new Date(ted - 3_600_000).toISOString(),
    zdroje: [
      { nazev: "Policie ČR", url: "https://policie.cz/a", primarni: true },
      { nazev: "ČTK", url: "https://ctk.cz/b", primarni: false },
    ],
    ...zmeny,
  });

  it("projde jen vážný případ se dvěma zdroji, z nichž jeden je úřední", () => {
    expect(vyberVazneNavrhy([navrh({})], { signaly: {} }, { ted })).toHaveLength(1);
  });

  it("mírnější závažnost neprojde", () => {
    for (const z of ["G1", "Y3"]) {
      expect(vyberVazneNavrhy([navrh({ zavaznost: z })], { signaly: {} }, { ted }), z).toHaveLength(0);
    }
  });

  it("bez úředního zdroje neprojde ani vážný případ", () => {
    const bezUradu = navrh({
      zdroje: [
        { nazev: "Médium A", url: "https://a", primarni: false },
        { nazev: "Médium B", url: "https://b", primarni: false },
      ],
    });
    expect(vyberVazneNavrhy([bezUradu], { signaly: {} }, { ted })).toHaveLength(0);
  });

  it("jediný zdroj neprojde, i když je úřední", () => {
    const jeden = navrh({ zdroje: [{ nazev: "Policie ČR", url: "https://a", primarni: true }] });
    expect(vyberVazneNavrhy([jeden], { signaly: {} }, { ted })).toHaveLength(0);
  });

  it("stará událost neprojde — varování se nedává zpětně", () => {
    const stara = navrh({ datumUdalosti: new Date(ted - 5 * 86_400_000).toISOString() });
    expect(vyberVazneNavrhy([stara], { signaly: {} }, { ted })).toHaveLength(0);
  });

  it("co už odešlo, neodejde podruhé", () => {
    const stav = { signaly: { n1: { kdy: "kdykoli" } } };
    expect(vyberVazneNavrhy([navrh({})], stav, { ted })).toHaveLength(0);
  });

  it("zpráva říká, že to ještě neprošlo člověkem", () => {
    /* Bez téhle věty by se dala číst jako zveřejněný záznam. */
    const z = sestavVaznyNavrh(navrh({}));
    expect(z).toContain("NEOVĚŘENO");
    expect(z).toContain("Záznam ještě neprošel lidskou kontrolou.");
  });
});
