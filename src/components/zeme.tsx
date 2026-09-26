
/** Český tvar podle počtu: 1 čin, 2–4 činy, 0 a 5+ činů. */
export const sklon = (n: number, j: string, mn: string, mnoho: string) => (n === 1 ? j : n >= 2 && n <= 4 ? mn : mnoho);

/** Vlajka z kódu země — dvě písmena, žádné obrázky. */
export function Vlajka({ kod, velka = false }: { kod: string; velka?: boolean }) {
  const k = kod.toUpperCase();
  // XZ = mezinárodní vody (kód pro místa mimo státy); NATO a jiná seskupení nemají vlajku.
  const emoji = k === "XZ" ? "🌊"
    : k.length === 2 && k !== "EU"
    ? String.fromCodePoint(...[...k].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : k === "EU" ? "🇪🇺" : "🏳️";
  return (
    <span role="img" aria-label={k} className={`inline-block shrink-0 ${velka ? "text-cislo leading-none" : "text-vetsi leading-none"}`}>
      {emoji}
    </span>
  );
}

