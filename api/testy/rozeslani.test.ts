import { describe, expect, it } from "vitest";
import { rozesli } from "../src/rozeslani";
import type { Env, NovaZprava } from "../src/typy";

/*
  Opakované doručení. Napodobenina D1 dodržuje stejná pravidla jako schéma:
  zpravy(id) je primární klíč, fronta má jedinečný index
  (zprava_id, ucet_id, druh). Test ověřuje, že dvojí rozeslání téže zprávy
  nevyrobí druhou položku fronty.
*/

function falesnaDb(ucty: { id: string; nastaveni: string; druh: string }[]) {
  const zpravy = new Set<string>();
  const fronta = new Set<string>();
  const stmt = (sql: string) => {
    let args: unknown[] = [];
    const s = {
      bind: (...a: unknown[]) => { args = a; return s; },
      run: async () => {
        if (sql.startsWith("INSERT OR IGNORE INTO zpravy")) zpravy.add(String(args[0]));
        else if (sql.startsWith("INSERT OR IGNORE INTO fronta")) fronta.add(`${args[0]}|${args[1]}|${args[2]}`);
        else if (sql.startsWith("INSERT INTO fronta")) {
          const k = `${args[0]}|${args[1]}|${args[2]}`;
          if (fronta.has(k)) throw new Error("UNIQUE constraint failed: fronta.zprava_id, fronta.ucet_id, fronta.druh");
          fronta.add(k);
        }
        return { success: true };
      },
      all: async () => ({ results: sql.includes("FROM ucty") ? ucty : [] }),
    };
    return s;
  };
  const db = {
    prepare: stmt,
    batch: async (davka: { run: () => Promise<unknown> }[]) => { for (const d of davka) await d.run(); return []; },
  };
  return { db: db as unknown as D1Database, zpravy, fronta };
}

const zprava: NovaZprava = { druh: "udalost", zavaznost: "vysoka", oblast: null, kategorie: ["kyber"], titulek: "Test", text: "Text", odkaz: null };

describe("rozeslání", () => {
  it("stejná zpráva dvakrát = jedna položka fronty na čtenáře a kanál", async () => {
    const { db, fronta } = falesnaDb([
      { id: "u1", nastaveni: JSON.stringify({ frekvence: "ihned", minZavaznost: "stredni", ticho: null, oblasti: [], zpravyIzs: true, kraj: null }), druh: "telegram" },
      { id: "u1", nastaveni: JSON.stringify({ frekvence: "ihned", minZavaznost: "stredni", ticho: null, oblasti: [], zpravyIzs: true, kraj: null }), druh: "email" },
    ]);
    const env = { DB: db } as unknown as Env;
    const a = await rozesli(env, zprava, "z-1");
    const b = await rozesli(env, zprava, "z-1");
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(fronta.size).toBe(2);
  });
});
