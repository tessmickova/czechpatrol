import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CoDal } from "@/components/co-dal";
import { HlavickaStranky } from "@/components/nadpisy";
import { SidebarWebu } from "@/components/sidebar-webu";

export const metadata: Metadata = {
  title: "Jaderná zbraň na oběžné dráze: co by vypadlo a jak se připravit",
  description: "Zprávy o ruské družici s jadernou hlavicí (23. 11. 2026): co je doložené, co by výbuch ve vesmíru zasáhl, na jak dlouho a v jakém okruhu, a jak se připravit doma i v práci.",
};

/*
  Téma (23. 11. 2026, provozovatelka): po zprávách WDR, NDR a SZ o ruské
  družici s jadernou hlavicí „vypracovat, co by to ovlivnilo a jak se
  připravit doma i pracovně“. Pravidla webu platí i tady: každé tvrzení má
  zdroj (číslo v hranatých závorkách vede dolů na seznam), odhady stojí jako
  odhady i s rozptylem a to, co nikdo neví, má vlastní oddíl. Tón je klidný:
  výbuch nehrozí jen proto, že o něm píšou média.

  Zdroje jsme četli přes vyhledávač a frontu sběru (data/kandidati.json);
  stránky zdrojů samotné byly z prostředí, kde text vznikal, nedostupné.
*/

const ZDROJE = [
  { k: "irozhlas", nazev: "Český rozhlas — Rusko plánuje vynést do vesmíru družici s jadernou zbraní, píšou německá média. Kreml to odmítá (23. 11. 2026)", url: "https://www.irozhlas.cz/veda-technologie/vesmir/rusko-planuje-vynest-do-vesmiru-druzici-s-jadernou-zbrani-pisi-nemecka-media_2611231343_vdv" },
  { k: "up", nazev: "Ukrajinska pravda — Western intelligence warns that Russia is preparing to deploy nuclear weapons in space (23. 11. 2026)", url: "https://www.pravda.com.ua/eng/news/2026/11/23/8064140/" },
  { k: "mt", nazev: "The Moscow Times — Kremlin Dismisses Reports About Alleged Nuclear-Armed Satellite Launch (23. 11. 2026)", url: "https://www.themoscowtimes.com/2026/11/23/kremlin-dismisses-reports-about-alleged-nuclear-armed-satellite-launch-a94349" },
  { k: "bz", nazev: "Berliner Zeitung — „Sputnik-S“: Geheimdienste warnen vor russischer Atomwaffe im Weltraum", url: "https://www.berliner-zeitung.de/article/sputnik-s-geheimdienste-warnen-vor-russischer-atomwaffe-im-weltraum-10627070" },
  { k: "20min", nazev: "20 Minuten — Atombombe im All: Geheimdienste warnen vor russischem Satelliten", url: "https://www.20min.ch/story/atombombe-im-all-geheimdienste-warnen-vor-russischem-satelliten-103672318" },
  { k: "bd", nazev: "Breaking Defense — Is Russia’s Cosmos 2553 satellite a test for a future orbital nuclear weapon? (5/2024)", url: "https://breakingdefense.com/2024/05/is-russias-cosmos-2553-satellite-a-test-for-a-future-orbital-nuclear-weapon/" },
  { k: "aca", nazev: "Arms Control Association — The Outer Space Treaty at a Glance", url: "https://www.armscontrol.org/factsheets/outerspace" },
  { k: "rand", nazev: "RAND — The Effects of High-Altitude Nuclear Explosions on Non-Military Satellites (2025)", url: "https://www.rand.org/pubs/research_reports/RRA3028-3.html" },
  { k: "dtra", nazev: "DTRA — High Altitude Nuclear Detonations (HAND) Against Low Earth Orbit Satellites, briefing (4/2001)", url: "https://spp.fas.org/military/program/asat/haleos.pdf" },
  { k: "sgs", nazev: "Science & Global Security — Assessing the Impact of the Prompt Effect of a High-Altitude Nuclear Explosion on Nonmilitary LEO Satellites (2026)", url: "https://www.tandfonline.com/doi/full/10.1080/08929882.2026.2756762" },
  { k: "natgeo", nazev: "National Geographic — Why the U.S. once set off a nuclear bomb in space called Starfish Prime", url: "https://www.nationalgeographic.com/science/article/why-the-us-once-set-off-a-nuclear-bomb-in-space-called-starfish-prime" },
  { k: "heise", nazev: "heise online — Zahlen, bitte! How the USA destroyed its Telstar 1 satellite in a nuclear test", url: "https://heise.de/-9795393" },
  { k: "sciam", nazev: "Scientific American — How the U.S. Accidentally Nuked Its Own Communications Satellite", url: "https://www.scientificamerican.com/article/how-us-accidentally-nuked-own-communications-satellite/" },
  { k: "csis", nazev: "CSIS — High-Altitude Nuclear Explosions: Myths and Reality", url: "https://www.csis.org/analysis/high-altitude-nuclear-explosions-myths-and-reality" },
  { k: "glasstone", nazev: "Glasstone, Dolan — The Effects of Nuclear Weapons, kap. 11: The Electromagnetic Pulse and Its Effects", url: "https://atomicarchive.com/resources/documents/effects/glasstone-dolan/chapter11.html" },
  { k: "osti", nazev: "OSTI — The Effect of Nuclear Explosions on Radio Communication (1962)", url: "https://www.osti.gov/biblio/4082181" },
  { k: "gps", nazev: "GPS.gov — Space Segment", url: "https://www.gps.gov/systems/gps/space/" },
  { k: "euspa", nazev: "EUSPA — GNSS for timing and synchronisation", url: "https://www.euspa.europa.eu/gnss-timing-and-synchronisation" },
  { k: "uk", nazev: "Vláda Spojeného království — The economic impact on the UK of a disruption to GNSS (2023)", url: "https://www.gov.uk/government/publications/report-the-economic-impact-on-the-uk-of-a-disruption-to-gnss" },
  { k: "dcf", nazev: "Meinberg — DCF77 longwave time signal", url: "https://www.meinbergglobal.com/english/info/dcf77.htm" },
] as const;
type KlicZdroje = (typeof ZDROJE)[number]["k"];
const CISLO = new Map<string, number>(ZDROJE.map((z, i) => [z.k, i + 1]));

/** Odkaz na zdroj v textu: [3] vede na řádek seznamu dole. */
function Z({ k }: { k: KlicZdroje | KlicZdroje[] }) {
  const klice = Array.isArray(k) ? k : [k];
  return (
    <span className="whitespace-nowrap text-mikro text-tlum2">
      {" "}
      {klice.map((x, i) => (
        <span key={x}>{i > 0 && " "}<a href={`#zdroj-${CISLO.get(x)}`} className="odkaz">[{CISLO.get(x)}]</a></span>
      ))}
    </span>
  );
}

function Oddil({ id, nadpis, uvod, children }: { id: string; nadpis: string; uvod?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-14 scroll-mt-24">
      <h2 id={id} className="text-velke font-bold leading-snug text-inkoust">{nadpis}</h2>
      {uvod && <p className="mt-3 max-w-[46rem] text-male leading-relaxed text-tlum">{uvod}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <ul className="max-w-[46rem] list-disc space-y-2.5 pl-5 text-male leading-relaxed text-tlum marker:text-tlum2">{children}</ul>;
}

/* Jeden zasažený systém: co, jak moc, jak dlouho, kde. */
const DOPADY: { co: string; jakMoc: ReactNode; jakDlouho: ReactNode; kde: ReactNode }[] = [
  {
    co: "Družice na nízké dráze (do zhruba 2 000 km): satelitní internet, snímky Země, část meteorologie",
    jakMoc: <>Nejvíc zasažené. Odhady se liší řádově podle síly a výšky výbuchu: od desetin až jednotek procent družic vyřazených natrvalo hned<Z k="sgs" />, přes pětinu ohrožených hned po výbuchu o síle 110 kilotun ve výšce 400 km<Z k="rand" />, po všechny neodolné družice na nízké dráze během týdnů až měsíců po malém výbuchu ve výšce 125–300 km<Z k="dtra" />. Velitel amerického Vesmírného velitelství Stephen Whiting podle švýcarského deníku 20 Minuten varuje před ztrátou zhruba třetiny družic na nízké dráze během několika dní<Z k="20min" />. Satelitní internet Starlink obíhá právě tady, kolem 550 km<Z k="rand" />.</>,
    jakDlouho: <>Hned po výbuchu přímé záření, potom umělý radiační pás, který družice poškozuje při každém průletu. U silného výbuchu může podle RAND vydržet roky<Z k="rand" />. Po americkém testu Starfish Prime v roce 1962 přestalo fungovat sedm družic<Z k="heise" />; první telekomunikační družice Telstar selhala v únoru 1963<Z k="sciam" />.</>,
    kde: <>Celá Země. Družice obíhají, takže nezáleží, nad kterým místem k výbuchu dojde. Pás nerozlišuje, čí družice poškodí: v roce 1962 zničil americký Telstar i britský Ariel 1<Z k="natgeo" />.</>,
  },
  {
    co: "Navigace (GPS, Galileo) a satelitní televize",
    jakMoc: <>Přímé ohrožení je malé. Družice GPS obíhají ve výšce kolem 20 200 km<Z k="gps" />, televizní na geostacionární dráze kolem 36 000 km. Podle studie DTRA by navigační a geostacionární družice ohrozil jen velmi silný výbuch kolem 10 megatun<Z k="dtra" />; podle RAND výbuch na nízké dráze družice až po geostacionární dráhu výrazně nezasáhne<Z k="rand" />.</>,
    jakDlouho: <>Když zasažené nejsou, fungují dál.</>,
    kde: <>Pro případ, že by přesto vypadly: přesný čas z navigačních družic potřebují telekomunikační sítě, energetické sítě i finanční trhy<Z k="euspa" />. Britská vláda odhaduje škodu týdenního výpadku navigace na 7,6 miliardy liber<Z k="uk" />.</>,
  },
  {
    co: "Rádiové spojení na krátkých vlnách a radary",
    jakMoc: <>Téměř úplný výpadek krátkovlnného spojení; krátké vlny používá třeba letectví a lodní doprava<Z k="osti" />.</>,
    jakDlouho: <>Hodiny<Z k="osti" />.</>,
    kde: <>Velká oblast kolem místa výbuchu, podle odhadu z roku 1962 kolem 10 milionů km²<Z k="osti" />.</>,
  },
  {
    co: "Elektronika a elektřina na zemi (elektromagnetický puls)",
    jakMoc: <>Záleží hlavně na výšce. Na zem působí nejsilněji výbuchy ve výšce 30–50 km; výbuch výš zasáhne větší území, ale slaběji, a víc ohrozí družice<Z k="csis" />. Po výškových testech v Pacifiku v roce 1962 byly hlášeny poruchy civilních elektrických systémů, které se přičítaly elektromagnetickému pulzu<Z k="glasstone" />.</>,
    jakDlouho: <>Poškozené zařízení nejde, dokud se neopraví nebo nevymění.</>,
    kde: <>Jen tam, odkud je místo výbuchu vidět nad obzorem<Z k="glasstone" />. Kde a v jaké výšce by ruská zbraň vybuchla, veřejně nikdo neví.</>,
  },
];

export default function Vesmir() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Téma · 23. 11. 2026"
        nadpis="Jaderná zbraň na oběžné dráze: co by vypadlo a jak se připravit"
        uvod="Německá média píšou, že Rusko může ještě letos vynést na oběžnou dráhu družici s jadernou hlavicí. Co z toho je doložené, co by výbuch ve vesmíru zasáhl, na jak dlouho a co s tím doma i v práci. Přehled místo paniky."
      />
      <div className="mt-12 grid gap-10 sm:mt-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-16">
        <div className="min-w-0">
          <Oddil id="co-je-dolozene" nadpis="Co je doložené (stav k 23. 11. 2026)">
            <Body>
              <li>V pondělí 23. 11. 2026 napsaly německé veřejnoprávní stanice WDR a NDR a deník Süddeutsche Zeitung, že západní zpravodajské služby považují za možné, aby Rusko ještě letos vyneslo do vesmíru družici s jadernou zbraní<Z k="irozhlas" />.</li>
              <li>Podle zpráv jde o družici Sputnik-S, která má být hotová a uskladněná u Moskvy. Varování dostalo několik zemí NATO; německá armáda o něm informovala ministra obrany<Z k="up" />. Termín: kdykoli v příštích týdnech<Z k="up" />, podle The Moscow Times nejdřív v prosinci 2026<Z k="mt" />.</li>
              <li>Americká vojenská zpravodajská služba DIA už v říjnu uvedla, že Rusko vyvíjí družici, která by mohla nést jadernou zbraň; píše to Berliner Zeitung<Z k="bz" />.</li>
              <li>Kreml podle agentury Reuters uvedl, že takové zprávy by neměly být brány vážně<Z k={["irozhlas", "mt"]} />.</li>
              <li>Samotné zpravodajské služby to veřejně nepotvrdily a nezávislé potvrzení není. Je to jejich hodnocení, jak ho popsala média.</li>
              <li>S ruským programem spojují Američané od roku 2024 družici Kosmos 2553 na dráze ve výšce kolem 2 000 km; podle nich sama zbraní není. Rusko vývoj popírá<Z k="bd" />.</li>
              <li>Umístit jadernou zbraň na oběžnou dráhu zakazuje Smlouva o kosmickém prostoru z roku 1967, kterou podepsal i Sovětský svaz<Z k="aca" />.</li>
              <li>V naší evidenci opatření k tomu není žádný pokyn českých úřadů pro obyvatele.</li>
            </Body>
          </Oddil>

          <Oddil
            id="co-by-zasahl"
            nadpis="Co by výbuch ve vesmíru zasáhl"
            uvod="Výbuch na oběžné dráze není totéž jako útok na zem. Ohrožuje hlavně družice; elektroniku na zemi zasáhne jen za určitých podmínek. Všechno níže záleží na síle nálože a výšce výbuchu, a ty veřejně nikdo nezná."
          >
            <div className="space-y-4">
              {DOPADY.map((d) => (
                <article key={d.co} className="rounded-[18px] border border-linka p-4 sm:p-5">
                  <h3 className="text-zaklad font-semibold leading-snug text-inkoust">{d.co}</h3>
                  <dl className="mt-3 grid gap-3 text-male leading-relaxed text-tlum sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-4">
                    <dt className="stitek pt-[3px]">Jak moc</dt><dd>{d.jakMoc}</dd>
                    <dt className="stitek pt-[3px]">Jak dlouho</dt><dd>{d.jakDlouho}</dd>
                    <dt className="stitek pt-[3px]">Kde</dt><dd>{d.kde}</dd>
                  </dl>
                </article>
              ))}
            </div>
          </Oddil>

          <Oddil
            id="doma"
            nadpis="Doma: jak se připravit"
            uvod={<>Družice doma používáte hlavně přes navigaci, satelitní internet a satelitní televizi. Elektřina, voda a rozhlasové vysílání jdou po zemi, i když část sítí bere z navigačních družic přesný čas<Z k="euspa" />. Příprava je proto hlavně o zálohách tam, kde družice používáte.</>}
          >
            <Body>
              <li><b className="font-semibold text-inkoust">Navigace:</b> mapa v autě a trasy do práce, do školy a za rodinou, které zvládnete i bez navigace.</li>
              <li><b className="font-semibold text-inkoust">Satelitní internet nebo televize:</b> druhá cesta — mobilní data, pevné připojení nebo anténa pro pozemní vysílání DVB-T2. Internet z družic na nízké dráze by byl zasažen nejvíc<Z k="rand" />.</li>
              <li><b className="font-semibold text-inkoust">Zprávy:</b> rádio na baterie pro FM nebo DAB+. Kde ladit krizové vysílání, je v <Link href="/pripravenost/" className="odkaz">průvodci připraveností</Link>.</li>
              <li><b className="font-semibold text-inkoust">Počasí:</b> výstrahy ČHMÚ sledovat i v rádiu. Předpovědi by mohly být méně přesné, protože výbuch na nízké dráze zhorší i meteorologické služby z družic<Z k="rand" />.</li>
              <li><b className="font-semibold text-inkoust">Zálohy jako u každého delšího výpadku:</b> kontakty a důležité dokumenty na papíře, hotovost na pár dní. Seznam je v <Link href="/odolnost/?seznam=ai" className="odkaz">kalkulačce odolnosti</Link>.</li>
              <li><b className="font-semibold text-inkoust">Zprávy ověřovat:</b> řídit se úřady a krizovým vysíláním, ne řetězovými zprávami. Poplašnou zprávu bez zdroje nesdílet.</li>
            </Body>
          </Oddil>

          <Oddil
            id="v-praci"
            nadpis="V práci: firma, úřad, živnost"
            uvod="Ve firmě se vyplatí projít závislosti na družicích předem: bývají schované v zařízeních a ve službách dodavatelů."
          >
            <Body>
              <li><b className="font-semibold text-inkoust">Sepsat, co stojí na družicích:</b> navigace a sledování vozidel, sledování zásilek, satelitní záloha připojení, přesný čas v serverovně a v sítích, stroje v zemědělství a stavebnictví s přesnou polohou, drony.</li>
              <li><b className="font-semibold text-inkoust">Ke každé závislosti jedna náhrada a kdo ji spustí:</b> dispečink po telefonu a papírové trasy, záložní připojení jinou cestou než přes družici, druhý zdroj času.</li>
              <li><b className="font-semibold text-inkoust">Přesný čas z víc než jednoho zdroje:</b> vedle GPS třeba internetové časové servery na různých místech nebo rádiový signál DCF77, který z Mainflingenu u Frankfurtu vysílá čas z atomových hodin a dosáhne i do Česka<Z k="dcf" />.</li>
              <li><b className="font-semibold text-inkoust">Dodavatelé:</b> zeptat se dopravce, správce IT a banky, co dělají při výpadku navigace nebo satelitního spojení.</li>
              <li><b className="font-semibold text-inkoust">Lidé:</b> jak se zaměstnanci dozvědí pokyny, když nepojede část sítí — telefonní řetěz, papírový seznam kontaktů, místo srazu.</li>
              <li><b className="font-semibold text-inkoust">Vyzkoušet:</b> jeden den bez navigace a s přepnutím na záložní připojení řekne víc než plán v šuplíku.</li>
              <li><b className="font-semibold text-inkoust">Proč to stojí za to:</b> britská vláda odhaduje škodu týdenního výpadku navigace na 7,6 miliardy liber a celodenního na 1,4 miliardy; nejvíc by to odnesly záchranné služby, silniční a lodní doprava<Z k="uk" />.</li>
            </Body>
          </Oddil>

          <Oddil id="co-nevime" nadpis="Co nevíme">
            <Body>
              <li>Jestli Rusko družici opravdu vynese a jestli by zbraň kdy použilo.</li>
              <li>Jak silná by nálož byla a v jaké výšce by vybuchla. Na tom závisí všechno výše.</li>
              <li>Jak by dnešní elektronika a energetické sítě v Evropě snesly elektromagnetický puls z velké výšky. Veřejný výpočet pro Evropu jsme nenašli.</li>
              <li>Kolik družic by vypadlo: studie se liší řádově podle toho, co předpokládají<Z k={["sgs", "rand", "dtra"]} />.</li>
            </Body>
            <p className="mt-5 max-w-[46rem] text-drobne leading-relaxed text-tlum2">Když přibudou nové doložené informace, doplníme je sem s datem.</p>
          </Oddil>

          <section aria-labelledby="zdroje" className="mb-14">
            <h2 id="zdroje" className="text-velke font-bold leading-snug text-inkoust">Zdroje</h2>
            <ol className="mt-4 max-w-[46rem] space-y-2 text-drobne leading-snug text-tlum">
              {ZDROJE.map((z, i) => (
                <li key={z.k} id={`zdroj-${i + 1}`} className="flex scroll-mt-24 gap-2">
                  <span className="cislice w-6 shrink-0 text-tlum2">{i + 1}.</span>
                  <a href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz min-w-0 break-words">{z.nazev} ↗</a>
                </li>
              ))}
            </ol>
          </section>
          <CoDal />
        </div>
        <SidebarWebu />
      </div>
    </div>
  );
}
