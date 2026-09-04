import type { Metadata } from "next";
import Link from "next/link";
import { KartaUdalosti } from "@/components/karta-udalosti";
import { Karta, OdznakUrovne, Prazdno } from "@/components/zaklad";
import { datumSlovy } from "@/lib/format";
import { celkovyStav, incidenty, klidoveBody, watchlist } from "@/lib/data";
import { tokeny, UROVNE } from "@/lib/skala";

export const metadata: Metadata = {
  title: "Dnes",
  description: "Shrnutí bezpečnostní situace pro dnešní den — celková úroveň, změna od včerejška a to, co zůstává beze změny.",
};

const TRENDY = {
  nahoru: { znak: "↑", text: "mírné zhoršení oproti včerejšku", tridy: "text-[#94450f]" },
  dolu: { znak: "↓", text: "uklidnění oproti včerejšku", tridy: "text-[#2f6f47]" },
  "beze-zmeny": { znak: "→", text: "beze změny oproti včerejšku", tridy: "text-tlum" },
} as const;

export default function Dnes() {
  const stav = celkovyStav();
  const vse = incidenty();
  const w = watchlist();
  const bezeZmeny = klidoveBody();

  const t = stav.uroven ? tokeny(stav.uroven) : null;
  const trend = stav.trend ? TRENDY[stav.trend] : null;
  const top = vse.slice(0, 3);

  return (
    <div className="mx-auto max-w-[820px] px-5 py-11 sm:px-8 sm:py-16">
      <div className="stitek mb-4">Dnes</div>
      <h1 className="nadpis text-[30px] sm:text-[38px]">{datumSlovy(new Date().toISOString())}</h1>

      <div
        className={`mt-8 rounded-[7px] border p-5 sm:p-6 ${
          t ? `${t.ramecek} ${t.pozadi}` : "border-dashed border-linka bg-plocha"
        }`}
      >
        <div className="stitek mb-3">Celková úroveň</div>
        {stav.uroven ? (
          <p className={`nadpis text-[28px] sm:text-[32px] ${t!.text}`}>
            {UROVNE[stav.uroven].nazev}
          </p>
        ) : (
          <p className="text-[19px] font-semibold tracking-[-0.02em] text-tlum">Zatím nestanoveno</p>
        )}
        {trend ? (
          <p className={`mt-3 text-[13.5px] font-medium ${trend.tridy}`}>
            <span aria-hidden>{trend.znak}</span> {trend.text}
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-tlum2">Porovnání s předchozím dnem zatím není k dispozici.</p>
        )}
        <p className="mt-4 border-t border-linka/70 pt-4 text-[13.5px] leading-relaxed text-tlum">
          {stav.shrnuti ||
            "Hodnocení zatím nebylo stanoveno. Dokud nejsou ověřená data, web to přizná — nedopočítává."}
        </p>
        <p className="mt-4 text-[13px] font-medium">
          {stav.noveSignaly.celkem === 0
            ? "Žádný nový relevantní signál."
            : `${stav.noveSignaly.celkem} ${
                stav.noveSignaly.celkem === 1 ? "nový relevantní signál" :
                stav.noveSignaly.celkem < 5 ? "nové relevantní signály" : "nových relevantních signálů"
              }`}
        </p>
      </div>

      <section className="mt-12">
        <h2 className="podnadpis mb-5 text-[18px]">Nejdůležitější nové události</h2>
        {top.length ? (
          <div className="space-y-4">
            {top.map((i) => (
              <KartaUdalosti key={i.id} incident={i} />
            ))}
          </div>
        ) : (
          <Prazdno
            nadpis="Dnes nejsou zveřejněné žádné nové události"
            popis="Zobrazujeme jen ověřené záznamy se zdrojem. Prázdný den je legitimní výsledek, ne chyba."
          />
        )}
      </section>

      <section className="mt-12">
        <h2 className="podnadpis mb-5 text-[18px]">Co zůstává beze změny</h2>
        {bezeZmeny.length ? (
          <Karta className="p-5 sm:p-6">
            <ul className="space-y-3">
              {bezeZmeny.map((b, i) => (
                <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed">
                  <span aria-hidden className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-[2px] bg-[#3f8f5c]" />
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-linka2 pt-4 text-[12px] leading-relaxed text-tlum2">
              Tyto body uvádíme jen tehdy, když je stav skutečně ověřený proti primárnímu
              zdroji. Neověřenou položku sem nepíšeme jako uklidnění.
            </p>
          </Karta>
        ) : (
          <Prazdno
            nadpis="Stav zatím nebyl ověřen"
            popis="Klidové body sem zapisujeme až po ověření proti úředním zdrojům. Bez ověření by to bylo uklidňování bez podkladu."
          />
        )}
      </section>

      <section className="mt-12">
        <h2 className="podnadpis mb-5 text-[18px]">Co sledujeme dnes</h2>
        <Karta className="p-5 sm:p-6">
          <ul className="space-y-3">
            {w.eskalacni.slice(0, 4).map((p) => (
              <li key={p.cislo} className="flex gap-3 text-[13.5px] leading-relaxed">
                <span className="cislice stitek mt-[3px] shrink-0">{p.cislo}</span>
                {p.nazev}
              </li>
            ))}
          </ul>
        </Karta>
      </section>

      <div className="mt-12 flex flex-wrap gap-2.5 border-t border-linka pt-8">
        <OdznakUrovne uroven={stav.uroven} cehoSe="celkem" />
        <Link
          href="/"
          className="rounded border border-linka bg-plocha px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust"
        >
          Celý přehled
        </Link>
        <Link
          href="/metodika/"
          className="rounded border border-linka bg-plocha px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust"
        >
          Metodika
        </Link>
      </div>
    </div>
  );
}
