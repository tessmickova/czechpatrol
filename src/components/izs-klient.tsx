"use client";

import { useCallback, useEffect, useState } from "react";
import { KRAJE, UCTY_ZAPNUTE } from "@/config/web";
import { datumCas } from "@/lib/format";
import { api, useUcet } from "@/lib/ucet";
import { Hlaska, POLE, Popisek, TLACITKO_AKCENT, TLACITKO_TICHE, TLACITKO_VAROVNE } from "./formulare";
import { Ikona } from "./ikony";
import { Karta } from "./zaklad";

export interface ZpravaIzs {
  id: string;
  autor: string;
  text: string;
  oblast: string;
  platnostDo: string | null;
  stav: "navrh" | "schvaleno" | "zamitnuto" | "odeslano";
  vytvoreno: string;
  rozhodl?: string | null;
  poznamka?: string | null;
  doruceno?: number;
}

export const STAVY_ZPRAV: Record<ZpravaIzs["stav"], { nazev: string; tridy: string }> = {
  navrh: { nazev: "Čeká na schválení", tridy: "border-jantar/40 bg-jantar/10 text-jantar" },
  schvaleno: { nazev: "Schváleno", tridy: "border-akcent/40 bg-akcent/10 text-akcent-svetla" },
  odeslano: { nazev: "Odesláno", tridy: "border-klid/40 bg-klid/10 text-klid-text" },
  zamitnuto: { nazev: "Zamítnuto", tridy: "border-akcent/40 bg-akcent/10 text-akcent-svetla" },
};

const MAX = 600;

/** Panel partnera IZS: návrh zprávy a její cesta ke čtenářům. */
export function IzsKlient() {
  const { ucet, nacita } = useUcet();
  const [zpravy, setZpravy] = useState<ZpravaIzs[]>([]);
  const [text, setText] = useState("");
  const [oblast, setOblast] = useState<string>("Celá ČR");
  const [platnost, setPlatnost] = useState("");
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const [odesila, setOdesila] = useState(false);

  const nacti = useCallback(async () => {
    try {
      const v = await api<{ zpravy: ZpravaIzs[] }>("/izs/zpravy");
      setZpravy(v.zpravy);
    } catch {
      setZpravy([]);
    }
  }, []);

  useEffect(() => {
    if (ucet && (ucet.role === "izs" || ucet.role === "admin")) nacti();
  }, [ucet, nacti]);

  if (!UCTY_ZAPNUTE || nacita) return null;
  if (!ucet || (ucet.role !== "izs" && ucet.role !== "admin")) return null;

  const odesli = async () => {
    setOdesila(true);
    setHlaska(null);
    try {
      await api("/izs/zpravy", { method: "POST", telo: { text: text.trim(), oblast, platnostDo: platnost || null } });
      setText("");
      setPlatnost("");
      setHlaska({ typ: "ok", text: "Návrh je u správce. Po schválení odejde čtenářům v dané oblasti." });
      nacti();
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se odeslat." });
    } finally {
      setOdesila(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Karta odstin="modra" className="p-6">
        <div className="stitek mb-2 !text-akcent">Nová zpráva partnera</div>
        <h2 className="podnadpis text-velke">Co mají čtenáři vědět</h2>
        <p className="mt-2 text-zaklad leading-relaxed text-tlum">
          Věcně, bez hodnocení situace. Co se děje, kde, co mají lidé udělat, kde je úřední zdroj.
          Zpráva odejde s označením „zpráva partnera IZS“ a jménem vaší složky.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <Popisek pro="text">Text ({text.length}/{MAX})</Popisek>
            <textarea id="text" value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))} rows={6} className={POLE} placeholder="Např.: Uzavírka D1 km 112–118 do 18:00 kvůli zásahu. Objížďka po II/602. Zdroj: HZS Kraje Vysočina." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Popisek pro="oblast">Oblast</Popisek>
              <select id="oblast" value={oblast} onChange={(e) => setOblast(e.target.value)} className={POLE}>
                <option>Celá ČR</option>
                {KRAJE.map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <Popisek pro="platnost">Platí do (nepovinné)</Popisek>
              <input id="platnost" type="datetime-local" value={platnost} onChange={(e) => setPlatnost(e.target.value)} className={`${POLE} cislice`} />
            </div>
          </div>
          {hlaska && <Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska>}
          <button type="button" disabled={odesila || text.trim().length < 20} onClick={odesli} className={TLACITKO_AKCENT}>
            <Ikona nazev="odeslat" velikost={15} tah={1.9} /> {odesila ? "Odesílám…" : "Odeslat ke schválení"}
          </button>
        </div>
      </Karta>

      <Karta className="p-6">
        <div className="stitek mb-3">Vaše zprávy</div>
        {zpravy.length === 0 ? (
          <p className="text-zaklad text-tlum">Zatím žádná.</p>
        ) : (
          <ul className="space-y-3">
            {zpravy.map((z) => <PolozkaZpravy key={z.id} z={z} />)}
          </ul>
        )}
      </Karta>
    </div>
  );
}

export function PolozkaZpravy({ z, akce }: { z: ZpravaIzs; akce?: React.ReactNode }) {
  const s = STAVY_ZPRAV[z.stav];
  return (
    <li className="rounded-[22px] border border-linka p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className={`stitek-tmavy rounded-full border px-2 py-1 ${s.tridy}`}>{s.nazev}</span>
        <span className="stitek">{z.oblast} · {datumCas(z.vytvoreno)}</span>
      </div>
      <p className="whitespace-pre-wrap text-zaklad leading-relaxed text-inkoust">{z.text}</p>
      {z.platnostDo && <p className="stitek mt-2">platí do {datumCas(z.platnostDo)}</p>}
      {z.poznamka && <p className="mt-2 text-male text-tlum">Poznámka správce: {z.poznamka}</p>}
      {typeof z.doruceno === "number" && z.stav === "odeslano" && (
        <p className="stitek mt-2 !text-klid-text">doručeno {z.doruceno}× </p>
      )}
      {akce && <div className="mt-3 flex flex-wrap gap-2">{akce}</div>}
    </li>
  );
}

/** Tlačítka schválení pro správce — používá je stránka správy. */
export function AkceSchvaleni({ z, po }: { z: ZpravaIzs; po: () => void }) {
  const [poznamka, setPoznamka] = useState("");
  if (z.stav !== "navrh") return null;
  const rozhodni = async (jak: "schvalit" | "zamitnout") => {
    await api(`/sprava/zpravy/${z.id}/${jak}`, { method: "POST", telo: { poznamka } });
    po();
  };
  return (
    <div className="w-full space-y-2">
      <input value={poznamka} onChange={(e) => setPoznamka(e.target.value)} className={POLE} placeholder="Poznámka pro autora (nepovinné)" />
      <div className="flex gap-2">
        <button type="button" onClick={() => rozhodni("schvalit")} className={TLACITKO_AKCENT}>Schválit a odeslat</button>
        <button type="button" onClick={() => rozhodni("zamitnout")} className={TLACITKO_VAROVNE}>Zamítnout</button>
        <span className="sr-only"><button type="button" className={TLACITKO_TICHE}>—</button></span>
      </div>
    </div>
  );
}
