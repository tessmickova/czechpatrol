import Link from "next/link";
import { PasCisel, RozcestnikMrizka } from "@/components/dlazdice";
import { SituacniPanel } from "@/components/hero";
import { KartaUdalosti } from "@/components/karta-udalosti";
import { OdberPanel } from "@/components/odber";
import { Prazdno, Sekce } from "@/components/zaklad";
import {
  celkovyStav, dnyBezZmeny, hybridniTlak, incidenty, nato, posledniOvereni,
  pravniStav, tydny,
} from "@/lib/data";

export default function Prehled() {
  const stav = celkovyStav();
  const vse = incidenty();
  const tydenni = tydny();
  const posledniTyden = tydenni[tydenni.length - 1];

  return (
    <>
      <SituacniPanel
        stav={stav}
        pravni={pravniStav()}
        nato={nato()}
        hybridni={hybridniTlak()}
        dnyBezZmeny={dnyBezZmeny()}
        overeno={posledniOvereni()}
      />

      <Sekce
        kicker="Poslední aktualizace"
        nadpis="Co je nového"
        akce={
          <Link
            href="/udalosti/"
            className="rounded-full border border-linka bg-plocha px-4 py-2.5 text-[13px] font-medium transition-colors hover:border-inkoust"
          >
            Všechny události
          </Link>
        }
      >
        <PasCisel
          polozky={[
            { stitek: "Nové signály", hodnota: stav.noveSignaly.celkem, ikona: "radar", tlumene: stav.noveSignaly.celkem === 0 },
            { stitek: "Vysoké", hodnota: stav.noveSignaly.vysoke, ikona: "vystraha", tlumene: stav.noveSignaly.vysoke === 0 },
            { stitek: "Kritické", hodnota: stav.noveSignaly.kriticke, ikona: "terc", tlumene: stav.noveSignaly.kriticke === 0 },
            {
              stitek: "Signálů tento týden",
              hodnota: posledniTyden
                ? Object.values(posledniTyden.pocty).reduce((a, b) => a + b, 0)
                : "—",
              ikona: "graf",
              tlumene: !posledniTyden,
            },
          ]}
        />

        <div className="mt-4 space-y-3">
          {vse.length ? (
            vse.slice(0, 3).map((i) => <KartaUdalosti key={i.id} incident={i} />)
          ) : (
            <Prazdno
              nadpis="Zatím žádné zveřejněné události"
              popis="Zveřejňujeme jen to, co prošlo kontrolou a má uvedený zdroj."
            />
          )}
        </div>
      </Sekce>

      <Sekce kicker="Rozcestník" nadpis="Kam dál" tmava>
        <RozcestnikMrizka
          polozky={[
            {
              href: "/dnes/",
              nazev: "Dnes",
              popis: "Jedno otevření denně. Úroveň, změna, tři body.",
              ikona: "hodiny",
              odznak: "Nejrychlejší",
              ton: "modra",
            },
            {
              href: "/cr/",
              nazev: "Česká republika",
              popis: "Právní stav a dopad na běžný život.",
              ikona: "vaha",
              ton: "zelena",
            },
            {
              href: "/tlak/",
              nazev: "Hybridní tlak",
              popis: "Sabotáže, kyber, drony — a odděleně vojenské riziko.",
              ikona: "terc",
              ton: "pisek",
            },
            {
              href: "/trend/",
              nazev: "Vývoj v čase",
              popis: "Posuvník archivem. Co web tvrdil kdy.",
              ikona: "graf",
              odznak: "Interaktivní",
              ton: "slez",
            },
            {
              href: "/watchlist/",
              nazev: "Watchlist 72 h",
              popis: "Co hodnocení zvýší a co ho uklidní.",
              ikona: "oko",
              ton: "modra",
            },
            {
              href: "/osa/",
              nazev: "Časová osa",
              popis: "Chronologie a kumulace signálů.",
              ikona: "osa",
              ton: "zelena",
            },
            {
              href: "/nato/",
              nazev: "NATO",
              popis: "Článek 4 a 5, pohotovost, východní křídlo.",
              ikona: "stit",
              ton: "pisek",
            },
            {
              href: "/metodika/",
              nazev: "Metodika",
              popis: "Co počítáme jako signál a co ne.",
              ikona: "kniha",
              ton: "slez",
            },
            {
              href: "/nepotvrzeno/",
              nazev: "Nepotvrzeno",
              popis: "Co jsme prověřili a nepotvrdilo se.",
              ikona: "oko",
              odznak: "Poctivě",
              ton: "pisek",
            },
            {
              href: "/komunita/",
              nazev: "Komunita",
              popis: "Tipy, opravy, otevřená data.",
              ikona: "globus",
              odznak: "Otevřené",
              ton: "noc",
            },
          ]}
        />
      </Sekce>

      <Sekce
        kicker="Odběr"
        nadpis="Dáme vědět, když se něco změní"
        akce={
          <Link
            href="/odber/"
            className="rounded-full border border-linka bg-plocha px-4 py-2.5 text-[13px] font-medium transition-colors hover:border-inkoust"
          >
            Všechny kanály
          </Link>
        }
      >
        <OdberPanel kompaktni />
      </Sekce>
    </>
  );
}
