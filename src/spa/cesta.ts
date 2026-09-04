/**
 * Minimalistické směrování pro klikací náhled.
 *
 * Náhled je jedna stránka bez serveru, takže cestu drží fragment adresy.
 * Skutečný web tenhle modul nepoužívá — tam směruje Next.
 */

const posluchaci = new Set<() => void>();

export function cesta(): string {
  const h = typeof location === "undefined" ? "" : decodeURIComponent(location.hash.slice(1));
  return h || "/";
}

export function jdi(kam: string) {
  location.hash = kam;
}

export function sleduj(f: () => void): () => void {
  posluchaci.add(f);
  return () => posluchaci.delete(f);
}

if (typeof window !== "undefined") {
  addEventListener("hashchange", () => {
    for (const f of posluchaci) f();
    scrollTo(0, 0);
  });
}
