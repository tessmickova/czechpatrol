import { rozesli } from "./rozeslani";
import { rozdilStavu } from "./upozorneni";
import type { Env, StavWebu } from "./typy";

/**
 * Přečte stav webu a z rozdílu proti minulému udělá zprávy.
 * Web je jediný zdroj pravdy; API si nic nedomýšlí.
 */
export async function synchronizuj(env: Env): Promise<{ zprav: number; zasazeni: number }> {
  const r = await fetch(env.STAV_URL, { headers: { Accept: "application/json" }, cf: { cacheTtl: 0 } } as RequestInit);
  if (!r.ok) throw new Error(`stav webu: HTTP ${r.status}`);
  const novy = (await r.json()) as StavWebu;
  if (novy.verze !== 1 || !Array.isArray(novy.udalosti)) throw new Error("stav webu: neznámý tvar");

  const ulozeny = await env.DB.prepare("SELECT hodnota FROM stav WHERE klic = 'web'").first<{ hodnota: string }>();
  const stary = ulozeny ? (JSON.parse(ulozeny.hodnota) as StavWebu) : null;

  // Stejný build webu = nic nového; šetří to databázi.
  if (stary && stary.generovano === novy.generovano) return { zprav: 0, zasazeni: 0 };
  /*
    Starší build, než jaký už známe (kopie z CDN, pozdě doručená odpověď):
    rozdíl by běžel pozpátku a z „platí“ by udělal „ukončeno“. Ignoruje se
    a uložený stav zůstává.
  */
  if (stary && novy.generovano < stary.generovano) return { zprav: 0, zasazeni: 0 };

  const zpravy = rozdilStavu(stary, novy, Date.now());
  let zasazeni = 0;
  // Pevné id ze stálého klíče: opakované zpracování téhož rozdílu nic nezdvojí (INSERT OR IGNORE).
  for (const z of zpravy) zasazeni += await rozesli(env, z, z.klic ? `zmena:${z.klic}` : undefined);

  await env.DB.prepare("INSERT OR REPLACE INTO stav (klic, hodnota, aktualizovano) VALUES ('web', ?, ?)")
    .bind(JSON.stringify(novy), new Date().toISOString())
    .run();
  return { zprav: zpravy.length, zasazeni };
}

/** Úklid podle zásad soukromí — nic se nedrží déle, než je slíbeno. */
export async function uklid(env: Env): Promise<void> {
  const nyni = new Date();
  const pred = (dni: number) => new Date(nyni.getTime() - dni * 86_400_000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM vyzvy WHERE expirace < ?").bind(nyni.toISOString()),
    env.DB.prepare("DELETE FROM propojeni WHERE expirace < ?").bind(nyni.toISOString()),
    env.DB.prepare("DELETE FROM limity WHERE okno_do < ?").bind(pred(1)),
    env.DB.prepare("DELETE FROM relace WHERE expirace < ?").bind(nyni.toISOString()),
    env.DB.prepare("DELETE FROM fronta WHERE odeslano IS NOT NULL AND odeslano < ?").bind(pred(30)),
    env.DB.prepare("DELETE FROM zpravy WHERE vytvoreno < ? AND id NOT IN (SELECT zprava_id FROM fronta)").bind(pred(90)),
    env.DB.prepare("DELETE FROM zpravy_izs WHERE vytvoreno < ?").bind(pred(365)),
    env.DB.prepare("DELETE FROM audit WHERE kdy < ?").bind(pred(365)),
    env.DB.prepare("DELETE FROM tipy WHERE vytvoreno < ?").bind(pred(365)),
    /* Odhlášená adresa zmizí do 30 dnů; adresa, které do roka nic nepřišlo, také. */
    env.DB.prepare("DELETE FROM zajem WHERE stav = 'odhlaseno' AND odhlaseno_kdy < ?").bind(pred(30)),
    env.DB.prepare("DELETE FROM zajem WHERE stav = 'nepotvrzeno' AND vytvoreno < ?").bind(pred(365)),
    /* E-maily s kódem se drží rok (viz návrh Premium); platby a kredity 10 let jako doklad — ty se nemažou. */
    env.DB.prepare("DELETE FROM emaily WHERE vytvoreno < ?").bind(pred(365)),
    /* Záznam v žebříčku, se kterým se rok nic nedělo, odchází i s kontaktem. */
    env.DB.prepare("DELETE FROM zebricek WHERE aktualizovano < ? AND stav IN ('novy', 'nezajem')").bind(pred(365)),
    /* Účet s platbou zůstává kvůli dokladu (viz ja.smazUcet); ostatní neaktivní účty po dvou letech odcházejí. */
    env.DB.prepare("DELETE FROM ucty WHERE COALESCE(posledni_prihlaseni, vytvoreno) < ? AND role != 'admin' AND id NOT IN (SELECT ucet_id FROM platby) AND id NOT IN (SELECT ucet_id FROM kredity)").bind(pred(730)),
  ]);
}
