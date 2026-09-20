import { omez } from "./limit";
import { ChybaHttp, json, ted, telo } from "./pomocne";
import type { Env, Prihlaseny } from "./typy";

/*
  Ruční zadání pro externího ověřovatele.

  Patrol běží na cizím serveru a nedá se mu zavolat zvenčí — sám se každých
  pár minut dívá na svou větev v repozitáři. Jediný způsob, jak mu něco
  zadat, je tedy něco na tu větev napsat.

  Zadání se proto ukládá do data/fronta/pro-patrola.json na větvi
  patrol/overovani. Dělá to workflow, ne tenhle worker: zápis do repozitáře
  má mít commit a autora.
*/

const WORKFLOW = "pro-patrola.yml";
const VETEV = "patrol/overovani";
const MAX_ZADANI = 2000;

function hlavicky(token: string) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "czechpatrol-api",
  };
}

function nastaveni(env: Env): { repo: string; token: string } {
  if (!env.GH_TOKEN_SBER) throw new ChybaHttp(503, "Není nastavený přístup na GitHub (GH_TOKEN_SBER).");
  if (!env.SBER_REPO) throw new ChybaHttp(503, "Není nastavený repozitář (SBER_REPO).");
  return { repo: env.SBER_REPO, token: env.GH_TOKEN_SBER };
}

/**
 * Fronta zadání i s odpověďmi.
 *
 * Patrol píše výsledek do téhož souboru, takže odpověď stojí u zadání,
 * kterého se týká. Dokud chodila jen na Telegram, musel si ji člověk
 * k úkolu párovat sám — a u desítek položek to znamená, že to nedělá.
 */
export async function seznam(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  const { repo, token } = nastaveni(env);

  const odpoved = await fetch(
    `https://api.github.com/repos/${repo}/contents/data/fronta/pro-patrola.json?ref=${VETEV}`,
    { headers: { ...hlavicky(token), accept: "application/vnd.github.raw" } },
  );
  if (odpoved.status === 404) return json({ zadani: [] });
  if (!odpoved.ok) throw new ChybaHttp(502, `GitHub odpověděl ${odpoved.status}. Má token právo číst obsah repozitáře?`);

  const vse = (await odpoved.json().catch(() => [])) as unknown[];
  return json({ zadani: Array.isArray(vse) ? vse.slice(-30).reverse() : [] });
}

export async function zadej(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
  /* Každé zadání je běh workflow a commit — brzda tu není pro ozdobu. */
  await omez(env, req, "pro-patrola", 20, 60);
  const { repo, token } = nastaveni(env);

  const t = await telo<{ zadani?: string }>(req);
  const zadani = (t.zadani ?? "").trim();
  if (zadani.length < 10) throw new ChybaHttp(400, "Napište, co má ověřit — aspoň větu.");
  if (zadani.length > MAX_ZADANI) throw new ChybaHttp(400, `Zadání je delší než ${MAX_ZADANI} znaků.`);

  const odpoved = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: { ...hlavicky(token), "content-type": "application/json" },
    // Workflow běží nad hlavní větví, ale zapisuje na Patrolovu.
    body: JSON.stringify({ ref: "main", inputs: { zadani, zadal: ucet.id.slice(0, 8) } }),
  });

  if (odpoved.status !== 204) {
    const text = await odpoved.text().catch(() => "");
    console.error(`dispatch ${WORKFLOW}: ${odpoved.status} ${text.slice(0, 200)}`);
    throw new ChybaHttp(502, `GitHub odpověděl ${odpoved.status}.`);
  }

  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)")
    .bind(ted(), ucet.id, "zadání pro Patrola", zadani.slice(0, 120))
    .run();

  /*
    Zadání je zapsané, ne splněné. Patrol se na větev dívá po svém, takže
    mezi odesláním a prací je jeho vlastní prodleva.
  */
  return json({ ok: true, stav: "zapsano" }, 202);
}
