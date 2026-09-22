import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Karta, OdznakTypu, Sekce } from "@/components/zaklad";
import { METODIKA_REVIDOVANA, METODIKA_VERZE } from "@/config/web";
import { datum } from "@/lib/format";
import { PASMA, UROVNE, zDeseti } from "@/lib/skala";
import type { Uroven } from "@/lib/typy";

export const metadata: Metadata = {
  title: "Metodika",
  description: "Co započítáváme jako nový bezpečnostní signál, co ne, jak fungují stupnice závažnosti a jistoty a jaké redakční zásady dodržujeme.",
};

const ZAPOCITAVAME = [
  "fyzické sabotáže a pokusy o ně",
  "incidenty proti kritické infrastruktuře",
  "relevantní kybernetické incidenty s dopadem na provoz",
  "významné doložené zpravodajské informace",
  "nové oficiální státní atribuce",
  "zatčení operativců",
  "zásadní vyšetřovací průlomy",
  "změny vojenské pohotovosti",
  "nezvyklé přesuny sil",
  "relevantní pohraniční opatření",
  "právní změny s bezpečnostním dopadem",
  "aktivaci článku 4 nebo 5",
  "evakuace personálu",
  "změny v oblasti mobilizace",
];

const NEZAPOCITAVAME = [
  "prohlášení, sliby a plány politiků",
  "jednání vlády o cenách, rozpočtu nebo důchodech",
  "další článek o téže věci",
  "komentář bez nového faktu",
  "repost a přejatou zprávu",
  "starou událost publikovanou znovu",
  "běžný incident odpovídající dlouhodobému baseline",
];

const ZMENA_VZORCE = [
  "vyšší četnost incidentů",
  "zasažení více států",
  "hlubší průnik",
  "použití zbraní",
  "vzniklé škody",
  "oběti",
  "prokazatelně úmyslné cílení",
  "oficiální atribuce",
  "změna reakce NATO",
];

const ZAKAZANE = [
  "Hranice se brzy zavřou",
  "Válka je za dveřmi",
  "Putin zaútočí",
  "Utíkejte z Česka",
  "Mobilizace přichází",
  "Evropa jde do války",
];

const PREFEROVANE = [
  "Co by muselo nastat, aby mohlo dojít k omezení hranic",
  "Nový incident zvyšuje hybridní tlak; přímé vojenské riziko zůstává nízké",
  "Mobilizace v ČR nebyla vyhlášena",
  "Vyšetřovatelé zatím nepotvrdili státní původ",
  "Tento vývoj sledujeme jako možný eskalační signál",
];

const UKAZKA_STUPNICE: Uroven[] = ["G1", "G3", "Y1", "Y3", "YO", "O1", "O2", "O3", "R1"];

function Seznam({ polozky, znak, barva }: { polozky: string[]; znak: string; barva: string }) {
  return (
    <ul className="space-y-2">
      {polozky.map((p) => (
        <li key={p} className="flex gap-2.5 text-male leading-relaxed text-tlum">
          <span aria-hidden className={`mt-[1px] shrink-0 ${barva}`}>{znak}</span>
          {p}
        </li>
      ))}
    </ul>
  );
}

export default function Metodika() {
  return (
    <>
      <HlavickaStranky
        ikona="kniha"
        stitek="Metodika"
        nadpis="Podle čeho web hodnotí"
        popis="Upozornění, že web je experimentální a používá AI, není omluvenka pro nepodložené tvrzení. Proto je metodika popsaná takhle konkrétně."
        doplnek={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="stitek-tmavy rounded-[18px] border border-linka px-2 py-1 text-tlum">
              Verze {METODIKA_VERZE}
            </span>
            <span className="text-drobne text-tlum2">
              Revidováno {datum(METODIKA_REVIDOVANA)} · verze 2 mění jen názvy úrovní (Nízká → Mírně zvýšená → Střední → Zvýšená → Vysoká → Vážná), prahy a hodnocení zůstávají · <Link href="/opravy/" className="odkaz">historie změn</Link>
            </span>
          </div>
        }
      />

      <Sekce nadpis="Co započítáváme jako nový signál" prvni>
        <div className="grid gap-5 lg:grid-cols-2">
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-zaklad">Započítáváme</h3>
            <Seznam polozky={ZAPOCITAVAME} znak="+" barva="text-[#7fdcac]" />
          </Karta>
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-zaklad">Nezapočítáváme jako nový incident</h3>
            <Seznam polozky={NEZAPOCITAVAME} znak="−" barva="text-tlum2" />
            <p className="mt-5 border-t border-linka2 pt-4 text-male leading-relaxed text-tlum">
              Nejsme zpravodajský web. Zajímá nás skutek, který mění bezpečnostní
              situaci, a úřední rozhodnutí, které mění, co platí — ne to, co kdo
              slíbil nebo se chystá projednat. Prohlášení zapisujeme jen tehdy,
              když se váže ke konkrétnímu skutku, a vedeme ho odděleně jako reakci.
            </p>
            <p className="mt-3 text-drobne leading-relaxed text-tlum2">
              Nové úřední vyšetřovací zjištění nebo atribuce staršího případu ale
              novým signálem být může. Rozhoduje, jestli přibyl fakt — ne jestli
              přibyl článek.
            </p>
          </Karta>
        </div>
      </Sekce>

      <Sekce
        nadpis="Baseline a změna vzorce"
        popis="Bez baseline by každá jednotlivá událost vypadala jako zhoršení."
      >
        <Karta className="p-5 sm:p-6">
          <p className="mb-5 max-w-[46rem] text-male leading-relaxed text-tlum">
            Některé jevy mají dlouhodobě nenulové pozadí. Například běžné jednotlivé
            průniky do vzdušného prostoru se dějí opakovaně a samy o sobě hodnocení
            nezvyšují. Zvyšuje ho až <b className="font-semibold text-inkoust">změna vzorce</b>:
          </p>
          <ul className="flex flex-wrap gap-2">
            {ZMENA_VZORCE.map((z) => (
              <li
                key={z}
                className="rounded-[18px] border border-linka bg-papir px-2.5 py-1.5 text-drobne text-tlum"
              >
                {z}
              </li>
            ))}
          </ul>
        </Karta>
      </Sekce>

      <Sekce
        nadpis="Stupnice závažnosti"
        popis="Jemnější než čtyři barvy. Uvnitř každého pásma rozlišujeme více úrovní, aby drobné posuny nezmizely a zároveň se nepřeháněly."
      >
        <Karta className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-linka">
                  {["Úroveň", "Číslo", "Znamená", "Neznamená"].map((h) => (
                    <th key={h} className="stitek px-4 py-3 font-medium first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UKAZKA_STUPNICE.map((u) => {
                  const d = UROVNE[u];
                  const t = PASMA[d.pasmo];
                  return (
                    <tr key={u} className="border-b border-linka2 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3.5 pl-5">
                        <span className={`inline-flex items-center gap-2 text-drobne font-semibold ${t.text}`}>
                          <span aria-hidden className={`h-[7px] w-[7px] rounded-[2px] ${t.pruh}`} />
                          {d.nazev}
                        </span>
                      </td>
                      <td className="cislice whitespace-nowrap px-4 py-3.5 text-drobne text-tlum">{zDeseti(u)} z 10</td>
                      <td className="px-4 py-3.5 text-drobne leading-relaxed text-tlum">{d.znamena}</td>
                      <td className="px-4 py-3.5 pr-5 text-drobne leading-relaxed text-tlum2">
                        {d.neznamena === "—" ? "" : d.neznamena}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-linka px-5 py-3.5 text-mikro leading-relaxed text-tlum2">
            Číslo „z 10“ je jen jinak zapsaná táž úroveň — pořadí na stupnici, aby se
            hodnocení vešlo i do krátké zprávy. Stupnice má třináct stupňů a deset čísel,
            takže sousední stupně se stejným názvem sdílí jedno číslo; liší se tím, co
            znamenají. Není to pravděpodobnost.
            Neuvádíme pravděpodobnost v procentech: věta „riziko války 63 %“ by
            předstírala model, který nemáme — a čtenář by z ní vyvodil víc, než data unesou.
          </p>
        </Karta>
      </Sekce>

      <Sekce
        nadpis="Původce se určuje stejně pro všechny"
        popis="Rusko, Ukrajina, jiný stát, domácí pachatel, neznámý. Rozhoduje zjištění dotčeného státu, ne to, na čí straně kdo stojí."
      >
        <Karta className="p-5 sm:p-6">
          <div className="max-w-[46rem] space-y-3 text-male leading-relaxed text-tlum">
            <p>
              Zbloudilý ukrajinský dron, který spadne v Lotyšsku, má původce Ukrajinu — i když ho z kurzu vychýlilo ruské rušení a
              nikdo netvrdí úmysl. Ruská střela, která dopadne v Polsku, má původce Rusko. Útok Ukrajiny na ropovod v Rusku, který
              zastaví dodávky do Maďarska, je záznam s původcem Ukrajina.
            </p>
            <p>
              „Potvrzeno“ znamená oficiální závěr dotčeného státu nebo přihlášení původce. Odhad podle typu dronu je „nepotvrzená“
              atribuce; když stát původ neuvede, je původce „neznámý“ a nic si nedomýšlíme. Přehled Kdo za tím stojí počítá všechny
              strany stejným metrem.
            </p>
          </div>
        </Karta>
      </Sekce>

      <Sekce
        nadpis="Závažnost a jistota jsou dvě různé věci"
        popis="Nejčastější zdroj zkreslení. Proto je nikdy neslučujeme."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Karta className="p-5 sm:p-6">
            <div className="stitek mb-3">Závažnost</div>
            <p className="text-male leading-relaxed text-tlum">
              Jak vážný je dopad, pokud se věc potvrdí. Odpovídá na otázku „jak moc by to
              vadilo“.
            </p>
          </Karta>
          <Karta className="p-5 sm:p-6">
            <div className="stitek mb-3">Jistota</div>
            <p className="text-male leading-relaxed text-tlum">
              Jak dobře je věc doložená. Odpovídá na otázku „jak moc tomu můžeme věřit“.
              Něco může být velmi závažné a špatně potvrzené — i naprosto potvrzené
              a málo závažné.
            </p>
          </Karta>
        </div>
      </Sekce>

      <Sekce
        nadpis="Redakční zásady"
        popis="Formulace, které web nepoužívá, a formulace, kterým dává přednost."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-zaklad">Nepoužíváme</h3>
            <ul className="space-y-2.5">
              {ZAKAZANE.map((z) => (
                <li key={z} className="flex gap-2.5 text-male leading-relaxed text-tlum2 line-through decoration-tlum2/40">
                  <span aria-hidden className="mt-[1px] shrink-0 no-underline">✕</span>
                  {z}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-linka2 pt-4 text-drobne leading-relaxed text-tlum2">
              Budoucí scénář se nikdy nepíše jako jistota.
            </p>
          </Karta>
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-zaklad">Dáváme přednost</h3>
            <Seznam polozky={PREFEROVANE} znak="✓" barva="text-[#7fdcac]" />
          </Karta>
        </div>
      </Sekce>

      <Sekce
        nadpis="Označování obsahu"
        popis="Čtyři odznaky, které se na webu používají konzistentně."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["fakt", "odhad", "scenar", "nepotvrzeno"] as const).map((t) => (
            <Karta key={t} className="p-4 sm:p-5">
              <div className="mb-3">
                <OdznakTypu typ={t} />
              </div>
              <p className="text-drobne leading-relaxed text-tlum">
                {{
                  fakt: "Doloženo zdrojem uvedeným u záznamu.",
                  odhad: "Analytická interpretace dostupných informací. Není to fakt ani předpověď.",
                  scenar: "Možnost, nikoli předpověď. Nemusí nastat a nemusí následovat v uvedeném pořadí.",
                  nepotvrzeno: "Informace existuje, ale nemáme dost důkazů. Sama o sobě nezvyšuje hodnocení.",
                }[t]}
              </p>
            </Karta>
          ))}
        </div>
      </Sekce>

      <Obsah>
        <Karta className="mb-4 p-5 sm:p-6">
          <h2 className="podnadpis mb-3 text-vetsi">Co záměrně nezveřejňujeme</h2>
          <div className="max-w-[46rem] space-y-3 text-male leading-relaxed text-tlum">
            <p>
              CzechPatrol má pomáhat lidem v Česku, ne dávat komukoli lepší obraz
              o tom, kde a jak zasahují bezpečnostní složky. Proto se do dat
              nezapisují souřadnice, pohyb ani rozmístění jednotek, počty
              zasahujících, interní kontakty, neveřejná evakuační místa, zásoby
              ani slabá místa infrastruktury — i když je někde jednotlivě najdete.
              Veřejné neznamená bezpečné k seskupení.
            </p>
            <p>
              U události stačí země a kraj. Kontrola dat souřadnice v textu
              považuje za chybu a nasazení zastaví; popis pohybu jednotek
              posuzuje člověk. Pravidla jsou sepsaná v dokumentaci projektu
              (Bezpečnost obsahu) a platí i pro externího ověřovatele.
            </p>
            <p className="text-tlum2">
              Co si naopak nastavit dřív, než se něco stane, je na stránce{" "}
              <Link href="/pripravenost/" className="odkaz">Jsem připraven/a?</Link>.
            </p>
          </div>
        </Karta>
        <Karta className="p-5 sm:p-6">
          <h2 className="podnadpis mb-3 text-vetsi">Role automatizace</h2>
          <div className="max-w-[46rem] space-y-3 text-male leading-relaxed text-tlum">
            <p>
              Sběr běží automaticky každou hodinu. Automat ale nic nezveřejňuje: ukládá
              kandidáty do fronty ke kontrole. Na web se dostane jen záznam, který prošel
              lidskou kontrolou a má uvedený zdroj.
            </p>
            <p>
              Právní a institucionální stav se ověřuje proti úředním registrům. Pokud
              ověření neproběhlo, web to napíše — hodnotu nedopočítává a nedoplňuje
              z médií.
            </p>
            <p className="text-tlum2">
              Historie dat odpovídá historii repozitáře. Každá změna hodnoty je
              samostatný záznam, takže je zpětně dohledatelné, co web kdy tvrdil.
            </p>
          </div>
        </Karta>
      </Obsah>
    </>
  );
}
