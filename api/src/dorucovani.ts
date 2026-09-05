import { prostyText, textSouhrnu, textZpravy, type ZpravaKTextu } from "./upozorneni";
import type { DruhKanalu, Env } from "./typy";

/*
  Doručení. Každý kanál je jedna funkce: text dovnitř, výsledek ven.
  Selhání se zapíše a zkusí znovu, nejvýš třikrát; pak zůstane ve frontě
  jako nedoručené s důvodem.
*/

export async function posliTelegram(env: Env, chatId: string, html: string): Promise<{ ok: boolean; chyba?: string }> {
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, chyba: "telegram: chybí token" };
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (r.ok) return { ok: true };
  const t = await r.text().catch(() => "");
  return { ok: false, chyba: `telegram ${r.status}: ${t.slice(0, 200)}` };
}

/**
 * WhatsApp Cloud API. Zpráva mimo 24hodinové okno musí být schválená
 * šablona — bez ní Meta text odmítne. Tady se posílá text; provozovatel
 * musí mít šablonu schválenou a tuhle funkci na ni přepnout.
 */
export async function posliWhatsapp(env: Env, cislo: string, text: string): Promise<{ ok: boolean; chyba?: string }> {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) return { ok: false, chyba: "whatsapp: chybí přístup" };
  const r = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: cislo.replace(/[^\d]/g, ""), type: "text", text: { body: text } }),
  });
  if (r.ok) return { ok: true };
  const t = await r.text().catch(() => "");
  return { ok: false, chyba: `whatsapp ${r.status}: ${t.slice(0, 200)}` };
}

interface Splatna {
  id: number;
  ucet_id: string;
  druh: DruhKanalu;
  cil: string;
  zprava_id: string;
  zdruh: ZpravaKTextu["druh"];
  zavaznost: ZpravaKTextu["zavaznost"];
  titulek: string;
  text: string;
  odkaz: string | null;
  oblast: string | null;
  naplanovano: string;
  pokusy: number;
}

/** Pošle, co je splatné. Víc zpráv pro stejného čtenáře ve stejný čas jde jako souhrn. */
export async function posliSplatne(env: Env, web: string, limit = 200): Promise<{ odeslano: number; selhalo: number }> {
  const nyni = new Date().toISOString();
  const { results } = await env.DB.prepare(
    `SELECT f.id, f.ucet_id, f.druh, k.cil, f.zprava_id, z.druh AS zdruh, z.zavaznost, z.titulek, z.text, z.odkaz, z.oblast, f.naplanovano, f.pokusy
     FROM fronta f
     JOIN zpravy z ON z.id = f.zprava_id
     JOIN kanaly k ON k.ucet_id = f.ucet_id AND k.druh = f.druh
     WHERE f.odeslano IS NULL AND f.naplanovano <= ? AND f.pokusy < 3
     ORDER BY f.ucet_id, f.druh, f.naplanovano
     LIMIT ?`,
  ).bind(nyni, limit).all<Splatna>();

  // seskupit: stejný čtenář + kanál + naplánovaný čas (souhrny)
  const skupiny = new Map<string, Splatna[]>();
  for (const r of results) {
    const klic = `${r.ucet_id}|${r.druh}|${r.naplanovano.slice(0, 16)}`;
    skupiny.set(klic, [...(skupiny.get(klic) ?? []), r]);
  }

  let odeslano = 0, selhalo = 0;
  for (const radky of skupiny.values()) {
    const zpravy: ZpravaKTextu[] = radky.map((r) => ({ druh: r.zdruh, zavaznost: r.zavaznost, titulek: r.titulek, text: r.text, odkaz: r.odkaz, oblast: r.oblast }));
    const html = zpravy.length === 1 ? textZpravy(zpravy[0]) : textSouhrnu(zpravy, web);
    const prvni = radky[0];
    const v = prvni.druh === "telegram" ? await posliTelegram(env, prvni.cil, html) : await posliWhatsapp(env, prvni.cil, prostyText(html));
    const ids = radky.map((r) => r.id);
    if (v.ok) {
      odeslano += ids.length;
      await env.DB.prepare(`UPDATE fronta SET odeslano = ?, vysledek = 'ok', pokusy = pokusy + 1 WHERE id IN (${ids.map(() => "?").join(",")})`).bind(nyni, ...ids).run();
      // počítadlo doručení u zpráv partnera IZS
      const izs = radky.filter((r) => r.zdruh === "izs").map((r) => r.zprava_id);
      for (const zid of new Set(izs)) {
        await env.DB.prepare("UPDATE zpravy_izs SET doruceno = doruceno + ? WHERE id = ?").bind(izs.filter((x) => x === zid).length, zid.replace(/^izs:/, "")).run();
      }
    } else {
      selhalo += ids.length;
      await env.DB.prepare(`UPDATE fronta SET vysledek = ?, pokusy = pokusy + 1 WHERE id IN (${ids.map(() => "?").join(",")})`).bind(v.chyba ?? "chyba", ...ids).run();
      // Chat, který bota zablokoval, se odpojí — dál by to jen selhávalo.
      if (prvni.druh === "telegram" && /403/.test(v.chyba ?? "")) {
        await env.DB.prepare("DELETE FROM kanaly WHERE ucet_id = ? AND druh = 'telegram'").bind(prvni.ucet_id).run();
      }
    }
  }
  return { odeslano, selhalo };
}
