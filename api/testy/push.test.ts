import { describe, expect, it } from "vitest";
import { cestaOdkazu, normalizujDruhy, podpisRozhlasu, podpisVapid, povolenaAdresa, zasifrujZpravu } from "../src/push";
import { b64u, zB64u } from "../src/pomocne";

/*
  Upozornění do telefonu (29. 9. 2026). Šifrování se ověřuje proti
  příkladu přímo ze standardu (RFC 8291, příloha A): když sedí bajt po
  bajtu, zprávu přečte každý prohlížeč.
*/
const RFC = {
  obsah: "When I grow up, I want to be a watermelon",
  asSoukromy: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asVerejny: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  uaVerejny: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  sul: "DGv6ra1nlYgDCS1FRnbzlw",
  vysledek:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

describe("šifrování zprávy (RFC 8291)", () => {
  it("dá přesně výsledek z přílohy A standardu", async () => {
    const pub = zB64u(RFC.asVerejny);
    const soukromy = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", d: RFC.asSoukromy, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)) },
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"],
    );
    const vystup = await zasifrujZpravu(new TextEncoder().encode(RFC.obsah), RFC.uaVerejny, RFC.auth, { verejny: pub, soukromy }, zB64u(RFC.sul));
    expect(b64u(vystup)).toBe(RFC.vysledek);
  });
});

describe("podpis doručení (RFC 8292)", () => {
  it("je platné ES256 nad hlavičkou a nároky", async () => {
    const par = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const jwt = await podpisVapid("https://fcm.googleapis.com", "https://czechpatrol.cz", par.privateKey, 1_700_000_000_000);
    const [h, n, p] = jwt.split(".");
    expect(JSON.parse(new TextDecoder().decode(zB64u(n)))).toEqual({ aud: "https://fcm.googleapis.com", exp: 1_700_000_000 + 12 * 3600, sub: "https://czechpatrol.cz" });
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, par.publicKey, zB64u(p), new TextEncoder().encode(`${h}.${n}`));
    expect(ok).toBe(true);
  });
});

describe("kam smí server posílat", () => {
  it("jen na služby prohlížečů přes https", () => {
    expect(povolenaAdresa("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(povolenaAdresa("https://web.push.apple.com/QGx")).toBe(true);
    expect(povolenaAdresa("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(povolenaAdresa("https://wns2-am3p.notify.windows.com/w/?token=x")).toBe(true);
    expect(povolenaAdresa("http://fcm.googleapis.com/x")).toBe(false);
    expect(povolenaAdresa("https://fcm.googleapis.com.zlo.example/x")).toBe(false);
    expect(povolenaAdresa("https://zlo.example/fcm.googleapis.com")).toBe(false);
    expect(povolenaAdresa("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(povolenaAdresa("https://u:p@fcm.googleapis.com/x")).toBe(false);
    expect(povolenaAdresa(42)).toBe(false);
  });
  it("odkaz v upozornění vede jen na náš web", () => {
    const env = { PUVOD_WEBU: "https://czechpatrol.cz" } as never;
    expect(cestaOdkazu(env, "https://czechpatrol.cz/incident/x/")).toBe("/incident/x/");
    expect(cestaOdkazu(env, "/udalosti/")).toBe("/udalosti/");
    expect(cestaOdkazu(env, "//zlo.example/")).toBe("/");
    expect(cestaOdkazu(env, "https://zlo.example/")).toBe("/");
    expect(cestaOdkazu(env, "javascript:alert(1)")).toBe("/");
  });
  it("druhy jen z pevného seznamu", () => {
    expect(normalizujDruhy(["tipy", "hned", "x", "hned"])).toEqual(["hned", "tipy"]);
    expect(normalizujDruhy("hned")).toEqual([]);
  });
});

describe("podpis rozhlasu", () => {
  it("shoduje se s tím, co počítá rozhlas v Node", async () => {
    const { createHash, createHmac } = await import(/* @vite-ignore */ ["node", "crypto"].join(":")) as {
      createHash: (a: string) => { update(s: string): { digest(): Uint8Array } };
      createHmac: (a: string, k: Uint8Array) => { update(s: string): { digest(e: string): string } };
    };
    const klic = createHash("sha256").update("czechpatrol-push-v1:tajny-token").digest();
    const ocekavany = createHmac("sha256", klic).update('1790000000.{"a":1}').digest("hex");
    expect(await podpisRozhlasu("tajny-token", "1790000000", '{"a":1}')).toBe(ocekavany);
  });
});

/* Celé rozeslání nad skutečným SQLite a s podvrženou službou prohlížeče. */
interface Prikaz { get(...a: unknown[]): unknown; run(...a: unknown[]): { changes: number | bigint }; all(...a: unknown[]): unknown[] }
interface Sqlite { exec(q: string): void; prepare(q: string): Prikaz }
async function prostredi() {
  const modul = (await import(/* @vite-ignore */ ["node", "sqlite"].join(":"))) as { DatabaseSync: new (f: string) => Sqlite };
  const sql = new modul.DatabaseSync(":memory:");
  // Cesta relativně k adresáři API — testy se spouštějí odtud (npm test v api/).
  const fs = (await import(/* @vite-ignore */ ["node", "fs"].join(":"))) as { readFileSync(p: string, k: string): string };
  sql.exec(fs.readFileSync("migrace/0010_push.sql", "utf-8"));
  sql.exec("CREATE TABLE limity (klic TEXT PRIMARY KEY, pocet INTEGER NOT NULL, okno_do TEXT NOT NULL)");
  const pripravit = (q: string) => {
    let args: unknown[] = [];
    const st = {
      bind(...a: unknown[]) { args = a; return st; },
      async first<T>() { return (sql.prepare(q).get(...args) ?? null) as T | null; },
      async run() { const r = sql.prepare(q).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
      async all<T>() { return { results: sql.prepare(q).all(...args) as T[] }; },
    };
    return st;
  };
  const DB = { prepare: pripravit, async batch(p: { run(): Promise<unknown> }[]) { for (const x of p) await x.run(); return []; } };
  return { sql, env: { DB, PUVOD_WEBU: "https://czechpatrol.cz", TELEGRAM_BOT_TOKEN: "tajny-token" } as never };
}

async function prohlizec() {
  const par = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  return { p256dh: b64u((await crypto.subtle.exportKey("raw", par.publicKey)) as ArrayBuffer), auth: b64u(crypto.getRandomValues(new Uint8Array(16))) };
}

// Každý požadavek z jiné adresy — brzda na jednu IP tu není předmětem testu.
let adresa = 0;
const pozadavek = (cesta: string, telo: unknown, hlavicky: Record<string, string> = {}) =>
  new Request(`https://api.test${cesta}`, { method: "POST", headers: { "cf-connecting-ip": `203.0.113.${++adresa % 250}`, ...hlavicky }, body: typeof telo === "string" ? telo : JSON.stringify(telo) });

async function podepsany(telo: unknown) {
  const text = JSON.stringify(telo);
  const cas = String(Math.floor(Date.now() / 1000));
  return pozadavek("/push/rozeslat", text, { "x-cas": cas, "x-podpis": await podpisRozhlasu("tajny-token", cas, text) });
}

describe("rozeslání", async () => {
  const { vi } = await import("vitest");
  const { prihlasit, rozeslat, DAVKA } = await import("../src/push");

  it("pošle jen odběratelům daného druhu, po dávkách, a podruhé nic", async () => {
    const { sql, env } = await prostredi();
    for (let i = 0; i < DAVKA + 3; i++) {
      await prihlasit(env, pozadavek("/push/odber", { endpoint: `https://fcm.googleapis.com/fcm/send/${i}`, keys: await prohlizec(), druhy: ["hned"] }));
    }
    await prihlasit(env, pozadavek("/push/odber", { endpoint: "https://web.push.apple.com/jen-prehled", keys: await prohlizec(), druhy: ["prehled"] }));
    const volano: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      volano.push(url);
      expect(String((init.headers as Record<string, string>).Authorization)).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
      return new Response(null, { status: url.endsWith("/0") ? 410 : 201 });
    });
    try {
      const zprava = { id: "z1", druh: "hned", titulek: "Test", text: "t", odkaz: "https://czechpatrol.cz/udalosti/" };
      const prvni = await (await rozeslat(env, await podepsany(zprava))).json() as { odeslano: number; zruseno: number; dalsi: string | null };
      expect(prvni).toMatchObject({ odeslano: DAVKA - 1, zruseno: 1 });
      expect(prvni.dalsi).toBeTruthy();
      const druha = await (await rozeslat(env, await podepsany({ ...zprava, od: prvni.dalsi }))).json() as { odeslano: number; dalsi: string | null };
      expect(druha).toMatchObject({ odeslano: 3, dalsi: null });
      expect(volano.some((u) => u.includes("apple"))).toBe(false);
      // Neplatná adresa (410) je pryč.
      expect((sql.prepare("SELECT COUNT(*) AS n FROM push_odbery").get() as { n: number }).n).toBe(DAVKA + 3);
      const znovu = await (await rozeslat(env, await podepsany(zprava))).json() as { uzOdeslano?: boolean };
      expect(znovu.uzOdeslano).toBe(true);
      expect(volano).toHaveLength(DAVKA + 3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("bez platného podpisu nic nepošle", async () => {
    const { env } = await prostredi();
    const cas = String(Math.floor(Date.now() / 1000));
    await expect(rozeslat(env, pozadavek("/push/rozeslat", { id: "x", druh: "hned", titulek: "x" }, { "x-cas": cas, "x-podpis": "0".repeat(64) }))).rejects.toMatchObject({ stav: 401 });
    const stary = String(Math.floor(Date.now() / 1000) - 3600);
    const text = JSON.stringify({ id: "x", druh: "hned", titulek: "x" });
    await expect(rozeslat(env, pozadavek("/push/rozeslat", text, { "x-cas": stary, "x-podpis": await podpisRozhlasu("tajny-token", stary, text) }))).rejects.toMatchObject({ stav: 401 });
  });

  it("odmítne cizí adresu i neplatné klíče", async () => {
    const { env } = await prostredi();
    await expect(prihlasit(env, pozadavek("/push/odber", { endpoint: "https://zlo.example/x", keys: await prohlizec(), druhy: ["hned"] }))).rejects.toMatchObject({ stav: 400 });
    await expect(prihlasit(env, pozadavek("/push/odber", { endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "abc", auth: "def" }, druhy: ["hned"] }))).rejects.toMatchObject({ stav: 400 });
    await expect(prihlasit(env, pozadavek("/push/odber", { endpoint: "https://fcm.googleapis.com/x", keys: await prohlizec(), druhy: [] }))).rejects.toMatchObject({ stav: 400 });
  });
});
