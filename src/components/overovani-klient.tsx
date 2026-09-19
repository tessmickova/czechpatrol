"use client";

import { useCallback, useEffect, useState } from "react";
import { datumCas } from "@/lib/format";
import { api } from "@/lib/ucet";
import { Hlaska, POLE, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Karta } from "./zaklad";

/*
  Ovládání ověřovací vrstvy.

  Dvě věci, které musí jít udělat hned a bez nasazování:

  1. Vypnout model. Když začne vracet nesmysly nebo utíkat na ceně, nesmí se
     čekat na někoho, kdo umí do nastavení GitHubu.
  2. Zadat něco externímu ověřovateli ručně. Ten se sám dívá na svou větev
     v repozitáři, takže „poslat mu to" znamená napsat mu tam úkol.

  Stránka nic neprovádí sama — odesílá pokyn. Vlastní práci dělají běhy
  v Actions, aby po každé změně zůstal commit a autor.
*/

const NAZVY: Record<string, string> = {
  "claude-sonnet-5": "Sonnet — silnější, dražší",
  "claude-haiku-4-5": "Haiku — levnější, mezi běhy kolísá",
};

interface Zadani {
  id: string;
  zadano: string;
  zadal: string;
  stav: string;
  zadani: string;
  odpoved?: string | null;
  hotovo?: string | null;
}

interface Ai {
  zapnuto: boolean;
  model: string;
  zmeneno: string | null;
}

export function OvladaniOverovani() {
  const [ai, setAi] = useState<Ai | null>(null);
  const [fronta, setFronta] = useState<Zadani[]>([]);
  const [zadani, setZadani] = useState("");
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const [ceka, setCeka] = useState(false);

  const nacti = useCallback(async () => {
    try {
      setAi(await api<Ai>("/nastaveni-sberu"));
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nastavení se nepodařilo načíst." });
    }
    try {
      const d = await api<{ zadani: Zadani[] }>("/sprava/patrol");
      setFronta(d.zadani);
    } catch {
      /* Fronta zadání je doplněk; když se nenačte, nastavení výše má jet dál. */
    }
  }, []);

  useEffect(() => {
    nacti();
  }, [nacti]);

  async function uloz(zmena: Partial<Ai>) {
    setCeka(true);
    try {
      const nove = await api<Ai>("/sprava/nastaveni-ai", { method: "PUT", telo: zmena });
      setAi(nove);
      setHlaska({ typ: "ok", text: "Uloženo. Projeví se při příštím běhu, ne zpětně." });
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Uložit se nepovedlo." });
    } finally {
      setCeka(false);
    }
  }

  async function posliPatrolovi() {
    setCeka(true);
    try {
      await api("/sprava/patrol", { method: "POST", telo: { zadani } });
      setZadani("");
      nacti();
      setHlaska({ typ: "ok", text: "Zadání zapsáno na větev. Patrol si ji čte po svém, takže chvíli potrvá, než se do toho pustí." });
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Zadání se nepodařilo odeslat." });
    } finally {
      setCeka(false);
    }
  }

  return (
    <Karta className="p-6">
      <div className="mb-4">
        <div className="stitek mb-1">Ověřovací vrstva</div>
        <h2 className="podnadpis text-velke">
          {ai ? (ai.zapnuto ? "Model posuzuje" : "Model je vypnutý") : "Načítám…"}
        </h2>
      </div>

      {hlaska && <Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska>}

      {ai && (
        <div className="mt-4 border-t border-linka2 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={ceka} onClick={() => uloz({ zapnuto: !ai.zapnuto })} className={ai.zapnuto ? TLACITKO_TICHE : TLACITKO_AKCENT}>
              {ai.zapnuto ? "Vypnout posuzování" : "Zapnout posuzování"}
            </button>
            {ai.zmeneno && <span className="stitek text-tlum2">naposledy {datumCas(ai.zmeneno)}</span>}
          </div>

          <div className="mt-4">
            <div className="stitek mb-2">Model</div>
            <div className="flex flex-col gap-2">
              {Object.keys(NAZVY).map((m) => (
                <label key={m} className="flex items-center gap-2 text-male text-inkoust">
                  <input
                    type="radio"
                    name="model"
                    checked={ai.model === m}
                    disabled={ceka}
                    onChange={() => uloz({ model: m })}
                  />
                  <span className="cislice">{m}</span>
                  <span className="text-tlum2">— {NAZVY[m].replace(/^[^—]*— /, "")}</span>
                </label>
              ))}
            </div>
          </div>

          {/*
            Bez téhle věty by se dalo čekat, že vypnutí zastaví i to, co
            právě běží. Nezastaví — projeví se až při dalším spuštění.
          */}
          <p className="mt-3 text-mikro leading-snug text-tlum2">
            Změna platí od příštího běhu. Sběr zpráv jede dál nezávisle na tomhle
            přepínači — vypíná se jen posuzování modelem.
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-linka2 pt-4">
        <div className="stitek mb-1">Zadání pro externího ověřovatele</div>
        <p className="mb-2 text-mikro leading-snug text-tlum2">
          Napište, co má ověřit. Zapíše se mu to do fronty na jeho větev; sám si ji
          čte po svém, takže mezi odesláním a prací je jeho prodleva.
        </p>
        <textarea
          className={`${POLE} min-h-[96px] w-full`}
          placeholder="Např.: Ověř kandidáty k dronům nad Polskem od 10. 9. a dohledej druhý zdroj."
          value={zadani}
          onChange={(e) => setZadani(e.target.value)}
          maxLength={2000}
        />
        <div className="mt-2 flex items-center gap-2">
          <button type="button" disabled={ceka || zadani.trim().length < 10} onClick={posliPatrolovi} className={TLACITKO_AKCENT}>
            Odeslat ověřovateli
          </button>
          <span className="stitek text-tlum2">{zadani.length}/2000</span>
        </div>

        {/*
          Odpověď stojí u zadání, kterého se týká. Dokud chodila jen na
          Telegram, musel si ji člověk k úkolu párovat sám — a u desítek
          položek to znamená, že to nedělá.
        */}
        {fronta.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-linka2 pt-4">
            {fronta.map((z) => (
              <li key={z.id} className="rounded-[18px] border border-linka p-3.5">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="stitek">
                    {z.stav === "hotovo" ? "Vyřízeno" : z.stav === "odmitnuto" ? "Odmítnuto" : "Čeká"}
                  </span>
                  <span className="stitek text-tlum2">{datumCas(z.zadano)}</span>
                </div>
                <p className="text-male leading-snug text-inkoust">{z.zadani}</p>
                {z.odpoved ? (
                  <p className="mt-2 border-l border-linka pl-3 text-male leading-snug text-tlum">{z.odpoved}</p>
                ) : (
                  <p className="mt-2 text-mikro text-tlum2">Odpověď zatím nepřišla.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Karta>
  );
}
