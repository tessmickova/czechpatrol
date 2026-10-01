/*
  Bezpečnost na internetu v Česku (1. 10. 2026, přání provozovatelky).

  Útoky přetížením webů (DDoS), vlny podvodných zpráv a výpadky služeb —
  srozumitelně pro seniora i dítě. Sběr (sber/kyber.ts) čte jen veřejné
  zprávy úřadů a médií přes RSS; nic neskenuje, na nic se nepřipojuje
  a robots.txt dodržuje. Downdetector se nečte: jeho podmínky automatické
  stahování zakazují. Výpadek, o kterém Downdetector píše, se k nám dostane
  přes média, která ho citují.

  Všechno tady jsou čisté funkce: stejné pravidlo pro web, pro sběr
  i pro Telegram, otestované na papíře.
*/

export type DruhKyber = "ddos" | "podvod" | "vypadek" | "utok";
export type StavKyber = "klid" | "pozor" | "utok";

export interface ZpravaKyber {
  id: string;
  druh: DruhKyber;
  titulek: string;
  vydavatel: string | null;
  odkaz: string;
  kdy: string;
  /** Hlásí to úřad (NÚKIB, CSIRT, policie, ČNB, ministerstvo), ne médium. */
  uredni: boolean;
}

export interface SnimekKyber {
  aktualizovano: string | null;
  /** Kdy se naposledy podařilo přečíst aspoň jeden zdroj. */
  nacteno: string | null;
  stav: StavKyber;
  zpravy: ZpravaKyber[];
}

/** Úřady, jejichž varování má vlastní váhu. Pozná se podle vydavatele v titulku Google News. */
const URADY = /\b(NÚKIB|Národní úřad pro kybernetickou|CSIRT|Policie ČR|Policie České republiky|policie\.cz|ČNB|Česká národní banka|Ministerstvo vnitra|Ministerstvo|vláda ČR|gov\.cz)\b/i;

const PRAVIDLA: [DruhKyber, RegExp][] = [
  ["ddos", /\bddos|přetěž|zahlcen|noname0?57|ddosia/i],
  ["podvod", /podvod|phishing|smishing|vishing|falešn[áéýí]|podvrž|scam|spoofing|vydáv(á|ají|al|ali) se za/i],
  ["vypadek", /výpad|nefunguj|nedostupn|downdetector|nejde (se )?přihlásit/i],
  ["utok", /kybernetick|hacker|ransomware|únik dat|uniklo|napaden/i],
];

/** Zpráva se týká Česka: česká instituce, firma, město nebo .cz. */
const CESKO = /česk|\bčr\b|\.cz\b|praha|praze|brn[oě]|ostrav|plzn|olomouc|liber|kraj|ministerst|úřad|bank|policie|núkib|csirt|čez|české dráhy|letiště|nemocnic|seznam|o2|t-mobile|vodafone/i;

/** Titulek z Google News: „Titulek - Vydavatel“. */
export function rozdelTitulek(nadpis: string): { titulek: string; vydavatel: string | null } {
  const m = nadpis.match(/^(.*\S)\s+[-–—]\s+([^-–—]{2,60})$/);
  return m ? { titulek: m[1].trim(), vydavatel: m[2].trim() } : { titulek: nadpis.trim(), vydavatel: null };
}

export function druhZpravy(text: string): DruhKyber | null {
  for (const [druh, vzor] of PRAVIDLA) if (vzor.test(text)) return druh;
  return null;
}

const klicTitulku = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);

/**
 * Z položek RSS udělá zprávy: jen české, jen o útocích, podvodech a výpadcích,
 * jen posledních 7 dní, bez duplicit (stejný titulek z více dotazů).
 */
export function vyberZpravy(polozky: { nadpis: string; odkaz: string; publikovano: string | null; shrnuti?: string }[], ted: number): ZpravaKyber[] {
  const videno = new Set<string>();
  const vysledek: ZpravaKyber[] = [];
  for (const p of polozky) {
    if (!p.publikovano || !/^https:\/\//.test(p.odkaz)) continue;
    const kdy = new Date(p.publikovano).getTime();
    if (!(kdy <= ted + 3_600_000 && ted - kdy <= 7 * 86_400_000)) continue;
    const { titulek, vydavatel } = rozdelTitulek(p.nadpis);
    const text = `${titulek} ${p.shrnuti ?? ""}`;
    const druh = druhZpravy(text);
    if (!druh) continue;
    if (!CESKO.test(`${text} ${vydavatel ?? ""}`)) continue;
    const klic = klicTitulku(titulek);
    if (!klic || videno.has(klic)) continue;
    videno.add(klic);
    vysledek.push({ id: klic.replace(/ /g, "-").slice(0, 60), druh, titulek: titulek.slice(0, 200), vydavatel, odkaz: p.odkaz, kdy: new Date(kdy).toISOString(), uredni: URADY.test(vydavatel ?? "") });
  }
  return vysledek.sort((a, b) => b.kdy.localeCompare(a.kdy)).slice(0, 30);
}

/**
 * Stav pro banner. Schválně opatrný — jeden článek poplach nedělá:
 * - „utok“: úřad hlásí útok nebo přetížení (72 h), nebo o přetěžování
 *   českých webů píšou aspoň dva různí vydavatelé (48 h),
 * - „pozor“: aspoň dvě zprávy o útocích nebo podvodech (72 h), nebo
 *   varování úřadu před podvody,
 * - jinak „klid“.
 */
export function stavKyber(zpravy: ZpravaKyber[], ted: number): StavKyber {
  const za = (h: number) => zpravy.filter((z) => ted - new Date(z.kdy).getTime() <= h * 3_600_000);
  const z72 = za(72);
  const ddos48 = za(48).filter((z) => z.druh === "ddos");
  const vydavatelu = new Set(ddos48.map((z) => z.vydavatel ?? z.odkaz)).size;
  if (z72.some((z) => z.uredni && (z.druh === "ddos" || z.druh === "utok")) || vydavatelu >= 2) return "utok";
  const vazne = z72.filter((z) => z.druh !== "vypadek");
  if (vazne.length >= 2 || z72.some((z) => z.uredni && z.druh === "podvod")) return "pozor";
  return "klid";
}

/* ---------- Texty pro lidi. Krátké věty, žádná odborná slova bez vysvětlení. ---------- */

export const NADPIS_STAVU: Record<StavKyber, string> = {
  klid: "Internet v Česku: bez hlášených útoků",
  pozor: "Internet v Česku: zvýšená pozornost",
  utok: "Internet v Česku: probíhá vlna útoků",
};

export const VETA_STAVU: Record<StavKyber, string> = {
  klid: "Úřady ani média teď nehlásí útoky na české weby ani vlnu podvodů.",
  pozor: "Objevují se zprávy o podvodech nebo útocích na weby. Buďte opatrnější u zpráv, které spěchají.",
  utok: "Některé weby úřadů a firem se teď mohou načítat pomalu nebo vůbec. Vaše peníze ani data tím ohrožené nejsou — weby jsou jen přetížené. Podvodníci ale zmatku rádi využívají.",
};

export const CO_TO_JE: Record<DruhKyber, { slovo: string; vysvetleni: string }> = {
  ddos: { slovo: "Přetížení webu", vysvetleni: "Na web míří záplava falešných návštěv, takže chvíli nejde otevřít. Data neunikají. Zkuste to později." },
  podvod: { slovo: "Podvodné zprávy", vysvetleni: "Zpráva se tváří jako banka, úřad, dopravce nebo známý. Chce peníze, kód nebo kliknutí na odkaz." },
  vypadek: { slovo: "Výpadek služby", vysvetleni: "Služba nefunguje. Nemusí jít o útok — často je to technická porucha." },
  utok: { slovo: "Kybernetický útok", vysvetleni: "Někdo napadl počítače firmy nebo úřadu. Řiďte se tím, co oznámí sami." },
};

export const TIPY_KYBER = [
  "Banka, policie ani úřad po vás nikdy nechtějí heslo, PIN ani kód z SMS.",
  "Když zpráva spěchá nebo straší, zastavte se. Spěch je znak podvodu.",
  "Pochybujete? Zavolejte bance nebo blízkému sami — na číslo, které znáte.",
] as const;

export const ZDROJE_KYBER_POPIS = "Úřady (NÚKIB, CSIRT.CZ, Policie ČR, ČNB) a česká média, automaticky přes Google News. Jen veřejné zprávy, nic neskenujeme.";
