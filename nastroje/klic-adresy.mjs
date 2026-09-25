/**
 * Klíč adresy článku pro porovnání „je to týž článek?“.
 *
 * RSS kanály přidávají k odkazům sledovací parametry (utm_…) a kotvy
 * (#utm_source=rss). Záznam přitom nese adresu bez nich. Porovnání přesné
 * adresy proto 25. 9. 2026 nespárovalo články ČTK a iDNES s už
 * zveřejněným záznamem o Putinově výroku a na úvodu visely zároveň jako
 * „zachyceno“ i jako záznam. Klíč zahodí jen to, co článek nemění:
 * kotvu, sledovací parametry, „www.“, koncové lomítko a http/https.
 * Ostatní parametry zůstávají — u některých webů určují, o jaký článek jde.
 */
const SLEDOVACI = /^(utm_\w+|fbclid|gclid|dclid|mc_cid|mc_eid|ref|ref_src|rss|at_medium|at_campaign|xtor)$/i;

export function klicAdresy(url) {
  if (!url || typeof url !== "string") return "";
  let u;
  try { u = new URL(url.trim()); } catch { return url.trim(); }
  const parametry = [...u.searchParams.entries()]
    .filter(([k]) => !SLEDOVACI.test(k))
    .sort(([a], [b]) => a.localeCompare(b));
  const dotaz = parametry.length ? "?" + new URLSearchParams(parametry).toString() : "";
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const cesta = u.pathname.replace(/\/+$/, "");
  return `${host}${cesta}${dotaz}`;
}
