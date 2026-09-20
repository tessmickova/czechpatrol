import { WEB } from "@/config/web";
import { kandidati, nepotvrzeneZaznamy, posledniKontrola } from "@/lib/data";

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
    sberNaposledy: vse.reduce<string | null>((nej, k) => {
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
    zachyceno: vse.slice(0, 300).map((k) => ({
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
    nepotvrzeno: nepotvrzeneZaznamy().map((z) => ({
      id: z.id,
      titulek: z.titulek,
      zeme: z.zeme,
      kodZeme: z.kodZeme,
      datumUdalosti: z.datumUdalosti,
      zavaznost: z.zavaznost,
      maUredniZdroj: z.zdroje.some((x) => x.typ === "primary" && Boolean(x.url)),
      zdroje: z.zdroje.map((x) => ({ nazev: x.nazev, url: x.url, typ: x.typ })),
    })),
  });
}
