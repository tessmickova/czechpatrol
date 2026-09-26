import type { Metadata } from "next";
import { ObsahStranky } from "@/components/obsah-stranky";
import { HlavickaStranky } from "@/components/nadpisy";
import Link from "next/link";
import { DORUCOVANI, KANALY, KOMUNITA, METODIKA_REVIDOVANA, PROVOZOVATEL, SBER_JAK_CASTO, PROVOZOVATEL_TEXT, UCTY_ZAPNUTE, WEB } from "@/config/web";
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
        uvod={<>{WEB.nazev} je nezávislý přehled bez inzerce — bezpečnostních událostí a úředních opatření, která se mohou dotknout lidí v Česku. Není to úřední zdroj, varovný systém ani předpověď.</>}
      />
      <ObsahStranky />
      <div className="mt-16 space-y-12 sm:mt-20">
        <Odstavec nadpis="Co web dělá">
          <p>Sbírá veřejné informace o sabotážích, dronech, kybernetických útocích a reakcích států. Každý záznam má zdroj, datum události, datum zjištění, závažnost a jistotu.</p>
          <p>Dnes je zveřejněno {p.pripady} případů, {p.aktualizace} aktualizací, {p.opatreni} opatření a {p.reakce} prohlášení nebo reakcí; {n} záznamů je bez dokladu a vedeno odděleně.</p>
        </Odstavec>
        <Odstavec nadpis="Co web nedělá">
          <p>Nepočítá pravděpodobnost války. Nezveřejňuje nic bez zdroje. Nezjišťuje vaši polohu.</p>
        </Odstavec>
        <Odstavec nadpis="Odkud jsou data">
          <p>Přednost má orgán, který věc sám vyšetřuje nebo provozuje, v kterékoli zemi; pak nezávislé potvrzení z druhé strany; redakce podle toho, jak dokládají, ne odkud jsou. Sociální sítě samy hodnocení nezvyšují. Všechny zdroje jsou na stránce <Link href="/zdroje/" className="odkaz">Zdroje</Link>, pravidla hodnocení v <Link href="/metodika/" className="odkaz">Metodice</Link> (revize {datumPraha(METODIKA_REVIDOVANA)}).</p>
          <p>Sběr běží {SBER_JAK_CASTO} a web se přestaví do několika minut po každé změně dat. Záznam se zveřejní sám jen tehdy, když ho potvrzují dva nezávislé zdroje a jeden z nich je úřední; válečně významné zprávy jen ze dvou médií vycházejí označené jako <strong>neověřené</strong> a do hodnocení se nepočítají. Ostatní čeká na kontrolu. Texty jsou AI shrnutí zdrojů, ne články. Celkové hodnocení se počítá automaticky podle pravidel v Metodice, nejvýš den stará data. Přebíráme fakta, ne znění, a odkazujeme na originál. Opravy jsou na stránce <Link href="/opravy/" className="odkaz">Opravy a historie</Link>.</p>
        </Odstavec>
        <Odstavec nadpis="Nezávislost a peníze">
          <p>Bez inzerce a sponzorů. Základ je a zůstane zdarma. Podpořit provoz jde dobrovolně na stránce <Link href="/podporit/" className="odkaz">Podpořit</Link>.</p>
        </Odstavec>
        <Odstavec nadpis="Co připravujeme">
          <ul className="list-disc space-y-1 pl-5">
            <li>Účty, týdenní souhrn a upozornění: {UCTY_ZAPNUTE ? "běží" : "připravujeme"}.</li>
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
              ? `Provozovatel: ${PROVOZOVATEL_TEXT}${PROVOZOVATEL.kontakt ? `, kontakt ${PROVOZOVATEL.kontakt}` : ""}.`
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
