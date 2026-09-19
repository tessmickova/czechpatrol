"use client";

import { useCallback, useEffect, useState } from "react";
import { datumCas } from "@/lib/format";
import { api } from "@/lib/ucet";
import { Hlaska, POLE, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Karta } from "./zaklad";

/*
  Schvalování návrhů.

  Tohle je ta lidská brána, bez které se nic nedostane na web. Dosud byla jen
  v příkazové řádce (`npm run spravce schval`), takže ji šlo použít jen
  z počítače s kopií repozitáře — při třech stovkách čekajících návrhů to
  znamenalo, že se to neudělá.

  Stránka rozhodnutí neprovádí, jen ho odesílá. Vlastní práci udělá workflow
  `schvaleni.yml` tímtéž příkazem jako z příkazové řádky. Dvě cesty, jedno
  chování — a rozhodnutí zůstane v historii repozitáře jako commit.
*/

interface Navrh {
  id: string | null;
  slug: string | null;
  titulek: string | null;
  zeme: string | null;
  kam: string;
  pripravil: string | null;
  pripraveno: string | null;
  datumUdalosti: string | null;
  zavaznost: string | null;
  jistota: string | null;
  fakta: string[];
  neznameho: string[];
  zdroje: { nazev: string | null; url: string | null }[];
}

export function NavrhyKeSchvaleni() {
  const [navrhy, setNavrhy] = useState<Navrh[]>([]);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacita, setNacita] = useState(true);
  const [odeslane, setOdeslane] = useState<Record<string, string>>({});
  const [duvody, setDuvody] = useState<Record<string, string>>({});

  const nacti = useCallback(async () => {
    setNacita(true);
    try {
      const d = await api<{ navrhy: Navrh[] }>("/sprava/navrhy");
      setNavrhy(d.navrhy);
      setChyba(null);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Frontu se nepodařilo načíst.");
    } finally {
      setNacita(false);
    }
  }, []);

  useEffect(() => {
    nacti();
  }, [nacti]);

  async function rozhodni(id: string, akce: "schval" | "zamitni") {
    try {
      await api(`/sprava/navrhy/${id}/rozhodnout`, { method: "POST", telo: { akce, duvod: duvody[id] ?? "" } });
      setOdeslane((p) => ({ ...p, [id]: akce }));
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Rozhodnutí se nepodařilo odeslat.");
    }
  }

  const ceka = navrhy.filter((n) => n.id && !odeslane[n.id]);

  return (
    <Karta className="p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="stitek mb-1">Fronta návrhů</div>
          <h2 className="podnadpis text-velke">
            {nacita ? "Načítám…" : ceka.length ? `${ceka.length} čeká na schválení` : "Nic nečeká"}
          </h2>
        </div>
        <button type="button" onClick={nacti} className={TLACITKO_TICHE}>Obnovit</button>
      </div>

      {chyba && <Hlaska typ="chyba">{chyba}</Hlaska>}

      {/*
        Bez téhle věty by se dalo číst „schváleno" jako „hotovo". Mezi
        zmáčknutím a webem je běh workflow a nasazení, což je řádově minuty.
      */}
      <p className="mb-4 text-male leading-snug text-tlum2">
        Schválení se odesílá ke zpracování — na webu se záznam objeví po doběhnutí
        kontroly a nasazení, ne hned. Zamítnutý návrh se nemaže beze stopy.
      </p>

      {!nacita && navrhy.length === 0 && !chyba && (
        <p className="text-zaklad text-tlum">Fronta je prázdná.</p>
      )}

      <ul className="space-y-3">
        {navrhy.filter((n) => n.id).map((n) => {
          const id = n.id as string;
          const hotovo = odeslane[id];
          return (
            <li key={id} className="rounded-[22px] border border-linka p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="stitek">
                  {[n.zeme, n.zavaznost, n.jistota && `jistota ${n.jistota}`, n.kam === "overujeme" && "do ověřovaných"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="stitek text-tlum2">
                  {n.pripravil && `připravil ${n.pripravil}`}
                  {n.pripraveno && ` · ${datumCas(n.pripraveno)}`}
                </span>
              </div>

              <h3 className="text-zaklad leading-snug text-inkoust">{n.titulek ?? id}</h3>
              {n.datumUdalosti && (
                <p className="cislice mt-1 text-mikro text-tlum2">Datum události: {n.datumUdalosti.slice(0, 10)}</p>
              )}

              {n.fakta.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {n.fakta.map((f) => (
                    <li key={f} className="text-male leading-snug text-tlum">— {f}</li>
                  ))}
                </ul>
              )}

              {/*
                Otevřené otázky stojí nad zdroji schválně. Je to to jediné,
                kvůli čemu se návrh nemá odklepnout.
              */}
              {n.neznameho.length > 0 && (
                <div className="mt-3 border-t border-linka2 pt-3">
                  <div className="stitek mb-1">Co doložené není</div>
                  <ul className="space-y-1">
                    {n.neznameho.map((x) => (
                      <li key={x} className="text-male leading-snug text-inkoust">— {x}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 border-t border-linka2 pt-3">
                <div className="stitek mb-1">Zdroje ({n.zdroje.length})</div>
                <ul className="space-y-1">
                  {n.zdroje.map((z) => (
                    <li key={z.url ?? z.nazev ?? Math.random().toString()}>
                      {z.url ? (
                        <a href={z.url} target="_blank" rel="noopener noreferrer" className="break-all text-male text-tlum underline underline-offset-4 hover:text-inkoust">
                          {z.nazev ?? z.url}
                        </a>
                      ) : (
                        <span className="text-male text-tlum">{z.nazev}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {hotovo ? (
                <p className="mt-3 text-male text-tlum2">
                  {hotovo === "schval" ? "Schválení odesláno. Běží kontrola a nasazení." : "Zamítnutí odesláno."}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => rozhodni(id, "schval")} className={TLACITKO_AKCENT}>
                    Schválit
                  </button>
                  <input
                    className={`${POLE} max-w-[240px]`}
                    placeholder="Důvod zamítnutí"
                    value={duvody[id] ?? ""}
                    onChange={(e) => setDuvody((p) => ({ ...p, [id]: e.target.value }))}
                  />
                  <button type="button" onClick={() => rozhodni(id, "zamitni")} className={TLACITKO_TICHE}>
                    Zamítnout
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Karta>
  );
}
