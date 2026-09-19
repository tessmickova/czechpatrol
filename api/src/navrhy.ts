import { omez } from "./limit";
import { ChybaHttp, json, ted, telo } from "./pomocne";
import type { Env, Prihlaseny } from "./typy";

/*
  Fronta návrhů ve správě.

  Návrhy leží v repozitáři (data/navrhy.json), ne v databázi — schválení je
  změna v repozitáři a má mít commit, autora a historii. Worker proto frontu
  jen čte přes GitHub a rozhodnutí posílá zpátky jako spuštění workflow,
  které udělá tutéž práci jako `npm run spravce schval` z příkazové řádky.

  Proč ne rovnou zápis odsud: dvě cesty ke schválení by znamenaly dvoje
  chování a dvě místa, kde se dá zapomenout na kontrolu. Takhle je kód jeden.
*/

const WORKFLOW = "schvaleni.yml";

function jenSpravce(ucet: Prihlaseny) {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
}

function hlavicky(token: string) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    // GitHub bez tohohle hlavičkového údaje odmítá požadavky.
    "user-agent": "czechpatrol-api",
  };
}

function nastaveni(env: Env): { repo: string; token: string } {
  if (!env.GH_TOKEN_SBER) throw new ChybaHttp(503, "Není nastavený přístup na GitHub (GH_TOKEN_SBER).");
  if (!env.SBER_REPO) throw new ChybaHttp(503, "Není nastavený repozitář (SBER_REPO).");
  return { repo: env.SBER_REPO, token: env.GH_TOKEN_SBER };
}

/** Jen to, co je potřeba k rozhodnutí. Celý návrh je dlouhý a do seznamu nepatří. */
interface Navrh {
  id?: string;
  slug?: string;
  titulek?: string;
  zeme?: string;
  kam?: string;
  pripravil?: string;
  pripraveno?: string;
  datumUdalosti?: string;
  zavaznost?: string;
  jistota?: string;
  fakta?: string[];
  neznameho?: string[];
  zdroje?: { nazev?: string; url?: string }[];
}

export async function seznam(env: Env, ucet: Prihlaseny): Promise<Response> {
  jenSpravce(ucet);
  const { repo, token } = nastaveni(env);

  const odpoved = await fetch(`https://api.github.com/repos/${repo}/contents/data/navrhy.json?ref=main`, {
    headers: { ...hlavicky(token), accept: "application/vnd.github.raw" },
  });
  if (odpoved.status === 404) return json({ navrhy: [] });
  if (!odpoved.ok) {
    /*
      Nejčastější příčina je token bez práva číst obsah repozitáře. Napsat to
      rovnou je lepší než prázdný seznam, který vypadá jako „nic nečeká".
    */
    throw new ChybaHttp(502, `GitHub odpověděl ${odpoved.status}. Má token právo číst obsah repozitáře?`);
  }

  const vse = (await odpoved.json().catch(() => [])) as Navrh[];
  const navrhy = (Array.isArray(vse) ? vse : []).map((n) => ({
    id: n.id ?? null,
    slug: n.slug ?? null,
    titulek: n.titulek ?? null,
    zeme: n.zeme ?? null,
    kam: n.kam ?? "zaznam",
    pripravil: n.pripravil ?? null,
    pripraveno: n.pripraveno ?? null,
    datumUdalosti: n.datumUdalosti ?? null,
    zavaznost: n.zavaznost ?? null,
    jistota: n.jistota ?? null,
    fakta: n.fakta ?? [],
    neznameho: n.neznameho ?? [],
    zdroje: (n.zdroje ?? []).map((z) => ({ nazev: z.nazev ?? null, url: z.url ?? null })),
  }));
  return json({ navrhy });
}

export async function rozhodni(env: Env, req: Request, ucet: Prihlaseny, id: string): Promise<Response> {
  jenSpravce(ucet);
  /* Brzda: rozhodnutí je běh workflow, ne dotaz do databáze. */
  await omez(env, req, "rozhodnuti", 30, 60);
  const { repo, token } = nastaveni(env);

  const { akce, duvod } = await telo<{ akce?: string; duvod?: string }>(req);
  if (akce !== "schval" && akce !== "zamitni") throw new ChybaHttp(400, "Akce je schval, nebo zamitni.");
  /* Id jde do příkazu na běžci — pustí se jen tvar, který sem opravdu patří. */
  if (!/^[\w.-]{1,80}$/.test(id)) throw new ChybaHttp(400, "Podivné id návrhu.");

  const odpoved = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: { ...hlavicky(token), "content-type": "application/json" },
    body: JSON.stringify({ ref: "main", inputs: { id, akce, duvod: (duvod ?? "").slice(0, 300) } }),
  });

  if (odpoved.status !== 204) {
    // Tělo chyby jde do logu, ne ven — může nést podrobnosti o repozitáři.
    const text = await odpoved.text().catch(() => "");
    console.error(`dispatch ${WORKFLOW}: ${odpoved.status} ${text.slice(0, 200)}`);
    throw new ChybaHttp(502, `GitHub odpověděl ${odpoved.status}.`);
  }

  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)")
    .bind(ted(), ucet.id, `návrh ${akce}`, id)
    .run();

  /*
    Rozhodnutí je odeslané, ne hotové — workflow teprve poběží. Stránka to
    musí říct stejně, aby se „odesláno" nečetlo jako „na webu".
  */
  return json({ ok: true, stav: "odeslano" }, 202);
}
