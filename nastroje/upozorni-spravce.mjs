/**
 * Upozornění správci na Telegram (25. 9. 2026).
 *
 *   node nastroje/upozorni-spravce.mjs "text"          # nebo text ze souboru .strazce/zprava.txt
 *
 * Posílá do SPRAVCE_CHAT přes TELEGRAM_BOT_TOKEN. Stejnou zprávu nepošle
 * dvakrát za 6 hodin (otisk v .strazce/posledni.json, který workflow drží
 * v mezipaměti), ať sběr každých 30 minut nezahltí telefon. Bez tokenu
 * nebo chatu zprávu jen vypíše. Nikdy nekončí chybou.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const soubor = path.join(koren, ".strazce/zprava.txt");
const pamet = path.join(koren, ".strazce/posledni.json");
const text = (process.argv.slice(2).join(" ") || (fs.existsSync(soubor) ? fs.readFileSync(soubor, "utf-8") : "")).trim();
if (!text) process.exit(0);

const otisk = crypto.createHash("sha256").update(text.replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, "")).digest("hex").slice(0, 16);
let minule = {};
try { minule = JSON.parse(fs.readFileSync(pamet, "utf-8")); } catch { /* první běh */ }
const ted = Date.now();
if (minule[otisk] && ted - minule[otisk] < 6 * 3_600_000) {
  console.log("[upozornění] stejná zpráva odešla před méně než 6 h, znovu se neposílá");
  process.exit(0);
}

const odkaz = process.env.GITHUB_RUN_ID ? `\nBěh: https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : "";
const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.SPRAVCE_CHAT;
if (!token || !chat) {
  console.log(`[upozornění] bez Telegramu:\n${text}${odkaz}`);
  process.exit(0);
}
try {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: `⚠️ CzechPatrol\n${text}${odkaz}`.slice(0, 4000), disable_web_page_preview: true }),
  });
  console.log(`[upozornění] Telegram ${r.status}`);
  if (r.ok) {
    minule[otisk] = ted;
    for (const [k, v] of Object.entries(minule)) if (ted - v > 86_400_000) delete minule[k];
    fs.mkdirSync(path.dirname(pamet), { recursive: true });
    fs.writeFileSync(pamet, JSON.stringify(minule));
  }
} catch (e) {
  console.log(`[upozornění] nepodařilo se odeslat: ${e instanceof Error ? e.message : e}`);
}
