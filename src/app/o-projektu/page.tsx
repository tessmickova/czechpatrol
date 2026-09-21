import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import Link from "next/link";
import { DORUCOVANI, KANALY, KOMUNITA, METODIKA_REVIDOVANA, PROVOZOVATEL, UCTY_ZAPNUTE, WEB } from "@/config/web";
import { datumPraha } from "@/lib/cas";
import { pocty } from "@/lib/agregace";
import { incidenty, nepotvrzene } from "@/lib/data";

export const metadata: Metadata = {
  title: "O projektu",
  description: "Kdo za CzechPatrol stojí, z čeho jsou data, co web nedělá a jak se dá zapojit.",
};

function Odstavec({ nadpis, children }: { nadpis: string; children: React.ReactNode }) {
  return (
    <section className="nalet border-t border-linka pt-10">
      <h2 className="titul-mensi">{nadpis}</h2>
      <div className="mt-4 space-y-3.5 text-vetsi leading-relaxed text-tlum">{children}</div>
    </section>
  );
}

export default function OProjektu() {
  const p = pocty(incidenty(), "všechny zveřejněné záznamy");
  const n = nepotvrzene().length;
  return (
    <div className="mx-auto max-w-[860px] px-5 py-12 sm:px-8 sm:py-16">
      <HlavickaStranky
        stitek="O projektu"
        nadpis="Kdo to píše a podle čeho"
        uvod={<>{WEB.nazev} je nezávislý a nekomerční přehled bezpečnostních událostí a úředních opatření, která se mohou dotknout lidí v Česku. Není to úřední zdroj, varovný systém ani předpověď.</>}
      />
      <div className="mt-16 space-y-12 sm:mt-20">
        <Odstavec nadpis="Co web dělá">
          <p>Sbírá veřejně dostupné informace o sabotážích, průnicích do vzdušného prostoru, kybernetických operacích a oficiálních reakcích států. Každý záznam má zdroj, datum události i datum, kdy vyšla najevo, a zvlášť uvedenou závažnost a jistotu.</p>
          <p>Dnes je zveřejněno {p.pripady} případů, {p.aktualizace} aktualizací, {p.opatreni} opatření a {p.reakce} prohlášení nebo reakcí; {n} záznamů ověřením neprošlo a je vedeno odděleně.</p>
        </Odstavec>
        <Odstavec nadpis="Co web nedělá">
          <p>Neradí, jestli odjet nebo zůstat. Nepočítá pravděpodobnost války v procentech. Nezveřejňuje nic, co neprošlo lidskou kontrolou a nemá zdroj. Nezjišťuje polohu návštěvníků.</p>
        </Odstavec>
        <Odstavec nadpis="Odkud jsou data">
          <p>Přednost mají orgány, které věc samy oznámily: policie, vlády, NATO, EU. Pak agentury a média. Sociální sítě samy o sobě nikdy nezvyšují hodnocení. Seznam všech zdrojů je na stránce <Link href="/zdroje/" className="odkaz">Zdroje</Link>, pravidla hodnocení v <Link href="/metodika/" className="odkaz">Metodice</Link> (revize {datumPraha(METODIKA_REVIDOVANA)}).</p>
          <p>Sběr běží automaticky každou hodinu, ale nic nezveřejňuje — ukládá kandidáty ke kontrole. Texty záznamů jsou AI shrnutí zdrojů, ne oficiální články; hodnocení stanovuje člověk. Přebírají se fakta, ne znění — každý záznam odkazuje na originál. Opravy jsou veřejné na stránce <Link href="/opravy/" className="odkaz">Opravy a historie</Link>.</p>
        </Odstavec>
        <Odstavec nadpis="Nezávislost a peníze">
          <p>Projekt nemá inzerci, sponzory ani placené umístění. Základní informace jsou a zůstanou zdarma. Provoz se dá podpořit dobrovolně na stránce <Link href="/podporit/" className="odkaz">Podpořit</Link>; co to stojí, je tam rozepsané.</p>
        </Odstavec>
        <Odstavec nadpis="Co zatím není hotové">
          <ul className="list-disc space-y-1 pl-5">
            <li>Účty, týdenní souhrn a upozornění: {UCTY_ZAPNUTE ? "běží" : "kód existuje, služba zatím neběží"}.</li>
            {/*
              Tohle tvrzení bylo v rozporu se skutečností i s vlastním úvodem
              webu: telegramový kanál běží a nabízí se. Věta se teď skládá
              z konfigurace, aby se rozejít nemohla.
            */}
            <li>
              {DORUCOVANI.telegram.nazev}: {KANALY.telegram ? `běží — ${DORUCOVANI.telegram.kadence}` : "není spuštěný"}.
              {" "}Ostatní sítě (WhatsApp, Signal, Bluesky) spuštěné nejsou, proto se nenabízejí.
            </li>
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
            {" · "}
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
