import { ChybaHttp, json, stejne, ted, telo } from "./pomocne";
import { jeRole, smiZmenitRoli } from "./role";
import type { Env, Prihlaseny, Role } from "./typy";

/* Správa účtů. Vidí identifikátory a role, ne lidi — nic víc tu není. */

function jenSpravce(ucet: Prihlaseny) {
  if (ucet.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
}

export async function ucty(env: Env, ucet: Prihlaseny): Promise<Response> {
  jenSpravce(ucet);
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.role, u.vytvoreno, u.posledni_prihlaseni, u.poznamka, u.nazev,
            (SELECT COUNT(*) FROM passkeys p WHERE p.ucet_id = u.id) AS passkeys,
            (SELECT COUNT(*) FROM kanaly k WHERE k.ucet_id = u.id AND k.druh = 'telegram') AS telegram,
            (SELECT COUNT(*) FROM kanaly k WHERE k.ucet_id = u.id AND k.druh = 'whatsapp') AS whatsapp
     FROM ucty u ORDER BY u.vytvoreno DESC LIMIT 500`,
  ).all<Record<string, unknown>>();
  return json({
    ucty: results.map((r) => ({
      id: r.id, role: r.role, vytvoreno: r.vytvoreno, posledniPrihlaseni: r.posledni_prihlaseni,
      poznamka: r.poznamka, nazev: r.nazev, passkeys: r.passkeys, telegram: Boolean(r.telegram), whatsapp: Boolean(r.whatsapp),
    })),
  });
}

export async function zmenRoli(env: Env, req: Request, ucet: Prihlaseny, id: string): Promise<Response> {
  jenSpravce(ucet);
  const { role, poznamka, nazev } = await telo<{ role: Role; poznamka?: string; nazev?: string }>(req);
  if (!jeRole(role)) throw new ChybaHttp(400, "Neznámá role.");
  const cil = await env.DB.prepare("SELECT role FROM ucty WHERE id = ?").bind(id).first<{ role: Role }>();
  if (!cil) throw new ChybaHttp(404, "Účet neexistuje.");
  const spravcu = (await env.DB.prepare("SELECT COUNT(*) AS n FROM ucty WHERE role = 'admin'").first<{ n: number }>())?.n ?? 0;
  const duvod = smiZmenitRoli(ucet.id, id, role, cil.role, spravcu);
  if (duvod) throw new ChybaHttp(400, duvod);
  if (role === "izs" && !(nazev ?? "").trim()) throw new ChybaHttp(400, "U partnera IZS je nutný název složky.");
  await env.DB.prepare("UPDATE ucty SET role = ?, poznamka = ?, nazev = ? WHERE id = ?")
    .bind(role, (poznamka ?? "").slice(0, 300) || null, role === "izs" ? (nazev ?? "").trim().slice(0, 120) : null, id)
    .run();
  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, ?, ?)").bind(ted(), ucet.id, `role ${cil.role} → ${role}`, id).run();
  return json({ ok: true });
}

export async function audit(env: Env, ucet: Prihlaseny): Promise<Response> {
  jenSpravce(ucet);
  const { results } = await env.DB.prepare("SELECT id, kdy, kdo, co, cil FROM audit ORDER BY id DESC LIMIT 300").all();
  return json({ audit: results });
}

/** První správce: jednorázový kód, který zná jen provozovatel. Funguje, jen dokud správce není. */
export async function bootstrap(env: Env, req: Request, ucet: Prihlaseny): Promise<Response> {
  const { kod } = await telo<{ kod: string }>(req);
  if (!env.ADMIN_BOOTSTRAP_KOD) throw new ChybaHttp(503, "Zavedení správce není nastavené.");
  const spravcu = (await env.DB.prepare("SELECT COUNT(*) AS n FROM ucty WHERE role = 'admin'").first<{ n: number }>())?.n ?? 0;
  if (spravcu > 0) throw new ChybaHttp(409, "Správce už existuje; další přidává správce.");
  if (!stejne(kod ?? "", env.ADMIN_BOOTSTRAP_KOD)) throw new ChybaHttp(400, "Kód nesedí.");
  await env.DB.prepare("UPDATE ucty SET role = 'admin' WHERE id = ?").bind(ucet.id).run();
  await env.DB.prepare("INSERT INTO audit (kdy, kdo, co, cil) VALUES (?, ?, 'zaveden první správce', ?)").bind(ted(), ucet.id, ucet.id).run();
  return json({ ok: true });
}
