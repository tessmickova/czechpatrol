/**
 * Stav v adrese: filtry a otevřený detail.
 *
 * Adresa je jediný zdroj pravdy pro filtry — jde ji sdílet, uložit do
 * záložek a tlačítko Zpět funguje. Na ostrém webu je to část za otazníkem;
 * v klikacím náhledu, který směruje přes fragment, táž část uvnitř fragmentu.
 */

const jeNahled = () => typeof location !== "undefined" && location.hash.startsWith("#/");

export function ctiDotaz(): URLSearchParams {
  if (typeof location === "undefined") return new URLSearchParams();
  if (jeNahled()) {
    const h = decodeURIComponent(location.hash.slice(1));
    const i = h.indexOf("?");
    return new URLSearchParams(i === -1 ? "" : h.slice(i + 1));
  }
  return new URLSearchParams(location.search);
}

/**
 * Zapíše dotaz do adresy. Filtry se nahrazují (replace), aby Zpět nevracelo
 * každé kliknutí; otevření detailu se přidává (push), aby ho Zpět zavřelo.
 */
export function zapisDotaz(p: URLSearchParams, zpusob: "replace" | "push" = "replace") {
  if (typeof location === "undefined") return;
  const s = p.toString();
  if (jeNahled()) {
    const h = decodeURIComponent(location.hash.slice(1));
    const zaklad = h.split("?")[0] || "/";
    const nova = `#${zaklad}${s ? `?${s}` : ""}`;
    if (nova === location.hash) return;
    if (zpusob === "push") {
      location.hash = nova;
    } else {
      history.replaceState(null, "", nova);
      dispatchEvent(new HashChangeEvent("hashchange"));
    }
    return;
  }
  const nova = `${location.pathname}${s ? `?${s}` : ""}${location.hash}`;
  if (nova === `${location.pathname}${location.search}${location.hash}`) return;
  if (zpusob === "push") history.pushState(null, "", nova);
  else history.replaceState(null, "", nova);
  dispatchEvent(new PopStateEvent("popstate"));
}

/** Přihlášení ke změnám adresy (Zpět/Vpřed i vlastní zápisy). */
export function sledujDotaz(f: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  addEventListener("popstate", f);
  addEventListener("hashchange", f);
  return () => {
    removeEventListener("popstate", f);
    removeEventListener("hashchange", f);
  };
}
