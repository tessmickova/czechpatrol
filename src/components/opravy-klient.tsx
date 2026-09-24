"use client";

import { useCallback, useEffect, useState } from "react";
import { datumCas } from "@/lib/format";
import { api } from "@/lib/ucet";
import { Hlaska, POLE, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Karta } from "./zaklad";

/*
  Oprava záznamu, který už je na webu.

  Chyba se pozná většinou až po zveřejnění — dokud šlo upravit jen návrh,
  vedla jediná cesta k opravě přes příkazovou řádku, což znamená, že se
  neudělá.

  Důvod opravy je povinný a objeví se veřejně na stránce Opravy. Tichý přepis
  zveřejněného údaje se tu dělat nedá schválně: projekt, který opravuje
  potichu, je k nerozeznání od projektu, který se nemýlí.
*/

const POLE_OPRAV: { klic: string; popis: string; volby?: string[] }[] = [
  { klic: "titulek", popis: "Titulek" },
  { klic: "kratkyTitulek", popis: "Krátký titulek" },
  { klic: "zavaznost", popis: "Závažnost", volby: ["G1", "G2", "G3", "Y1", "Y2", "Y3", "O1", "O2", "O3", "R1", "R2", "R3"] },
  { klic: "jistota", popis: "Jistota", volby: ["nizka", "stredni", "vysoka", "potvrzeno"] },
  { klic: "atribuce", popis: "Atribuce", volby: ["neznama", "podezreni", "oficialni", "domaci"] },
  { klic: "puvodce", popis: "Původce — jen s úředním závěrem" },
  { klic: "vyznam", popis: "Co z toho plyne pro čtenáře v Česku" },
];

interface Zaznam {
  slug: string | null;
  titulek: string | null;
  kratkyTitulek: string | null;
  zeme: string | null;
  datumUdalosti: string | null;
  aktualizovano: string | null;
  zavaznost: string | null;
  jistota: string | null;
  atribuce: string | null;
  puvodce: string | null;
  vyznam: string | null;
}

export function OpravaZaznamu() {
  const [zaznamy, setZaznamy] = useState<Zaznam[]>([]);
  const [hledat, setHledat] = useState("");
  const [otevreny, setOtevreny] = useState<string | null>(null);
  const [zmeny, setZmeny] = useState<Record<string, string>>({});
  const [duvod, setDuvod] = useState("");
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const [ceka, setCeka] = useState(false);

  const nacti = useCallback(async () => {
    try {
      const d = await api<{ zaznamy: Zaznam[] }>("/sprava/zaznamy");
      setZaznamy(d.zaznamy);
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Záznamy se nepodařilo načíst." });
    }
  }, []);

  useEffect(() => {
    nacti();
  }, [nacti]);

  async function odesli(slug: string) {
    setCeka(true);
    try {
      await api(`/sprava/zaznamy/${slug}/opravit`, { method: "POST", telo: { duvod, upravy: zmeny } });
      setHlaska({ typ: "ok", text: "Oprava odeslána. Objeví se na webu i na stránce Opravy." });
      setOtevreny(null);
      setZmeny({});
      setDuvod("");
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Opravu se nepodařilo odeslat." });
    } finally {
      setCeka(false);
    }
  }

  const hledane = hledat.trim().toLowerCase();
  const videt = hledane
    ? zaznamy.filter((z) => `${z.titulek ?? ""} ${z.slug ?? ""} ${z.zeme ?? ""}`.toLowerCase().includes(hledane))
    : zaznamy.slice(0, 8);

  return (
    <Karta className="p-6">
      <div className="mb-4">
        <div className="stitek mb-1">Zveřejněné záznamy</div>
        <h2 className="podnadpis text-velke">Oprava toho, co je na webu</h2>
      </div>

      {hlaska && <Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska>}

      <input
        className={`${POLE} mt-3 w-full`}
        placeholder="Hledat podle titulku, země nebo slugu"
        value={hledat}
        onChange={(e) => setHledat(e.target.value)}
      />
      {!hledane && <p className="mt-2 text-mikro text-tlum2">Nejnovějších osm. Starší najdete hledáním.</p>}

      <ul className="mt-4 space-y-2">
        {videt.map((z) => {
          const slug = z.slug as string;
          const otevreno = otevreny === slug;
          return (
            <li key={slug} className="rounded-[18px] border border-linka p-3.5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="stitek">{[z.zeme, z.zavaznost].filter(Boolean).join(" · ")}</span>
                <span className="stitek text-tlum2">
                  {z.aktualizovano ? `upraveno ${datumCas(z.aktualizovano)}` : null}
                </span>
              </div>
              <h3 className="text-male leading-snug text-inkoust">{z.titulek ?? slug}</h3>

              {otevreno ? (
                <div className="mt-3 pt-3">
                  <div className="grid gap-2">
                    {POLE_OPRAV.map((f) => (
                      <label key={f.klic} className="block">
                        <span className="stitek mb-1 block">{f.popis}</span>
                        {f.volby ? (
                          <select
                            className={`${POLE} w-full`}
                            value={zmeny[f.klic] ?? (z[f.klic as keyof Zaznam] as string) ?? ""}
                            onChange={(e) => setZmeny((p) => ({ ...p, [f.klic]: e.target.value }))}
                          >
                            {f.volby.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className={`${POLE} w-full`}
                            value={zmeny[f.klic] ?? (z[f.klic as keyof Zaznam] as string) ?? ""}
                            onChange={(e) => setZmeny((p) => ({ ...p, [f.klic]: e.target.value }))}
                          />
                        )}
                      </label>
                    ))}
                  </div>

                  {/*
                    Povinné a veřejné. Projekt, který opravuje potichu, je
                    k nerozeznání od projektu, který se nemýlí.
                  */}
                  <label className="mt-3 block">
                    <span className="stitek mb-1 block">Proč se to opravuje — uvidí to čtenáři</span>
                    <textarea
                      className={`${POLE} min-h-[72px] w-full`}
                      placeholder="Např.: Původce byl uveden podle médií, úřední závěr ho nepotvrdil."
                      value={duvod}
                      onChange={(e) => setDuvod(e.target.value)}
                      maxLength={600}
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={ceka || duvod.trim().length < 10 || !Object.keys(zmeny).length}
                      onClick={() => odesli(slug)}
                      className={TLACITKO_AKCENT}
                    >
                      Opravit a zveřejnit
                    </button>
                    <button type="button" onClick={() => { setOtevreny(null); setZmeny({}); }} className={TLACITKO_TICHE}>
                      Zpět
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOtevreny(slug); setZmeny({}); setDuvod(""); }}
                  className={`${TLACITKO_TICHE} mt-2`}
                >
                  Opravit
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Karta>
  );
}
