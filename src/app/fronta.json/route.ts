import { WEB } from "@/config/web";
import { kandidati, nepotvrzeneZaznamy, posledniKontrola, vsichniKandidati } from "@/lib/data";

export const dynamic = "force-static";

/**
 * Fronta zachycených zpráv, strojově čitelná.
 *
 * Proč existuje: denní rutiny běží v prostředí bez gitových přihlašovacích
 * údajů a bez nástroje na připojení repozitáře. `git clone` jim skončí na
 * „could not read Username for 'https://github.com'" a dál se nedostanou.
 * Obcházet to vkládáním přihlašovacích údajů do rutiny nepřipadá v úvahu —
 * tajemství do textu úkolu nepatří.
 *
 * Řešení je opačné: co rutina potřebuje, jí připravíme tam, kam dosáhne
 * i bez čehokoli — na veřejnou adresu. Nic se tím nevyzrazuje. Zachycené
 * zprávy jsou titulky a odkazy z veřejných zdrojů a web je stejně ukazuje
 * v oddílu „Zachyceno, neověřeno".
 *
 * Od 20. 9. 2026 jsou tu i nepotvrzené záznamy — návrhy, které čekají na
 * schválení. Dřív tu nebyly schválně, s odůvodněním, že rozdělaná práce není
 * tvrzení projektu. To pořád platí, jen se ukázalo, že mlčení je zavádějící
 * jinak: dokud návrh čekal, vypadal web, jako by se nic nedělo. Ukazují se
 * proto obojí a zřetelně oddělené — stejně jako na webu.
 */
/*
  Stropy na velikost.

  Tohle není úspora místa, ale podmínka funkčnosti. Soubor čte rutina —
  jazykový model, kterému se stránka předává jako text. Když je dlouhá,
  ořízne se a modelu zbude rozbitý JSON; rutina pak hlásí chybu, přestože
  server odpověděl správně.

  20. 9. 2026 se to stalo: k frontě přibyly nepotvrzené záznamy i se všemi
  zdroji a soubor vyskočil z 9 kB na 74 kB. Zdroje z Google News mají adresu
  přes čtyři sta znaků, takže 88 % souboru byly odkazy, které rutina
  k ničemu nepotřebuje.
*/
const NEJVYS_ZACHYCENYCH = 60;
const NEJVYS_NEPOTVRZENYCH = 40;

/**
 * Jeden zdroj na ukázku, ne všechny.
 *
 * Přednost má úřední; z ostatních ta nejkratší adresa, protože přesměrování
 * přes agregátor je dlouhé a k ničemu — vede na tentýž článek.
 */
function ukazkovyZdroj(zdroje: { url: string; typ?: string; primarni?: boolean }[]) {
  const uredni = zdroje.find((z) => z.typ === "primary" || z.primarni);
  const vybrany = uredni ?? [...zdroje].sort((a, b) => a.url.length - b.url.length)[0];
  return vybrany?.url ?? null;
}

export function GET() {
  const vse = kandidati();

  return Response.json({
    verze: 1,
    web: WEB.url,
    generovano: new Date().toISOString(),
    /*
      Kdy sběr naposledy něco uložil. Bere se z nejnovější zachycené zprávy,
      protože to je jediný údaj, který se nedá zaměnit s ověřováním stavů —
      a rutina se právě podle něj pozná, jestli sběr vůbec běží.
    */
    sberNaposledy: vsichniKandidati().reduce<string | null>((nej, k) => {
      const kdy = k.zachyceno ?? null;
      return kdy && (!nej || kdy > nej) ? kdy : nej;
    }, null),
    /* Kdy se naposledy kontrolovaly úřední stavy. Jiná věc než sběr. */
    stavyKontrolovany: posledniKontrola(),
    pocet: vse.length,
    /*
      Jen to podstatné k ověření: co se tvrdí, kdy to vyšlo a kde to stojí.
      Vnitřní údaje (klasifikace, shody na klíčová slova, důvody odmítnutí)
      sem nepatří — rutina je k práci nepotřebuje a ven nemají chodit.
    */
    zachyceno: vse.slice(0, NEJVYS_ZACHYCENYCH).map((k) => ({
      id: k.id,
      titulek: k.titulek,
      zeme: k.zeme ?? null,
      kodZeme: k.kodZeme ?? null,
      kategorie: k.kategorie ?? [],
      publikovano: k.publikovano ?? k.zachyceno,
      zdroj: { nazev: k.zdroj?.nazev ?? null, url: k.zdroj?.url ?? null },
    })),
    /*
      Nepotvrzené záznamy. Rutina z nich pozná, kde chybí úřední zdroj —
      a to je přesně práce, kterou umí udělat: dohledat ho.
    */
    nepotvrzeno: nepotvrzeneZaznamy().slice(0, NEJVYS_NEPOTVRZENYCH).map((z) => ({
      id: z.id,
      titulek: z.titulek,
      zeme: z.zeme,
      kodZeme: z.kodZeme,
      datumUdalosti: z.datumUdalosti,
      zavaznost: z.zavaznost,
      maUredniZdroj: z.zdroje.some((x) => x.typ === "primary" && Boolean(x.url)),
      zdrojuCelkem: z.zdroje.length,
      /* Jeden na ukázku. Celý seznam je u záznamu na webu. */
      zdroj: ukazkovyZdroj(z.zdroje),
    })),
  });
}
