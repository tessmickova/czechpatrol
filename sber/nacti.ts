import type { Polozka } from "./typy";

const CASOVY_LIMIT = 20_000;
const AGENT = "bezpecnostni-prehled/0.1 (nezavisly monitorovaci projekt)";

/** Stažení s časovým limitem a opakováním. Síť selhává, sběr kvůli tomu padat nemá. */
export async function stahni(url: string, pokusu = 3): Promise<{ stav: number; telo: string }> {
  let posledni: unknown;
  for (let i = 0; i < pokusu; i++) {
    try {
      const prerus = AbortSignal.timeout(CASOVY_LIMIT);
      const o = await fetch(url, {
        signal: prerus,
        headers: { "user-agent": AGENT, accept: "application/rss+xml, application/xml, text/xml, application/json, text/html" },
        redirect: "follow",
      });
      return { stav: o.status, telo: await o.text() };
    } catch (e) {
      posledni = e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw posledni;
}

function odtaguj(s: string): string {
  const dekoduj = (x: string) =>
    x
      /* Komentáře pryč celé. Bez tohohle zůstávalo v textu „-->“ z konce komentáře. */
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  /*
    Dvakrát, a pokaždé nejdřív rozkódovat a teprve pak odstranit značky.

    RSS popisky bývají zakódované dvojitě (&lt;a href="…"&gt;). Při jednom
    průchodu se nejdřív odstranily skutečné značky, pak se rozkódovaly entity
    — a v textu zůstal vypsaný odkaz i s base64 adresou z Google News. Ten
    text pak chodil do rozpoznávání i na web: čtenář viděl v shrnutí kandidáta
    „<a href=…CBMilAFBVV95cUxOSHdY…", a rozpoznávání zemí v tom nacházelo
    zkratky, protože pomlčky a podtržítka v base64 se chovají jako mezery.
  */
  let t = dekoduj(s).replace(/<[^>]+>/g, " ");
  t = dekoduj(t).replace(/<[^>]+>/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

function vytahni(blok: string, znacka: string): string {
  const m = blok.match(new RegExp(`<${znacka}[^>]*>([\\s\\S]*?)</${znacka}>`, "i"));
  return m ? odtaguj(m[1]) : "";
}

/**
 * Minimalistický čtečka RSS a Atomu. Záměrně bez knihovny — jde o pár značek
 * a každá závislost navíc je něco, co může v hodinovém běhu selhat.
 */
/**
 * Text bez značek a bez adres. Používá se na shrnutí z RSS — a taky na
 * dočištění starších zápisů, ve kterých značky uvízly jako holý text.
 */
export function ocistiText(s: string): string {
  /*
    Poslední smetení: nedokončené značky.

    Starší zápisy mají shrnutí oříznuté na 600 znaků — a base64 adresa uvnitř
    odkazu z Google News je sama delší než 400 znaků, takže se ořízlo uprostřed
    značky a uzavírací „>" v textu vůbec není. Běžné odstranění značek na to
    nestačí, protože hledá dvojici.
  */
  return bezAdres(odtaguj(s))
    .replace(/<\/?[a-z][^<>]*>?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Odkazy ven z textu. Použije se na shrnutí z RSS, ne na stažené stránky. */
export function bezAdres(s: string): string {
  return s.replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Položky z obyčejné HTML stránky — nouzový režim, když kanál RSS nefunguje.
 *
 * Vzniklo to z měření: 15. 9. 2026 vrátily všechny čtyři úřední kanály (NATO,
 * Policie ČR, NÚKIB, vláda) chybu 404 nebo prázdno. Sběr tak běžel bez
 * jediného primárního zdroje a nikdo si toho nevšiml, protože „nula nových
 * zpráv z úřadu" vypadá úplně stejně jako klid.
 *
 * Tiskové stránky těch úřadů přitom odpovídají a jde z nich číst — jen to
 * není RSS. Bere se z nich odkaz a jeho text; datum vydání stránka neuvádí,
 * takže zůstává prázdné a platí čas zachycení. Je to hrubé, ale zpráva
 * z úřadu má přijít i tehdy, když se úřadu rozbije kanál.
 */
export function polozkyZeStranky(html: string, zaklad: string, max = 40): Polozka[] {
  const out: Polozka[] = [];
  const videne = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href, vnitrek] = m;
    if (/^(mailto:|javascript:|tel:)/i.test(href)) continue;
    const nadpis = odtaguj(vnitrek);
    /* Krátké texty jsou navigace („Úvod", „Více"), dlouhé jsou celé odstavce. */
    if (nadpis.length < 25 || nadpis.length > 200) continue;
    let odkaz: string;
    try { odkaz = new URL(href, zaklad).toString(); } catch { continue; }
    if (videne.has(odkaz)) continue;
    videne.add(odkaz);
    out.push({ nadpis, odkaz, publikovano: null, shrnuti: "", zeStranky: true });
    if (out.length >= max) break;
  }
  return out;
}

export function ctiRss(xml: string): Polozka[] {
  const bloky = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ].map((m) => m[0]);

  return bloky.map((b) => {
    let odkaz = vytahni(b, "link");
    if (!odkaz) odkaz = b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "";
    const datum =
      vytahni(b, "pubDate") || vytahni(b, "published") || vytahni(b, "updated") || vytahni(b, "dc:date");
    const t = datum ? new Date(datum) : null;
    return {
      nadpis: vytahni(b, "title"),
      odkaz,
      publikovano: t && !Number.isNaN(t.getTime()) ? t.toISOString() : null,
      /*
        Adresy ze shrnutí pryč. V kanálech Google News je popisek jen odkazem
        na článek; base64 v té adrese nenese žádnou informaci, zato kazí
        rozpoznávání tématu i země a na webu vypadá jako porucha.
      */
      shrnuti: bezAdres(vytahni(b, "description") || vytahni(b, "summary") || vytahni(b, "content")).slice(0, 600),
    };
  }).filter((p) => p.nadpis);
}

/** Z HTML stránky vytáhne jen text — pro hledání klíčových slov v úředních registrech. */
export function ctiHtml(html: string): string {
  return odtaguj(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " "));
}

/** Bez diakritiky a malými písmeny, aby se „ohrožení“ našlo i jako „ohrozeni“. */
export function normalizuj(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
