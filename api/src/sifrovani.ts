import { b64u, ChybaHttp, zB64u } from "./pomocne";
import type { Env } from "./typy";

/*
  Šifrování citlivých polí v D1: kódy kreditů, e-mail u účtu, uložený
  profil domácnosti. D1 sloupce šifrovat neumí, takže se to dělá tady —
  AES-GCM s klíčem z tajemství Workeru (KLIC_SIFROVANI, 32 bajtů base64url).

  Tvar uložené hodnoty: "v1.<iv>.<šifrovaný text>", obojí base64url.
  Verze vpředu, aby šlo klíč jednou vyměnit bez hádání, čím byl řádek
  zašifrovaný. Bez klíče se nic nezašifruje ani nepřečte — a Premium
  se proto bez klíče vůbec nespustí (viz platby.bezi()).
*/

const kodovac = new TextEncoder();
const dekodovac = new TextDecoder();

export function sifrovaniNastaveno(env: Env): boolean {
  return Boolean(env.KLIC_SIFROVANI && env.KLIC_SIFROVANI.length >= 40);
}

async function klic(env: Env): Promise<CryptoKey> {
  if (!sifrovaniNastaveno(env)) throw new ChybaHttp(503, "Šifrování není nastavené.");
  const surovy = zB64u(env.KLIC_SIFROVANI!);
  if (surovy.length !== 32) throw new ChybaHttp(503, "Šifrovací klíč nemá 32 bajtů.");
  return crypto.subtle.importKey("raw", surovy, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function zasifruj(env: Env, text: string): Promise<string> {
  const k = await klic(env);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, kodovac.encode(text));
  return `v1.${b64u(iv)}.${b64u(ct)}`;
}

export async function desifruj(env: Env, ulozeno: string): Promise<string> {
  const [verze, iv, ct] = ulozeno.split(".");
  if (verze !== "v1" || !iv || !ct) throw new ChybaHttp(500, "Neznámý tvar šifrované hodnoty.");
  const k = await klic(env);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: zB64u(iv) }, k, zB64u(ct));
  return dekodovac.decode(pt);
}
