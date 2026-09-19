import { WEB } from "@/config/web";
import { kandidati, posledniKontrola } from "@/lib/data";

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
 * Co tu NENÍ a nebude: návrhy záznamů. Ty čekají na lidské schválení a do
 * té doby nejsou tvrzením projektu — vystavit je veřejně by z rozdělané
 * práce udělalo zprávu.
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
  });
}
