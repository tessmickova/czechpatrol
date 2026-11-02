import { omez } from "./limit";
import { ChybaHttp, escapeHtml, json, ted, telo } from "./pomocne";
import { posliTelegram } from "./dorucovani";
import { rozesli } from "./rozeslani";
import type { Env, Prihlaseny, Zavaznost } from "./typy";

/*
  Správa: co čeká na rozhodnutí a ruční oznámení.

  Přehled sečte, co v databázi čeká na člověka (zprávy partnerů, hlášení,
  platby k rozhodnutí, selhané e-maily, noví v žebříčku s kontaktem).
  Fronta návrhů a kandidáti nejsou v databázi — návrhy čte web
  z GitHubu zvlášť, kandidáty zná ze sestavení.

  Oznámení je jediná cesta, jak správce z webu něco pošle ven: do
  veřejného kanálu (jednou, hned, botem) a/nebo čtenářům s propojeným
  kanálem (přes stejnou frontu jako každá jiná zpráva, tedy podle jejich
  nastavení — kdo chce jen kritické, dostane jen kritické). Nikdy
  automaticky: každé oznámení má autora v auditu.
*/

function jenSpravce(ucet: Prihlaseny) {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
}

export async function prehled(env: Env, ucet: Prihlaseny): Promise<Response> {
  jenSpravce(ucet);
  const n = async (sql: string) => (await env.DB.prepare(sql).first<{ n: number }>())?.n ?? 0;
  return json({
    zpravyIzs: await n("SELECT COUNT(*) AS n FROM zpravy_izs WHERE stav = 'navrh'"),
    tipy: await n("SELECT COUNT(*) AS n FROM tipy WHERE stav = 'novy'"),
    platbyKRozhodnuti: await n("SELECT COUNT(*) AS n FROM platby WHERE vyzaduje_rozhodnuti = 1"),
    platbyCekajici: await n("SELECT COUNT(*) AS n FROM platby WHERE stav = 'PENDING'"),
    emailySelhane: await n("SELECT COUNT(*) AS n FROM emaily WHERE stav = 'FAILED'"),
    zebricekNovi: await n("SELECT COUNT(*) AS n FROM zebricek WHERE stav = 'novy' AND (email_sifrovany IS NOT NULL OR telefon_sifrovany IS NOT NULL)"),
    zajem: await n("SELECT COUNT(*) AS n FROM zajem WHERE stav != 'odhlaseno'"),
    uctu: await n("SELECT COUNT(*) AS n FROM ucty WHERE smazano IS NULL"),
    sKanalem: await n("SELECT COUNT(DISTINCT ucet_id) AS n FROM kanaly"),
    kanal: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_KANAL),
    kanalNazev: env.TELEGRAM_KANAL ?? null,
  });
}

export const KAM = ["kanal", "ctenari", "oba"] as const;
export type Kam = (typeof KAM)[number];
const ZAVAZNOSTI: Zavaznost[] = ["vysoka", "kriticka"];

/** Text do kanálu: tučný titulek, text, odkaz, podpis. Čistá funkce. */
export function sestavOznameni(o: { titulek: string; text: string; odkaz: string | null; nazevWebu: string }): string {
  const radky = [`<b>${escapeHtml(o.titulek)}</b>`, "", escapeHtml(o.text)];
  if (o.odkaz) radky.push("", escapeHtml(o.odkaz));
  radky.push("", `— ${escapeHtml(o.nazevWebu)}, oznámení správce`);
  return radky.join("\n");
}

export function overOznameni(t: { kam?: unknown; titulek?: unknown; text?: unknown; odkaz?: unknown; zavaznost?: unknown }): { kam: Kam; titulek: string; text: string; odkaz: string | null; zavaznost: Zavaznost } {
  if (!KAM.includes(t.kam as Kam)) throw new ChybaHttp(400, "Kam: kanal, ctenari nebo oba.");
  const titulek = typeof t.titulek === "string" ? t.titulek.trim() : "";
  const text = typeof t.text === "string" ? t.text.trim() : "";
  if (titulek.length < 3 || titulek.length > 120) throw new ChybaHttp(400, "Titulek má mít 3 až 120 znaků.");
  if (text.length < 10 || text.length > 2000) throw new ChybaHttp(400, "Text má mít 10 až 2000 znaků.");
  const odkaz = typeof t.odkaz === "string" && t.odkaz.trim() ? t.odkaz.trim() : null;
  if (odkaz && !/^https:\/\/[^\s]+$/.test(odkaz)) throw new ChybaHttp(400, "Odkaz musí začínat https://.");
  const zavaznost = ZAVAZNOSTI.includes(t.zavaznost as Zavaznost) ? (t.zavaznost as Zavaznost) : "vysoka";
  return { kam: t.kam as Kam, titulek, text, odkaz, zavaznost };
}

export async function posli(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  jenSpravce(ucet);
  await omez(env, req, "oznameni", 10, 60);
  const o = overOznameni(await telo(req));
  const id = crypto.randomUUID();
  let kanal: { ok: boolean; chyba?: string } | null = null;
  let zasazeni: number | null = null;

  if (o.kam === "kanal" || o.kam === "oba") {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_KANAL) throw new ChybaHttp(503, "Veřejný kanál není nastavený (TELEGRAM_BOT_TOKEN a TELEGRAM_KANAL).");
    kanal = await posliTelegram(env, env.TELEGRAM_KANAL, sestavOznameni({ titulek: o.titulek, text: o.text, odkaz: o.odkaz, nazevWebu: env.NAZEV_WEBU }));
  }
  if (o.kam === "ctenari" || o.kam === "oba") {
    zasazeni = await rozesli(env, { druh: "provoz", zavaznost: o.zavaznost, oblast: null, kategorie: null, titulek: o.titulek, text: o.text, odkaz: o.odkaz }, `oznameni:${id}`);
  }
  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)")
    .bind(ted(), ucet.id, `OZNAMENI ${o.kam}${kanal && !kanal.ok ? " (kanál selhal)" : ""}: ${o.titulek.slice(0, 80)}`, id).run();
  if (kanal && !kanal.ok) throw new ChybaHttp(502, `Do kanálu se nepodařilo odeslat: ${kanal.chyba ?? "neznámá chyba"}${zasazeni !== null ? `. Čtenářům zařazeno (${zasazeni}).` : ""}`);
  return json({ ok: true, id, kanal: kanal?.ok ?? null, zasazeni });
}
