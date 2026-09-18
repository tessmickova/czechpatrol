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
  const data = (await r.json()) as { workflow_runs?: { conclusion: string | null; run_started_at: string }[] };
  const behy = data.workflow_runs ?? [];
  if (!behy.length) return null;
  const uspech = behy.find((b) => b.conclusion === "success");
  return {
    posledniUspech: uspech ? uspech.run_started_at : null,
    chybnych: behy.filter((b) => b.conclusion === "failure").length,
  };
}

/**
 * Rozhodne, co se má stát. Oddělené od odesílání, aby se to dalo otestovat
 * bez sítě — na hlídači, který se spustí jednou za měsíc, se ručně zkoušet nedá.
 */
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
  if (hodin < PRAH_SPRAVCE_H) return { komu: [], hodin };

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
    return [
      "<b>Sběr dat neběží</b>",
      "",
      `Poslední úspěšné čtení zdrojů: ${kdy} (před ${Math.round(hodin)} h).`,
      "Web i tento kanál do odvolání ukazují starý stav. Nová zpráva sem nedorazí.",
      "",
      "Nespoléhejte se zatím na tento kanál. V nouzi volejte 112, oficiální informace dává krizové vysílání Českého rozhlasu.",
    ].join("\n");
  }
  return [
    "<b>Hlídač: sběr dat neběží</b>",
    "",
    `Poslední úspěšný běh: ${kdy} (před ${Math.round(hodin)} h).`,
    `Z posledních běhů skončilo chybou: ${stav.chybnych}.`,
    "",
    "Pokud běhy padají během několika sekund a bez výpisu, došly minuty GitHub Actions (Settings → Billing).",
  ].join("\n");
}

/** Celý krok hlídače: přečíst, rozhodnout, případně ohlásit a zapsat. */
export async function zkontrolujSber(env: Env, ted: number): Promise<{ ohlaseno: string[]; hodin: number } | null> {
  const stav = await stavSberu(env);
  if (!stav) return null;

  const ulozeno = await env.DB.prepare("SELECT hodnota FROM stav WHERE klic = 'hlidac-sber'").first<{ hodnota: string }>();
  const rozhodnuti = coOhlasit(stav, ted, ulozeno?.hodnota ?? null);
  if (!rozhodnuti.komu.length) return { ohlaseno: [], hodin: rozhodnuti.hodin };

  const ohlaseno: string[] = [];
  for (const komu of rozhodnuti.komu) {
    const chat = komu === "spravce" ? env.SPRAVCE_CHAT : env.TELEGRAM_KANAL;
    if (!chat) continue;
    const v = await posliTelegram(env, chat, zprava(rozhodnuti.hodin, stav, komu === "kanal"));
    if (v.ok) ohlaseno.push(komu);
  }

  const kdy = new Date(ted).toISOString();
  await env.DB.prepare("INSERT OR REPLACE INTO stav (klic, hodnota, aktualizovano) VALUES ('hlidac-sber', ?, ?)")
    .bind(kdy, kdy)
    .run();
  return { ohlaseno, hodin: rozhodnuti.hodin };
}
