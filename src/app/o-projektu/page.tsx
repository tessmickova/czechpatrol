import type { Metadata } from "next";
import Link from "next/link";
import { KOMUNITA, METODIKA_REVIDOVANA, PROVOZOVATEL, UCTY_ZAPNUTE, WEB } from "@/config/web";
import { datumPraha } from "@/lib/cas";
import { pocty } from "@/lib/agregace";
import { incidenty, nepotvrzene } from "@/lib/data";

export const metadata: Metadata = {
  title: "O projektu",
  description: "Kdo za CzechPatrol stojí, z čeho jsou data, co web nedělá a jak se dá zapojit.",
};

function Odstavec({ nadpis, children }: { nadpis: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-linka pt-6">
      <h2 className="text-[18px] font-bold">{nadpis}</h2>
      <div className="mt-2 space-y-2.5 text-[15px] leading-relaxed text-tlum">{children}</div>
    </section>
  );
}

export default function OProjektu() {
  const p = pocty(incidenty(), "všechny zveřejněné záznamy");
  const n = nepotvrzene().length;
  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">O projektu</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-tlum">
        {WEB.nazev} je nezávislý, nekomerční přehled bezpečnostních událostí a oficiálních opatření, které se mohou dotknout lidí v Česku.
        Není to úřední zdroj, varovný systém ani předpověď.
      </p>
      <div className="mt-8 space-y-6">
        <Odstavec nadpis="Co web dělá">
          <p>Sbírá veřejně dostupné informace o sabotážích, průnicích do vzdušného prostoru, kybernetických operacích a oficiálních reakcích států. Každý záznam má zdroj, datum události i datum, kdy vyšla najevo, a zvlášť uvedenou závažnost a jistotu.</p>
          <p>Dnes je zveřejněno {p.pripady} případů, {p.aktualizace} aktualizací, {p.opatreni} opatření a {p.reakce} prohlášení nebo reakcí; {n} záznamů ověřením neprošlo a je vedeno odděleně.</p>
        </Odstavec>
        <Odstavec nadpis="Co web nedělá">
          <p>Neradí, jestli odjet nebo zůstat. Nepočítá pravděpodobnost války v procentech. Nezveřejňuje nic, co neprošlo lidskou kontrolou a nemá zdroj. Nezjišťuje polohu návštěvníků.</p>
        </Odstavec>
        <Odstavec nadpis="Odkud jsou data">
          <p>Přednost mají orgány, které věc samy oznámily: policie, vlády, NATO, EU. Pak agentury a média. Sociální sítě samy o sobě nikdy nezvyšují hodnocení. Seznam všech zdrojů je na stránce <Link href="/zdroje/" className="odkaz">Zdroje</Link>, pravidla hodnocení v <Link href="/metodika/" className="odkaz">Metodice</Link> (revize {datumPraha(METODIKA_REVIDOVANA)}).</p>
          <p>Sběr běží automaticky každou hodinu, ale nic nezveřejňuje — ukládá kandidáty ke kontrole. Hodnocení stanovuje člověk. Opravy jsou veřejné na stránce <Link href="/opravy/" className="odkaz">Opravy a historie</Link>.</p>
        </Odstavec>
        <Odstavec nadpis="Nezávislost a peníze">
          <p>Projekt nemá inzerci, sponzory ani placené umístění. Základní informace jsou a zůstanou zdarma. Provoz se dá podpořit dobrovolně na stránce <Link href="/podporit/" className="odkaz">Podpořit</Link>; co to stojí, je tam rozepsané.</p>
        </Odstavec>
        <Odstavec nadpis="Co zatím není hotové">
          <ul className="list-disc space-y-1 pl-5">
            <li>Účty, týdenní souhrn a upozornění: {UCTY_ZAPNUTE ? "běží" : "kód existuje, služba zatím neběží"}.</li>
            <li>Kanály na Telegramu, WhatsAppu a dalších sítích: nejsou spuštěné, proto se nikde nenabízejí.</li>
            <li>Role partnera pro záchranné složky: připravená v kódu, přiděluje ji jen správce po ověření.</li>
          </ul>
        </Odstavec>
        <Odstavec nadpis="Kdo za tím stojí">
          <p>
            {PROVOZOVATEL.nazev
              ? `Provozovatel: ${PROVOZOVATEL.nazev}${PROVOZOVATEL.kontakt ? `, kontakt ${PROVOZOVATEL.kontakt}` : ""}.`
              : "Provozovatel zatím není v nastavení webu vyplněn — do jeho doplnění tu nic nevymýšlíme. Kód i data jsou veřejné."}
          </p>
          <p>
            <a href={KOMUNITA.github} target="_blank" rel="noopener noreferrer" className="odkaz">Kód a data na GitHubu</a>
            {" · "}
            <a href={KOMUNITA.diskuse} target="_blank" rel="noopener noreferrer" className="odkaz">Diskuse a podněty</a>
            {" · "}
            <Link href="/soukromi/" className="odkaz">Soukromí</Link>
            {" · "}
            <Link href="/podminky/" className="odkaz">Podmínky</Link>
          </p>
        </Odstavec>
      </div>
    </div>
  );
}
