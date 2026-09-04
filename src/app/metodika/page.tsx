import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Karta, OdznakTypu, Sekce } from "@/components/zaklad";
import { METODIKA_REVIDOVANA } from "@/config/web";
import { datum } from "@/lib/format";
import { PASMA, UROVNE } from "@/lib/skala";
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
  "další článek o téže věci",
  "komentář politika bez nového faktu",
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
        <li key={p} className="flex gap-2.5 text-[13.5px] leading-relaxed text-tlum">
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
        stitek="Metodika"
        nadpis="Podle čeho web hodnotí"
        popis="Upozornění, že web je experimentální a používá AI, není omluvenka pro nepodložené tvrzení. Proto je metodika popsaná takhle konkrétně."
        doplnek={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="stitek-tmavy rounded border border-linka px-2 py-1 text-tlum">
              Pracovní verze
            </span>
            <span className="text-[12px] text-tlum2">
              Naposledy revidováno {datum(METODIKA_REVIDOVANA)}
            </span>
          </div>
        }
      />

      <Sekce nadpis="Co započítáváme jako nový signál" prvni>
        <div className="grid gap-5 lg:grid-cols-2">
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-[15px]">Započítáváme</h3>
            <Seznam polozky={ZAPOCITAVAME} znak="+" barva="text-[#2f6f47]" />
          </Karta>
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-[15px]">Nezapočítáváme jako nový incident</h3>
            <Seznam polozky={NEZAPOCITAVAME} znak="−" barva="text-tlum2" />
            <p className="mt-5 border-t border-linka2 pt-4 text-[12.5px] leading-relaxed text-tlum2">
              Nové oficiální vyšetřovací zjištění nebo atribuce staršího incidentu ale
              novým analytickým signálem být může. Rozhoduje, jestli přibyl fakt — ne
              jestli přibyl článek.
            </p>
          </Karta>
        </div>
      </Sekce>

      <Sekce
        nadpis="Baseline a změna vzorce"
        popis="Bez baseline by každá jednotlivá událost vypadala jako zhoršení."
      >
        <Karta className="p-5 sm:p-6">
          <p className="mb-5 max-w-[46rem] text-[13.5px] leading-relaxed text-tlum">
            Některé jevy mají dlouhodobě nenulové pozadí. Například běžné jednotlivé
            průniky do vzdušného prostoru se dějí opakovaně a samy o sobě hodnocení
            nezvyšují. Zvyšuje ho až <b className="font-semibold text-inkoust">změna vzorce</b>:
          </p>
          <ul className="flex flex-wrap gap-2">
            {ZMENA_VZORCE.map((z) => (
              <li
                key={z}
                className="rounded border border-linka bg-papir px-2.5 py-1.5 text-[12.5px] text-tlum"
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
                  {["Úroveň", "Znamená", "Neznamená"].map((h) => (
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
                        <span className={`inline-flex items-center gap-2 text-[12.5px] font-semibold ${t.text}`}>
                          <span aria-hidden className={`h-[7px] w-[7px] rounded-[2px] ${t.pruh}`} />
                          {d.nazev}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px] leading-relaxed text-tlum">{d.znamena}</td>
                      <td className="px-4 py-3.5 pr-5 text-[12.5px] leading-relaxed text-tlum2">
                        {d.neznamena === "—" ? "" : d.neznamena}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-linka px-5 py-3.5 text-[11.5px] leading-relaxed text-tlum2">
            Neuvádíme pravděpodobnost v procentech. Věta „riziko války 63 %“ by
            předstírala model, který nemáme — a čtenář by z ní vyvodil víc, než data unesou.
          </p>
        </Karta>
      </Sekce>

      <Sekce
        nadpis="Závažnost a jistota jsou dvě různé věci"
        popis="Nejčastější zdroj zkreslení. Proto je nikdy neslučujeme."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Karta className="p-5 sm:p-6">
            <div className="stitek mb-3">Závažnost</div>
            <p className="text-[13.5px] leading-relaxed text-tlum">
              Jak vážný je dopad, pokud se věc potvrdí. Odpovídá na otázku „jak moc by to
              vadilo“.
            </p>
          </Karta>
          <Karta className="p-5 sm:p-6">
            <div className="stitek mb-3">Jistota</div>
            <p className="text-[13.5px] leading-relaxed text-tlum">
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
            <h3 className="podnadpis mb-4 text-[15px]">Nepoužíváme</h3>
            <ul className="space-y-2.5">
              {ZAKAZANE.map((z) => (
                <li key={z} className="flex gap-2.5 text-[13.5px] leading-relaxed text-tlum2 line-through decoration-tlum2/40">
                  <span aria-hidden className="mt-[1px] shrink-0 no-underline">✕</span>
                  {z}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-linka2 pt-4 text-[12.5px] leading-relaxed text-tlum2">
              Budoucí scénář se nikdy nepíše jako jistota.
            </p>
          </Karta>
          <Karta className="p-5 sm:p-6">
            <h3 className="podnadpis mb-4 text-[15px]">Dáváme přednost</h3>
            <Seznam polozky={PREFEROVANE} znak="✓" barva="text-[#2f6f47]" />
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
              <p className="text-[12.5px] leading-relaxed text-tlum">
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
        <Karta className="p-5 sm:p-6">
          <h2 className="podnadpis mb-3 text-[16px]">Role automatizace</h2>
          <div className="max-w-[46rem] space-y-3 text-[13.5px] leading-relaxed text-tlum">
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
