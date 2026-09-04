import { datumCas } from "@/lib/format";
import { tokeny, UROVNE } from "@/lib/skala";
import type { CelkovyStav } from "@/lib/typy";
import { WEB } from "@/config/web";
import { Napoveda, Tecka, VykladUrovne } from "./zaklad";

const TRENDY = {
  nahoru: { znak: "↑", nazev: "zhoršení", tridy: "text-[#94450f]" },
  dolu: { znak: "↓", nazev: "uklidnění", tridy: "text-[#2f6f47]" },
  "beze-zmeny": { znak: "→", nazev: "beze změny", tridy: "text-tlum" },
} as const;

export function Hero({ stav, klidove = [] }: { stav: CelkovyStav; klidove?: string[] }) {
  const t = stav.uroven ? tokeny(stav.uroven) : null;
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const trend = stav.trend ? TRENDY[stav.trend] : null;

  return (
    <section className="border-b border-linka">
      <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <div className="stitek mb-5">{WEB.podtitul}</div>
            <h1 className="nadpis text-[38px] sm:text-[52px] lg:text-[60px]">
              Co se skutečně mění?
            </h1>
            <p className="mt-5 max-w-[36rem] text-[15px] leading-relaxed text-tlum sm:text-[16px]">
              {WEB.popis}
            </p>

            {klidove.length > 0 && (
              <div className="mt-9 border-t border-linka pt-6">
                <div className="stitek mb-4">Co se zatím nestalo</div>
                <ul className="grid max-w-[36rem] gap-2.5 sm:grid-cols-2">
                  {klidove.map((k) => (
                    <li key={k} className="flex gap-2.5 text-[13px] leading-snug text-tlum">
                      <span aria-hidden className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-[2px] bg-[#3f8f5c]" />
                      {k}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 max-w-[34rem] text-[11.5px] leading-relaxed text-tlum2">
                  Uvádíme jen body ověřené proti primárnímu zdroji. Neověřenou položku
                  sem nepíšeme — uklidňovat bez podkladu je stejná chyba jako strašit.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <div
              className={`rounded-[7px] border ${t ? t.ramecek : "border-dashed border-linka"} ${
                t ? t.pozadi : "bg-plocha"
              } p-5 sm:p-6`}
            >
              <div className="stitek mb-3">Celková úroveň</div>

              {d && stav.uroven ? (
                <Napoveda popis={<VykladUrovne uroven={stav.uroven} />}>
                  <span className="flex items-center gap-3">
                    <Tecka uroven={stav.uroven} velka />
                    <span className={`nadpis text-[30px] sm:text-[34px] ${t!.text}`}>
                      {d.nazev}
                    </span>
                  </span>
                </Napoveda>
              ) : (
                <p className="text-[19px] font-semibold tracking-[-0.02em] text-tlum">
                  Zatím nestanoveno
                </p>
              )}

              {trend ? (
                <p className={`mt-3.5 flex items-center gap-2 text-[13px] font-medium ${trend.tridy}`}>
                  <span aria-hidden className="text-[15px]">{trend.znak}</span>
                  Trend: {trend.nazev} během posledních 7 dní
                </p>
              ) : (
                <p className="mt-3.5 text-[13px] text-tlum2">
                  Trend bude k dispozici po prvním úplném týdnu měření.
                </p>
              )}

              <p className="mt-5 border-t border-linka/70 pt-4 text-[13px] leading-relaxed text-tlum">
                {stav.shrnuti ||
                  "Hodnocení zatím nebylo stanoveno. Web nedopočítává úroveň z neúplných dat — dokud nejsou ověřená data, přizná to."}
              </p>

              {stav.aktualizovano && (
                <p className="cislice mt-4 text-[11.5px] text-tlum2">
                  Aktualizováno {datumCas(stav.aktualizovano)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Souhrn „co se změnilo od poslední aktualizace“. */
export function CoSeZmenilo({ stav }: { stav: CelkovyStav }) {
  const s = stav.noveSignaly;
  const polozky = [
    { stitek: "Nových signálů", hodnota: s.celkem, zvyraznit: true },
    { stitek: "Vysokých", hodnota: s.vysoke },
    { stitek: "Středních", hodnota: s.stredni },
    { stitek: "Kritických", hodnota: s.kriticke },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {polozky.map((p) => (
        <div
          key={p.stitek}
          className={`rounded-[7px] border border-linka bg-plocha px-4 py-4 ${
            p.zvyraznit ? "sm:px-5" : ""
          }`}
        >
          <div className="stitek mb-2.5">{p.stitek}</div>
          <div
            className={`cislice font-semibold tracking-[-0.03em] ${
              p.zvyraznit ? "text-[30px]" : "text-[24px]"
            } ${p.hodnota === 0 ? "text-tlum2" : ""}`}
          >
            {p.hodnota}
          </div>
        </div>
      ))}
    </div>
  );
}
