import { ctiRss, stahni } from "./nacti";
import { blueskyFeed, mastodonRss, telegramNahled, type SledovanyProfil } from "./socialni";
import type { Polozka } from "./typy";

/*
  Čtení profilů na sociálních sítích.

  Každá síť vrací něco jiného, ale ven jde vždycky tentýž tvar `Polozka`,
  aby se zbytek sběru nemusel starat, odkud nález přišel. Nikdy nevyhazuje:
  když se profil nepodaří přečíst, vrátí se prázdno a důvod. Výpadek profilu
  nesmí zastavit zbytek běhu.
*/

export interface VysledekProfilu {
  profil: SledovanyProfil;
  polozky: Polozka[];
  chyba?: string;
}

/** Bluesky vrací JSON; zajímá nás text příspěvku, čas a adresa. */
function zBluesky(telo: string, handle: string): Polozka[] {
  interface Prispevek {
    uri?: string;
    record?: { text?: string; createdAt?: string };
  }
  const data = JSON.parse(telo) as { feed?: { post?: Prispevek }[] };
  const feed: { post?: Prispevek }[] = Array.isArray(data.feed) ? data.feed : [];
  return feed
    .map((f) => f.post)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.record?.text))
    .map((p) => {
      // AT URI vypadá jako at://did:plc:xxx/app.bsky.feed.post/<rkey>; čtenáři patří https adresa.
      const rkey = (p.uri ?? "").split("/").pop() ?? "";
      const text = p.record!.text!.trim();
      return {
        nadpis: text.slice(0, 200),
        odkaz: rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : `https://bsky.app/profile/${handle}`,
        publikovano: p.record?.createdAt ?? null,
        shrnuti: text.slice(0, 600),
      };
    });
}

/*
  Telegram: veřejný náhled kanálu je HTML. Nečteme ho jako stránku, jen z něj
  vytáhneme bloky se zprávami. Je to křehké — když Telegram tvar změní, vrátí
  se prázdno a řekne se to, místo aby se tiše nesbíralo nic.
*/
function zTelegramu(html: string, kanal: string): Polozka[] {
  const bloky = [...html.matchAll(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g)];
  const casy = [...html.matchAll(/<time[^>]*datetime="([^"]+)"/g)].map((m) => m[1]);
  const odkazy = [...html.matchAll(/data-post="([^"]+)"/g)].map((m) => m[1]);
  return bloky.map((m, i) => {
    const text = m[1]
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    return {
      nadpis: text.slice(0, 200),
      odkaz: odkazy[i] ? `https://t.me/${odkazy[i]}` : `https://t.me/s/${kanal}`,
      publikovano: casy[i] ?? null,
      shrnuti: text.slice(0, 600),
    };
  }).filter((p) => p.nadpis);
}

/** Přečte jeden profil. Nikdy nevyhazuje — chyba se vrátí jako důvod. */
export async function ctiProfil(p: SledovanyProfil): Promise<VysledekProfilu> {
  try {
    const adresa =
      p.sit === "mastodon" ? (p.url || mastodonRss(p.ucet.split("@").pop() ?? "", p.ucet.split("@")[0]))
      : p.sit === "bluesky" ? (p.url || blueskyFeed(p.ucet))
      : (p.url || telegramNahled(p.ucet));

    const { stav, telo } = await stahni(adresa, 2);
    if (stav >= 400) return { profil: p, polozky: [], chyba: `HTTP ${stav}` };

    const polozky =
      p.sit === "mastodon" ? ctiRss(telo)
      : p.sit === "bluesky" ? zBluesky(telo, p.ucet)
      : zTelegramu(telo, p.ucet);

    if (!polozky.length) return { profil: p, polozky: [], chyba: "odpověď přišla, ale nenašel se v ní žádný příspěvek" };
    return { profil: p, polozky };
  } catch (e) {
    return { profil: p, polozky: [], chyba: e instanceof Error ? e.message : String(e) };
  }
}
