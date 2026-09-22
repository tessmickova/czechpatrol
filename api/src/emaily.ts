import { ChybaHttp, json, sha256, ted, telo } from "./pomocne";
import { vyzadujPravo } from "./prava";
import { desifruj, sifrovaniNastaveno, zasifruj } from "./sifrovani";
import type { Env, Prihlaseny } from "./typy";
import { PRODUKTY } from "./typy";

/*
  E-maily jako úloha po zápisu, ne podmínka zápisu.

  Kredit existuje, i když e-mail selže. Řádek ve frontě vzniká ve stejné
  dávce jako kredit; odesílá ho cron (posliCekajici), nejvýš třikrát
  s odstupem; po třetím selhání je FAILED a vidí ho správce i účet.

  Workers neumí SMTP, posílá se přes API služby. Která — je rozhodnutí
  provozovatele (DPA, zpracování v EU, DKIM/SPF na doméně); kód umí dvě
  běžné (Resend, Postmark) a bez nastavení nechává frontu v QUEUED, nic
  nepředstírá. Adresa se ve frontě nedrží — jen její otisk; při odeslání
  se čte aktuální adresa u účtu (šifrovaná).
*/

export const DRUHY_EMAILU = ["kredit-vydan", "kredit-znovu", "kredit-nahrada"] as const;
export type DruhEmailu = (typeof DRUHY_EMAILU)[number];
export const MAX_POKUSU = 3;
const ODSTUP_MIN = 10;

const MAX_EMAIL = 200;
export function platnyEmail(e: string): boolean {
  if (!e || e.length > MAX_EMAIL) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export function odesilaniNastaveno(env: Env): boolean {
  return Boolean(env.EMAIL_POSKYTOVATEL && env.EMAIL_API_KLIC && env.EMAIL_ODESILATEL && sifrovaniNastaveno(env));
}

/* ---------- e-mail u účtu ---------- */

export async function emailUctu(env: Env, ucetId: string): Promise<string | null> {
  const r = await env.DB.prepare("SELECT email_sifrovany FROM ucty WHERE id = ?").bind(ucetId).first<{ email_sifrovany: string | null }>();
  if (!r?.email_sifrovany) return null;
  return desifruj(env, r.email_sifrovany);
}

export async function ulozEmail(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  if (!sifrovaniNastaveno(env)) throw new ChybaHttp(503, "Ukládání e-mailu zatím není zapnuté.");
  const { email, souhlas } = await telo<{ email?: string; souhlas?: boolean }>(req);
  const e = (email ?? "").trim().toLowerCase();
  if (!platnyEmail(e)) throw new ChybaHttp(400, "Zadejte prosím platný e-mail.");
  if (souhlas !== true) throw new ChybaHttp(400, "Bez souhlasu e-mail neuložíme.");
  await env.DB.prepare("UPDATE ucty SET email_sifrovany = ?, email_souhlas_kdy = ? WHERE id = ?").bind(await zasifruj(env, e), ted(), ucet.id).run();
  return json({ ok: true, email: maskujEmail(e) });
}

export async function smazEmail(env: Env, ucet: Prihlaseny): Promise<Response> {
  await env.DB.prepare("UPDATE ucty SET email_sifrovany = NULL, email_souhlas_kdy = NULL WHERE id = ?").bind(ucet.id).run();
  return json({ ok: true });
}

/** j***@example.cz — pro zobrazení v účtu bez celé adresy v odpovědi. */
export function maskujEmail(e: string): string {
  const [u, d] = e.split("@");
  if (!d) return "***";
  return `${u.slice(0, 1)}***@${d}`;
}

/* ---------- fronta ---------- */

export async function pripravEmail(env: Env, e: { ucetId: string; druh: DruhEmailu; kreditId: string | null; adresa: string }): Promise<{ id: string; prikaz: D1PreparedStatement }> {
  const id = crypto.randomUUID();
  const prikaz = env.DB.prepare("INSERT INTO emaily (id, ucet_id, druh, kredit_id, adresa_otisk, stav, vytvoreno) VALUES (?, ?, ?, ?, ?, 'QUEUED', ?)")
    .bind(id, e.ucetId, e.druh, e.kreditId, (await sha256(e.adresa.toLowerCase())).slice(0, 32), ted());
  return { id, prikaz };
}

export interface ObsahEmailu { predmet: string; text: string }

/** Text podle zadání. Čistá funkce — testovatelná. */
export function sestavEmail(druh: DruhEmailu, v: { kod: string; hodnotaHaleru: number; mena: string; stav: string; eshopBezi: boolean; web: string; nazevWebu: string }): ObsahEmailu {
  const hodnota = `${Math.round(v.hodnotaHaleru / 100)} ${v.mena === "CZK" ? "Kč" : v.mena}`;
  const uvod = druh === "kredit-nahrada"
    ? "Vydali jsme vám náhradní kód kreditu. Předchozí kód přestal platit."
    : druh === "kredit-znovu"
      ? "Posíláme znovu váš kód kreditu, jak jste si vyžádali v účtu."
      : "Děkujeme za odemknutí Premium. Podle slibu vám vracíme celou částku jako kredit na nákup výbavy.";
  const radky = [
    uvod,
    "",
    `Kód kreditu: ${v.kod}`,
    `Hodnota: ${hodnota}`,
    `Stav: ${v.stav === "ACTIVE" ? "aktivní" : v.stav}`,
    "",
    v.eshopBezi
      ? `Kód uplatníte v košíku e-shopu ${v.nazevWebu}.`
      : `Kredit bude možné využít po spuštění ${v.nazevWebu} e-shopu. Dáme vám vědět.`,
    `Kód najdete také ve svém účtu: ${v.web}/ucet/#kredity`,
    `Podmínky: ${v.web}/podminky/`,
    "",
    "Kredit je vázaný na váš účet. Když vám e-mail nedorazí nebo kód někdo uvidí, požádejte v účtu o náhradní kód.",
  ];
  return { predmet: `Váš ${v.nazevWebu} kredit ${hodnota}`, text: radky.join("\n") };
}

async function odesli(env: Env, komu: string, obsah: ObsahEmailu): Promise<void> {
  const od = env.EMAIL_ODESILATEL!;
  let r: Response;
  if (env.EMAIL_POSKYTOVATEL === "resend") {
    r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.EMAIL_API_KLIC}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: od, to: [komu], subject: obsah.predmet, text: obsah.text }),
    });
  } else if (env.EMAIL_POSKYTOVATEL === "postmark") {
    r = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "X-Postmark-Server-Token": env.EMAIL_API_KLIC!, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ From: od, To: komu, Subject: obsah.predmet, TextBody: obsah.text, MessageStream: "outbound" }),
    });
  } else {
    throw new Error(`neznámý poskytovatel ${env.EMAIL_POSKYTOVATEL}`);
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

/** Cron: pošle, co čeká; opakuje s odstupem; po MAX_POKUSU označí FAILED. */
export async function posliCekajici(env: Env, web: string): Promise<{ odeslano: number; selhalo: number; ceka: number }> {
  const { results } = await env.DB.prepare("SELECT id, ucet_id, druh, kredit_id, pokusy, posledni_pokus FROM emaily WHERE stav = 'QUEUED' ORDER BY vytvoreno LIMIT 20")
    .all<{ id: string; ucet_id: string; druh: DruhEmailu; kredit_id: string | null; pokusy: number; posledni_pokus: string | null }>();
  if (!odesilaniNastaveno(env)) return { odeslano: 0, selhalo: 0, ceka: results.length };
  const hranice = Date.now() - ODSTUP_MIN * 60_000;
  let odeslano = 0;
  let selhalo = 0;
  for (const e of results) {
    if (e.posledni_pokus && new Date(e.posledni_pokus).getTime() > hranice) continue;
    try {
      const adresa = await emailUctu(env, e.ucet_id);
      if (!adresa) throw new Error("účet už nemá e-mail");
      const k = e.kredit_id
        ? await env.DB.prepare("SELECT kod_sifrovany, hodnota_haleru, mena, stav FROM kredity WHERE id = ?").bind(e.kredit_id).first<{ kod_sifrovany: string; hodnota_haleru: number; mena: string; stav: string }>()
        : null;
      if (!k) throw new Error("kredit neexistuje");
      const obsah = sestavEmail(e.druh, { kod: await desifruj(env, k.kod_sifrovany), hodnotaHaleru: k.hodnota_haleru, mena: k.mena, stav: k.stav, eshopBezi: Boolean(env.ESHOP_TOKEN), web, nazevWebu: env.NAZEV_WEBU });
      await odesli(env, adresa, obsah);
      await env.DB.batch([
        env.DB.prepare("UPDATE emaily SET stav = 'SENT', odeslano = ?, pokusy = pokusy + 1, posledni_pokus = ?, posledni_chyba = NULL WHERE id = ?").bind(ted(), ted(), e.id),
        env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, 'system', ?, ?)").bind(ted(), `EMAIL_SENT ${e.druh}`, e.ucet_id),
      ]);
      odeslano++;
    } catch (err) {
      const chyba = (err instanceof Error ? err.message : String(err)).slice(0, 300);
      const konec = e.pokusy + 1 >= MAX_POKUSU;
      await env.DB.batch([
        env.DB.prepare("UPDATE emaily SET stav = ?, pokusy = pokusy + 1, posledni_pokus = ?, posledni_chyba = ? WHERE id = ?").bind(konec ? "FAILED" : "QUEUED", ted(), chyba, e.id),
        ...(konec ? [env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, 'system', ?, ?)").bind(ted(), `EMAIL_FAILED ${e.druh}`, e.ucet_id)] : []),
      ]);
      selhalo++;
    }
  }
  return { odeslano, selhalo, ceka: results.length - odeslano - selhalo };
}

/* ---------- správa ---------- */

export async function seznam(env: Env, ucet: Prihlaseny): Promise<Response> {
  await vyzadujPravo(env, ucet, "platby.cist");
  const { results } = await env.DB.prepare("SELECT id, ucet_id, druh, kredit_id, stav, pokusy, posledni_pokus, posledni_chyba, vytvoreno, odeslano FROM emaily ORDER BY vytvoreno DESC LIMIT 300").all();
  return json({ emaily: results, odesilaniNastaveno: odesilaniNastaveno(env), poskytovatel: odesilaniNastaveno(env) ? env.EMAIL_POSKYTOVATEL : null });
}

/** Znovu zařadit selhaný e-mail. */
export async function znovu(env: Env, ucet: Prihlaseny, id: string): Promise<Response> {
  await vyzadujPravo(env, ucet, "emaily.znovu");
  const r = await env.DB.prepare("SELECT ucet_id, stav FROM emaily WHERE id = ?").bind(id).first<{ ucet_id: string; stav: string }>();
  if (!r) throw new ChybaHttp(404, "E-mail nenalezen.");
  if (r.stav === "QUEUED") throw new ChybaHttp(409, "E-mail už čeká na odeslání.");
  await env.DB.batch([
    env.DB.prepare("UPDATE emaily SET stav = 'QUEUED', pokusy = 0, posledni_pokus = NULL, posledni_chyba = NULL WHERE id = ?").bind(id),
    env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, 'EMAIL_RESENT', ?)").bind(ted(), ucet.id, r.ucet_id),
  ]);
  return json({ ok: true });
}

export const NAZVY_PRODUKTU = Object.fromEntries(Object.entries(PRODUKTY).map(([k, v]) => [k, v.nazev]));
