"use client";

import { useCallback, useEffect, useState } from "react";
import { datumCas } from "@/lib/format";
import { kamOdejde } from "@/lib/kam-odejde";
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
  druh: string | null;
  puvodce: string | null;
  atribuce: string | null;
  vyznam: string | null;
  archivniZaznam: boolean;
  preverit: { kdy: string; duvod: string | null } | null;
}

const POLE_UPRAV: { klic: string; popis: string; zastupny?: string; volby?: string[]; viceradkove?: boolean }[] = [
  { klic: "titulek", popis: "Titulek — co se stalo a kde" },
  { klic: "kratkyTitulek", popis: "Krátký titulek (do výpisů)" },
  { klic: "zavaznost", popis: "Závažnost", volby: ["G1", "G2", "G3", "Y1", "Y2", "Y3", "O1", "O2", "O3", "R1", "R2", "R3"] },
  { klic: "jistota", popis: "Jistota", volby: ["nizka", "stredni", "vysoka", "potvrzeno"] },
  { klic: "druh", popis: "Druh", volby: ["pripad", "opatreni", "reakce"] },
  { klic: "atribuce", popis: "Atribuce", volby: ["neznama", "podezreni", "urednizaver"] },
  { klic: "puvodce", popis: "Původce — jen s úředním závěrem", zastupny: "nechte prázdné, dokud to není potvrzené" },
  { klic: "vyznam", popis: "Co z toho plyne pro čtenáře v Česku" },
  /*
    Povinné ke schválení. Když model nic nedoloženého neoznačí, schválení se
    zastaví — čtenář má vedle fakt vidět i hranici toho, co víme.
  */
  { klic: "neznameho", popis: "Co doložené NENÍ — povinné, každý řádek zvlášť", viceradkove: true },
  { klic: "fakta", popis: "Fakta — každý řádek zvlášť", viceradkove: true },
];

export function NavrhyKeSchvaleni() {
  const [navrhy, setNavrhy] = useState<Navrh[]>([]);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacita, setNacita] = useState(true);
  const [odeslane, setOdeslane] = useState<Record<string, string>>({});
  const [duvody, setDuvody] = useState<Record<string, string>>({});
  /* Rozepsané úpravy. Drží se mimo návrh, aby nezmizely při obnovení fronty. */
  const [upravy, setUpravy] = useState<Record<string, Record<string, string>>>({});
  const [upravuje, setUpravuje] = useState<string | null>(null);

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

  async function rozhodni(id: string, akce: "schval" | "znovu" | "zamitni") {
    try {
      const zmeny = akce === "schval" ? (upravy[id] ?? {}) : {};
      await api(`/sprava/navrhy/${id}/rozhodnout`, {
        method: "POST",
        telo: { akce, duvod: duvody[id] ?? "", upravy: zmeny },
      });
      setOdeslane((p) => ({ ...p, [id]: akce }));
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Rozhodnutí se nepodařilo odeslat.");
    }
  }

  function zmen(id: string, klic: string, hodnota: string) {
    setUpravy((p) => ({ ...p, [id]: { ...(p[id] ?? {}), [klic]: hodnota } }));
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
                        <a href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="break-all text-male text-tlum underline underline-offset-4 hover:text-inkoust">
                          {z.nazev ?? z.url}
                        </a>
                      ) : (
                        <span className="text-male text-tlum">{z.nazev}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/*
                Co se stane po schválení. Bez téhle věty se kliká naslepo —
                a u zprávy, která jde odběratelům do telefonu, je to málo.
              */}
              <p className="mt-3 border-t border-linka2 pt-3 text-male leading-snug text-tlum">
                {kamOdejde(n).vysvetleni}
              </p>

              {n.preverit && (
                <p className="mt-2 text-male leading-snug text-inkoust">
                  Vráceno k doplnění {datumCas(n.preverit.kdy)}
                  {n.preverit.duvod ? `: ${n.preverit.duvod}` : "."}
                </p>
              )}

              {upravuje === id && (
                <div className="mt-3 border-t border-linka2 pt-3">
                  <div className="stitek mb-2">Úprava před zveřejněním</div>
                  {/*
                    Zdroje ani historie se tu needitují. O ověření rozhoduje
                    schválení, ne formulář, a zdroje se nemají přepisovat
                    ručně — celá cena projektu je v tom, že odkazují na doklad.
                  */}
                  <div className="grid gap-2">
                    {POLE_UPRAV.map((f) => (
                      <label key={f.klic} className="block">
                        <span className="stitek mb-1 block">{f.popis}</span>
                        {f.viceradkove ? (
                          <textarea
                            className={`${POLE} min-h-[72px] w-full`}
                            value={
                              upravy[id]?.[f.klic] ??
                              ((n[f.klic as keyof Navrh] as string[] | undefined) ?? []).join("\n")
                            }
                            placeholder={f.zastupny}
                            onChange={(e) => zmen(id, f.klic, e.target.value)}
                          />
                        ) : f.volby ? (
                          <select
                            className={`${POLE} w-full`}
                            value={upravy[id]?.[f.klic] ?? (n[f.klic as keyof Navrh] as string) ?? ""}
                            onChange={(e) => zmen(id, f.klic, e.target.value)}
                          >
                            {f.volby.map((v) => (
                              <option key={v} value={v}>{v || "—"}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className={`${POLE} w-full`}
                            value={upravy[id]?.[f.klic] ?? (n[f.klic as keyof Navrh] as string) ?? ""}
                            placeholder={f.zastupny}
                            onChange={(e) => zmen(id, f.klic, e.target.value)}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-mikro leading-snug text-tlum2">
                    Změny se zapíšou až při schválení a zůstane po nich stopa v historii
                    záznamu. Původce nevyplňujte, dokud to nepotvrdil úřední závěr.
                  </p>
                </div>
              )}

              {hotovo ? (
                <p className="mt-3 text-male text-tlum2">
                  {hotovo === "schval"
                    ? "Schválení odesláno. Běží kontrola, rozeslání a nasazení."
                    : hotovo === "znovu"
                      ? "Posláno ověřovateli k doplnění. Návrh zůstává ve frontě."
                      : "Zamítnutí odesláno."}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => rozhodni(id, "schval")} className={TLACITKO_AKCENT}>
                    Schválit
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpravuje((p) => (p === id ? null : id))}
                    className={TLACITKO_TICHE}
                  >
                    {upravuje === id ? "Skrýt úpravy" : "Upravit"}
                  </button>
                  <button type="button" onClick={() => rozhodni(id, "znovu")} className={TLACITKO_TICHE}>
                    Znovu ověřit
                  </button>
                  <button type="button" onClick={() => rozhodni(id, "zamitni")} className={TLACITKO_TICHE}>
                    Zamítnout
                  </button>
                  <input
                    className={`${POLE} max-w-[260px]`}
                    placeholder="Důvod (u vrácení i zamítnutí)"
                    value={duvody[id] ?? ""}
                    onChange={(e) => setDuvody((p) => ({ ...p, [id]: e.target.value }))}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Karta>
  );
}
