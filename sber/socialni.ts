/*
  Profily představitelů a institucí na sociálních sítích.

  Proč to tu je: ministr, armáda nebo zpravodajská služba dnes často řeknou
  věc nejdřív na svém profilu a teprve potom v tiskové zprávě. Kdo tyhle
  profily nesleduje, dozví se to o hodiny později.

  Proč to NIKDY není doklad:

  1. Příspěvek na síti je SIGNÁL, ne důkaz. Zakládá kandidáta ke kontrole,
     nikdy nezveřejní záznam, nezvyšuje závažnost ani připsání odpovědnosti
     a nikdy nedokládá, že se něco NEstalo.
  2. Snímek obrazovky není zdroj vůbec. Nedá se z něj ověřit ani to, že
     příspěvek existuje, ani že účet patří tomu, kdo je na něm podepsaný.
     Právě takhle vypadají podvrhy, které vedeme v sekci Manipulace.
  3. Pravost účtu musí jednou potvrdit člověk — a to odkazem z vlastního
     webu instituce na ten profil, ne modrým odznakem. Odznak si koupí kdokoli.

  Co jde číst bez přihlášení a bez placeného přístupu:
    • Mastodon — každý účet má veřejné RSS na adrese …/@ucet.rss
    • Bluesky — veřejné XRPC rozhraní public.api.bsky.app
    • Telegram — veřejný náhled kanálu na t.me/s/<kanal>
  Facebook a X veřejné čtení bez tokenu neumožňují. Nepředstíráme, že je
  sledujeme; kdo je chce, musí je zadat ručně.
*/

export type Sit = "mastodon" | "bluesky" | "telegram";

export interface SledovanyProfil {
  klic: string;
  /** Kdo to je a jakou má roli. Do popisu kandidáta, ať je poznat váha. */
  kdo: string;
  role: string;
  sit: Sit;
  /** Identifikátor účtu v dané síti. */
  ucet: string;
  /** Strojová adresa ke čtení. */
  url: string;
  /** Adresa pro čtenáře. */
  odkaz: string;
  jazyk: string;
  /**
   * Doklad pravosti účtu: odkaz z VLASTNÍHO webu instituce na tenhle profil.
   * Prázdné = pravost neověřena, profil se nečte.
   */
  pravostDolozena: string;
  /** Ověřeno živým stažením. Nové profily sem patří s false. */
  overenaAdresa: boolean;
}

/** Mastodon: veřejné RSS účtu. Funguje bez přihlášení na každé instanci. */
export const mastodonRss = (instance: string, ucet: string) => `https://${instance}/@${ucet}.rss`;
/** Bluesky: veřejné čtení cizího profilu bez přihlášení. */
export const blueskyFeed = (handle: string) =>
  `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=20`;
/** Telegram: veřejný náhled kanálu jako HTML. */
export const telegramNahled = (kanal: string) => `https://t.me/s/${kanal}`;

/*
  Seznam sledovaných profilů.

  Záměrně prázdný, dokud u každé položky nebude doložená pravost. Vymyslet si
  handle je tady horší než nemít žádný: sledovali bychom cizí účet a jeho
  příspěvky bychom připisovali instituci, která s nimi nemá nic společného.

  Jak se profil přidává:
    1. najdi na OFICIÁLNÍM webu instituce odkaz na její profil,
    2. adresu toho webu zapiš do `pravostDolozena`,
    3. přidej záznam s `overenaAdresa: false`,
    4. `npm run sber:zdroje` ověří, že adresa odpovídá, a teprve pak se
       příznak přepne.
*/
export const SLEDOVANE_PROFILY: SledovanyProfil[] = [];

/** Profily, které se opravdu čtou: jen s doloženou pravostí a ověřenou adresou. */
export function ctenaProfily(): SledovanyProfil[] {
  return SLEDOVANE_PROFILY.filter((p) => p.pravostDolozena && p.overenaAdresa);
}
