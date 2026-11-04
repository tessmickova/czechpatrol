/*
  Bezpečnost na internetu v Česku (1. 10. 2026, přání provozovatelky).

  Útoky přetížením webů (DDoS), vlny podvodných zpráv a výpadky služeb —
  srozumitelně pro seniora i dítě. Sběr (sber/kyber.ts) čte jen veřejné
  zprávy úřadů a médií z jejich vlastních kanálů; nic neskenuje, na nic se nepřipojuje
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

/*
  Druh zprávy: klíčové slovo A ZÁROVEŇ souvislost s internetem. Obecné
  zpravodajské kanály jsou plné „podvodníků“ u soudu, výpadků proudu
  a přetížených nemocnic — to do banneru o internetu nepatří.
*/
const INTERNET = /internet|online|e-?shop|on-line|web|stránk|server|aplikac|e-?mail|sms|zpráv[auy]? |odkaz|účt|bankovnictv|messenger|whatsapp|facebook|instagram|telegram|sociální síť|kyber|hacker|data|digitáln|platební kart|mobil|telefon/i;

const PRAVIDLA: [DruhKyber, RegExp, RegExp | null][] = [
  ["ddos", /\bddos|noname0?57|ddosia|(přetěž|přetíž|zahlcen|zahlt)\S*\s+(\S+\s+){0,3}(web|server|stránk|portál|internet)/i, null],
  ["podvod", /phishing|smishing|vishing|spoofing|podvodn[éáýíou]\S*\s+(\S+\s+){0,2}(sms|e-?mail|zpráv|hovor|web|stránk|odkaz|aplikac|reklam|inzer)|falešn\S*\s+(\S+\s+){0,2}(sms|e-?mail|zpráv|web|stránk|bank|e-?shop|profil|účet)|vydáv(á|ají|al|ali) se za/i, INTERNET],
  /* Výpadek jen jako výpadek služby: „výpadek/nefunguje/nedostupné“ těsně u webu, aplikace, bankovnictví, sítě… („systém pokut nefunguje“ neprojde). */
  ["vypadek", /downdetector|nejde (se )?přihlásit|(výpad\S*|nefunguj\S*|nedostupn\S*)\s+(\S+\s+){0,2}(web|internet|aplikac|bankovnictv|plateb|karet|sít[ěi]|signál|mobiln|e-?mail|datov|portál|server|služb)|(web|internet|aplikac|bankovnictví|síť|signál|portál|server)\S*\s+(\S+\s+){0,2}(nefunguj|nedostupn|má výpadek|vypadl)/i, null],
  ["utok", /kybernetick\S*\s+útok|kyberútok|hacker|ransomware|únik\S*\s+(\S+\s+){0,2}dat/i, null],
];

/** Zpráva se týká Česka: česká instituce, firma, město nebo .cz. */
const CESKO = /česk|\bčr\b|\.cz\b|praha|praze|brn[oě]|ostrav|plzn|olomouc|liber|kraj|ministerst|úřad|bank|policie|núkib|csirt|čez|české dráhy|letiště|nemocnic|seznam|o2|t-mobile|vodafone/i;

/** Titulek z Google News: „Titulek - Vydavatel“. */
export function rozdelTitulek(nadpis: string): { titulek: string; vydavatel: string | null } {
  const m = nadpis.match(/^(.*\S)\s+[-–—]\s+([^-–—]{2,60})$/);
  return m ? { titulek: m[1].trim(), vydavatel: m[2].trim() } : { titulek: nadpis.trim(), vydavatel: null };
}

export function druhZpravy(text: string): DruhKyber | null {
  for (const [druh, vzor, souvislost] of PRAVIDLA) if (vzor.test(text) && (!souvislost || souvislost.test(text))) return druh;
  return null;
}

const klicTitulku = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);

/**
 * Z položek RSS udělá zprávy: jen české, jen o útocích, podvodech a výpadcích,
 * jen posledních 7 dní, bez duplicit (stejný titulek z více dotazů).
 */
export interface PolozkaKyber {
  nadpis: string;
  odkaz: string;
  publikovano: string | null;
  shrnuti?: string;
  /** Název zdroje, když ho nenese titulek (přímý kanál média nebo úřadu). */
  zdroj?: string;
  /** Zdroj je úřad (NÚKIB, policie, ministerstvo). */
  uredniZdroj?: boolean;
}

export function vyberZpravy(polozky: PolozkaKyber[], ted: number): ZpravaKyber[] {
  const videno = new Set<string>();
  const vysledek: ZpravaKyber[] = [];
  for (const p of polozky) {
    if (!p.publikovano || !/^https:\/\//.test(p.odkaz)) continue;
    const kdy = new Date(p.publikovano).getTime();
    if (!(kdy <= ted + 3_600_000 && ted - kdy <= 7 * 86_400_000)) continue;
    const rozdeleny = p.zdroj ? { titulek: p.nadpis.trim(), vydavatel: p.zdroj } : rozdelTitulek(p.nadpis);
    const { titulek, vydavatel } = rozdeleny;
    /*
      Druh jen podle titulku (1. 10. 2026). Shrnutí v obecných kanálech
      nese úvod celého článku a slova z něj dělala falešné výpadky
      („heslo do BIOSu“, „systém pokut nefunguje“). Shrnutí slouží jen
      k poznání, že jde o Česko.
    */
    const text = titulek;
    const druh = druhZpravy(text);
    if (!druh) continue;
    if (!CESKO.test(`${text} ${p.shrnuti ?? ""} ${vydavatel ?? ""}`)) continue;
    const klic = klicTitulku(titulek);
    if (!klic || videno.has(klic)) continue;
    videno.add(klic);
    vysledek.push({ id: klic.replace(/ /g, "-").slice(0, 60), druh, titulek: titulek.slice(0, 200), vydavatel, odkaz: p.odkaz, kdy: new Date(kdy).toISOString(), uredni: p.uredniZdroj === true || URADY.test(vydavatel ?? "") });
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

export const ZDROJE_KYBER_POPIS = "Úřady (NÚKIB, Policie ČR, Ministerstvo vnitra) a česká média z jejich vlastních kanálů. Jen veřejné zprávy, nic neskenujeme.";

/* ---------- souhrn zprávy: co a kde ---------- */

/*
  Box Internet v Česku (4. 11. 2026, provozovatelka): místo počtu zpráv
  krátké názvy toho, co se děje — „útok na krevní banky“, „útok na chlazení
  v obchodech“ — a vždy s vlajkou, aby bylo na první pohled vidět, že jde
  o Francii nebo Belgii, ne o Česko. Čisté funkce nad titulkem; co nejde
  poznat, zůstane obecné („kybernetický útok“) a bez vlajky.
*/
const ZEME_V_TITULKU: [RegExp, string][] = [
  [/česk|\bčr\b|\bprah[ay]|\bpraze|\bbrn[oě]|ostrav|plzn|olomouc|liberec|\.cz\b|\bčez\b|české dráhy|núkib|rohlík|čvut|\balbert/i, "CZ"],
  [/franc/i, "FR"], [/belgi/i, "BE"], [/švéd/i, "SE"], [/lucembur/i, "LU"], [/nizozem|holand/i, "NL"], [/irsk/i, "IE"], [/itál|italsk/i, "IT"],
  [/polsk/i, "PL"], [/němec|berlín/i, "DE"], [/rakous/i, "AT"], [/slovensk/i, "SK"], [/maďar/i, "HU"], [/estonsk/i, "EE"], [/lotyš/i, "LV"],
  [/litv|litev/i, "LT"], [/finsk/i, "FI"], [/dánsk/i, "DK"], [/norsk/i, "NO"], [/španěl/i, "ES"], [/portugal/i, "PT"], [/rumun/i, "RO"],
  [/bulhar/i, "BG"], [/británi|britsk|londýn/i, "GB"], [/ukrajin/i, "UA"], [/\brusk|\brusko|moskv/i, "RU"], [/\busa\b|americ|spojené státy/i, "US"],
  [/čín/i, "CN"], [/\bkldr\b|severokorej/i, "KP"], [/tchaj/i, "TW"], [/evrop|\beu\b|unie/i, "EU"],
];
/* Země zmíněná jako původce („podezření padá na KLDR“) není místo události. */
const PUVODCE_PRED = /(podezření padá na|stál[ao]? za|stojí za|skupina|hackeři z|hackeři)\s+[^.]{0,25}$/i;

export function zemeZpravy(titulek: string): string | null {
  let nej: { i: number; kod: string } | null = null;
  for (const [re, kod] of ZEME_V_TITULKU) {
    const m = re.exec(titulek);
    if (!m) continue;
    if (PUVODCE_PRED.test(titulek.slice(0, m.index))) continue;
    if (!nej || m.index < nej.i) nej = { i: m.index, kod };
  }
  return nej?.kod ?? null;
}

/* Cíl útoku: čtvrtý pád pro „útok na …“, první pád pro ostatní druhy. Pořadí rozhoduje — užší dřív. */
const CILE: [RegExp, string, string][] = [
  [/krevní bank/i, "krevní banky", "krevní banky"],
  [/chlad|mraz|lednic/i, "chlazení v obchodech", "chlazení v obchodech"],
  [/varov/i, "varovné aplikace", "varovné aplikace"],
  [/burz|kryptoměn|bitcoin/i, "kryptoměnovou burzu", "kryptoměnová burza"],
  [/supermark|obchod|řetězc|řetězec|prodejn|regál|rohlík|albert/i, "obchody", "obchody"],
  [/nemocnic|zdravotn|pacient/i, "nemocnici", "nemocnice"],
  [/čvut|univerzit|vysoké škol/i, "univerzitu", "univerzita"],
  [/škol/i, "školy", "školy"],
  [/letišt/i, "letiště", "letiště"],
  [/bankovnictv|\bbank/i, "banky", "banky"],
  [/úřad|ministerstv|magistrát|radnic|\bkraj|vlád/i, "úřady", "úřady"],
  [/energet|elektr|plyn|\bčez\b/i, "energetiku", "energetika"],
  [/doprav|dráh|vlak|letadl/i, "dopravu", "doprava"],
  [/rozhlas|televiz|médi|redakc/i, "média", "média"],
  [/discord|sociální sí|facebook|instagram|telegram/i, "sociální síť", "sociální síť"],
  [/starlink|satelit|připojení|operátor/i, "připojení", "připojení"],
  [/aplikac/i, "aplikaci", "aplikace"],
  [/\bdat\b|data|údaj|únik/i, "data", "data"],
  [/\bweb|stránk|portál|server/i, "weby", "weby"],
];
const PODVOD: [RegExp, string][] = [
  [/e-?mail/i, "podvodné e-maily"], [/\bsms/i, "podvodné SMS"], [/hovor|telefon|volaj/i, "podvodné hovory"], [/e-?shop/i, "falešné e-shopy"],
  [/inzer|bazar/i, "podvodné inzeráty"], [/investi|kryptoměn/i, "investiční podvody"],
];

export function coZpravy(z: Pick<ZpravaKyber, "druh" | "titulek">): string {
  const t = z.titulek;
  if (z.druh === "podvod") return PODVOD.find(([re]) => re.test(t))?.[1] ?? "podvodné zprávy";
  const cil = CILE.find(([re]) => re.test(t));
  if (z.druh === "utok") return cil ? `útok na ${cil[1]}` : "kybernetický útok";
  if (z.druh === "ddos") return cil ? `přetížené weby: ${cil[2]}` : "přetížené weby";
  return cil ? `výpadek: ${cil[2]}` : "výpadek služby";
}

export interface RadekInternetu { kodZeme: string | null; co: string; pocet: number }

/** Krátké řádky do boxu: táž věc z více redakcí jednou, s počtem; nejvýš `max`. */
export function radkyInternetu(zpravy: readonly Pick<ZpravaKyber, "druh" | "titulek" | "kdy">[], max = 3): RadekInternetu[] {
  const mapa = new Map<string, RadekInternetu>();
  for (const z of [...zpravy].sort((a, b) => b.kdy.localeCompare(a.kdy))) {
    const kodZeme = zemeZpravy(z.titulek);
    const co = coZpravy(z);
    const klic = `${kodZeme ?? "?"}|${co}`;
    const r = mapa.get(klic) ?? { kodZeme, co, pocet: 0 };
    r.pocet += 1;
    mapa.set(klic, r);
  }
  return [...mapa.values()].slice(0, max);
}
