import { dostupneKanaly, nastaveniZ, verejnyUcet } from "./auth";
import { ChybaHttp, json, nahodnyToken, telo, zaMinut } from "./pomocne";
import { VYCHOZI_NASTAVENI, type Env, type Nastaveni, type Prihlaseny } from "./typy";

/* Všechno, co si čtenář spravuje sám: nastavení, kanály, smazání. */

export async function ja(env: Env, ucet: Prihlaseny): Promise<Response> {
  return json({ ucet: await verejnyUcet(env, ucet.id), dostupne: dostupneKanaly(env) });
}

const FREKVENCE = ["ihned", "denne", "tydne", "jen-kriticke"];
const ZAVAZNOSTI = ["stredni", "vysoka", "kriticka"];
const CAS = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Nastavení se ukládá jen v ověřené podobě — nic navíc, nic mimo rozsah. */
export function overNastaveni(vstup: unknown): Nastaveni {
  const v = (vstup ?? {}) as Partial<Nastaveni>;
  const n: Nastaveni = { ...VYCHOZI_NASTAVENI };
  if (FREKVENCE.includes(v.frekvence as string)) n.frekvence = v.frekvence!;
  if (ZAVAZNOSTI.includes(v.minZavaznost as string)) n.minZavaznost = v.minZavaznost!;
  if (v.ticho && typeof v.ticho === "object" && CAS.test(v.ticho.od ?? "") && CAS.test(v.ticho.do ?? "")) n.ticho = { od: v.ticho.od, do: v.ticho.do };
  else n.ticho = null;
  if (Array.isArray(v.oblasti)) n.oblasti = v.oblasti.filter((x): x is string => typeof x === "string" && /^[a-z-]{2,40}$/.test(x)).slice(0, 20);
  n.zpravyIzs = v.zpravyIzs !== false;
  n.kraj = typeof v.kraj === "string" && v.kraj.length <= 40 ? v.kraj : null;
  return n;
}

export async function ulozUpozorneni(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  const n = overNastaveni(await telo(req));
  await env.DB.prepare("UPDATE ucty SET nastaveni = ? WHERE id = ?").bind(JSON.stringify(n), ucet.id).run();
  return json({ upozorneni: n });
}

export async function upozorneni(env: Env, ucet: Prihlaseny): Promise<Response> {
  const r = await env.DB.prepare("SELECT nastaveni FROM ucty WHERE id = ?").bind(ucet.id).first<{ nastaveni: string }>();
  return json({ upozorneni: r ? nastaveniZ(r) : VYCHOZI_NASTAVENI });
}

/** Propojení Telegramu: kód, který uživatel pošle botovi. */
export async function telegramKod(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_BOT_JMENO) throw new ChybaHttp(503, "Telegram zatím není zapnutý.");
  const kod = nahodnyToken(9).replace(/[-_]/g, "x").slice(0, 12);
  await env.DB.prepare("DELETE FROM propojeni WHERE ucet_id = ? AND druh = 'telegram'").bind(ucet.id).run();
  await env.DB.prepare("INSERT INTO propojeni (kod, ucet_id, druh, expirace) VALUES (?, ?, 'telegram', ?)").bind(kod, ucet.id, zaMinut(15)).run();
  return json({ kod, odkaz: `https://t.me/${env.TELEGRAM_BOT_JMENO}?start=${kod}` });
}

export async function odpojKanal(env: Env, ucet: Prihlaseny, druh: "telegram" | "whatsapp"): Promise<Response> {
  await env.DB.prepare("DELETE FROM kanaly WHERE ucet_id = ? AND druh = ?").bind(ucet.id, druh).run();
  await env.DB.prepare("DELETE FROM fronta WHERE ucet_id = ? AND druh = ? AND odeslano IS NULL").bind(ucet.id, druh).run();
  return json({ ok: true });
}

export async function ulozWhatsapp(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) throw new ChybaHttp(503, "WhatsApp zatím není zapnutý.");
  const { cislo } = await telo<{ cislo: string }>(req);
  const c = (cislo ?? "").replace(/[\s()-]/g, "");
  if (!/^\+\d{9,15}$/.test(c)) throw new ChybaHttp(400, "Číslo zadejte v mezinárodním tvaru, např. +420…");
  await env.DB.prepare("INSERT OR REPLACE INTO kanaly (ucet_id, druh, cil, vytvoreno) VALUES (?, 'whatsapp', ?, ?)").bind(ucet.id, c, new Date().toISOString()).run();
  return json({ ok: true });
}

/** Smazání účtu: hned, úplně, bez zálohy. Cizí klíče smažou zbytek. */
export async function smazUcet(env: Env, ucet: Prihlaseny): Promise<Response> {
  await env.DB.prepare("DELETE FROM ucty WHERE id = ?").bind(ucet.id).run();
  return json({ ok: true });
}
