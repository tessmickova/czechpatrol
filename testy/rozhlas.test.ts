// @ts-nocheck — skript je prostý ES modul bez typů; test hlídá chování, typy hlídá běh.
import { describe, expect, it } from "vitest";
import { sestavZmenuStavu, sestavZpravu, vyberNove, vyberZmenyStavu } from "../nastroje/rozhlas.mjs";

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
});
