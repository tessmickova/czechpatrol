import { novyKod, obnova, odhlasit, passkeyDokoncit, prihlaseniDokoncit, prihlaseniZacit, registraceDokoncit, registraceZacit, vyzadujPrihlaseni } from "./auth";
import { posliSplatne } from "./dorucovani";
import * as izs from "./izs";
import * as ja from "./ja";
import { ChybaHttp, json, povolenyPuvod, sCors } from "./pomocne";
import { zkontrolujSber } from "./hlidac";
import { kopniDoSberu } from "./sber";
import * as navrhy from "./navrhy";
import * as sprava from "./sprava";
import * as tipy from "./tipy";
import { synchronizuj, uklid } from "./synchronizace";
import { nastavWebhook, webhook } from "./telegram";
import type { Env } from "./typy";

/*
  Směrování. Každá cesta je jeden řádek, aby bylo na první pohled vidět,
  co API umí a kdo na to smí. Cokoli jiného je 404.
*/

type Obsluha = (req: Request, env: Env, url: URL, param: string) => Promise<Response>;

const CESTY: [string, RegExp, Obsluha][] = [
  ["GET", /^\/zdravi$/, async () => json({ ok: true, cas: new Date().toISOString() })],

  ["POST", /^\/auth\/registrace\/zacit$/, (req, env) => registraceZacit(env, req)],
  ["POST", /^\/auth\/registrace\/dokoncit$/, (req, env) => registraceDokoncit(env, req)],
  ["POST", /^\/auth\/prihlaseni\/zacit$/, (req, env) => prihlaseniZacit(env, req)],
  ["POST", /^\/auth\/prihlaseni\/dokoncit$/, (req, env) => prihlaseniDokoncit(env, req)],
  ["POST", /^\/auth\/obnova$/, (req, env) => obnova(env, req)],
  ["POST", /^\/auth\/odhlaseni$/, (req, env) => odhlasit(env, req)],

  ["GET", /^\/ja$/, async (req, env) => ja.ja(env, await vyzadujPrihlaseni(env, req))],
  ["DELETE", /^\/ja$/, async (req, env) => ja.smazUcet(env, await vyzadujPrihlaseni(env, req))],
  ["GET", /^\/ja\/upozorneni$/, async (req, env) => ja.upozorneni(env, await vyzadujPrihlaseni(env, req))],
  ["PUT", /^\/ja\/upozorneni$/, async (req, env) => ja.ulozUpozorneni(env, req, await vyzadujPrihlaseni(env, req))],
  ["POST", /^\/ja\/obnova$/, async (req, env) => novyKod(env, await vyzadujPrihlaseni(env, req))],
  ["POST", /^\/ja\/passkey\/zacit$/, async (req, env) => registraceZacit(env, req, (await vyzadujPrihlaseni(env, req)).id)],
  ["POST", /^\/ja\/passkey\/dokoncit$/, async (req, env) => passkeyDokoncit(env, req, await vyzadujPrihlaseni(env, req))],
  ["POST", /^\/ja\/telegram\/kod$/, async (req, env) => ja.telegramKod(env, await vyzadujPrihlaseni(env, req))],
  ["DELETE", /^\/ja\/telegram$/, async (req, env) => ja.odpojKanal(env, await vyzadujPrihlaseni(env, req), "telegram")],
  ["PUT", /^\/ja\/whatsapp$/, async (req, env) => ja.ulozWhatsapp(env, req, await vyzadujPrihlaseni(env, req))],
  ["DELETE", /^\/ja\/whatsapp$/, async (req, env) => ja.odpojKanal(env, await vyzadujPrihlaseni(env, req), "whatsapp")],

  ["GET", /^\/izs\/zpravy$/, async (req, env) => izs.seznam(env, await vyzadujPrihlaseni(env, req))],
  ["POST", /^\/izs\/zpravy$/, async (req, env) => izs.navrhni(env, req, await vyzadujPrihlaseni(env, req))],
  ["POST", /^\/sprava\/zpravy\/([\w-]+)\/schvalit$/, async (req, env, _u, id) => izs.rozhodni(env, req, await vyzadujPrihlaseni(env, req), id, "schvalit")],
  ["POST", /^\/sprava\/zpravy\/([\w-]+)\/zamitnout$/, async (req, env, _u, id) => izs.rozhodni(env, req, await vyzadujPrihlaseni(env, req), id, "zamitnout")],

  ["GET", /^\/sprava\/ucty$/, async (req, env) => sprava.ucty(env, await vyzadujPrihlaseni(env, req))],
  ["PUT", /^\/sprava\/ucty\/([\w-]+)\/role$/, async (req, env, _u, id) => sprava.zmenRoli(env, req, await vyzadujPrihlaseni(env, req), id)],
  ["GET", /^\/sprava\/audit$/, async (req, env) => sprava.audit(env, await vyzadujPrihlaseni(env, req))],
  ["POST", /^\/sprava\/bootstrap$/, async (req, env) => sprava.bootstrap(env, req, await vyzadujPrihlaseni(env, req))],
  ["POST", /^\/sprava\/telegram-webhook$/, async (req, env, url) => {
    const u = await vyzadujPrihlaseni(env, req);
    if (u.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
    return nastavWebhook(env, `${url.origin}/telegram/webhook`);
  }],
  ["POST", /^\/sprava\/synchronizovat$/, async (req, env) => {
    const u = await vyzadujPrihlaseni(env, req);
    if (u.role !== "admin") throw new ChybaHttp(403, "Jen pro správce.");
    return json(await synchronizuj(env));
  }],

  ["POST", /^\/tipy$/, (req, env) => tipy.prijmi(env, req)],
  ["GET", /^\/sprava\/navrhy$/, async (req, env) => navrhy.seznam(env, await vyzadujPrihlaseni(env, req))],
  ["POST", /^\/sprava\/navrhy\/([\w.-]+)\/rozhodnout$/, async (req, env, _u, id) => navrhy.rozhodni(env, req, await vyzadujPrihlaseni(env, req), id)],
  ["GET", /^\/sprava\/tipy$/, async (req, env) => tipy.seznam(env, await vyzadujPrihlaseni(env, req))],
  ["PUT", /^\/sprava\/tipy\/([\w-]+)$/, async (req, env, _u, id) => tipy.vyrid(env, req, await vyzadujPrihlaseni(env, req), id)],

  ["POST", /^\/telegram\/webhook$/, (req, env) => webhook(env, req)],
];

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const puvod = povolenyPuvod(env, req.headers.get("Origin"));

    if (req.method === "OPTIONS") {
      return sCors(new Response(null, { status: puvod ? 204 : 403 }), puvod);
    }

    // Prohlížeč z jiného původu než web sem nesmí; webhook a zdraví původ nemají.
    const origin = req.headers.get("Origin");
    if (origin && !puvod) return json({ chyba: "Původ není povolen." }, 403);

    try {
      for (const [metoda, vzor, obsluha] of CESTY) {
        if (req.method !== metoda) continue;
        const m = url.pathname.match(vzor);
        if (!m) continue;
        return sCors(await obsluha(req, env, url, m[1] ?? ""), puvod);
      }
      return sCors(json({ chyba: "Nenalezeno." }, 404), puvod);
    } catch (e) {
      if (e instanceof ChybaHttp) return sCors(json({ chyba: e.message }, e.stav), puvod);
      console.error(e);
      return sCors(json({ chyba: "Chyba serveru." }, 500), puvod);
    }
  },

  async scheduled(udalost: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        // Sběr dat kope worker, protože plánovač GitHubu běhy zahazuje.
        // Selhání sběru nesmí shodit rozesílání upozornění, proto zvlášť.
        try {
          const b = await kopniDoSberu(env, udalost.scheduledTime);
          if (b.spusteno) console.log("[sběr] spuštěn");
          else if (b.duvod && b.duvod !== "není čas") console.warn(`[sběr] nespuštěn — ${b.duvod}`);
        } catch (e) {
          console.error("[sběr]", e);
        }

        /*
          Kopnout do sběru nestačí. Když GitHub kopnutí přijme a pak běh
          shodí, vypadá to odsud stejně jako úspěch — a přesně tak se stalo,
          že web dva dny stál a nikdo o tom nevěděl. Hlídač se dívá na to,
          jak běhy dopadly.
        */
        try {
          const h = await zkontrolujSber(env, udalost.scheduledTime);
          if (h?.ohlaseno.length) console.warn(`[hlídač] ohlášeno ${h.ohlaseno.join(", ")} — ${Math.round(h.hodin)} h bez sběru`);
        } catch (e) {
          console.error("[hlídač]", e);
        }

        try {
          const s = await synchronizuj(env);
          if (s.zprav) console.log(`[sync] zpráv ${s.zprav}, čtenářů ${s.zasazeni}`);
        } catch (e) {
          console.error("[sync]", e);
        }
        const d = await posliSplatne(env, env.PUVOD_WEBU);
        if (d.odeslano || d.selhalo) console.log(`[doručení] odesláno ${d.odeslano}, selhalo ${d.selhalo}`);
        await uklid(env);
      })(),
    );
  },
} satisfies ExportedHandler<Env>;
