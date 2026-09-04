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
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function vytahni(blok: string, znacka: string): string {
  const m = blok.match(new RegExp(`<${znacka}[^>]*>([\\s\\S]*?)</${znacka}>`, "i"));
  return m ? odtaguj(m[1]) : "";
}

/**
 * Minimalistický čtečka RSS a Atomu. Záměrně bez knihovny — jde o pár značek
 * a každá závislost navíc je něco, co může v hodinovém běhu selhat.
 */
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
      shrnuti: (vytahni(b, "description") || vytahni(b, "summary") || vytahni(b, "content")).slice(0, 600),
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
