import { describe, expect, it } from "vitest";
import { prijmi as prijmiZajem } from "../src/zajem";
import { prijmi as prijmiTip } from "../src/tipy";
import type { Env } from "../src/typy";

// Falešná D1: jen zaznamená, co by se zapsalo.
function falesnaDb() {
  const zapisy: unknown[][] = [];
  const db = {
    prepare: () => ({
      bind: (...h: unknown[]) => ({ run: async () => { zapisy.push(h); return {}; }, first: async () => null }),
      first: async () => null,
    }),
  };
  return { db, zapisy };
}
const pozadavek = (telo: unknown) =>
  new Request("https://api.test/x", { method: "POST", body: JSON.stringify(telo), headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" } });

describe("osobní údaje bez provozovatele", () => {
  it("zájem o e-maily server odmítne", async () => {
    const { db, zapisy } = falesnaDb();
    const env = { DB: db } as unknown as Env;
    await expect(prijmiZajem(env, pozadavek({ email: "a@b.cz", souhlas: true, zajmy: ["x"] }))).rejects.toMatchObject({ stav: 503 });
    // Zapíše se jen brzda (otisk IP), žádný e-mail.
    expect(zapisy.flat()).not.toContain("a@b.cz");
  });

  it("tip přijme, ale kontakt k němu zahodí", async () => {
    const { db, zapisy } = falesnaDb();
    const env = { DB: db } as unknown as Env;
    const r = await prijmiTip(env, pozadavek({ popis: "Chybí tu událost z Brna, dron nad letištěm.", jmeno: "Jana", email: "j@x.cz", telefon: "123" }));
    expect(r.status).toBe(201);
    const radek = zapisy.find((h) => h.length === 7)!;
    expect(radek.slice(4)).toEqual([null, null, null]);
  });
});
