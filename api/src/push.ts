import { omez, vLimituCelkem } from "./limit";
import { b64u, ChybaHttp, json, sha256, stejne, surovyText, ted, telo, zB64u } from "./pomocne";
import { desifruj, sifrovaniNastaveno, zasifruj } from "./sifrovani";
import type { Env, Prihlaseny } from "./typy";

/*
  Upozornění do telefonu přes webovou aplikaci (Web Push, 29. 9. 2026).

  Náhrada Telegramu a WhatsAppu bez čísla a bez účtu: prohlížeč vydá
  adresu pro doručení, my na ni pošleme zašifrovanou zprávu (RFC 8291)
  podepsanou klíčem serveru (RFC 8292). Co a kdy se posílá, rozhoduje
  rozhlas (nastroje/rozhlas.mjs) stejnými pravidly jako u Telegramu —
  tady je jen doručení.

  Klíč serveru vzniká sám při prvním použití a leží v D1 (zašifrovaný,
  je-li nastaven KLIC_SIFROVANI). Rozhlas se prokazuje podpisem odvozeným
  z tokenu bota, který už má — žádné nové tajemství není potřeba.
*/

export const DRUHY_PUSH = ["hned", "prehled", "kratce", "tipy"] as const;
export type DruhPush = (typeof DRUHY_PUSH)[number];

/*
  Kam smí server posílat. Adresu vydává prohlížeč, ale přichází od
  návštěvníka — bez seznamu by šlo API přimět, aby volalo libovolnou adresu.
*/
const SLUZBY = ["fcm.googleapis.com", "android.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"];

export function povolenaAdresa(e: unknown): e is string {
  if (typeof e !== "string" || e.length > 1024) return false;
  let u: URL;
  try { u = new URL(e); } catch { return false; }
  if (u.protocol !== "https:" || u.port || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  return SLUZBY.some((s) => h === s || h.endsWith(`.${s}`));
}

export function normalizujDruhy(v: unknown): DruhPush[] {
  if (!Array.isArray(v)) return [];
  const s = new Set(v);
  return DRUHY_PUSH.filter((d) => s.has(d));
}

function platnyKlic(k: unknown, delka: number): k is string {
  if (typeof k !== "string" || k.length > 200) return false;
  try {
    const b = zB64u(k);
    return b.length === delka && (delka !== 65 || b[0] === 4);
  } catch {
    return false;
  }
}

const kodovac = new TextEncoder();

function spoj(...casti: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(casti.reduce((n, c) => n + c.length, 0)));
  let i = 0;
  for (const c of casti) { out.set(c, i); i += c.length; }
  return out;
}

async function hmac(klic: Uint8Array, data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const k = await crypto.subtle.importKey("raw", spoj(klic), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, spoj(data)));
}

/** Pár klíčů serveru pro šifrování jedné dávky (ECDH P-256). */
export interface ParSifrovani { verejny: Uint8Array; soukromy: CryptoKey }

export async function novyParSifrovani(): Promise<ParSifrovani> {
  const par = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  return { verejny: new Uint8Array((await crypto.subtle.exportKey("raw", par.publicKey)) as ArrayBuffer), soukromy: par.privateKey };
}

/**
 * Zašifruje obsah pro jeden odběr podle RFC 8291 (aes128gcm, jeden záznam).
 * Pár serveru se smí sdílet v dávce: sůl je pokaždé nová a společné
 * tajemství se liší s každým odběratelem.
 */
export async function zasifrujZpravu(obsah: Uint8Array, p256dh: string, auth: string, par: ParSifrovani, sul?: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const uaVerejny = zB64u(p256dh);
  const tajemstvi = zB64u(auth);
  const uaKlic = await crypto.subtle.importKey("raw", uaVerejny, { name: "ECDH", namedCurve: "P-256" }, false, []);
  // Standardní název pole je `public`; typy Workeru ho vedou jako `$public`, runtime bere standard.
  const algoritmus = { name: "ECDH", public: uaKlic } as unknown as SubtleCryptoDeriveKeyAlgorithm;
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits(algoritmus, par.soukromy, 256));

  const prkKlic = await hmac(tajemstvi, ecdh);
  const ikm = await hmac(prkKlic, spoj(kodovac.encode("WebPush: info\0"), uaVerejny, par.verejny, new Uint8Array([1])));
  const s = sul ?? crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(s, ikm);
  const cek = (await hmac(prk, spoj(kodovac.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, spoj(kodovac.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const aes = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  // 0x02 = poslední (a jediný) záznam, bez vycpávky.
  const sifra = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, spoj(obsah, new Uint8Array([2]))));
  const hlavicka = new Uint8Array(16 + 4 + 1);
  hlavicka.set(s, 0);
  new DataView(hlavicka.buffer).setUint32(16, 4096);
  hlavicka[20] = par.verejny.length;
  return spoj(hlavicka, par.verejny, sifra);
}

/** Podpis doručení (RFC 8292): JWT ES256 pro jednu službu prohlížeče. */
export async function podpisVapid(aud: string, sub: string, klic: CryptoKey, nyni = Date.now()): Promise<string> {
  const cast = (o: unknown) => b64u(kodovac.encode(JSON.stringify(o)));
  const vstup = `${cast({ typ: "JWT", alg: "ES256" })}.${cast({ aud, exp: Math.floor(nyni / 1000) + 12 * 3600, sub })}`;
  const podpis = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, klic, kodovac.encode(vstup));
  return `${vstup}.${b64u(podpis)}`;
}

interface KlicServeru { verejny: string; soukromy: CryptoKey }

/** Klíč serveru; při prvním použití vznikne. Souběžné první volání vyřeší INSERT OR IGNORE — platí ten, který se uložil. */
export async function klicServeru(env: Env): Promise<KlicServeru> {
  const cti = () => env.DB.prepare("SELECT hodnota FROM push_nastaveni WHERE klic = 'vapid'").first<{ hodnota: string }>();
  let radek = await cti();
  if (!radek) {
    const par = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const verejny = b64u((await crypto.subtle.exportKey("raw", par.publicKey)) as ArrayBuffer);
    const jwk = JSON.stringify(await crypto.subtle.exportKey("jwk", par.privateKey));
    const soukromy = sifrovaniNastaveno(env) ? await zasifruj(env, jwk) : `prosty.${jwk}`;
    await env.DB.prepare("INSERT OR IGNORE INTO push_nastaveni (klic, hodnota) VALUES ('vapid', ?)").bind(JSON.stringify({ verejny, soukromy })).run();
    radek = await cti();
    if (!radek) throw new ChybaHttp(500, "Klíč pro upozornění nejde uložit.");
  }
  const { verejny, soukromy } = JSON.parse(radek.hodnota) as { verejny: string; soukromy: string };
  const jwk = soukromy.startsWith("prosty.") ? soukromy.slice(7) : await desifruj(env, soukromy);
  const klic = await crypto.subtle.importKey("jwk", JSON.parse(jwk) as JsonWebKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return { verejny, soukromy: klic };
}

/** Podpis požadavku rozhlasu. Klíč je odvozený z tokenu bota, aby nebylo potřeba další tajemství. */
export async function podpisRozhlasu(token: string, cas: string, teloPozadavku: string): Promise<string> {
  const klic = new Uint8Array(await crypto.subtle.digest("SHA-256", kodovac.encode(`czechpatrol-push-v1:${token}`)));
  return Array.from(await hmac(klic, kodovac.encode(`${cas}.${teloPozadavku}`)), (b) => b.toString(16).padStart(2, "0")).join("");
}

interface Odber { id: string; endpoint: string; p256dh: string; auth: string }
interface Obsah { t: string; b: string; u: string; tag: string }
type Vysledek = "ok" | "pryc" | "chyba";

/** Kolik odběrů v jednom volání — pod limitem dílčích požadavků Workeru i s rezervou na databázi. */
export const DAVKA = 20;

async function dorucDavce(env: Env, odbery: Odber[], obsah: Obsah, urgentni: boolean): Promise<Vysledek[]> {
  const klic = await klicServeru(env);
  const par = await novyParSifrovani();
  const data = kodovac.encode(JSON.stringify(obsah));
  const podpisy = new Map<string, Promise<string>>();
  return Promise.all(
    odbery.map(async (o): Promise<Vysledek> => {
      try {
        const aud = new URL(o.endpoint).origin;
        if (!podpisy.has(aud)) podpisy.set(aud, podpisVapid(aud, env.PUVOD_WEBU, klic.soukromy));
        const r = await fetch(o.endpoint, {
          method: "POST",
          headers: {
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            // Naléhavé má smysl doručit i o půl dne později, přehled už ne.
            TTL: String(urgentni ? 12 * 3600 : 6 * 3600),
            Urgency: urgentni ? "high" : "normal",
            Authorization: `vapid t=${await podpisy.get(aud)}, k=${klic.verejny}`,
          },
          body: await zasifrujZpravu(data, o.p256dh, o.auth, par),
        });
        if (r.status === 404 || r.status === 410) return "pryc";
        return r.ok ? "ok" : "chyba";
      } catch {
        return "chyba";
      }
    }),
  );
}

/** Zapíše výsledky dávky: neplatné adresy pryč, po deseti chybách v řadě taky. */
async function zapisVysledky(env: Env, odbery: Odber[], vysledky: Vysledek[]): Promise<void> {
  const kdy = ted();
  const prikazy = odbery.map((o, i) =>
    vysledky[i] === "pryc"
      ? env.DB.prepare("DELETE FROM push_odbery WHERE id = ?").bind(o.id)
      : vysledky[i] === "ok"
        ? env.DB.prepare("UPDATE push_odbery SET chyb = 0, posledni_doruceni = ? WHERE id = ?").bind(kdy, o.id)
        : env.DB.prepare("UPDATE push_odbery SET chyb = chyb + 1 WHERE id = ?").bind(o.id),
  );
  prikazy.push(env.DB.prepare("DELETE FROM push_odbery WHERE chyb >= 10"));
  await env.DB.batch(prikazy);
}

/** Cesta na webu pro kliknutí na upozornění. Jen naše adresy; cokoli jiného vede na úvod. */
export function cestaOdkazu(env: Env, odkaz: unknown): string {
  if (typeof odkaz !== "string" || !odkaz) return "/";
  if (odkaz.startsWith("/") && !odkaz.startsWith("//")) return odkaz.slice(0, 300);
  try {
    const u = new URL(odkaz);
    if (u.origin === new URL(env.PUVOD_WEBU).origin) return (u.pathname + u.search + u.hash).slice(0, 300);
  } catch { /* neplatná adresa */ }
  return "/";
}

/**
 * Rozeslání jedné zprávy (volá rozhlas). Po dávkách: každé volání obslouží
 * DAVKA odběrů a vrátí, odkud pokračovat. První volání zprávu zapíše; když
 * už zapsaná je, nic se nepošle — opakovaný běh rozhlasu tak nezdvojí.
 */
export async function rozeslat(env: Env, req: Request): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN) throw new ChybaHttp(503, "Rozesílání není nastavené.");
  const text = await surovyText(req);
  const cas = req.headers.get("x-cas") ?? "";
  const podpis = req.headers.get("x-podpis") ?? "";
  if (!/^\d{10}$/.test(cas) || Math.abs(Date.now() / 1000 - Number(cas)) > 300) throw new ChybaHttp(401, "Neplatný podpis.");
  if (!stejne(podpis, await podpisRozhlasu(env.TELEGRAM_BOT_TOKEN, cas, text))) throw new ChybaHttp(401, "Neplatný podpis.");

  let t: { id?: unknown; druh?: unknown; titulek?: unknown; text?: unknown; odkaz?: unknown; od?: unknown };
  try { t = JSON.parse(text); } catch { throw new ChybaHttp(400, "Tělo požadavku není platný JSON."); }
  const druh = normalizujDruhy([t.druh])[0];
  if (!druh) throw new ChybaHttp(400, "Neznámý druh zprávy.");
  if (typeof t.id !== "string" || !/^[\w-]{1,80}$/.test(t.id)) throw new ChybaHttp(400, "Chybí id zprávy.");
  if (typeof t.titulek !== "string" || !t.titulek.trim()) throw new ChybaHttp(400, "Chybí titulek.");
  const od = typeof t.od === "string" ? t.od : "";

  if (!od) {
    const r = await env.DB.prepare("INSERT OR IGNORE INTO push_zpravy (id, druh, titulek, vytvoreno) VALUES (?, ?, ?, ?)")
      .bind(t.id, druh, t.titulek.slice(0, 200), ted()).run();
    if (!r.meta?.changes) return json({ odeslano: 0, selhalo: 0, zruseno: 0, dalsi: null, uzOdeslano: true });
  }

  const { results: odbery } = await env.DB.prepare(
    "SELECT id, endpoint, p256dh, auth FROM push_odbery WHERE id > ? AND instr(druhy, ?) > 0 ORDER BY id LIMIT ?",
  ).bind(od, `"${druh}"`, DAVKA).all<Odber>();
  if (!odbery.length) return json({ odeslano: 0, selhalo: 0, zruseno: 0, dalsi: null });

  const obsah: Obsah = {
    t: t.titulek.trim().slice(0, 120),
    b: typeof t.text === "string" ? t.text.trim().slice(0, 300) : "",
    u: cestaOdkazu(env, t.odkaz),
    tag: t.id,
  };
  const vysledky = await dorucDavce(env, odbery, obsah, druh === "hned");
  await zapisVysledky(env, odbery, vysledky);
  return json({
    odeslano: vysledky.filter((v) => v === "ok").length,
    selhalo: vysledky.filter((v) => v === "chyba").length,
    zruseno: vysledky.filter((v) => v === "pryc").length,
    dalsi: odbery.length === DAVKA ? odbery[odbery.length - 1].id : null,
  });
}

/** Veřejný klíč serveru — prohlížeč ho potřebuje k přihlášení odběru. */
export async function verejnyKlic(env: Env): Promise<Response> {
  const { verejny } = await klicServeru(env);
  return json({ klic: verejny }, 200, { "Cache-Control": "public, max-age=3600" });
}

interface TeloOdberu { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown }; druhy?: unknown }

export async function prihlasit(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "push-odber", 10, 60);
  const t = await telo<TeloOdberu>(req);
  if (!povolenaAdresa(t.endpoint)) throw new ChybaHttp(400, "Tenhle prohlížeč upozornění nepodporuje.");
  if (!platnyKlic(t.keys?.p256dh, 65) || !platnyKlic(t.keys?.auth, 16)) throw new ChybaHttp(400, "Prohlížeč poslal neplatné klíče.");
  const druhy = normalizujDruhy(t.druhy);
  if (!druhy.length) throw new ChybaHttp(400, "Vyberte aspoň jeden druh upozornění.");
  if (!(await vLimituCelkem(env, "push-odber", 5000, 24 * 60))) throw new ChybaHttp(429, "Přihlášek je dnes hodně. Zkuste to prosím zítra.");
  const kdy = ted();
  await env.DB.prepare(
    `INSERT INTO push_odbery (id, endpoint, p256dh, auth, druhy, vytvoreno, zmeneno, chyb) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, druhy = excluded.druhy, zmeneno = excluded.zmeneno, chyb = 0`,
  ).bind(await sha256(t.endpoint), t.endpoint, t.keys!.p256dh, t.keys!.auth, JSON.stringify(druhy), kdy, kdy).run();
  return json({ ok: true, druhy }, 201);
}

async function adresaZTela(req: Request): Promise<string> {
  const { endpoint } = await telo<{ endpoint?: unknown }>(req);
  if (!povolenaAdresa(endpoint)) throw new ChybaHttp(400, "Neplatná adresa odběru.");
  return endpoint;
}

/** Odhlášení. Znalost adresy je jediné oprávnění — vydal ji prohlížeč tomu, kdo se přihlásil. */
export async function odhlasit(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "push-odhlaseni", 20, 60);
  await env.DB.prepare("DELETE FROM push_odbery WHERE id = ?").bind(await sha256(await adresaZTela(req))).run();
  return json({ ok: true });
}

/** Co má tenhle prohlížeč zapnuto. */
export async function stav(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "push-stav", 30, 10);
  const r = await env.DB.prepare("SELECT druhy, posledni_doruceni FROM push_odbery WHERE id = ?").bind(await sha256(await adresaZTela(req))).first<{ druhy: string; posledni_doruceni: string | null }>();
  return json(r ? { prihlaseno: true, druhy: normalizujDruhy(JSON.parse(r.druhy)), posledniDoruceni: r.posledni_doruceni } : { prihlaseno: false });
}

/** Zkušební upozornění jen do tohohle prohlížeče — ať si člověk ověří, že mu to chodí. */
export async function zkouska(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "push-zkouska", 3, 10);
  const id = await sha256(await adresaZTela(req));
  const o = await env.DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_odbery WHERE id = ?").bind(id).first<Odber>();
  if (!o) throw new ChybaHttp(404, "Upozornění tu nejsou zapnutá.");
  const [v] = await dorucDavce(env, [o], { t: "Zkouška upozornění", b: "Funguje to. Takhle vám přijde zpráva, když se něco stane.", u: "/upozorneni/", tag: "zkouska" }, false);
  await zapisVysledky(env, [o], [v]);
  if (v !== "ok") throw new ChybaHttp(502, v === "pryc" ? "Prohlížeč odběr zrušil. Zapněte upozornění znovu." : "Službě prohlížeče se teď nepodařilo zprávu předat. Zkuste to za chvíli.");
  return json({ ok: true });
}

/** Pro správce: kolik lidí co odebírá a co naposledy odešlo. */
export async function prehled(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const celkem = await env.DB.prepare("SELECT COUNT(*) AS n FROM push_odbery").first<{ n: number }>();
  const druhy: Record<string, number> = {};
  for (const d of DRUHY_PUSH) {
    druhy[d] = (await env.DB.prepare("SELECT COUNT(*) AS n FROM push_odbery WHERE instr(druhy, ?) > 0").bind(`"${d}"`).first<{ n: number }>())?.n ?? 0;
  }
  const { results: posledni } = await env.DB.prepare("SELECT druh, titulek, vytvoreno FROM push_zpravy ORDER BY vytvoreno DESC LIMIT 10").all();
  return json({ celkem: celkem?.n ?? 0, druhy, posledni });
}

/** Záznamy o rozeslaných zprávách stačí na měsíc — slouží jen proti zdvojení. */
export async function uklidPush(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM push_zpravy WHERE vytvoreno < ?").bind(new Date(Date.now() - 30 * 86_400_000).toISOString()).run();
}
