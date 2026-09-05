import { ChybaHttp, json, ted, telo } from "./pomocne";
import { maRoli } from "./role";
import { rozesli } from "./rozeslani";
import type { Env, Prihlaseny } from "./typy";

/*
  Zprávy partnerů IZS.

  Partner navrhne, správce rozhodne, teprve pak se rozesílá. Text jde ven
  doslova, jak ho partner napsal — bez úprav, aby bylo jasné, kdo za ním
  stojí. Označení „zpráva partnera IZS“ přidává formát, ne partner.
*/

const MAX_DELKA = 600;
const OBLASTI = new Set([
  "Celá ČR", "Hlavní město Praha", "Středočeský", "Jihočeský", "Plzeňský", "Karlovarský", "Ústecký",
  "Liberecký", "Královéhradecký", "Pardubický", "Vysočina", "Jihomoravský", "Olomoucký", "Zlínský", "Moravskoslezský",
]);

export async function navrhni(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  if (!maRoli(ucet.role, "izs")) throw new ChybaHttp(403, "Zprávy navrhují jen partneři IZS.");
  const { text, oblast, platnostDo } = await telo<{ text: string; oblast: string; platnostDo: string | null }>(req);
  const t = (text ?? "").trim();
  if (t.length < 20) throw new ChybaHttp(400, "Zpráva je moc krátká.");
  if (t.length > MAX_DELKA) throw new ChybaHttp(400, `Zpráva má nejvýš ${MAX_DELKA} znaků.`);
  if (!OBLASTI.has(oblast)) throw new ChybaHttp(400, "Neznámá oblast.");
  let platnost: string | null = null;
  if (platnostDo) {
    const d = new Date(platnostDo);
    if (Number.isNaN(d.getTime())) throw new ChybaHttp(400, "Neplatné datum platnosti.");
    platnost = d.toISOString();
  }
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO zpravy_izs (id, autor, text, oblast, platnost_do, stav, vytvoreno) VALUES (?, ?, ?, ?, ?, 'navrh', ?)")
    .bind(id, ucet.id, t, oblast, platnost, ted())
    .run();
  return json({ id }, 201);
}

export async function seznam(env: Env, ucet: Prihlaseny): Promise<Response> {
  if (!maRoli(ucet.role, "izs")) throw new ChybaHttp(403, "Jen pro partnery IZS a správce.");
  const dotaz = ucet.role === "admin"
    ? env.DB.prepare("SELECT * FROM zpravy_izs ORDER BY vytvoreno DESC LIMIT 200")
    : env.DB.prepare("SELECT * FROM zpravy_izs WHERE autor = ? ORDER BY vytvoreno DESC LIMIT 100").bind(ucet.id);
  const { results } = await dotaz.all<Record<string, unknown>>();
  return json({
    zpravy: results.map((r) => ({
      id: r.id, autor: r.autor, text: r.text, oblast: r.oblast, platnostDo: r.platnost_do, stav: r.stav,
      vytvoreno: r.vytvoreno, rozhodl: r.rozhodl, poznamka: r.poznamka, doruceno: r.doruceno,
    })),
  });
}

export async function rozhodni(env: Env, req: Request, ucet: Prihlaseny, id: string, jak: "schvalit" | "zamitnout"): Promise<Response> {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Rozhoduje jen správce.");
  const { poznamka } = await telo<{ poznamka?: string }>(req).catch(() => ({ poznamka: "" }));
  const z = await env.DB.prepare("SELECT z.*, u.nazev AS slozka FROM zpravy_izs z JOIN ucty u ON u.id = z.autor WHERE z.id = ?")
    .bind(id)
    .first<{ id: string; text: string; oblast: string; stav: string; slozka: string | null; platnost_do: string | null }>();
  if (!z) throw new ChybaHttp(404, "Zpráva neexistuje.");
  if (z.stav !== "navrh") throw new ChybaHttp(409, "O zprávě už bylo rozhodnuto.");
  if (z.platnost_do && new Date(z.platnost_do) < new Date()) throw new ChybaHttp(409, "Platnost zprávy už vypršela.");

  const novyStav = jak === "schvalit" ? "odeslano" : "zamitnuto";
  await env.DB.prepare("UPDATE zpravy_izs SET stav = ?, rozhodl = ?, rozhodnuto = ?, poznamka = ? WHERE id = ?")
    .bind(novyStav, ucet.id, ted(), (poznamka ?? "").slice(0, 300) || null, id)
    .run();
  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(ted(), ucet.id, `zpráva IZS ${jak === "schvalit" ? "schválena" : "zamítnuta"}`, id).run();

  let zasazeni = 0;
  if (jak === "schvalit") {
    zasazeni = await rozesli(env, {
      druh: "izs", zavaznost: "vysoka", oblast: z.oblast, kategorie: null,
      titulek: z.slozka ?? "Partner IZS", text: z.text, odkaz: null,
    }, `izs:${id}`);
  }
  return json({ ok: true, zasazeni });
}
