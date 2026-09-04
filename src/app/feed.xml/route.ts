import { WEB } from "@/config/web";
import { incidenty } from "@/lib/data";
import { JISTOTY, UROVNE } from "@/lib/skala";

export const dynamic = "force-static";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Kanál RSS. Generuje se při buildu, takže funguje i na statickém hostingu.
 *
 * Do kanálu jdou jen zveřejněné, lidsky ověřené záznamy — tedy přesně to,
 * co je na webu. Kanál nikdy neobsahuje nic, co web sám netvrdí.
 */
export function GET() {
  const polozky = incidenty()
    .slice(0, 50)
    .map((i) => {
      const kdy = new Date(i.datumZjisteni ?? i.datumUdalosti).toUTCString();
      const popis = [
        `Závažnost: ${UROVNE[i.zavaznost].nazev}. Jistota informace: ${JISTOTY[i.jistota].nazev}.`,
        i.vyznam,
        `Zdroje: ${i.zdroje.map((z) => z.nazev).join(", ")}.`,
      ].join(" ");
      return `    <item>
      <title>${escape(i.titulek)}</title>
      <link>${WEB.url}/incident/${i.slug}/</link>
      <guid isPermaLink="true">${WEB.url}/incident/${i.slug}/</guid>
      <pubDate>${kdy}</pubDate>
      <description>${escape(popis)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(`${WEB.nazev} — ${WEB.podtitul}`)}</title>
    <link>${WEB.url}/</link>
    <description>${escape(WEB.popis)}</description>
    <language>cs</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${polozky}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
