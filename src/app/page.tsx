import Link from "next/link";
import { SeznamSFiltry } from "@/components/filtry";
import { SituacniPanel } from "@/components/hero";
import { Ikona } from "@/components/ikony";
import { OdberPanel } from "@/components/odber";
import { CasovaOsa } from "@/components/osa";
import { Mrizka, Panel } from "@/components/panel";
import {
  HybridniPanel, NatoPanel, PravniSemafor, ProvozPanel, RuskoPanel,
  ScenarovaCesta, WatchlistPanel,
} from "@/components/panely";
import { CasovyPosuvnik } from "@/components/posuvnik";
import { PuvodcePanel } from "@/components/puvodce";
import { GrafTrendu, TabulkaTydnu } from "@/components/trend";
import { SeznamZdroju } from "@/components/zdroje";
import { datum } from "@/lib/format";
import {
  archiv, celkovyStav, dnyBezZmeny, hybridniTlak, incidenty, nato, nepotvrzene,
  posledniOvereni, pravniStav, provoz, puvodce, rusko, tydny, watchlist,
} from "@/lib/data";

const odkaz =
  "rounded-full border border-linka bg-plocha px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-inkoust";

export default function Prehled() {
  const stav = celkovyStav();
  const pravni = pravniStav();
  const aliance = nato();
  const hybridni = hybridniTlak();
  const vse = incidenty();
  const tydenni = tydny();
  const neprosly = nepotvrzene();

  return (
    <>
      <SituacniPanel
        stav={stav}
        pravni={pravni}
        nato={aliance}
        hybridni={hybridni}
        dnyBezZmeny={dnyBezZmeny()}
        overeno={posledniOvereni()}
      />

      <Mrizka>
        <Panel
          id="cr"
          kod="ČR · právní stav"
          ikona="vaha"
          nadpis="Co u nás platí a co ne"
          popis="Mimořádné stavy nevznikají zhoršením situace. Každý je samostatný právní krok. Rozklikněte řádek pro vysvětlení a zdroj."
          sirka="pul"
          vnorena
        >
          <PravniSemafor polozky={pravni.polozky} overeno={pravni.overeno} />
        </Panel>

        <Panel
          kod="Aliance"
          ikona="stit"
          nadpis="NATO"
          popis="Článek 4 je nástroj konzultací, článek 5 kolektivní obrana. Jedno nevede k druhému automaticky."
          sirka="pul"
          vnorena
        >
          <NatoPanel polozky={aliance.polozky} overeno={aliance.overeno} bezHlavicky />
        </Panel>

        <Panel
          kod="Dopad na život"
          ikona="stit-ok"
          nadpis="Běžné služby"
          popis="Palivo, elektřina, banky, sítě. Kde chybí spolehlivý veřejný zdroj, je to napsané — nedopočítáváme."
        >
          <ProvozPanel provoz={provoz()} />
        </Panel>

        <Panel
          kod="Hybridní tlak"
          ikona="terc"
          nadpis="Tlak v Evropě a vojenské riziko odděleně"
          popis="Sabotáže a kyber jsou jedna otázka, vojenský střet druhá. Na radaru je vidět, že vysoký tlak neznamená blížící se válku."
          sirka="dve-tretiny"
        >
          <HybridniPanel tlak={hybridni} />
        </Panel>

        <Panel
          kod="Původ"
          ikona="oko"
          nadpis="Co se ví o pachateli"
          popis="Část případů dostala domácí vysvětlení. Do celkové úrovně tenhle rozpad nevstupuje."
          sirka="tretina"
        >
          <PuvodcePanel skupiny={puvodce()} bezHlavicky />
        </Panel>

        <Panel
          id="vyvoj"
          kod="Archiv"
          ikona="hodiny"
          nadpis="Jak to vypadalo kterýkoli den"
          popis="Táhněte posuvníkem nebo pusťte přehrávání. Hodnota platí, dokud ji nepřepíše nový snímek."
        >
          <CasovyPosuvnik archiv={archiv()} />
        </Panel>

        <Panel
          kod="Trend"
          ikona="graf"
          nadpis="Vývoj po týdnech"
          popis="Svislá osa je stupnice úrovní, ne procenta. Riziko v procentech neuvádíme."
          sirka="dve-tretiny"
        >
          <GrafTrendu tydny={tydenni} />
        </Panel>

        <Panel
          kod="Watchlist 72 h"
          ikona="terc"
          nadpis="Co může hodnocení změnit"
          popis="Konkrétní kroky institucí, v obou směrech."
          sirka="tretina"
        >
          <WatchlistPanel watchlist={watchlist()} />
        </Panel>

        <Panel kod="Týdny" ikona="graf" nadpis="Týdenní přehled" popis="Počty signálů a rozložení závažnosti." vnorena>
          <TabulkaTydnu tydny={tydenni} />
        </Panel>

        <Panel
          id="udalosti"
          kod="Události"
          ikona="oko"
          nadpis="Ověřené záznamy"
          popis="Filtrujte podle oblasti, závažnosti a období. Každý záznam má datum události i datum zjištění."
          akce={
            <Link href="/udalosti/" className={odkaz}>
              Samostatně
            </Link>
          }
        >
          <SeznamSFiltry incidenty={vse} odkdyCervenec="2026-07-01T00:00:00Z" />
        </Panel>

        <Panel
          kod="Chronologie"
          ikona="osa"
          nadpis="Časová osa"
          popis="Kumulace signálů v čase. „Nové zjištění“ není nový útok."
          sirka="pul"
        >
          <CasovaOsa incidenty={vse.slice(0, 14)} />
        </Panel>

        <Panel
          kod="Scénář"
          ikona="zebrik"
          nadpis="Kam až by se to mohlo posunout"
          popis="Orientační sled kroků. Žádný nenásleduje automaticky po předchozím."
          sirka="pul"
        >
          <ScenarovaCesta />
        </Panel>

        <Panel
          kod="Rusko"
          ikona="globus"
          nadpis="Vnitřní tlak režimu"
          popis="Doplňkový ukazatel. Méně jistý než zbytek webu, celkovou úroveň sám o sobě nemění."
          sirka="pul"
          vnorena
        >
          <RuskoPanel stav={rusko()} bezHlavicky />
        </Panel>

        <Panel
          kod="Nepotvrzeno"
          ikona="krizek"
          nadpis="Co jsme prověřili a nepotvrdilo se"
          popis="Do žádného počtu ani hodnocení nevstupuje. Je tu, aby bylo vidět i to, co neprošlo."
          sirka="pul"
          akce={
            <Link href="/nepotvrzeno/" className={odkaz}>
              Detail
            </Link>
          }
        >
          <ul className="space-y-3">
            {neprosly.map((n) => (
              <li key={n.id} className="rounded-[14px] border border-linka bg-papir p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2.5">
                  <span className="stitek-tmavy rounded-[6px] border border-linka px-1.5 py-1 text-tlum">
                    {n.kodZeme}
                  </span>
                  <span className="cislice stitek">{datum(n.datum)}</span>
                  <span className="stitek-tmavy ml-auto rounded-full border border-[#c9e3d4] bg-list px-2.5 py-1 text-[#227050]">
                    {n.stav === "vyvraceno" ? "Vyvráceno" : "Nepotvrzeno"}
                  </span>
                </div>
                <p className="text-[13.5px] font-semibold tracking-[-0.01em]">{n.nazev}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-tlum">{n.overeni}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          id="odber"
          kod="Odběr"
          ikona="komunikace"
          nadpis="Dáme vědět, když se něco změní"
          popis="Ne u každé události. Jen při změně, kvůli které by člověk mohl jednat jinak."
          sirka="dve-tretiny"
        >
          <OdberPanel />
        </Panel>

        <Panel
          kod="Zdroje"
          ikona="dokument"
          nadpis="Odkud data pocházejí"
          popis="Přednost mají orgány, které věc samy oznámily. Sociální sítě hodnocení nezvyšují."
          sirka="tretina"
          akce={
            <Link href="/metodika/" className={odkaz}>
              Metodika
            </Link>
          }
        >
          <div className="max-h-[320px] overflow-y-auto pr-1">
            <SeznamZdroju
              zdroje={[...pravni.polozky, ...aliance.polozky].flatMap((p) => p.zdroje).slice(0, 12)}
              husty
            />
          </div>
          <Link
            href="/zdroje/"
            className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-inkoust"
          >
            Všechny zdroje
            <Ikona nazev="nahoru" velikost={12} tah={1.9} trida="rotate-90" />
          </Link>
        </Panel>
      </Mrizka>
    </>
  );
}
