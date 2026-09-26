/*
  Hlídač sběru.

  Proč to hlídá worker, a ne GitHub
  ---------------------------------
  17. 9. 2026 v 08:03 přestal na GitHubu běžet sběr dat. Každý další pokus
  skončil chybou dřív, než se vůbec spustil první krok. Web se od té chvíle
  nesestavoval, do Telegramu nic neodešlo — a nikdo se to nedozvěděl, protože
  všechno, co by to mohlo ohlásit, běželo na tomtéž GitHubu.

  Hlídač uvnitř hlídaného systému nehlídá nic. Tenhle běží na Cloudflare,
  na vlastním plánovači a s vlastními penězi: když GitHub odmítne pracovat,
  worker o tom ví a řekne to.

  Co hlásí a komu
  ---------------
  - správci (SPRAVCE_CHAT) po třech hodinách bez úspěšného sběru,
  - do veřejného kanálu (TELEGRAM_KANAL) až po dvanácti hodinách. Odběratel
    nepotřebuje vědět o každém zaškobrtnutí, ale po půl dni má právo vědět,
    že se na kanál nedá spolehnout. Mlčení se nesmí dát zaměnit za klid.

  Nic z toho není povinné: bez nastavených chatů hlídač jen píše do logu.
*/
import { posliTelegram } from "./dorucovani";
import { behyMesice, KADENCE, odmitnuty, PRIDEL_MINUT, spocitejSpotrebu, vyberKadenci, type Beh } from "./minuty";
import type { Env } from "./typy";

/** Po kolika hodinách bez úspěšného sběru se ozve správci. */
export const PRAH_SPRAVCE_H = 3;
/** Po kolika hodinách se to dozví i veřejný kanál. */
export const PRAH_KANAL_H = 12;
/** Jak často se smí hlášení opakovat, aby z něj nebyl budík každých deset minut. */
export const OPAKOVAT_PO_H = 6;

export interface StavSberu {
  /** Kdy naposledy sběr doběhl úspěšně. null = v posledních bězích ani jednou. */
  posledniUspech: string | null;
  /** Kolik z posledních běhů skončilo chybou. */
  chybnych: number;
  /**
   * Poslední tři běhy GitHub odmítl spustit (chyba do 15 s, bez výpisu).
   * Typicky došlé minuty. Hlásí se hned, ne po třech hodinách.
   */
  odmitaSe?: boolean;
}

/** Přečte z GitHubu, jak dopadly poslední běhy sběru. */
export async function stavSberu(env: Env): Promise<StavSberu | null> {
  if (!env.GH_TOKEN_SBER || !env.SBER_REPO) return null;
  const soubor = env.SBER_WORKFLOW ?? "sber.yml";
  const r = await fetch(
    `https://api.github.com/repos/${env.SBER_REPO}/actions/workflows/${soubor}/runs?per_page=20`,
    {
      headers: {
        authorization: `Bearer ${env.GH_TOKEN_SBER}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "czechpatrol-api",
      },
    },
  );
  if (!r.ok) return null;
  const data = (await r.json()) as { workflow_runs?: Beh[] };
  const behy = data.workflow_runs ?? [];
  if (!behy.length) return null;
  const uspech = behy.find((b) => b.conclusion === "success");
  const dokoncene = behy.filter((b) => b.conclusion !== null);
  return {
    posledniUspech: uspech ? uspech.run_started_at : null,
    chybnych: behy.filter((b) => b.conclusion === "failure").length,
    odmitaSe: dokoncene.length >= 3 && dokoncene.slice(0, 3).every(odmitnuty),
  };
}

/**
 * Rozhodne, co se má stát. Oddělené od odesílání, aby se to dalo otestovat
 * bez sítě — na hlídači, který se spustí jednou za měsíc, se ručně zkoušet nedá.
 */
/** Co hlídač naposledy ohlásil (D1 `stav` klíč hlidac-sber). Starší zápis byl jen čas. */
export interface Nahlaseno {
  kdy: string;
  komu: ("spravce" | "kanal")[];
}

export function ctiNahlaseno(hodnota: string | null | undefined): Nahlaseno | null {
  if (!hodnota) return null;
  try {
    const j = JSON.parse(hodnota) as Nahlaseno;
    if (j && typeof j.kdy === "string" && Array.isArray(j.komu)) return j;
  } catch { /* starý tvar: prostý čas */ }
  // Starý zápis neříká komu; bere se, že i kanálu — radši jedna zpráva o obnovení navíc než žádná.
  return /^\d{4}-/.test(hodnota) ? { kdy: hodnota, komu: ["spravce", "kanal"] } : null;
}

/**
 * Po obnovení: komu říct, že sběr zase běží. Jen těm, kdo dostali hlášení
 * o výpadku, a jen jednou (záznam se pak smaže). Bez toho kanál po
 * „nespoléhejte se na nás“ mlčel dál a nikdo nevěděl, že už to zase platí.
 */
export function coObnovit(stav: StavSberu, ted: number, nahlaseno: Nahlaseno | null): ("spravce" | "kanal")[] {
  if (!nahlaseno || stav.odmitaSe || !stav.posledniUspech) return [];
  const hodin = (ted - new Date(stav.posledniUspech).getTime()) / 3_600_000;
  // Úspěch musí být novější než hlášení výpadku — jinak jde o starý úspěch.
  if (hodin >= PRAH_SPRAVCE_H || new Date(stav.posledniUspech).getTime() <= new Date(nahlaseno.kdy).getTime()) return [];
  return nahlaseno.komu;
}

export function coOhlasit(
  stav: StavSberu,
  ted: number,
  posledniHlaseni: string | null,
): { komu: ("spravce" | "kanal")[]; hodin: number } {
  /*
    Bez jediného úspěchu v posledních dvaceti bězích se počítá, jako by sběr
    nefungoval od nejstaršího z nich — přesnější číslo stejně nemáme a
    podcenit výpadek je horší než ho nadhodnotit.
  */
  const od = stav.posledniUspech ? new Date(stav.posledniUspech).getTime() : ted - PRAH_KANAL_H * 3_600_000;
  const hodin = (ted - od) / 3_600_000;
  if (hodin < PRAH_SPRAVCE_H && !stav.odmitaSe) return { komu: [], hodin };

  // Hlásí se znovu, ne pořád. Budík, který zvoní každých deset minut, se vypne.
  if (posledniHlaseni && ted - new Date(posledniHlaseni).getTime() < OPAKOVAT_PO_H * 3_600_000) {
    return { komu: [], hodin };
  }

  const komu: ("spravce" | "kanal")[] = ["spravce"];
  if (hodin >= PRAH_KANAL_H) komu.push("kanal");
  return { komu, hodin };
}

function zprava(hodin: number, stav: StavSberu, proKanal: boolean): string {
  const kdy = stav.posledniUspech
    ? new Date(stav.posledniUspech).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" })
    : "neznámo kdy";
  if (proKanal) {
    /*
      Technická zpráva, ne bezpečnostní poplach (26. 9. 2026): bez výstražných
      znaků a s výslovnou větou, že o bezpečnosti nic neříká.
    */
    return [
      "Technická zpráva CzechPatrol: sběr dat stojí",
      "",
      `Poslední úspěšné čtení zdrojů: ${kdy} (před ${Math.round(hodin)} h).`,
      "Web i tento kanál teď ukazují starší stav a nové zprávy sem nepřicházejí. O bezpečnostní situaci tahle zpráva nic neříká.",
      "",
      "Oficiální informace hledejte u HZS, ČHMÚ, obce a policie; v nouzi volejte 112.",
    ].join("\n");
  }
  return [
    "<b>Hlídač: sběr dat neběží</b>",
    "",
    `Poslední úspěšný běh: ${kdy} (před ${Math.round(hodin)} h).`,
    `Z posledních běhů skončilo chybou: ${stav.chybnych}.`,
    "",
    stav.odmitaSe
      ? "GitHub poslední tři běhy ODMÍTL spustit (skončily do 15 s bez výpisu). Téměř jistě došly minuty GitHub Actions nebo neprošla platba: https://github.com/settings/billing"
      : "Pokud běhy padají během několika sekund a bez výpisu, došly minuty GitHub Actions (Settings → Billing).",
  ].join("\n");
}

/** Celý krok hlídače: přečíst, rozhodnout, případně ohlásit a zapsat. */
export async function zkontrolujSber(env: Env, ted: number): Promise<{ ohlaseno: string[]; hodin: number } | null> {
  const stav = await stavSberu(env);
  if (!stav) return null;

  const ulozeno = await env.DB.prepare("SELECT hodnota FROM stav WHERE klic = 'hlidac-sber'").first<{ hodnota: string }>();
  const nahlaseno = ctiNahlaseno(ulozeno?.hodnota);

  const obnovit = coObnovit(stav, ted, nahlaseno);
  if (obnovit.length) {
    const kdy = new Date(stav.posledniUspech!).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" });
    for (const komu of obnovit) {
      const chat = komu === "spravce" ? env.SPRAVCE_CHAT : env.TELEGRAM_KANAL;
      if (chat) await posliTelegram(env, chat, komu === "spravce" ? `<b>Hlídač: sběr zase běží</b>\nÚspěšný běh ${kdy}.` : `Technická zpráva CzechPatrol: sběr dat zase běží (úspěšné čtení zdrojů ${kdy}).`);
    }
    // Smazat, ať se obnovení neohlásí dvakrát a příští výpadek začne načisto.
    await env.DB.prepare("DELETE FROM stav WHERE klic = 'hlidac-sber'").run();
    return { ohlaseno: obnovit.map((k) => `obnoveno:${k}`), hodin: 0 };
  }

  const rozhodnuti = coOhlasit(stav, ted, nahlaseno?.kdy ?? null);
  if (!rozhodnuti.komu.length) return { ohlaseno: [], hodin: rozhodnuti.hodin };

  const ohlaseno: string[] = [];
  for (const komu of rozhodnuti.komu) {
    const chat = komu === "spravce" ? env.SPRAVCE_CHAT : env.TELEGRAM_KANAL;
    if (!chat) continue;
    const v = await posliTelegram(env, chat, zprava(rozhodnuti.hodin, stav, komu === "kanal"));
    if (v.ok) ohlaseno.push(komu);
  }

  const kdy = new Date(ted).toISOString();
  // Komu se výpadek ohlásil — sčítá se s dřívějším, aby obnovení dostal každý, kdo slyšel o výpadku.
  const komu = [...new Set([...(nahlaseno?.komu ?? []), ...ohlaseno])] as Nahlaseno["komu"];
  await env.DB.prepare("INSERT OR REPLACE INTO stav (klic, hodnota, aktualizovano) VALUES ('hlidac-sber', ?, ?)")
    .bind(JSON.stringify({ kdy, komu } satisfies Nahlaseno), kdy)
    .run();
  return { ohlaseno, hodin: rozhodnuti.hodin };
}

/*
  Spotřeba minut: přepočet jednou za 6 h (stránkování historie běhů stojí
  až 25 požadavků), výsledek v D1. Kadenci sběru z něj čte kopniDoSberu.
*/
const PREPOCET_H = 6;

export async function kadenceSberu(env: Env): Promise<number> {
  const r = await env.DB.prepare("SELECT hodnota FROM stav WHERE klic = 'minuty'").first<{ hodnota: string }>();
  try {
    const k = r ? (JSON.parse(r.hodnota) as { kadence?: number }).kadence : undefined;
    return k && (KADENCE as readonly number[]).includes(k) ? k : KADENCE[0];
  } catch {
    return KADENCE[0];
  }
}

export async function hlidejMinuty(env: Env, ted: number): Promise<{ kadence: number; podil: number } | null> {
  if (!env.GH_TOKEN_SBER || !env.SBER_REPO) return null;
  const ulozeno = await env.DB.prepare("SELECT hodnota FROM stav WHERE klic = 'minuty'").first<{ hodnota: string }>();
  const minule = ulozeno ? (JSON.parse(ulozeno.hodnota) as { kdy: string; kadence: number; varovano: number; mesic: string }) : null;
  if (minule && ted - new Date(minule.kdy).getTime() < PREPOCET_H * 3_600_000) return null;

  const behy = await behyMesice(env.GH_TOKEN_SBER, env.SBER_REPO, ted);
  if (!behy.length) return null;
  const s = spocitejSpotrebu(behy, ted);
  const kadence = vyberKadenci(s, ted);
  const mesic = new Date(ted).toISOString().slice(0, 7);
  const varovano = minule?.mesic === mesic ? minule.varovano : 0;
  const prah = s.podil >= 0.9 ? 90 : s.podil >= 0.7 ? 70 : 0;

  if (env.SPRAVCE_CHAT && (prah > varovano || (minule && kadence !== minule.kadence))) {
    await posliTelegram(env, env.SPRAVCE_CHAT, [
      "<b>Hlídač: minuty GitHub Actions</b>",
      "",
      `Tento měsíc spotřebováno odhadem ${s.minut} z ${PRIDEL_MINUT} minut (${Math.round(s.podil * 100)} %).`,
      `Při dnešním tempu na konci měsíce: ${s.naKonciMesice} minut.`,
      kadence > KADENCE[0]
        ? `Aby sběr nestál, sbírá se teď jednou za ${kadence} minut místo za ${KADENCE[0]}. Trvalé řešení: rozpočet v https://github.com/settings/billing nebo nasazování přes Cloudflare Pages (docs/PROVOZ.md, 2b).`
        : "Sbírá se v plné kadenci.",
    ].join("\n"));
  }

  const kdy = new Date(ted).toISOString();
  await env.DB.prepare("INSERT OR REPLACE INTO stav (klic, hodnota, aktualizovano) VALUES ('minuty', ?, ?)")
    .bind(JSON.stringify({ kdy, kadence, varovano: Math.max(varovano, prah), mesic, minut: s.minut, naKonciMesice: s.naKonciMesice }), kdy)
    .run();
  return { kadence, podil: s.podil };
}
