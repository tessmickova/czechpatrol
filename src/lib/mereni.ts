/**
 * Měření použití — minimální a vypnuté, dokud není kam posílat.
 *
 * Slovník událostí je pevný. Bez adresy NEXT_PUBLIC_MERENI_URL se nic
 * neodesílá ani neukládá; funkce je pak prázdná. Nikdy se neposílá
 * poloha, IP ani identifikátor zařízení — jen název události a
 * krátký kontext (např. slug záznamu nebo název filtru).
 */

export type UdalostMereni =
  | "overview_view"
  | "event_open"
  | "source_open"
  | "filter_apply"
  | "preference_save"
  | "subscription_complete"
  | "feedback_submit"
  | "support_complete";

export const SLOVNIK_MERENI: Record<UdalostMereni, string> = {
  overview_view: "zobrazení přehledu",
  event_open: "otevření detailu události",
  source_open: "kliknutí na zdroj",
  filter_apply: "použití filtru",
  preference_save: "uložení předvolby v Mém přehledu",
  subscription_complete: "dokončený odběr",
  feedback_submit: "odeslané hlášení nebo zpětná vazba",
  support_complete: "dokončená podpora projektu",
};

const ADRESA = (process.env.NEXT_PUBLIC_MERENI_URL ?? "").replace(/\/$/, "");

export const MERENI_ZAPNUTO = ADRESA !== "";

export function zaznamejUdalost(udalost: UdalostMereni, kontext: Record<string, string> = {}) {
  if (!MERENI_ZAPNUTO || typeof navigator === "undefined") return;
  const telo = JSON.stringify({ udalost, kontext, cesta: location.pathname, kdy: new Date().toISOString() });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon(`${ADRESA}/udalost`, telo);
    else fetch(`${ADRESA}/udalost`, { method: "POST", body: telo, keepalive: true }).catch(() => {});
  } catch {
    /* měření nikdy nesmí rozbít stránku */
  }
}
