/**
 * Minimalistické směrování pro klikací náhled.
 *
 * Náhled je jedna stránka bez serveru, takže cestu drží fragment adresy.
 * Část za otazníkem je dotaz (filtry, otevřený detail) — stejně jako
 * na ostrém webu, jen uvnitř fragmentu. Skutečný web tenhle modul nepoužívá.
 */

const posluchaci = new Set<() => void>();

function cely(): string {
  const h = typeof location === "undefined" ? "" : decodeURIComponent(location.hash.slice(1));
  return h || "/";
}

export function cesta(): string {
  return cely().split("?")[0] || "/";
}

export function dotaz(): string {
  const i = cely().indexOf("?");
  return i === -1 ? "" : cely().slice(i + 1);
}

export function jdi(kam: string) {
  location.hash = kam;
}

export function sleduj(f: () => void): () => void {
  posluchaci.add(f);
  return () => posluchaci.delete(f);
}

if (typeof window !== "undefined") {
  let posledniCesta = cesta();
  addEventListener("hashchange", () => {
    for (const f of posluchaci) f();
    // Změna jen dotazu (filtr, detail) nesmí odrolovat nahoru.
    const nyni = cesta();
    if (nyni !== posledniCesta) scrollTo(0, 0);
    posledniCesta = nyni;
  });
}
