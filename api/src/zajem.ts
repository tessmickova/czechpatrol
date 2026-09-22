import { omez } from "./limit";
import { ChybaHttp, json, nahodnyToken, ted, telo } from "./pomocne";
import type { Env, Prihlaseny } from "./typy";

/*
  Zájem o e-mail a komunitu.

  Bez účtu, s brzdou, bez potvrzovacího e-mailu — ten zatím nemáme čím
  poslat. Adresa se proto ukládá se stavem „nepotvrzeno" a s časem a verzí
  souhlasu; první zpráva, která kdy odejde, ponese odkaz na odhlášení
  (token níž). Kdo se odhlásí, je do 30 dnů smazaný. Komu do roka nic
  nepřišlo, je smazaný taky — držet adresy „pro jistotu" není důvod.

  Co se neukládá: jméno, IP, nic o prohlížeči. Zdroj je jen slovo, odkud
  na webu člověk přišel (např. „zapojit-se"), aby šlo poznat, které místo
  lidem dává smysl.
*/

export const ZAJMY = ["souhrn", "komunita", "pomoc", "obce"] as const;
export type Zajem = (typeof ZAJMY)[number];

/** Verze textu souhlasu. Změna textu na webu = nová verze tady i tam. */
export const VERZE_SOUHLASU = "2026-09-22";

const MAX_EMAIL = 200;

/** Střízlivá kontrola: něco@něco.něco, bez mezer, rozumná délka. */
export function platnyEmail(e: string): boolean {
  if (!e || e.length > MAX_EMAIL) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/** Jen povolené zájmy, bez duplicit, v pevném pořadí. */
export function normalizujZajmy(v: unknown): Zajem[] {
  if (!Array.isArray(v)) return [];
  const s = new Set(v.filter((x): x is Zajem => typeof x === "string" && (ZAJMY as readonly string[]).includes(x)));
  return ZAJMY.filter((z) => s.has(z));
}

export async function prijmi(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "zajem", 5, 60);
  const t = await telo<{ email?: string; zajmy?: unknown; zdroj?: string; souhlas?: boolean; past?: string }>(req);
  // Skryté pole „past" vyplňují jen roboti.
  if (t.past) return json({ ok: true });
  const email = (t.email ?? "").trim().toLowerCase();
  if (!platnyEmail(email)) throw new ChybaHttp(400, "Zadejte prosím platný e-mail.");
  if (t.souhlas !== true) throw new ChybaHttp(400, "Bez souhlasu e-mail neuložíme.");
  const zajmy = normalizujZajmy(t.zajmy);
  if (!zajmy.length) throw new ChybaHttp(400, "Vyberte prosím aspoň jednu věc, která vás zajímá.");
  const zdroj = (t.zdroj ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || null;
  const kdy = ted();

  const stavajici = await env.DB.prepare("SELECT id FROM zajem WHERE email = ?").bind(email).first<{ id: string }>();
  if (stavajici) {
    /* Opakované přihlášení = aktualizace zájmů a nový souhlas; odhlášený se tím vrací. */
    await env.DB.prepare(
      "UPDATE zajem SET zajmy = ?, souhlas_kdy = ?, souhlas_verze = ?, zdroj = COALESCE(?, zdroj), stav = CASE WHEN stav = 'odhlaseno' THEN 'nepotvrzeno' ELSE stav END, odhlaseno_kdy = NULL WHERE id = ?",
    ).bind(JSON.stringify(zajmy), kdy, VERZE_SOUHLASU, zdroj, stavajici.id).run();
  } else {
    await env.DB.prepare(
      "INSERT INTO zajem (id, vytvoreno, email, zajmy, zdroj, souhlas_kdy, souhlas_verze, stav, token) VALUES (?, ?, ?, ?, ?, ?, ?, 'nepotvrzeno', ?)",
    ).bind(crypto.randomUUID(), kdy, email, JSON.stringify(zajmy), zdroj, kdy, VERZE_SOUHLASU, nahodnyToken(16)).run();
  }
  return json({ ok: true }, 201);
}

/** Odhlášení odkazem z e-mailu. Token je jediné, co se posílá; adresa se nikam nevrací. */
export async function odhlasit(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "zajem-odhlaseni", 10, 60);
  const { token } = await telo<{ token?: string }>(req);
  if (!token || typeof token !== "string") throw new ChybaHttp(400, "Chybí odkaz na odhlášení.");
  await env.DB.prepare("UPDATE zajem SET stav = 'odhlaseno', odhlaseno_kdy = ? WHERE token = ? AND stav != 'odhlaseno'").bind(ted(), token).run();
  return json({ ok: true });
}

/** Pro správce: počty podle stavu a zájmu, adresy k rozeslání. */
export async function prehled(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { results: stavy } = await env.DB.prepare("SELECT stav, COUNT(*) AS pocet FROM zajem GROUP BY stav").all<{ stav: string; pocet: number }>();
  const { results: adresy } = await env.DB
    .prepare("SELECT email, zajmy, zdroj, stav, vytvoreno, souhlas_kdy, souhlas_verze, token FROM zajem WHERE stav != 'odhlaseno' ORDER BY vytvoreno DESC LIMIT 1000")
    .all();
  return json({ stavy, adresy });
}
