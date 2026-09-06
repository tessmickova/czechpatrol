import Link from "next/link";
import { KOMUNITA, METODIKA_REVIDOVANA, WEB } from "@/config/web";
import { datum } from "@/lib/format";

const SLOUPCE: { nadpis: string; odkazy: [string, string][] }[] = [
  {
    nadpis: "Obsah",
    odkazy: [["/", "Přehled"], ["/udalosti/", "Události"], ["/vyvoj/", "Vývoj"], ["/svet/", "Svět"], ["/muj-prehled/", "Můj přehled"], ["/odber/", "Odběr a RSS"]],
  },
  {
    nadpis: "Důvěryhodnost",
    odkazy: [["/metodika/", "Metodika"], ["/zdroje/", "Zdroje"], ["/opravy/", "Opravy a historie"], ["/o-projektu/", "O projektu"]],
  },
  {
    nadpis: "Projekt",
    odkazy: [["/podporit/", "Podpořit"], ["/ucet/", "Účet"], ["/izs/", "Pro záchranné složky"], ["/soukromi/", "Soukromí"], ["/podminky/", "Podmínky"]],
  },
];

export function Paticka() {
  return (
    <footer className="border-t border-linka">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <div className="text-[17px] font-bold">{WEB.nazev}</div>
            <p className="mt-2 max-w-[38ch] text-[14px] leading-relaxed text-tlum">
              Nezávislý přehled bezpečnostních událostí a změn, které mohou mít dopad na lidi v Česku.
              Není to úřední zdroj ani varovný systém. V nouzi volejte 112.
            </p>
            <p className="mt-3 text-[13px] text-tlum2">
              Metodika revidována {datum(METODIKA_REVIDOVANA)}
              {KOMUNITA.github && (
                <>
                  {" · "}
                  <a href={KOMUNITA.github} target="_blank" rel="noopener noreferrer" className="odkaz">kód a data na GitHubu</a>
                </>
              )}
            </p>
          </div>
          {SLOUPCE.map((s) => (
            <nav key={s.nadpis} aria-label={s.nadpis}>
              <div className="stitek mb-3">{s.nadpis}</div>
              <ul className="space-y-2 text-[14px]">
                {s.odkazy.map(([href, label]) => (
                  <li key={href}><Link href={href} className="text-tlum transition-colors hover:text-inkoust">{label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
