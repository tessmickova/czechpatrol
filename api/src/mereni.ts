import { omez } from "./limit";
import { ChybaHttp, json, telo } from "./pomocne";
import type { Env, Prihlaseny } from "./typy";

/*
  Měření návštěvnosti (25. 9. 2026).

  Co se měří: zobrazení stránky, kliknutí na odkaz nebo tlačítko, původ
  návštěvy (přímo / vyhledávač / síť / jiný web / odběr), druh zařízení
  a hrubá poloha kliknutí a pohybu myši v mřížce 20 × 20 nad stránkou.

  Co se neměří, schválně: IP adresa, identifikátor prohlížeče, cookies,
  přesný čas, pořadí stránek jednoho člověka. Ukládají se jen součty po
  dnech. Prohlížeč s Do Not Track nebo Global Privacy Control neposílá nic.
  Zásady soukromí to popisují slovo od slova.
*/
export const DRUHY = ["zobrazeni", "klik", "pohyb"] as const;
export type Druh = (typeof DRUHY)[number];
export const ZARIZENI = ["mobil", "tablet", "pocitac"] as const;
export const ODKUD = ["primo", "vyhledavac", "socialni", "web", "odber"] as const;
export const MRIZKA = 20;
const NEJVIC_UDALOSTI = 60;

export interface Udalost {
  druh: Druh;
  cesta: string;
  prvek?: string;
  odkud?: string;
  zarizeni?: string;
  /** Poloha v procentech: x šířky okna, y výšky celé stránky. */
  x?: number;
  y?: number;
}

/** Stránka bez dotazu a kotvy, s lomítkem na konci, nejvýš 120 znaků. Správa se neměří. */
export function ocistiCestu(c: unknown): string | null {
  if (typeof c !== "string") return null;
  let s = c.split("?")[0].split("#")[0].trim();
  if (!s.startsWith("/")) return null;
  if (s.startsWith("/sprava")) return null;
  if (!s.endsWith("/")) s += "/";
  if (s.length > 120) return null;
  if (!/^[\w\-./%]+$/.test(s)) return null;
  return s;
}

/** Název prvku: krátký, bez řídicích znaků. */
export function ocistiPrvek(p: unknown): string {
  if (typeof p !== "string") return "";
  return p.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Procento → index buňky mřížky. Mimo rozsah = null. */
export function bunka(p: unknown): number | null {
  if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 100) return null;
  return Math.min(MRIZKA - 1, Math.floor((p / 100) * MRIZKA));
}

export function ocistiUdalost(u: unknown): Udalost | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  if (!DRUHY.includes(o.druh as Druh)) return null;
  const cesta = ocistiCestu(o.cesta);
  if (!cesta) return null;
  const v: Udalost = { druh: o.druh as Druh, cesta };
  if (ZARIZENI.includes(o.zarizeni as (typeof ZARIZENI)[number])) v.zarizeni = o.zarizeni as string;
  if (v.druh === "zobrazeni" && ODKUD.includes(o.odkud as (typeof ODKUD)[number])) v.odkud = o.odkud as string;
  if (v.druh === "klik") v.prvek = ocistiPrvek(o.prvek);
  if (v.druh !== "zobrazeni") { v.x = typeof o.x === "number" ? o.x : undefined; v.y = typeof o.y === "number" ? o.y : undefined; }
  return v;
}

const den = () => new Date().toISOString().slice(0, 10);

/** POST /mereni — dávka událostí z jedné stránky. Odpovídá 204 i na prázdno; nikdy nevrací data. */
export async function prijmi(env: Env, req: Request): Promise<Response> {
  await omez(env, req, "mereni", 120, 10);
  const t = await telo<{ udalosti?: unknown[] }>(req).catch(() => ({ udalosti: [] }));
  const udalosti = (Array.isArray(t.udalosti) ? t.udalosti : []).slice(0, NEJVIC_UDALOSTI).map(ocistiUdalost).filter((u): u is Udalost => u !== null);
  if (!udalosti.length) return new Response(null, { status: 204 });
  const d = den();
  const denni = new Map<string, number>();
  const teplo = new Map<string, number>();
  const pridej = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const u of udalosti) {
    if (u.druh === "zobrazeni") {
      pridej(denni, `zobrazeni\t${u.cesta}\t`);
      if (u.odkud) pridej(denni, `odkud\t${u.cesta}\t${u.odkud}`);
      if (u.zarizeni) pridej(denni, `zarizeni\t${u.cesta}\t${u.zarizeni}`);
      continue;
    }
    if (u.druh === "klik" && u.prvek) pridej(denni, `klik\t${u.cesta}\t${u.prvek}`);
    const bx = bunka(u.x), by = bunka(u.y);
    if (bx !== null && by !== null) pridej(teplo, `${u.druh}\t${u.cesta}\t${u.zarizeni ?? "pocitac"}\t${bx}\t${by}`);
  }
  const davka: D1PreparedStatement[] = [];
  for (const [k, n] of denni) {
    const [druh, cesta, klic] = k.split("\t");
    davka.push(env.DB.prepare("INSERT INTO mereni_denni (den, druh, cesta, klic, pocet) VALUES (?, ?, ?, ?, ?) ON CONFLICT(den, druh, cesta, klic) DO UPDATE SET pocet = pocet + excluded.pocet").bind(d, druh, cesta, klic, n));
  }
  for (const [k, n] of teplo) {
    const [druh, cesta, zarizeni, bx, by] = k.split("\t");
    davka.push(env.DB.prepare("INSERT INTO mereni_teplo (den, druh, cesta, zarizeni, bx, by, pocet) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(den, druh, cesta, zarizeni, bx, by) DO UPDATE SET pocet = pocet + excluded.pocet").bind(d, druh, cesta, zarizeni, Number(bx), Number(by), n));
  }
  if (davka.length) await env.DB.batch(davka);
  return new Response(null, { status: 204 });
}

/** GET /sprava/mereni?dni=30&cesta=/ — souhrn pro správce. */
export async function souhrn(env: Env, url: URL, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const dni = Math.min(90, Math.max(1, Number(url.searchParams.get("dni") ?? 30) || 30));
  const od = new Date(Date.now() - (dni - 1) * 86_400_000).toISOString().slice(0, 10);
  const cesta = ocistiCestu(url.searchParams.get("cesta") ?? "/") ?? "/";
  const [poDnech, stranky, prvky, odkud, zarizeni, teploKlik, teploPohyb] = await Promise.all([
    env.DB.prepare("SELECT den, SUM(pocet) AS n FROM mereni_denni WHERE druh = 'zobrazeni' AND den >= ? GROUP BY den ORDER BY den").bind(od).all<{ den: string; n: number }>(),
    env.DB.prepare(`SELECT z.cesta, SUM(z.pocet) AS zobrazeni,
        (SELECT COALESCE(SUM(k.pocet), 0) FROM mereni_denni k WHERE k.druh = 'klik' AND k.cesta = z.cesta AND k.den >= ?) AS kliku
      FROM mereni_denni z WHERE z.druh = 'zobrazeni' AND z.den >= ? GROUP BY z.cesta ORDER BY zobrazeni DESC LIMIT 60`).bind(od, od).all<{ cesta: string; zobrazeni: number; kliku: number }>(),
    env.DB.prepare("SELECT cesta, klic AS prvek, SUM(pocet) AS n FROM mereni_denni WHERE druh = 'klik' AND den >= ? GROUP BY cesta, klic ORDER BY n DESC LIMIT 80").bind(od).all<{ cesta: string; prvek: string; n: number }>(),
    env.DB.prepare("SELECT klic AS odkud, SUM(pocet) AS n FROM mereni_denni WHERE druh = 'odkud' AND den >= ? GROUP BY klic ORDER BY n DESC").bind(od).all<{ odkud: string; n: number }>(),
    env.DB.prepare("SELECT klic AS zarizeni, SUM(pocet) AS n FROM mereni_denni WHERE druh = 'zarizeni' AND den >= ? GROUP BY klic ORDER BY n DESC").bind(od).all<{ zarizeni: string; n: number }>(),
    env.DB.prepare("SELECT zarizeni, bx, by, SUM(pocet) AS n FROM mereni_teplo WHERE druh = 'klik' AND cesta = ? AND den >= ? GROUP BY zarizeni, bx, by").bind(cesta, od).all<{ zarizeni: string; bx: number; by: number; n: number }>(),
    env.DB.prepare("SELECT zarizeni, bx, by, SUM(pocet) AS n FROM mereni_teplo WHERE druh = 'pohyb' AND cesta = ? AND den >= ? GROUP BY zarizeni, bx, by").bind(cesta, od).all<{ zarizeni: string; bx: number; by: number; n: number }>(),
  ]);
  return json({
    dni, od, mrizka: MRIZKA,
    poDnech: poDnech.results ?? [],
    stranky: stranky.results ?? [],
    prvky: prvky.results ?? [],
    odkud: odkud.results ?? [],
    zarizeni: zarizeni.results ?? [],
    teplo: { cesta, klik: teploKlik.results ?? [], pohyb: teploPohyb.results ?? [] },
  });
}
