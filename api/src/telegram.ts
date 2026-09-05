import { posliTelegram } from "./dorucovani";
import { json, stejne } from "./pomocne";
import type { Env } from "./typy";

/*
  Webhook Telegramu. Bot umí dvě věci: /start <kód> propojí chat s účtem,
  /stop ho odpojí. Nic jiného nečte a nikam neposílá.
*/

interface Aktualizace {
  message?: { chat: { id: number }; text?: string };
}

export async function webhook(env: Env, req: Request): Promise<Response> {
  const tajemstvi = req.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
  if (!env.TELEGRAM_WEBHOOK_SECRET || !stejne(tajemstvi, env.TELEGRAM_WEBHOOK_SECRET)) return json({ chyba: "nepovoleno" }, 401);
  const u = (await req.json().catch(() => ({}))) as Aktualizace;
  const zprava = u.message;
  if (!zprava?.text) return json({ ok: true });
  const chat = String(zprava.chat.id);
  const [prikaz, arg] = zprava.text.trim().split(/\s+/, 2);

  if (prikaz.startsWith("/start")) {
    if (!arg) {
      await posliTelegram(env, chat, "Ahoj. Propojení uděláte z účtu na webu: Účet → Propojit Telegram. Kód pak přijde sem sám.");
      return json({ ok: true });
    }
    const p = await env.DB.prepare("SELECT ucet_id, expirace FROM propojeni WHERE kod = ? AND druh = 'telegram'").bind(arg).first<{ ucet_id: string; expirace: string }>();
    await env.DB.prepare("DELETE FROM propojeni WHERE kod = ?").bind(arg).run();
    if (!p || new Date(p.expirace) < new Date()) {
      await posliTelegram(env, chat, "Kód nesedí nebo vypršel. Vygenerujte v účtu nový.");
      return json({ ok: true });
    }
    await env.DB.prepare("INSERT OR REPLACE INTO kanaly (ucet_id, druh, cil, vytvoreno) VALUES (?, 'telegram', ?, ?)").bind(p.ucet_id, chat, new Date().toISOString()).run();
    await posliTelegram(env, chat, "✅ Propojeno. Odteď sem chodí, co jste si v účtu nastavili.\n\n<i>CzechPatrol je analytický přehled, ne úřední varování. V nouzi volejte 112.</i>");
    return json({ ok: true });
  }

  if (prikaz.startsWith("/stop")) {
    await env.DB.prepare("DELETE FROM kanaly WHERE druh = 'telegram' AND cil = ?").bind(chat).run();
    await posliTelegram(env, chat, "Odpojeno. Nic dalšího sem nepřijde. Propojit znovu jde kdykoli z účtu.");
    return json({ ok: true });
  }

  await posliTelegram(env, chat, "Umím jen /start <kód> a /stop. Nastavení je v účtu na webu.");
  return json({ ok: true });
}

/** Zaregistruje webhook u Telegramu — volá se z nasazení. */
export async function nastavWebhook(env: Env, url: string): Promise<Response> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) return json({ chyba: "chybí token nebo tajemství" }, 503);
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message"] }),
  });
  return json(await r.json());
}
