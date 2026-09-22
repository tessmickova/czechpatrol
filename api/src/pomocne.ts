import type { Env } from "./typy";

export class ChybaHttp extends Error {
  constructor(public stav: number, zprava: string) {
    super(zprava);
  }
}

export const ted = () => new Date().toISOString();
export const zaMinut = (n: number) => new Date(Date.now() + n * 60_000).toISOString();
export const zaDni = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const kodovac = new TextEncoder();

export function b64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function zB64u(s: string): Uint8Array<ArrayBuffer> {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(norm);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256(text: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", kodovac.encode(text));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function nahodnyToken(bytu = 32): string {
  const a = new Uint8Array(bytu);
  crypto.getRandomValues(a);
  return b64u(a);
}

/** Obnovovací kód: 4×4 znaky bez záměnných písmen, čitelný i po telefonu. */
export function novyObnovovaciKod(): string {
  const abeceda = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  const znaky = Array.from(a, (b) => abeceda[b % abeceda.length]);
  return [0, 4, 8, 12].map((i) => znaky.slice(i, i + 4).join("")).join("-");
}

export const normalizujKod = (k: string) => k.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Porovnání bez úniku času — pro tajné kódy. */
export function stejne(a: string, b: string): boolean {
  const x = kodovac.encode(a);
  const y = kodovac.encode(b);
  if (x.length !== y.length) return false;
  let r = 0;
  for (let i = 0; i < x.length; i++) r |= x[i] ^ y[i];
  return r === 0;
}

export function json(telo: unknown, stav = 200, hlavicky: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(telo), {
    status: stav,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...hlavicky,
    },
  });
}

export async function telo<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ChybaHttp(400, "Tělo požadavku není platný JSON.");
  }
}

/**
 * Adresy webu: hlavní (PUVOD_WEBU) a během přechodu na vlastní doménu i ty
 * předchozí (PUVOD_WEBU_DALSI, více adres oddělených čárkou). Nic jiného API
 * nevolá.
 */
export function povolenePuvody(env: Env): string[] {
  return [env.PUVOD_WEBU, ...(env.PUVOD_WEBU_DALSI ?? "").split(",")]
    .map((p) => p.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/** Povolené původy: adresy webu a lokální vývoj. */
export function povolenyPuvod(env: Env, origin: string | null): string | null {
  if (!origin) return null;
  if (povolenePuvody(env).includes(origin)) return origin;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return origin;
  return null;
}

/**
 * Pro který doménový název platí passkey (RP ID) — podle původu požadavku.
 *
 * Passkey je uvázaný k doméně, na které vznikl. Během přechodu
 * z czechpatrol.pages.dev na czechpatrol.cz běží web na obou adresách
 * a každá má své passkeye; API proto musí vědět, ze které stránky člověk
 * přichází, a podle toho výzvu vydat i ověřit. Hlavní adresa má RP ID
 * z nastavení, ostatní jméno svého hostitele (pro localhost „localhost").
 */
export function rpIdProPuvod(env: Env, puvod: string | null): string {
  if (!puvod || puvod === env.PUVOD_WEBU.replace(/\/$/, "")) return env.RP_ID;
  return new URL(puvod).hostname;
}

export function sCors(odpoved: Response, puvod: string | null): Response {
  if (!puvod) return odpoved;
  const h = new Headers(odpoved.headers);
  h.set("Access-Control-Allow-Origin", puvod);
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  h.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  h.set("Access-Control-Max-Age", "600");
  return new Response(odpoved.body, { status: odpoved.status, headers: h });
}

/** Otisk IP se solí podle dne — z databáze se IP nedá zpětně získat. */
export async function otiskIp(req: Request): Promise<string> {
  const ip = req.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
  const den = new Date().toISOString().slice(0, 10);
  return (await sha256(`${den}|${ip}`)).slice(0, 32);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
