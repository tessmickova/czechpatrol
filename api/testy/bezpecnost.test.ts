import { describe, expect, it } from "vitest";
import { omez } from "../src/limit";
import { MAX_TELA, telo, ChybaHttp } from "../src/pomocne";
import { ROLE_S_OBNOVOU } from "../src/auth";

/*
  Bezpečnostní opravy API (29. 9. 2026). Brzda se testuje nad skutečným
  SQLite (node:sqlite), ne nad napodobeninou — jde právě o to, co udělá
  databáze se souběžnými zápisy.
*/
/*
  node:sqlite se načítá za běhu: API se typově kontroluje s typy Workeru,
  ne Node (29. 9. 2026 kvůli tomu spadlo nasazení API). Stačí mu úzké rozhraní.
*/
interface Prikaz { get(...a: unknown[]): unknown; run(...a: unknown[]): unknown; all(...a: unknown[]): unknown[] }
interface Sqlite { exec(q: string): void; prepare(q: string): Prikaz }
const novaDb = async (): Promise<Sqlite> => {
  const modul = (await import(/* @vite-ignore */ ["node", "sqlite"].join(":"))) as { DatabaseSync: new (f: string) => Sqlite };
  return new modul.DatabaseSync(":memory:");
};

function d1(sql: Sqlite) {
  return {
    prepare(q: string) {
      let args: unknown[] = [];
      const st = {
        bind(...a: unknown[]) { args = a; return st; },
        async first<T>() { return (sql.prepare(q).get(...args) ?? null) as T | null; },
        async run() { sql.prepare(q).run(...args); return { success: true }; },
        async all<T>() { return { results: sql.prepare(q).all(...args) as T[] }; },
      };
      return st;
    },
  };
}
const pozadavek = () => new Request("https://api.test/x", { headers: { "cf-connecting-ip": "203.0.113.7" } });

describe("brzda počtu pokusů", () => {
  it("pustí právě max pokusů, i když přijdou naráz", async () => {
    const sql = await novaDb();
    sql.exec("CREATE TABLE limity (klic TEXT PRIMARY KEY, pocet INTEGER NOT NULL, okno_do TEXT NOT NULL)");
    const env = { DB: d1(sql) } as never;
    const vysledky = await Promise.allSettled(Array.from({ length: 12 }, () => omez(env, pozadavek(), "test", 5)));
    expect(vysledky.filter((v) => v.status === "fulfilled")).toHaveLength(5);
    expect(vysledky.filter((v) => v.status === "rejected")).toHaveLength(7);
  });
  it("po uplynutí okna počítá znovu od jedné", async () => {
    const sql = await novaDb();
    sql.exec("CREATE TABLE limity (klic TEXT PRIMARY KEY, pocet INTEGER NOT NULL, okno_do TEXT NOT NULL)");
    const env = { DB: d1(sql) } as never;
    for (let i = 0; i < 5; i++) await omez(env, pozadavek(), "t", 5);
    await expect(omez(env, pozadavek(), "t", 5)).rejects.toBeInstanceOf(ChybaHttp);
    sql.exec("UPDATE limity SET okno_do = '2000-01-01T00:00:00.000Z'");
    await expect(omez(env, pozadavek(), "t", 5)).resolves.toBeUndefined();
  });
});

describe("strop těla požadavku", () => {
  it("odmítne tělo nad strop, i bez Content-Length", async () => {
    const velke = JSON.stringify({ x: "a".repeat(MAX_TELA + 10) });
    await expect(telo(new Request("https://api.test/x", { method: "POST", body: velke }))).rejects.toMatchObject({ stav: 413 });
    await expect(telo(new Request("https://api.test/x", { method: "POST", body: "{}", headers: { "content-length": String(MAX_TELA + 1) } }))).rejects.toMatchObject({ stav: 413 });
  });
  it("běžné tělo projde", async () => {
    await expect(telo<{ a: number }>(new Request("https://api.test/x", { method: "POST", body: '{"a":1}' }))).resolves.toEqual({ a: 1 });
  });
});

describe("obnova kódem", () => {
  it("správce a IZS se kódem obnovit nedají", () => {
    expect(ROLE_S_OBNOVOU).not.toContain("admin");
    expect(ROLE_S_OBNOVOU).not.toContain("izs");
  });
});

describe("konfigurace workeru", () => {
  it("routes a další hlavní klíče stojí před první [tabulkou]", async () => {
    /*
      30. 9. 2026: `routes` zapsané pod `[observability]` patřilo v TOML do té
      tabulky; Wrangler to vzal jen jako varování a nasazení API spadlo.
    */
    const { readFileSync } = await import(/* @vite-ignore */ ["node", "fs"].join(":")) as { readFileSync: (p: string, k: string) => string };
    const radky = readFileSync("wrangler.toml", "utf-8").split("\n");
    const prvniTabulka = radky.findIndex((r) => /^\[/.test(r));
    for (const klic of ["name", "main", "routes", "compatibility_date"]) {
      const i = radky.findIndex((r) => r.startsWith(`${klic} =`));
      expect(i, klic).toBeGreaterThanOrEqual(0);
      expect(i, `${klic} musí být před první tabulkou`).toBeLessThan(prvniTabulka);
    }
  });
});
