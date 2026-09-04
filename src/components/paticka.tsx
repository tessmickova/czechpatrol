import Link from "next/link";
import { BUY_ME_A_COFFEE_URL, METODIKA_REVIDOVANA, WEB } from "@/config/web";
import { datum } from "@/lib/format";

export function Paticka() {
  return (
    <footer className="noc relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div data-vrstva="0.05" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[45%]" />
      </div>
      <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div>
            <div className="stitek mb-3 !text-noc-tlum">O tomto projektu</div>
            <h2 className="podnadpis mb-4 text-[19px] text-noc-text">
              Nezávislý analytický projekt, ne úřední zdroj
            </h2>
            <div className="max-w-[42rem] space-y-3 text-[13px] leading-relaxed text-noc-tlum">
              <p>
                Nezávislý hobby projekt. Veřejně dostupné informace zpracovává
                automatizovaně a s pomocí AI.
              </p>
              <p>
                <b className="font-semibold text-noc-text">
                  Není součástí vlády ČR, Armády ČR, NATO, EU ani bezpečnostních složek.
                </b>{" "}
                Hodnocení je analytická interpretace — ne oficiální stupeň, ne předpověď,
                ne pokyn k jednání.
              </p>
              <p>
                Automat se může splést. Před důležitým rozhodnutím ověřte stav u úřadů
                a primárních zdrojů; v krizi se řiďte pokyny státních orgánů a IZS.
              </p>
              <p className="text-noc-tlum/70">
                Web nedává doporučení „odjet / neodjet“. Ukazuje ověřený stav, spouštěče
                a to, co se zatím nestalo. Rozhodnutí zůstává na čtenáři.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <span className="stitek-tmavy rounded-full border border-white/20 px-2.5 py-1 text-noc-tlum">
                Pracovní verze
              </span>
              <span className="text-[11.5px] text-noc-tlum/70">
                Metodika naposledy revidována {datum(METODIKA_REVIDOVANA)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 lg:grid-cols-1 lg:gap-8">
            <nav aria-label="Patička">
              <div className="stitek mb-3 !text-noc-tlum">Obsah</div>
              <ul className="space-y-2 text-[13px]">
                {[
                  ["/dnes/", "Dnes"],
                  ["/udalosti/", "Události"],
                  ["/osa/", "Časová osa"],
                  ["/trend/", "Trend po týdnech"],
                  ["/cr/", "Právní stav ČR"],
                  ["/nato/", "NATO"],
                  ["/metodika/", "Metodika"],
                  ["/zdroje/", "Zdroje"],
                  ["/odber/", "Odběr"],
                ].map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-noc-tlum transition-colors hover:text-noc-text">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {BUY_ME_A_COFFEE_URL && (
              <div>
                <div className="stitek mb-3 !text-noc-tlum">Podpora</div>
                <p className="mb-3 text-[12.5px] leading-relaxed text-noc-tlum">
                  Projekt je nezávislý a vzniká jako hobby. Pokud vám přehled pomáhá,
                  můžete přispět na jeho provoz.
                </p>
                <a
                  href={BUY_ME_A_COFFEE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-[10px] border border-white/20 px-3 py-2 text-[12.5px] font-medium text-noc-text transition-colors hover:border-white/45"
                >
                  Podpořit projekt
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] text-noc-tlum/70">
            {WEB.nazev} — {WEB.podtitul}. Nezávislý experimentální projekt.
          </p>
          <p className="text-[11.5px] text-noc-tlum/70">
            Časové údaje jsou uváděny absolutně, ve středoevropském čase.
          </p>
        </div>
      </div>
    </footer>
  );
}
