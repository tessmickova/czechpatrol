import type { Metadata } from "next";
import Link from "next/link";
import { ObsahStranky } from "@/components/obsah-stranky";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Karta, OdznakTypu, Sekce } from "@/components/zaklad";
import { METODIKA_REVIDOVANA, METODIKA_VERZE, SBER_JAK_CASTO } from "@/config/web";
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
      <ObsahStranky />

      <Sekce nadpis="Co započítáváme jako nový signál" prvni>
        <div className="grid gap-5 lg:grid-cols-2">
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-zaklad">Započítáváme</h3>
            <Seznam polozky={ZAPOCITAVAME} znak="+" barva="text-[#7fdcac]" />
          </Karta>
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-zaklad">Nezapočítáváme jako nový incident</h3>
            <Seznam polozky={NEZAPOCITAVAME} znak="−" barva="text-tlum2" />
            <p className="mt-5 pt-4 text-male leading-relaxed text-tlum">
              Nejsme zpravodajský web. Zapisujeme skutky a úřední rozhodnutí — ne sliby a plány. Prohlášení vedeme zvlášť jako reakci, a jen když se váže ke konkrétnímu skutku.
            </p>
            <p className="mt-3 text-drobne leading-relaxed text-tlum2">
              Nové úřední zjištění ke staršímu případu signál být může. Rozhoduje nový fakt, ne nový článek.
            </p>
          </Karta>
        </div>
      </Sekce>

      <Sekce
        nadpis="Baseline a změna vzorce"
        popis="Bez baseline by každá jednotlivá událost vypadala jako zhoršení."
      >
        <Karta className="mb-5 p-5 sm:p-6">
          <h3 className="podnadpis mb-2 text-zaklad">Jak vzniká celkové hodnocení</h3>
          <p className="max-w-[46rem] text-male leading-relaxed text-tlum">
            Počítá ho automat při každém sběru, nejvýš den staré. Bere ověřené případy za 14 dní a vezme jejich střední závažnost; případy mimo Česko o stupeň níž. Neověřené zprávy nevstupují. Trend porovnává poslední týden s předchozím.
          </p>
          <p className="mt-2 max-w-[46rem] text-male leading-relaxed text-tlum">
            Výjimkou je <b className="font-semibold text-inkoust">mimořádný signál</b>, který vyhodnotíme sami — například výrok, jaký v minulosti předcházel vojenským krokům. Zvedne hodnocení nejvýš o jeden stupeň a nejvýš na 14 dní. U hodnocení je pak vždy vidět, proč, a jaká by úroveň byla bez něj.
          </p>
        </Karta>
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
            Číslo „z 10“ je táž úroveň zapsaná krátce, aby se vešla do zprávy. Stupnice má třináct stupňů a deset čísel, sousední stupně se stejným názvem sdílí číslo. Není to pravděpodobnost. Procenta neuvádíme: „riziko války 63 %“ by předstíralo model, který nemáme.
          </p>
        </Karta>
      </Sekce>

      <Sekce
        nadpis="Původce se určuje stejně pro všechny"
        popis="Rusko, Ukrajina, jiný stát, domácí pachatel, neznámý. Rozhoduje závěr vyšetřování dotčeného státu, ne typ prostředku a ne to, na čí straně kdo stojí."
      >
        <Karta className="p-5 sm:p-6">
          <div className="max-w-[46rem] space-y-3 text-male leading-relaxed text-tlum">
            <p>
              U každého incidentu rozlišujeme tři různé věci, které se v médiích běžně slévají do jedné věty:
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li><b className="font-semibold text-inkoust">Prostředek</b> — čí výroby nebo typu je dron, střela či nástroj. To je fakt o věci, ne o viníkovi: dron ruského typu mohl vyslat kdokoli, kdo ho má, a dron ukrajinského typu mohla přesměrovat protivzdušná obrana, rušení nebo porucha.</li>
              <li><b className="font-semibold text-inkoust">Odesílatel</b> — kdo prostředek vyslal nebo čin provedl. Určuje ho vyšetřování dotčeného státu, mezinárodní organizace nebo přihlášení pachatele. Dokud takový závěr není, je původce „nepotvrzený“ a u záznamu stojí, kdo co tvrdí a o co se to opírá (typ prostředku, směr letu, radarová stopa).</li>
              <li><b className="font-semibold text-inkoust">Úmysl</b> — záměr, omyl, nebo zbloudilý prostředek. Odpovědnost za následek nese odesílatel i bez úmyslu, ale úmysl se zapisuje zvlášť a jen podle vyšetřování.</li>
            </ol>
            <p>
              Příklady: dron ukrajinského typu, který spadne v Lotyšsku, má prostředek „ukrajinský“, původce „nepotvrzený“, dokud lotyšské úřady neřeknou, kdo ho vyslal a proč se odchýlil. Střela ruského typu v Polsku má původce Rusko až po závěru polských úřadů nebo NATO, do té doby stojí u záznamu „ruského typu, původce se vyšetřuje“. Útok na ropovod, který zastaví dodávky do Maďarska, je záznam kvůli následku pro sledovanou zemi; původce se i tady zapíše až podle vyšetřování nebo přihlášení.
            </p>
            <p>
              „Potvrzeno“ = úřední závěr státu, mezinárodní organizace nebo přihlášení původce. Odhad podle typu prostředku je vždy „nepotvrzeno“. Když stát původ neuvede, je původce „neznámý“. Stejný metr platí pro Rusko, Ukrajinu i kohokoli dalšího.
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
              Jak dobře je věc doložená — jak moc jí věřit. Věc může být závažná a špatně doložená, nebo doložená a málo závažná.
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
            <p className="mt-5 pt-4 text-drobne leading-relaxed text-tlum2">
              Budoucí scénář se nikdy nepíše jako jistota.
            </p>
          </Karta>
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-zaklad">Dáváme přednost</h3>
            <Seznam polozky={PREFEROVANE} znak="✓" barva="text-[#7fdcac]" />
          </Karta>
        </div>
        {/* Pravidla č. 0.5 a 0.6 v CLAUDE.md, veřejně a stručně (24. 9. 2026). */}
        <Karta className="mt-5 p-5 sm:p-6">
          <h3 className="podnadpis mb-4 text-zaklad">Jak přebíráme zprávy</h3>
          <Seznam
            polozky={[
              "Shromažďujeme zdroje, zasazujeme je do kontextu a upozorňujeme na kritické události. Držíme se novinářské etiky.",
              "Souhrny pomáhá psát AI. Smí zkrátit, nesmí nic přidat: žádné nové tvrzení, závěr ani souvislost, kterou zdroj neuvádí. Věta, kterou nejde dohledat ve zdroji, se smaže.",
              "Každé tvrzení má původce. Podezřelý zůstává podezřelým, obviněný není pachatel, dokud soud nerozhodne.",
              "O všech stranách píšeme věcně a s úctou. Žádné nálepky, žádné výzvy, nikoho neprovokujeme.",
              "Nezveřejňujeme pohyby jednotek, podrobnosti vyšetřování nad rámec oznámení úřadu, osobní údaje ani návody.",
              "Média ze sankčního seznamu EU nepoužíváme jako zdroj.",
            ]}
            znak="✓"
            barva="text-[#7fdcac]"
          />
        </Karta>
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
                  nepotvrzeno: "Informace existuje, ale zatím bez dostatečného doložení. Sama o sobě nezvyšuje hodnocení.",
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
              Web má pomáhat lidem v Česku, ne ukazovat, kde a jak zasahují složky. Proto nezapisujeme souřadnice, pohyb jednotek, počty zasahujících, interní kontakty, evakuační místa, zásoby ani slabá místa infrastruktury. Veřejné neznamená bezpečné k seskupení.
            </p>
            <p>
              U události stačí země a kraj. Souřadnice v textu zastaví nasazení; popis pohybu jednotek posoudí člověk. Pravidla platí i pro externího ověřovatele.
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
              Sběr běží {SBER_JAK_CASTO}, ale nic nezveřejňuje — jen ukládá zprávy ke kontrole. Na web jde záznam se zdrojem po kontrole, nebo se dvěma zdroji včetně úředního.
            </p>
            <p>
              Úřední stavy ověřujeme proti úředním zdrojům. Když ověření neproběhlo, napíšeme to. Nic nedopočítáváme z médií.
            </p>
            <p className="text-tlum2">
              Každá změna dat je uložená. Dá se dohledat, co web kdy tvrdil.
            </p>
          </div>
        </Karta>
      </Obsah>
    </>
  );
}
