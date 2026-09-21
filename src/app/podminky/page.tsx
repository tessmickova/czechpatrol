import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Karta } from "@/components/zaklad";
import { PLACENE, PROVOZOVATEL } from "@/config/web";

export const metadata: Metadata = {
  title: "Podmínky použití",
  description: "Co CzechPatrol je a není, jak fungují účty, upozornění a zprávy partnerů IZS.",
};

const REVIZE = "2026-09-05";

function Oddil({ cislo, nadpis, children }: { cislo: string; nadpis: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-linka py-7 md:grid-cols-[120px_minmax(0,1fr)]">
      <div className="cislice stitek pt-1">{cislo}</div>
      <div>
        <h2 className="podnadpis text-velke">{nadpis}</h2>
        <div className="mt-3 space-y-3 text-zaklad leading-relaxed text-tlum [&_b]:font-semibold [&_b]:text-inkoust">{children}</div>
      </div>
    </section>
  );
}

export default function PodminkyStranka() {
  return (
    <>
      <HlavickaStranky
        stitek="Podmínky"
        ikona="dokument"
        nadpis="Podmínky použití"
        popis="Krátké, protože služba je jednoduchá: ukazuje ověřený stav, nedává rady a nic nepředstírá."
        doplnek={<span className="stitek !text-noc-tlum">Platí od {REVIZE}</span>}
      />
      <Obsah>
        <Karta odstin="pisek" className="p-6">
          <div className="stitek mb-2">Nejdůležitější věta</div>
          <p className="text-vetsi leading-relaxed text-inkoust">
            CzechPatrol není úřední zdroj ani varovný systém. V krizi se řiďte pokyny státních orgánů
            a složek integrovaného záchranného systému, ne tímto webem.
          </p>
        </Karta>

        <div className="mt-10">
          <Oddil cislo="01" nadpis="Co služba je">
            <p>Nezávislý analytický projekt. Sbírá veřejné informace z úředních zdrojů a důvěryhodných médií, řadí je do jednotné stupnice a ukazuje, co platí a co ne. Provozuje ho {PROVOZOVATEL.nazev ? <b>{PROVOZOVATEL.nazev}</b> : "soukromá osoba (identifikace bude doplněna se spuštěním účtů)"}.</p>
            <p>Není součástí vlády ČR, Armády ČR, NATO, EU ani bezpečnostních složek. Hodnocení je analytická interpretace, ne oficiální stupeň, předpověď ani pokyn k jednání.</p>
          </Oddil>

          <Oddil cislo="02" nadpis="Co služba není">
            <p>Web nedává doporučení typu „odjet / neodjet“, „vybrat hotovost“ ani jiné rady do osobního života. Ukazuje ověřený stav, spouštěče a to, co se zatím nestalo. Rozhodnutí je vaše.</p>
            <p>Automat, který data sbírá, může chybět nebo se zpozdit. Nikdy sám nepotvrzuje, že něco platí — jen to, že v úředních zdrojích nic nenašel. Před důležitým rozhodnutím ověřte stav u úřadů.</p>
          </Oddil>

          <Oddil cislo="03" nadpis="Texty, AI a cizí práce">
            <p>Popisy událostí jsou <b>AI shrnutí veřejných zdrojů</b> — ne oficiální články, ne stanoviska úřadů ani projektu. Jsou tak označené u každého záznamu a štítkem „AI-assisted“ na každé stránce. Celkovou úroveň, zařazení a zveřejnění událostí schvaluje člověk; podrobnosti v <Link href="/metodika/" className="odkaz text-inkoust">metodice</Link>.</p>
            <p>Přebíráme fakta, ne znění. Články necitujeme v celku ani v dlouhých pasážích, u každého záznamu uvádíme zdroj jménem a odkazujeme na originál, fotografie ze zdrojů nepřebíráme. Kde zdroj automatizované čtení zakazuje, respektujeme to.</p>
            <p>U lidí platí presumpce neviny a ochrana osobnosti. Dokud není pravomocný rozsudek, píšeme „obviněný“, „podezřelý“ nebo „podle policie“ — nikdy „pachatel“. Kdo se cítí záznamem dotčen, může požádat o opravu; opravy jsou veřejné na stránce <Link href="/opravy/" className="odkaz text-inkoust">Opravy</Link>.</p>
          </Oddil>

          <Oddil cislo="04" nadpis="Účet">
            <p>Účet je anonymní a bezplatný. Zřizuje se passkey; obnovovací kód dostanete jednou a je jen na vás ho uchovat — bez něj a bez zařízení s passkey se k účtu nedostanete a nemáme jak ho obnovit.</p>
            <p>Účet nesmíte používat k obtěžování, k pokusům o průnik do systému ani k automatizovanému vytěžování služby. Takový účet můžeme zrušit.</p>
            <p>Účet i všechna data smažete sami v nastavení, okamžitě.</p>
          </Oddil>

          <Oddil cislo="05" nadpis="Upozornění">
            <p>Doručení na Telegram nebo WhatsApp děláme s nejlepší péčí, ale <b>bez záruky</b>: kanál třetí strany může selhat, zpráva se může zpozdit nebo nedorazit. Upozornění nenahrazují úřední varování (sirény, státní SMS, veřejnoprávní média).</p>
            <p>Co a kdy vám přijde, si nastavujete sami. Nastavení „hned, cokoli důležitého“ nemá strop počtu zpráv.</p>
          </Oddil>

          <Oddil cislo="06" nadpis="Zprávy partnerů IZS">
            <p>Roli partnera přiděluje správce po ověření, že za účtem stojí skutečná složka integrovaného záchranného systému. Partner odpovídá za pravdivost a věcnost svých zpráv. Každá zpráva před odesláním projde schválením správce, který ji může bez udání důvodu vrátit.</p>
            <p>Zprávy partnerů jsou vždy označené jako <b>zpráva partnera IZS</b> se jménem složky. Nejde o úřední varování a nesmí se za něj vydávat.</p>
          </Oddil>

          <Oddil cislo="07" nadpis="Cena a podpora">
            {PLACENE.hraniceADoprava ? (
              <p>Část obsahu je vyhrazena podporovatelům. Podmínky placené vrstvy (cena, trvání, odstoupení) budou uvedeny u objednávky před jejím potvrzením v souladu s § 1820 a násl. občanského zákoníku.</p>
            ) : (
              <p>Web i účet jsou zdarma. Dobrovolná podpora (například „Buy me a coffee“) je dar na provoz, ne nákup služby — nevzniká z ní nárok na nic navíc.</p>
            )}
          </Oddil>

          <Oddil cislo="08" nadpis="Odpovědnost">
            <p>Obsah poskytujeme tak, jak je, bez záruky úplnosti a aktuálnosti. Neodpovídáme za rozhodnutí, která na základě webu učiníte, ani za výpadky služby. Tím nejsou dotčena práva, která vám dává zákon a která nelze vyloučit.</p>
          </Oddil>

          <Oddil cislo="09" nadpis="Obsah a licence">
            <p>Data událostí uvádějí zdroje; citované texty patří jejich autorům. Přehled můžete citovat s odkazem na zdroj.</p>
          </Oddil>

          <Oddil cislo="10" nadpis="Právo a spory">
            <p>Řídí se právem České republiky. Spotřebitel se může obrátit na Českou obchodní inspekci jako subjekt mimosoudního řešení sporů (coi.cz). Osobní údaje: <Link href="/soukromi/" className="odkaz text-inkoust">Soukromí</Link>.</p>
          </Oddil>

          <Oddil cislo="11" nadpis="Změny">
            <p>Podmínky můžeme upravit; datum poslední revize je nahoře. Podstatnou změnu oznámíme v přehledu a přihlášeným v účtu. Používáním po změně s ní souhlasíte.</p>
          </Oddil>
        </div>
      </Obsah>
    </>
  );
}
