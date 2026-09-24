"use client";

import { useCallback, useEffect, useState } from "react";
import { datumCas } from "@/lib/format";
import { KRAJE_ODOLNOSTI } from "@/lib/odolnost";
import { api } from "@/lib/ucet";
import { useDialog } from "./dialog";
import { Hlaska, POLE } from "./formulare";
import { Karta } from "./zaklad";

/*
  Žebříček ve Správě. Jediné místo, kde je vidět kontakt (pokud ho člověk
  nechal) — každé čtení kontaktů zapisuje API do auditu. Správce označí,
  co s kým udělal (pozván, člen, nezájem), nebo záznam smaže.
*/

interface Zaznam {
  id: string; ucetId: string; vytvoreno: string; aktualizovano: string; prezdivka: string; skore: number; kraj: string | null; osob: number | null;
  email: string | null; telefon: string | null; souhlasKdy: string | null; stav: string; poznamka: string | null;
}

const STAVY: { klic: string; nazev: string }[] = [
  { klic: "novy", nazev: "nový" }, { klic: "pozvan", nazev: "pozván" }, { klic: "clen", nazev: "člen komunity" }, { klic: "nezajem", nazev: "nezájem" },
];

export function SpravaZebricku() {
  const [zaznamy, setZaznamy] = useState<Zaznam[]>([]);
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const { potvrd } = useDialog();

  const nacti = useCallback(async () => {
    try { setZaznamy((await api<{ zaznamy: Zaznam[] }>("/sprava/zebricek")).zaznamy); } catch (e) { setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se načíst žebříček." }); }
  }, []);
  useEffect(() => { nacti(); }, [nacti]);

  const uloz = async (z: Zaznam, zmena: Partial<Pick<Zaznam, "stav" | "poznamka">>) => {
    try { await api(`/sprava/zebricek/${z.id}`, { method: "PUT", telo: { stav: zmena.stav ?? z.stav, poznamka: zmena.poznamka ?? z.poznamka ?? "" } }); nacti(); } catch (e) { setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." }); }
  };
  const smaz = async (z: Zaznam) => {
    if (!(await potvrd({ nadpis: `Smazat ${z.prezdivka}?`, text: "Záznam i kontakt zmizí. Člověk se může zařadit znovu.", potvrdit: "Smazat" }))) return;
    try { await api(`/sprava/zebricek/${z.id}`, { method: "PUT", telo: { smazat: true } }); nacti(); } catch (e) { setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." }); }
  };
  const kraj = (k: string | null) => KRAJE_ODOLNOSTI.find((x) => x.klic === k)?.nazev ?? null;
  const sKontaktem = zaznamy.filter((z) => z.email || z.telefon).length;

  return (
    <Karta className="p-6">
      <div className="stitek mb-1">Odolnost domácnosti</div>
      <h2 className="podnadpis text-velke">{zaznamy.length} v žebříčku · {sKontaktem} s kontaktem</h2>
      <p className="mt-2 text-male text-tlum">Kontakt je tu jen k pozvání do komunity; čtení této stránky s kontakty je v auditu. Veřejně je vidět přezdívka, skóre, datum a kraj.</p>
      {hlaska && <div className="mt-3"><Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska></div>}
      {zaznamy.length > 0 && (
        <ul className="mt-4">
          {zaznamy.map((z) => (
            <li key={z.id} className="py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-male">
                <span className="font-semibold text-inkoust">{z.prezdivka}</span>
                <span className="cislice font-bold text-inkoust">{z.skore}</span>
                <span className="text-tlum2">{kraj(z.kraj) ?? "kraj neuveden"}{z.osob !== null ? ` · ${z.osob} os.` : ""} · účet #{z.ucetId.slice(0, 8)} · {datumCas(z.aktualizovano)}</span>
                {(z.email || z.telefon) ? (
                  <span className="text-inkoust">{[z.email, z.telefon].filter(Boolean).join(" · ")}<span className="text-tlum2">{z.souhlasKdy ? ` · souhlas ${datumCas(z.souhlasKdy)}` : ""}</span></span>
                ) : (
                  <span className="text-tlum2">bez kontaktu</span>
                )}
                <button type="button" onClick={() => smaz(z)} className="ml-auto text-tlum underline underline-offset-4 hover:text-inkoust">Smazat</button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
                <select value={z.stav} onChange={(e) => uloz(z, { stav: e.target.value })} className={POLE} aria-label="Stav">
                  {STAVY.map((s) => <option key={s.klic} value={s.klic}>{s.nazev}</option>)}
                </select>
                <input defaultValue={z.poznamka ?? ""} placeholder="interní poznámka" className={POLE} aria-label="Poznámka" onBlur={(e) => { if ((e.target.value || "") !== (z.poznamka ?? "")) uloz(z, { poznamka: e.target.value }); }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Karta>
  );
}
