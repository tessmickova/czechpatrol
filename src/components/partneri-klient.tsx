"use client";

import Link from "next/link";
import { useState } from "react";
import { API_URL, KONTAKTY_PRIJIMAME, PROVOZOVATEL } from "@/config/web";
import { zaznamejUdalost } from "@/lib/mereni";
import { Hlaska, POLE, Popisek, TLACITKO_AKCENT } from "./formulare";
import { Ikona } from "./ikony";

/*
  Poptávka banneru — krátký formulář (26. 9. 2026).

  Klíče voleb odpovídají api/src/partneri.ts. Platba se zatím nevybírá:
  po schválení se správce ozve s cenou; napojení brány přijde později.
  Bez uvedeného kontaktu provozovatele formulář nic neodesílá (GDPR,
  KONTAKTY_PRIJIMAME) — řekne to rovnou.
*/

const KATEGORIE = [
  ["pripravenost", "Připravenost a vybavení"], ["bezpecnost", "Bezpečnost a ochrana"], ["zdravi", "Zdraví a první pomoc"],
  ["energie", "Energie a záloha napájení"], ["komunikace", "Komunikace a spojení"], ["vzdelavani", "Vzdělávání a kurzy"], ["jine", "Jiné"],
] as const;
const UMISTENI = [["paticka", "Před patičkou na všech stránkách"], ["uvod", "Na úvodu pod aktualitami"], ["oboje", "Obojí"]] as const;
const OBDOBI = [["mesic", "Měsíc"], ["ctvrtleti", "Čtvrtletí"], ["rok", "Rok"], ["jednorazove", "Jednorázová akce"]] as const;
const VERZE_SOUHLASU = "2026-09-26";

export function PartneriFormular() {
  const [f, setF] = useState({ firma: "", web: "", email: "", kategorie: "pripravenost", umisteni: "paticka", obdobi: "mesic", zprava: "" });
  const [souhlas, setSouhlas] = useState(false);
  const [past, setPast] = useState("");
  const [odesila, setOdesila] = useState(false);
  const [stav, setStav] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const zmen = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (!KONTAKTY_PRIJIMAME) {
    return (
      <Hlaska typ="info">
        Poptávky začneme přijímat, jakmile na web doplníme kontakt provozovatele — bez něj nesmíme ukládat kontaktní údaje.
        Formulář tu pak bude hned funkční.
      </Hlaska>
    );
  }

  const odesli = async (e: React.FormEvent) => {
    e.preventDefault();
    setStav(null);
    if (!souhlas) { setStav({ typ: "chyba", text: "Bez souhlasu poptávku neuložíme." }); return; }
    setOdesila(true);
    try {
      const r = await fetch(`${API_URL}/partneri/poptavka`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, souhlas, past, verze: VERZE_SOUHLASU }),
      });
      const data = (await r.json().catch(() => ({}))) as { chyba?: string };
      if (!r.ok) throw new Error(data.chyba ?? "Nepovedlo se odeslat.");
      zaznamejUdalost("partner_poptavka", { umisteni: f.umisteni });
      setStav({ typ: "ok", text: "Díky, poptávku máme. Posoudíme ji podle zásad výše a ozveme se na uvedený e-mail." });
      setF({ ...f, firma: "", web: "", email: "", zprava: "" });
    } catch (err) {
      setStav({ typ: "chyba", text: err instanceof Error ? err.message : "Nepovedlo se odeslat." });
    } finally {
      setOdesila(false);
    }
  };

  return (
    <form onSubmit={odesli} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Popisek pro="p-firma">Firma nebo projekt</Popisek><input id="p-firma" required value={f.firma} onChange={zmen("firma")} className={POLE} autoComplete="organization" /></div>
        <div><Popisek pro="p-web">Web, kam má banner vést</Popisek><input id="p-web" required value={f.web} onChange={zmen("web")} className={POLE} inputMode="url" placeholder="https://" /></div>
        <div><Popisek pro="p-email">Kontaktní e-mail</Popisek><input id="p-email" type="email" required value={f.email} onChange={zmen("email")} className={POLE} autoComplete="email" /></div>
        <div><Popisek pro="p-kat">Obor</Popisek><select id="p-kat" value={f.kategorie} onChange={zmen("kategorie")} className={POLE}>{KATEGORIE.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
        <div><Popisek pro="p-um">Umístění</Popisek><select id="p-um" value={f.umisteni} onChange={zmen("umisteni")} className={POLE}>{UMISTENI.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
        <div><Popisek pro="p-ob">Na jak dlouho</Popisek><select id="p-ob" value={f.obdobi} onChange={zmen("obdobi")} className={POLE}>{OBDOBI.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
      </div>
      <div><Popisek pro="p-zprava">Co nabízíte (nepovinné, pár vět)</Popisek><textarea id="p-zprava" value={f.zprava} onChange={zmen("zprava")} maxLength={800} rows={3} className={POLE} /></div>
      <label className="flex items-start gap-3 text-male leading-relaxed text-tlum">
        <input type="checkbox" checked={souhlas} onChange={(e) => setSouhlas(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-akcent" />
        <span>
          Souhlasím, aby <b className="font-semibold text-inkoust">{PROVOZOVATEL.nazev}</b> uložil údaje z poptávky a kontaktoval mě kvůli ní.
          Nevyřízené poptávky mažeme do roka. <Link href="/soukromi/#partneri" className="odkaz">Jak s údaji nakládáme</Link>
        </span>
      </label>
      {/* past na roboty — lidé pole nevidí */}
      <input tabIndex={-1} autoComplete="off" value={past} onChange={(e) => setPast(e.target.value)} className="hidden" aria-hidden />
      {stav && <Hlaska typ={stav.typ}>{stav.text}</Hlaska>}
      <button type="submit" disabled={odesila} className={TLACITKO_AKCENT}>
        <Ikona nazev="odeslat" velikost={14} tah={2} /> {odesila ? "Odesílám…" : "Odeslat poptávku"}
      </button>
    </form>
  );
}
