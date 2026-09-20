import { ChybaHttp, json, ted, telo } from "./pomocne";
import type { Env, Prihlaseny } from "./typy";

/*
  Nastavení ověřovací vrstvy.

  Dvě věci, které se musí dát přepnout bez nasazování: jestli se má volat
  model, a který to má být. Dokud to bylo jen v proměnných repozitáře, musel
  u toho být někdo, kdo umí do nastavení GitHubu — a když model začal vracet
  chyby nebo utíkat na ceně, nešlo ho rychle vypnout.

  Uloženo je to v D1 (tabulka stav), ne v proměnných GitHubu, aby existovalo
  jedno místo pravdy a šlo to číst i ze sběru.
*/

const KLIC = "ai-nastaveni";

/* Co smí správce vybrat. Volný text by znamenal překlep v názvu modelu, který
   se projeví až za běhu tichou poruchou — model se nezavolá a nikdo neví proč. */
export const MODELY = ["claude-sonnet-5", "claude-haiku-4-5"] as const;
export type Model = (typeof MODELY)[number];

export interface AiNastaveni {
  zapnuto: boolean;
  model: Model;
  zmeneno: string | null;
}

const VYCHOZI: AiNastaveni = { zapnuto: true, model: "claude-sonnet-5", zmeneno: null };

export async function nactiAi(env: Env): Promise<AiNastaveni> {
  const r = await env.DB.prepare("SELECT hodnota FROM stav WHERE klic = ?").bind(KLIC).first<{ hodnota: string }>();
  if (!r) return VYCHOZI;
  try {
    const u = JSON.parse(r.hodnota) as Partial<AiNastaveni>;
    return {
      zapnuto: u.zapnuto ?? VYCHOZI.zapnuto,
      model: MODELY.includes(u.model as Model) ? (u.model as Model) : VYCHOZI.model,
      zmeneno: u.zmeneno ?? null,
    };
  } catch {
    /* Rozbitý zápis nesmí shodit sběr — vrátí se výchozí a jede se dál. */
    return VYCHOZI;
  }
}

/**
 * Veřejné čtení bez přihlášení.
 *
 * Čte to běh sběru na GitHubu, který se k účtu přihlásit nemůže. Nic
 * citlivého to neobsahuje: jestli se posuzuje a jakým modelem.
 */
export async function proSber(env: Env): Promise<Response> {
  return json(await nactiAi(env));
}

export async function uloz(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const t = await telo<{ zapnuto?: boolean; model?: string }>(req);
  const stav = await nactiAi(env);

  const zapnuto = typeof t.zapnuto === "boolean" ? t.zapnuto : stav.zapnuto;
  const model = t.model === undefined ? stav.model : t.model;
  if (!MODELY.includes(model as Model)) throw new ChybaHttp(400, `Neznámý model. Na výběr je: ${MODELY.join(", ")}.`);

  const nove: AiNastaveni = { zapnuto, model: model as Model, zmeneno: ted() };
  await env.DB.prepare("INSERT OR REPLACE INTO stav (klic, hodnota, aktualizovano) VALUES (?, ?, ?)")
    .bind(KLIC, JSON.stringify(nove), ted())
    .run();
  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)")
    .bind(ted(), ucet.id, `ověřovací model ${zapnuto ? "zapnut" : "vypnut"}`, nove.model)
    .run();

  return json(nove);
}
