import Link from "next/link";
import { CoSeZmenilo, Hero } from "@/components/hero";
import { KartaUdalosti } from "@/components/karta-udalosti";
import { CasovaOsa } from "@/components/osa";
import {
  HybridniPanel, JakCist, NatoPanel, PravniSemafor, ProvozPanel,
  RuskoPanel, ScenarovaCesta, WatchlistPanel,
} from "@/components/panely";
import { StavPruh } from "@/components/stav-pruh";
import { GrafTrendu, TabulkaTydnu } from "@/components/trend";
import { Karta, Prazdno, Sekce } from "@/components/zaklad";
import { BUY_ME_A_COFFEE_URL } from "@/config/web";
import {
  celkovyStav, hybridniTlak, incidenty, klidoveBody, nato, pravniStav,
  provoz, rusko, tydny, watchlist,
} from "@/lib/data";
import { UROVNE } from "@/lib/skala";

export default function Prehled() {
  const stav = celkovyStav();
  const pravni = pravniStav();
  const aliance = nato();
  const hybridni = hybridniTlak();
  const vse = incidenty();
  const tydenni = tydny();

  const hlavni = vse.filter((i) => {
    const p = UROVNE[i.zavaznost].pasmo;
    return p === "oranzova" || p === "cervena" || p === "prechod" || i.novy;
  }).slice(0, 4);
  const mensi = vse.filter((i) => !hlavni.includes(i)).slice(0, 6);

  return (
    <>
      <StavPruh
        aktualizovano={stav.aktualizovano}
        uroven={stav.uroven}
        pravni={pravni}
        nato={aliance}
        hybridni={hybridni}
      />

      <Hero stav={stav} klidove={klidoveBody()} />

      <Sekce
        cislo="01"
        nadpis="Co se změnilo od poslední aktualizace"
        popis="Jedna událost se počítá jednou, i když o ní vyjde víc článků. Nové vyšetřovací zjištění u starší události ale může být samostatným signálem."
        akce={
          <Link href="/dnes/" className="rounded border border-linka bg-plocha px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust">
            Shrnutí dne
          </Link>
        }
      >
        <CoSeZmenilo stav={stav} />

        <div className="mt-8 space-y-4">
          {hlavni.length ? (
            hlavni.map((i) => <KartaUdalosti key={i.id} incident={i} />)
          ) : (
            <Prazdno
              nadpis="Zatím nejsou zveřejněné žádné události"
              popis="Zobrazujeme jen záznamy, které prošly kontrolou a mají uvedený zdroj. Dokud takové nejsou, web žádné události netvrdí."
            />
          )}
        </div>
      </Sekce>

      <Sekce
        cislo="02"
        nadpis="Co je teď důležité vědět"
        popis="Nejdřív jak web číst, potom stav Aliance. Obojí patří ke každému číslu na této stránce."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <JakCist />
          <NatoPanel polozky={aliance.polozky} overeno={aliance.overeno} />
        </div>
      </Sekce>

      <Sekce
        id="cr"
        cislo="03"
        nadpis="Česká republika — právní stav"
        popis="Mimořádné stavy nevznikají tím, že se zhorší situace. Každý z nich je samostatný právní krok s vlastními podmínkami a vlastním úředním vyhlášením."
        akce={
          <Link href="/cr/" className="rounded border border-linka bg-plocha px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust">
            Podrobně
          </Link>
        }
      >
        <PravniSemafor polozky={pravni.polozky} overeno={pravni.overeno} />
      </Sekce>

      <Sekce
        cislo="04"
        nadpis="Hybridní tlak a přímý vojenský střet"
        popis="Dvě různé otázky. Sledujeme je odděleně, protože jejich sloučení je nejčastější zdroj zbytečného strachu."
      >
        <HybridniPanel tlak={hybridni} />
      </Sekce>

      <Sekce
        cislo="05"
        nadpis="Co to znamená pro život v ČR"
        popis="Praktický stav běžných služeb. Kde nemáme spolehlivý veřejný zdroj, napíšeme to — nedopočítáváme."
      >
        <ProvozPanel provoz={provoz()} />
      </Sekce>

      <Sekce
        cislo="06"
        nadpis="Co může změnit hodnocení během příštích 72 hodin"
        popis="Konkrétní institucionální a právní spouštěče — v obou směrech."
      >
        <WatchlistPanel watchlist={watchlist()} />
      </Sekce>

      <Sekce
        cislo="07"
        nadpis="K čemu by se situace mohla posunout"
        popis="Orientační sled možných institucionálních kroků. Žádný z nich nenásleduje automaticky po předchozím."
      >
        <ScenarovaCesta />
      </Sekce>

      <Sekce
        cislo="08"
        nadpis="Časová osa"
        popis="Chronologie ověřených událostí. Smyslem je vidět kumulaci, ne přečíst každý detail."
        akce={
          <Link href="/osa/" className="rounded border border-linka bg-plocha px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust">
            Celá osa
          </Link>
        }
      >
        <CasovaOsa incidenty={vse.slice(0, 12)} />
      </Sekce>

      <Sekce
        cislo="09"
        nadpis="Jak se situace vyvíjí"
        popis="Vývoj po týdnech od začátku měření. Svislá osa je stupnice úrovní, ne procenta."
        akce={
          <Link href="/trend/" className="rounded border border-linka bg-plocha px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust">
            Detail trendu
          </Link>
        }
      >
        <div className="space-y-5">
          <GrafTrendu tydny={tydenni} />
          <TabulkaTydnu tydny={tydenni} />
        </div>
      </Sekce>

      <Sekce
        cislo="10"
        nadpis="Rusko: vnitřní tlak režimu"
        popis="Doplňkový ukazatel, vizuálně menší než hlavní bezpečnostní status — protože je méně jistý."
      >
        <RuskoPanel stav={rusko()} />
      </Sekce>

      <Sekce
        cislo="11"
        nadpis="Menší signály"
        popis="Události, které samy o sobě hodnocení nemění, ale mohou se kumulovat."
      >
        {mensi.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {mensi.map((i) => (
              <KartaUdalosti key={i.id} incident={i} rozbalitelna={false} />
            ))}
          </div>
        ) : (
          <Prazdno
            nadpis="Žádné menší signály k zobrazení"
            popis="Sem se zapisují drobnější ověřené události, které samy o sobě hodnocení nemění."
          />
        )}
      </Sekce>

      <Sekce
        cislo="12"
        nadpis="Metodika"
        popis="Co započítáváme jako nový signál, co ne, a co je náš baseline."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Karta className="p-5 sm:p-6">
            <p className="max-w-[42rem] text-[13.5px] leading-relaxed text-tlum">
              Nezapočítáváme další článek o téže věci, komentář politika bez nového faktu,
              repost ani starou událost publikovanou znovu. Běžné jednotlivé průniky do
              vzdušného prostoru samy o sobě hodnocení nezvyšují — hledáme{" "}
              <b className="font-semibold text-inkoust">změnu vzorce</b>: vyšší četnost,
              více zasažených států, hlubší průnik, škody, oběti, úmyslné cílení, oficiální
              atribuci nebo změnu reakce NATO.
            </p>
            <Link
              href="/metodika/"
              className="mt-5 inline-block rounded border border-linka px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust"
            >
              Celá metodika
            </Link>
          </Karta>

          {BUY_ME_A_COFFEE_URL ? (
            <Karta className="flex flex-col justify-between p-5 sm:p-6">
              <div>
                <h3 className="podnadpis mb-2 text-[16px]">Podpořit projekt</h3>
                <p className="text-[12.5px] leading-relaxed text-tlum">
                  Projekt je nezávislý a vzniká jako hobby. Pokud vám přehled pomáhá,
                  můžete přispět na jeho provoz.
                </p>
              </div>
              <a
                href={BUY_ME_A_COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block rounded border border-linka px-3 py-2 text-center text-[12.5px] font-medium transition-colors hover:border-inkoust"
              >
                Podpořit projekt
              </a>
            </Karta>
          ) : (
            <Karta className="p-5 sm:p-6">
              <h3 className="podnadpis mb-2 text-[16px]">Zdroje</h3>
              <p className="text-[12.5px] leading-relaxed text-tlum">
                Každé konkrétní tvrzení na webu má uvedený zdroj. Přednost mají orgány,
                které věc samy oznámily, teprve po nich agentury a média.
              </p>
              <Link
                href="/zdroje/"
                className="mt-5 inline-block rounded border border-linka px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust"
              >
                Seznam zdrojů
              </Link>
            </Karta>
          )}
        </div>
      </Sekce>
    </>
  );
}
