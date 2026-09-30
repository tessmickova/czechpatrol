/*
  Kopnutí do sběru dat na GitHubu.

  Proč to dělá worker a ne GitHub sám: událost `schedule` na GitHub Actions je
  „best effort". Dokumentace přímo přiznává, že se při zátěži zpožďuje a část
  naplánovaných běhů se zahodí. V praxi nám z hodinového sběru zbyl jeden běh
  zhruba za čtyři a půl hodiny. Worker má vlastní, nezávislý plánovač, takže
  výpadek plánovače GitHubu ho nepoloží.

  GitHubí `schedule` v sber.yml zůstává jako záloha. Dva nezávislé plánovače
  jsou spolehlivější než jeden; když oba trefí stejné okno, sběr se díky
  skupině souběhu zařadí do fronty a jen zjistí, že není co commitnout.
*/
import type { Env } from "./typy";

/**
 * Jak často chceme sbírat. Tik workeru chodí po deseti minutách.
 *
 * Od 19. 9. 2026 jednou za hodinu, dřív dvakrát. Repozitář je soukromý a
 * tam se každý běh na GitHubu účtuje z měsíčního přídělu 2 000 minut.
 * Půlhodinový sběr se do přídělu nevejde ani po zeštíhlení úloh; hodinový
 * ano. Je to vědomá výměna: zpráva se na web dostane nejpozději za hodinu
 * místo za půlhodiny.
 */
const KAZDYCH_MINUT = 60;

/**
 * Je tenhle tik ten, ve kterém se sbírá?
 *
 * Okno je desetiminutové, ne přesná minuta: tik může dorazit s malým
 * zpožděním a kvůli pár sekundám nechceme sběr vynechat na celou hodinu.
 *
 * Počítá se z minut od počátku epochy, ne z minut v rámci hodiny.
 * Původní `getUTCMinutes() % kazdychMinut` fungovalo jen pro hodnoty menší
 * než 60: minuta je vždycky 0–59, takže pro 120 vycházel zbytek stejně jako
 * pro 60 a sbíralo se dál každou hodinu. Bylo to schované, dokud byla
 * kadence 30 — a přitom je zpomalení sběru jediná páka, kterou na spotřebu
 * minut bez placení máme. Takhle funguje pro libovolný interval.
 */
export function maSeSbirat(cas: number, kazdychMinut = KAZDYCH_MINUT): boolean {
  return Math.floor(cas / 60_000) % kazdychMinut < 10;
}

export interface VysledekSberu {
  spusteno: boolean;
  duvod?: string;
}

/** Spustí workflow sběru přes GitHub API. Nic nečeká, jen předá štafetu. */
export async function kopniDoSberu(env: Env, cas: number, kazdychMinut = KAZDYCH_MINUT): Promise<VysledekSberu> {
  // Kadenci může hlídač minut prodloužit, aby příděl vydržel do konce měsíce (api/src/minuty.ts).
  if (!maSeSbirat(cas, kazdychMinut)) return { spusteno: false, duvod: "není čas" };

  // Bez tokenu se nic neděje a nic to nerozbije — sběr pak jede jen na
  // GitHubím plánovači, tedy jako dřív.
  if (!env.GH_TOKEN_SBER) return { spusteno: false, duvod: "není nastaven GH_TOKEN_SBER" };

  const repo = env.SBER_REPO;
  if (!repo) return { spusteno: false, duvod: "není nastaven SBER_REPO" };
  const soubor = env.SBER_WORKFLOW ?? "sber.yml";

  return spustWorkflow(env.GH_TOKEN_SBER, repo, soubor);
}

async function spustWorkflow(token: string, repo: string, soubor: string, vstupy?: Record<string, string>): Promise<VysledekSberu> {
  const odpoved = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${soubor}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      // GitHub API bez tohohle hlavičkového údaje odmítá požadavky.
      "user-agent": "czechpatrol-api",
    },
    body: JSON.stringify(vstupy ? { ref: "main", inputs: vstupy } : { ref: "main" }),
  });

  if (odpoved.status === 204) return { spusteno: true };

  // Tělo chyby se vypisuje do logu, ne ven — může obsahovat podrobnosti
  // o repozitáři, které do veřejné odpovědi nepatří.
  const text = await odpoved.text().catch(() => "");
  return { spusteno: false, duvod: `GitHub odpověděl ${odpoved.status}${text ? `: ${text.slice(0, 200)}` : ""}` };
}

/** Hodina a minuta v Praze — letní i zimní čas řeší databáze časových pásem, ne my. */
export function prazskyCas(cas: number): { hodina: number; minuta: number } {
  const casti = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(cas));
  const cislo = (typ: string) => Number(casti.find((c) => c.type === typ)?.value ?? 0);
  return { hodina: cislo("hour"), minuta: cislo("minute") };
}

/** Tik plánovače (každých 10 minut), ve kterém se spouští přehled: 7:30 a 19:30 pražského času. */
export function jeCasPrehledu(cas: number): boolean {
  const { hodina, minuta } = prazskyCas(cas);
  return (hodina === 7 || hodina === 19) && minuta >= 30 && minuta < 40;
}

/*
  Přehled v 7:30 a 19:30 spouští worker (29. 9. 2026). Plánovač GitHubu
  běh zdržel o čtyři hodiny a večerní přehled přišel ve 23:28. Worker se
  trefí na deset minut; naplánované běhy GitHubu zůstávají jako záloha
  a opožděný běh rozhlas sám zahodí (nastroje/rozhlas.mjs, jeCasPrehledu).
  Dvojí odeslání hlídá stav rozhlasu: přehled s daným klíčem odejde jednou.
*/
export async function kopniDoRozhlasu(env: Env, cas: number): Promise<VysledekSberu> {
  if (!jeCasPrehledu(cas)) return { spusteno: false, duvod: "není čas" };
  if (!env.GH_TOKEN_SBER || !env.SBER_REPO) return { spusteno: false, duvod: "není nastaven GH_TOKEN_SBER nebo SBER_REPO" };
  return spustWorkflow(env.GH_TOKEN_SBER, env.SBER_REPO, "rozhlas.yml", { prehled: "true", planovany: "true" });
}
