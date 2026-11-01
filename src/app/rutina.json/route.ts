import { WEB } from "@/config/web";
import {
  celkovyStav, incidenty, kandidati, nepotvrzeneZaznamy, posledniKontrola, posledniOvereni, vsichniKandidati,
} from "@/lib/data";
import { UROVNE } from "@/lib/skala";

export const dynamic = "force-static";

/**
 * Jeden malý soubor pro denní rutiny.
 *
 * Proč vlastní adresa
 * -------------------
 * Rutiny četly /stav.json a /fronta.json. Oba soubory mají ale i jiné
 * odběratele, kteří potřebují víc dat: stav.json čte API upozornění a veze
 * kvůli němu šedesát záznamů, fronta.json vezla nepotvrzené záznamy se všemi
 * zdroji. Dohromady přes sto kilobajtů.
 *
 * Rutina je jazykový model a stránka se mu předává jako text. Dlouhý text se
 * ořízne a modelu zbude rozbitý JSON — ohlásí chybu, přestože server
 * odpověděl správně. Přesně to se 20. 9. 2026 stalo.
 *
 * Tenhle soubor proto veze jen to, na co se rutina ptá, a je záměrně malý.
 * Když sem bude chtít někdo přidat pole, musí se vejít pod strop hlídaný
 * testem — nebo si založit vlastní adresu, jako to udělala rutina.
 */

/** Kolik položek se vypisuje jmenovitě. Zbytek je jen v počtech. */
const NEJVYS = 12;
/*
  Zachycených méně: rutina z nich čte jen počet a stáří nejnovější, ale každá
  nese adresu zdroje — u Google News přes čtyři sta znaků. Osm stačí.
*/
const NEJVYS_ZACHYCENYCH = 8;

export function GET() {
  const fronta = kandidati();
  const nepotvrzene = nepotvrzeneZaznamy();
  const stav = celkovyStav();

  /*
    Kdy sběr naposledy něco uložil — ze VŠECH zachycených, ne jen z těch,
    co čekají ve frontě.

    Počítalo se to z čekajících a 21. 9. 2026 fronta poprvé klesla na nulu.
    Údaj tím spadl na null a ranní kontrola by z toho usoudila, že sběr
    neběží. Prázdná fronta je ale úspěch, ne výpadek: znamená, že se
    všechno posoudilo.
  */
  const sberNaposledy = vsichniKandidati().reduce<string | null>(
    (nej, k) => (k.zachyceno && (!nej || k.zachyceno > nej) ? k.zachyceno : nej),
    null,
  );

  return Response.json({
    verze: 1,
    web: WEB.url,
    generovano: new Date().toISOString(),

    /* Provoz: běží sběr, kontrolují se stavy? Na tohle se ptá ranní kontrola. */
    provoz: {
      sberNaposledy,
      stavyKontrolovany: posledniKontrola(),
      zaznamyOvereny: posledniOvereni(),
      zaznamuCelkem: incidenty().length,
      veFronte: fronta.length,
      nepotvrzenych: nepotvrzene.length,
    },

    /* Co web tvrdí o situaci. Bez rozpisu záznamů — ten je ve stav.json. */
    situace: {
      uroven: stav.uroven,
      nazev: stav.uroven ? UROVNE[stav.uroven].nazev : null,
      trend: stav.trend,
    },

    /*
      Nepotvrzené bez úředního zdroje — hlavní práce rutiny i ověřovatele.
      Jeden odkaz na ukázku stačí; celý seznam zdrojů je u záznamu na webu.
    */
    chybiUredniZdroj: nepotvrzene
      .filter((z) => !z.zdroje.some((x) => (x.typ === "primary" || x.primarni) && Boolean(x.url)))
      .slice(0, NEJVYS)
      .map((z) => ({
        id: z.id,
        titulek: z.titulek,
        zeme: z.zeme,
        kodZeme: z.kodZeme,
        datumUdalosti: z.datumUdalosti,
        zdrojuCelkem: z.zdroje.length,
        zdroj: [...z.zdroje].sort((a, b) => a.url.length - b.url.length)[0]?.url ?? null,
      })),

    /* Nejnovější zachycené zprávy, které nikdo neposoudil. */
    zachyceno: fronta.slice(0, NEJVYS_ZACHYCENYCH).map((k) => ({
      id: k.id,
      titulek: k.titulek,
      zeme: k.zeme ?? null,
      kodZeme: k.kodZeme ?? null,
      /* Datum vydání zdroje, ne datum události — a když chybí, je to vidět. */
      zdrojVydan: k.publikovano ?? null,
      zachyceno: k.zachyceno,
      zdroj: k.zdroj?.url ?? null,
    })),
  });
}
