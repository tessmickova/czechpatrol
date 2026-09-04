"use client";

import { useMemo, useState } from "react";
import { KATEGORIE, PORADI_KATEGORII } from "@/lib/kategorie";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Incident, Kategorie, Pasmo } from "@/lib/typy";
import { KartaUdalosti } from "./karta-udalosti";
import { Prazdno } from "./zaklad";

const OKNA = [
  { klic: "24h", nazev: "24 h", hodin: 24 },
  { klic: "7d", nazev: "7 dní", hodin: 24 * 7 },
  { klic: "30d", nazev: "30 dní", hodin: 24 * 30 },
  { klic: "od-cervence", nazev: "od července", hodin: null },
  { klic: "vse", nazev: "Vše", hodin: null },
] as const;

const PASMA_FILTR: Pasmo[] = ["zelena", "zluta", "oranzova", "cervena"];

function Prepinac({
  aktivni, onClick, children,
}: { aktivni: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktivni}
      className={`rounded-[10px] border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
        aktivni
          ? "border-inkoust bg-inkoust text-white"
          : "border-linka bg-plocha text-tlum hover:border-tlum2 hover:text-inkoust"
      }`}
    >
      {children}
    </button>
  );
}

export function SeznamSFiltry({
  incidenty, odkdyCervenec,
}: { incidenty: (Incident & { ukazka?: boolean })[]; odkdyCervenec: string }) {
  const [kategorie, setKategorie] = useState<Kategorie | null>(null);
  const [pasma, setPasma] = useState<Pasmo[]>([]);
  const [okno, setOkno] = useState<(typeof OKNA)[number]["klic"]>("vse");

  const dostupne = useMemo(() => {
    const s = new Set<Kategorie>();
    for (const i of incidenty) for (const k of i.kategorie) s.add(k);
    return PORADI_KATEGORII.filter((k) => s.has(k));
  }, [incidenty]);

  const vysledek = useMemo(() => {
    const ted = Date.now();
    return incidenty.filter((i) => {
      if (kategorie && !i.kategorie.includes(kategorie)) return false;
      if (pasma.length && !pasma.includes(UROVNE[i.zavaznost].pasmo === "prechod" ? "oranzova" : UROVNE[i.zavaznost].pasmo)) return false;
      const kdy = new Date(i.datumZjisteni ?? i.datumUdalosti).getTime();
      const o = OKNA.find((x) => x.klic === okno)!;
      if (o.hodin && ted - kdy > o.hodin * 3600_000) return false;
      if (okno === "od-cervence" && kdy < new Date(odkdyCervenec).getTime()) return false;
      return true;
    });
  }, [incidenty, kategorie, pasma, okno, odkdyCervenec]);

  const prepniPasmo = (p: Pasmo) =>
    setPasma((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]));

  return (
    <>
      <div className="mb-7 space-y-4 rounded-[14px] border border-linka bg-plocha p-4 sm:p-5">
        <div>
          <div className="stitek mb-2.5">Oblast</div>
          <div className="flex flex-wrap gap-1.5">
            <Prepinac aktivni={kategorie === null} onClick={() => setKategorie(null)}>
              Vše
            </Prepinac>
            {dostupne.map((k) => (
              <Prepinac key={k} aktivni={kategorie === k} onClick={() => setKategorie(k)}>
                {KATEGORIE[k].nazev}
              </Prepinac>
            ))}
            {!dostupne.length && (
              <span className="text-[12px] text-tlum2">Zatím nejsou žádné záznamy k filtrování.</span>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="stitek mb-2.5">Závažnost</div>
            <div className="flex flex-wrap gap-1.5">
              {PASMA_FILTR.map((p) => (
                <Prepinac key={p} aktivni={pasma.includes(p)} onClick={() => prepniPasmo(p)}>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className={`h-[7px] w-[7px] rounded-[2px] ${PASMA[p].pruh}`} />
                    {PASMA[p].nazev}
                  </span>
                </Prepinac>
              ))}
            </div>
          </div>

          <div>
            <div className="stitek mb-2.5">Období</div>
            <div className="flex flex-wrap gap-1.5">
              {OKNA.map((o) => (
                <Prepinac key={o.klic} aktivni={okno === o.klic} onClick={() => setOkno(o.klic)}>
                  {o.nazev}
                </Prepinac>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="mb-5 text-[12.5px] text-tlum">
        {vysledek.length === 0
          ? "Žádný záznam neodpovídá filtru."
          : `${vysledek.length} ${vysledek.length === 1 ? "záznam" : vysledek.length < 5 ? "záznamy" : "záznamů"}`}
      </p>

      {vysledek.length ? (
        <div className="space-y-4">
          {vysledek.map((i) => (
            <KartaUdalosti key={i.id} incident={i} />
          ))}
        </div>
      ) : incidenty.length ? (
        <Prazdno
          nadpis="Nic neodpovídá zvolenému filtru"
          popis="Zkuste rozšířit období nebo zrušit omezení závažnosti."
        />
      ) : (
        <Prazdno
          nadpis="Zatím nejsou zveřejněné žádné události"
          popis="Zobrazujeme jen záznamy, které prošly kontrolou a mají uvedený zdroj."
        />
      )}
    </>
  );
}
