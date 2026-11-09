/**
 * Pravidla o redakcích bez čtení souborů (9. 11. 2026).
 *
 * Totéž co nastroje/napadane-redakce.mjs, jen data předává volající. Důvod:
 * napadane-redakce.mjs čte data přes node:fs a do prohlížeče se nedostane,
 * a web potřebuje stejné pravidlo pro zvýraznění naléhavých zpráv („aspoň
 * dvě nezávislé redakce, s napadenou tři“). Jedno pravidlo, dva vstupy.
 */
export function domenaZdroje(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

const sedi = (host, domena) => Boolean(host && domena) && (host === domena || host.endsWith(`.${domena}`));

/** Napodobenina redakce: nikdy není zdroj. */
export function jeFalesnaRedakce(zdroj, data) {
  const host = domenaZdroje(zdroj?.url);
  return (data?.falesne ?? []).some((f) => sedi(host, f.domena));
}

/** Redakce s doloženým průnikem, dokud riziko nepominulo (`do`). Pozná se podle domény, nebo podle jména zdroje. */
export function jeNapadenaRedakce(zdroj, data, ted = Date.now()) {
  const host = domenaZdroje(zdroj?.url);
  const nazev = String(zdroj?.nazev ?? "").toLowerCase();
  return (data?.redakce ?? []).some((r) => {
    if (r.do && new Date(r.do).getTime() < ted) return false;
    if (r.od && new Date(r.od).getTime() > ted) return false;
    if (r.domena) return sedi(host, r.domena);
    return Boolean(r.nazev) && nazev.includes(String(r.nazev).toLowerCase());
  });
}

/** Kolik nezávislých redakcí zpráva potřebuje: dvě; s napadenou redakcí mezi zdroji tři. */
export function potrebnychRedakci(zdroje, data, ted = Date.now()) {
  return (zdroje ?? []).some((z) => jeNapadenaRedakce(z, data, ted)) ? 3 : 2;
}

/** Počet různých domén mezi zdroji; Google News a napodobeniny se nepočítají. */
export function nezavisleRedakce(zdroje, data) {
  const domeny = new Set();
  for (const z of zdroje ?? []) {
    const d = domenaZdroje(z?.url);
    if (d && d !== "news.google.com" && !jeFalesnaRedakce(z, data)) domeny.add(d);
  }
  return domeny.size;
}

/** Má zpráva dost nezávislých redakcí? Jedno místo pro pravidlo. */
export function dostRedakci(zdroje, data, ted = Date.now()) {
  return nezavisleRedakce(zdroje, data) >= potrebnychRedakci(zdroje, data, ted);
}
