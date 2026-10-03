import type { VzorObalky } from "@/lib/letaky";

/*
  Náhled obálky příručky (3. 10. 2026). Kreslený vlastní náhled v barvách
  vydavatele, ne kopie obálky ani loga: obrázky obálek jsou cizí dílo
  a loga úřadů nemáme právo používat. Název je napsaný přímo v náhledu.
*/
const STYL: Record<VzorObalky, { pozadi: string; pruh: string; text: string; velky: string; maly: string }> = {
  hzs: { pozadi: "#b3141c", pruh: "#f6c40e", text: "#fff", velky: "Pro případ ohrožení", maly: "příručka pro obyvatele" },
  "hzs-letak": { pozadi: "#f6c40e", pruh: "#b3141c", text: "#1a1a1a", velky: "Varování obyvatelstva", maly: "leták A4" },
  "72h": { pozadi: "#13306b", pruh: "#e8484f", text: "#fff", velky: "72 hodin", maly: "připravte se" },
  pl: { pozadi: "#ffffff", pruh: "#dc143c", text: "#1a1a1a", velky: "Poradnik bezpieczeństwa", maly: "polská vláda" },
  se: { pozadi: "#ffd200", pruh: "#006aa7", text: "#111", velky: "In case of crisis or war", maly: "švédská brožura" },
};

function radky(text: string, sirka: number): string[] {
  const slova = text.split(" ");
  const out: string[] = [];
  for (const w of slova) {
    const posledni = out[out.length - 1];
    if (posledni && (posledni + " " + w).length <= sirka) out[out.length - 1] = posledni + " " + w;
    else out.push(w);
  }
  return out;
}

export function ObalkaPrirucky({ vzor, trida = "" }: { vzor: VzorObalky; trida?: string }) {
  const s = STYL[vzor];
  const r = radky(s.velky, vzor === "72h" ? 8 : 12);
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={`Náhled: ${s.velky}`} className={trida}>
      <rect width="120" height="160" rx="8" fill={s.pozadi} />
      {vzor === "pl" ? <rect y="96" width="120" height="64" fill={s.pruh} /> : <rect y="0" width="120" height="14" fill={s.pruh} />}
      {vzor === "se" && <rect x="0" y="122" width="120" height="10" fill={s.pruh} />}
      {vzor === "72h" ? (
        <text x="12" y="78" fill={s.text} fontSize="44" fontWeight="800" fontFamily="system-ui, sans-serif">72</text>
      ) : null}
      {r.map((t, i) => (
        <text key={t} x="12" y={(vzor === "72h" ? 98 : 40) + i * 14} fill={s.text} fontSize={vzor === "72h" ? 13 : 12} fontWeight="800" fontFamily="system-ui, sans-serif">{t}</text>
      ))}
      <text x="12" y={vzor === "pl" ? 88 : 148} fill={vzor === "pl" ? "#555" : s.text} opacity="0.85" fontSize="8" fontFamily="system-ui, sans-serif">{s.maly}</text>
      {vzor === "hzs-letak" && <path d="M12 118 Q20 104 28 118 T44 118 T60 118 T76 118 T92 118 T108 118" fill="none" stroke={s.pruh} strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}
