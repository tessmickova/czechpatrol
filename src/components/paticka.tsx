import Link from "next/link";
import { KOMUNITA, METODIKA_REVIDOVANA, WEB } from "@/config/web";
import { datum } from "@/lib/format";
import { Logo } from "./znacka";
import { JAZYKY } from "@/lib/jazyky";

const SLOUPCE: { nadpis: string; odkazy: [string, string][] }[] = [
  {
    nadpis: "Obsah",
    odkazy: [["/", "Přehled"], ["/udalosti/", "Události"], ["/manipulace/", "Manipulace"], ["/zeme/", "Země"], ["/analyzy/", "Analýzy"], ["/muj-prehled/", "Můj přehled"], ["/odber/", "Odběr a RSS"]],
  },
  {
    nadpis: "Důvěryhodnost",
    odkazy: [["/metodika/", "Metodika"], ["/zdroje/", "Zdroje"], ["/opravy/", "Opravy a historie"], ["/vyvoj/", "Vývoj"], ["/svet/", "Aktéři a cíle"], ["/o-projektu/", "O projektu"]],
  },
  {
    nadpis: "Projekt",
    odkazy: [["/podporit/", "Podpořit"], ["/ucet/", "Účet"], ["/izs/", "Pro záchranné složky"], ["/soukromi/", "Soukromí"], ["/podminky/", "Podmínky"]],
  },
];

/*
  Jazyky v patičce. Nejsou v hlavní navigaci schválně: český web zůstává tím
  hlavním a přepínač je rozcestník pro čtenáře odjinud, ne rovnocenná větev.
*/
function Jazyky() {
  return (
    <nav aria-label="Jazyky" className="mt-8 border-t border-white/10 pt-6">
      <div className="stitek-tmavy mb-3 text-noc-tlum/70">Jiné jazyky / Other languages</div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13.5px]">
        {JAZYKY.map((j) => (
          <li key={j.kod}>
            <Link href={`/${j.kod}/`} hrefLang={j.kod} className="text-noc-tlum transition-colors hover:text-noc-text">
              {j.nazev}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Paticka() {
  return (
    // Patička stojí na tmavé desce — jediné velké tmavé místo na stránce.
    // Stejný obal jako hlavička a obsah stránky, ať tmavá deska lícuje s panely
    // nad sebou. Dřív měla vlastní 1200 px a byla o 16 px zasunutá.
    <footer className="neni-tisk pb-6">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <div className="noc rounded-[28px] px-6 py-10 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Logo velikost={32} pismo={17} tmave />
            <p className="mt-3 max-w-[38ch] text-[14px] leading-relaxed text-noc-tlum">
              Nezávislý přehled bezpečnostních událostí a změn, které mohou mít dopad na lidi v Česku.
              Není to úřední zdroj ani varovný systém. V nouzi volejte 112.
            </p>
            <p className="mt-3 text-[13px] text-noc-tlum/80">
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
              <div className="stitek-tmavy mb-3 text-noc-tlum/70">{s.nadpis}</div>
              <ul className="space-y-2 text-[14px]">
                {s.odkazy.map(([href, label]) => (
                  <li key={href}><Link href={href} className="text-noc-tlum transition-colors hover:text-noc-text">{label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <Jazyky />
      </div>
      </div>
    </footer>
  );
}
