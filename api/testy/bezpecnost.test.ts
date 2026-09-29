import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { omez } from "../src/limit";
import { MAX_TELA, telo, ChybaHttp } from "../src/pomocne";
import { ROLE_S_OBNOVOU } from "../src/auth";

/*
  Bezpečnostní opravy API (29. 9. 2026). Brzda se testuje nad skutečným
  SQLite (node:sqlite), ne nad napodobeninou — jde právě o to, co udělá
  databáze se souběžnými zápisy.
*/
function d1(sql: DatabaseSync) {
  return {
    prepare(q: string) {
      let args: unknown[] = [];
      const st = {
        bind(...a: unknown[]) { args = a; return st; },
        async first<T>() { return (sql.prepare(q).get(...(args as never[])) ?? null) as T | null; },
        async run() { sql.prepare(q).run(...(args as never[])); return { success: true }; },
        async all<T>() { return { results: sql.prepare(q).all(...(args as never[])) as T[] }; },
      };
      return st;
    },
  };
}
const pozadavek = () => new Request("https://api.test/x", { headers: { "cf-connecting-ip": "203.0.113.7" } });

describe("brzda počtu pokusů", () => {
  it("pustí právě max pokusů, i když přijdou naráz", async () => {
    const sql = new DatabaseSync(":memory:");
    sql.exec("CREATE TABLE limity (klic TEXT PRIMARY KEY, pocet INTEGER NOT NULL, okno_do TEXT NOT NULL)");
    const env = { DB: d1(sql) } as never;
    const vysledky = await Promise.allSettled(Array.from({ length: 12 }, () => omez(env, pozadavek(), "test", 5)));
    expect(vysledky.filter((v) => v.status === "fulfilled")).toHaveLength(5);
    expect(vysledky.filter((v) => v.status === "rejected")).toHaveLength(7);
  });
  it("po uplynutí okna počítá znovu od jedné", async () => {
    const sql = new DatabaseSync(":memory:");
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
