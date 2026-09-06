import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import Link from "next/link";
import { datumPraha } from "@/lib/cas";
import { incident, opravy } from "@/lib/data";
import { KOMUNITA } from "@/config/web";

export const metadata: Metadata = {
  title: "Opravy a historie",
  description: "Veřejný seznam oprav: co bylo špatně, proč a od kdy platí nová verze. Nic se neopravuje potichu.",
};

const DRUHY: Record<string, string> = {
  "oprava-dat": "oprava dat",
  "doplneni-zdroju": "doplnění zdrojů",
  metodika: "metodika",
  "oprava-textu": "oprava textu",
};

export default function Opravy() {
  const seznam = opravy();
  return (
    <div className="mx-auto max-w-[900px] px-5 py-12 sm:px-8 sm:py-16">
      <HlavickaStranky
        stitek="Opravy"
        nadpis="Co jsme napsali špatně"
        uvod={<>Každá oprava zveřejněného údaje je tady: co bylo špatně, proč a co platí teď. U jednotlivých událostí najdete totéž v části Historie. Úplná historie změn dat je v <a href={KOMUNITA.github} target="_blank" rel="noopener noreferrer" className="odkaz">repozitáři</a>.</>}
      />
      <h2 className="titul-mensi mt-16 sm:mt-20">Jak opravy děláme</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-tlum">
        <li>Chybu ověříme proti zdroji. Podnět od čtenáře sám o sobě opravou není.</li>
        <li>Opravený záznam dostane novou položku v historii, původní znění zůstává dohledatelné v repozitáři.</li>
        <li>Oprava, která mění počty nebo hodnocení, se zapíše i sem, s datem zveřejnění.</li>
        <li>Změna metodiky je verzovaná. Starší hodnocení se nepřepisují zpětně; mění se jen názvy, pokud to metodika říká.</li>
      </ol>
      <h2 className="titul-mensi mt-14">Seznam oprav</h2>
      {seznam.length ? (
        <ol className="mt-3 divide-y divide-linka2 border-y border-linka2">
          {seznam.map((o) => {
            const i = incident(o.tykaSe);
            return (
              <li key={o.id} className="py-4">
                <div className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-tlum">
                  <span className="cislice">{datumPraha(o.datum)}</span>
                  <span aria-hidden>·</span>
                  <span className="font-semibold uppercase tracking-[0.05em]">{DRUHY[o.druh] ?? o.druh}</span>
                  {i && <><span aria-hidden>·</span><Link href={`/incident/${i.slug}/`} className="odkaz">{i.kratkyTitulek || i.titulek}</Link></>}
                  {!i && o.tykaSe === "metodika" && <><span aria-hidden>·</span><Link href="/metodika/" className="odkaz">metodika</Link></>}
                </div>
                <p className="mt-1.5 text-[15px] font-semibold text-inkoust">{o.co}</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-tlum">{o.proc}</p>
              </li>
            );
          })}
        </ol>
      ) : <p className="mt-3 text-[14px] text-tlum">Zatím žádná zveřejněná oprava.</p>}
      <p className="mt-8 text-[13.5px] text-tlum">
        Našli jste chybu? Napište ji do <a href={KOMUNITA.diskuse} target="_blank" rel="noopener noreferrer" className="odkaz">diskuse na GitHubu</a> nebo formulářem „Chybí tu nějaká událost?“ v <Link href="/udalosti/" className="odkaz">Událostech</Link>.
      </p>
    </div>
  );
}
