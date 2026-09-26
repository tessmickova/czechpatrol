import type { OficialniNastroj } from "./typy";
import { OFFLINE_MAPY, type OfflineMapa } from "../config/odkazy-ven";

/*
  Skóre digitální připravenosti.

  Počítá se jen z odpovědí, které dal člověk sám (mám / nemám / nevím),
  a jen nad doporučenými položkami. Web nevidí do telefonu a nepředstírá
  to. „Nevím" se nepočítá jako „mám": nejistota není připravenost.
*/

export type Odpoved = "mam" | "nemam" | "nevim";
export type Odpovedi = Record<string, Odpoved>;

export const KLIC_ULOZISTE = "czechpatrol:pripravenost:v1";

export const NAZVY_KATEGORII: Record<OficialniNastroj["kategorie"], string> = {
  tisen: "Tísňová pomoc",
  pocasi: "Počasí",
  cestovani: "Cestování",
  "mistni-varovani": "Místní varování",
  zdravi: "Zdraví",
  "krizove-informace": "Krizové informace",
};

export const PORADI_KATEGORII: OficialniNastroj["kategorie"][] = ["tisen", "mistni-varovani", "krizove-informace", "pocasi", "cestovani", "zdravi"];

export function skorePripravenosti(nastroje: OficialniNastroj[], odpovedi: Odpovedi): { mam: number; celkem: number; chybi: string[]; nevim: string[] } {
  const doporucene = nastroje.filter((n) => n.doporuceno);
  const mam = doporucene.filter((n) => odpovedi[n.id] === "mam");
  return {
    mam: mam.length,
    celkem: doporucene.length,
    chybi: doporucene.filter((n) => odpovedi[n.id] === "nemam").map((n) => n.id),
    nevim: doporucene.filter((n) => !odpovedi[n.id] || odpovedi[n.id] === "nevim").map((n) => n.id),
  };
}

/** Věta pod skóre. Bez hodnocení člověka — jen co chybí. */
export function vetaKeSkore(s: ReturnType<typeof skorePripravenosti>): string {
  if (!s.celkem) return "Zatím žádná doporučená položka.";
  if (s.mam === s.celkem) return "Máte všechny doporučené služby.";
  const chybi = s.chybi.length;
  const nevim = s.nevim.length;
  const casti: string[] = [];
  if (chybi) casti.push(`${chybi === 1 ? "Chybí vám jedna doporučená služba" : chybi < 5 ? `Chybí vám ${chybi} doporučené služby` : `Chybí vám ${chybi} doporučených služeb`}`);
  if (nevim) casti.push(`${nevim === 1 ? "jednu zatím nemáte zaškrtnutou" : `${nevim} zatím nemáte zaškrtnuté`}`);
  return `${casti.join(", ")}.`;
}

/** Načtení odpovědí z prohlížeče. Když úložiště nefunguje, začíná se od nuly — bez chyby. */
export function nactiOdpovedi(): Odpovedi {
  try {
    const s = localStorage.getItem(KLIC_ULOZISTE);
    if (!s) return {};
    const o = JSON.parse(s) as Record<string, unknown>;
    const out: Odpovedi = {};
    for (const [k, v] of Object.entries(o)) if (v === "mam" || v === "nemam" || v === "nevim") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export function ulozOdpovedi(o: Odpovedi): boolean {
  try {
    localStorage.setItem(KLIC_ULOZISTE, JSON.stringify(o));
    return true;
  } catch {
    return false;
  }
}

/*
  Další dvě části dotazníku (23. 9. 2026): lékárnička a typy událostí.

  Stejné odpovědi mám / nemám / nevím, stejné úložiště v prohlížeči, nikam
  se neposílají. Nejsou to zdravotní ani bezpečnostní rady — jen otázky,
  na které si člověk odpoví sám. Složení lékárničky patří lékárníkovi
  nebo lékaři, postupy pro jednotlivé události úřadům; web na ně odkazuje.
*/
export interface OtazkaDotazniku {
  id: string;
  nazev: string;
  /** Upřesnění pod názvem, ne pokyn. */
  upresneni?: string;
  /** Doporučené aplikace (offline mapy) — odkazy do obchodů, důvod po najetí. */
  aplikace?: OfflineMapa[];
  /** Odkaz pod položkou: zdroj doporučení (ven) nebo stránka webu. */
  odkaz?: { nazev: string; url: string };
}

/*
  Zdroje doporučení (26. 9. 2026). Položky níž nejsou naše zdravotní ani
  bezpečnostní rady: každá stojí na doporučení úřadu nebo odborné komory.
*/
const ZDROJ = {
  hzsZavazadlo: { nazev: "HZS ČR — evakuační zavazadlo", url: "https://hzscr.gov.cz/clanek/evakuacni-zavazadlo-i.aspx" },
  autolekarnicka: { nazev: "vyhláška 341/2014 Sb. — povinná autolékárnička", url: "https://www.zakonyprolidi.cz/cs/2014-341" },
  lekarnici: { nazev: "Česká lékárnická komora — domácí lékárnička", url: "https://lekarnici.cz/wp-content/uploads/2023/07/TI_Jak-na-domaci-lekarnicku_doporuceni-lekarniku.pdf" },
  lekarniciVraceni: { nazev: "Česká lékárnická komora — prošlé léky do lékárny", url: "https://lekarnici.cz/je-jen-jeden-spravny-zpusob-jak-se-zbavit-nepouzitelnych-leku-odnest-je-do-lekarny/" },
};

/*
  Samozřejmosti (26. 9. 2026): co zná a má každý — tísňové linky, sirény,
  krizové vysílání, základ lékárničky. V průvodci nejsou jako položky
  k odškrtnutí; zmíní se jednou větou v kroku (ZMINKY), bez balastu.
*/
export const SAMOZREJME = new Set(["tisnove-linky", "sireny-jsvv", "krizove-vysilani"]);

export function nastrojeDoPruvodce<T extends { id: string }>(n: T[]): T[] {
  return n.filter((x) => !SAMOZREJME.has(x.id));
}

export const ZMINKY: Record<string, string> = {
  tisen: "Tísňové linky 112, 150, 155 a 158 znáte — tady jen to, co navíc.",
  "mistni-varovani": "Sirény zkouší každou první středu v měsíci ve 12:00; při skutečném poplachu zapněte rádio nebo televizi.",
  "krizove-informace": "Při mimořádné události vysílá krizové informace Český rozhlas a Česká televize.",
  lekarnicka: "Lékárnička, která opravdu pomůže: nejdřív věci na zastavení krvácení a ochranu zraněného, pak léky. Lékárníci doporučují ji procházet dvakrát ročně.",
  odbery: "Když vypadne proud nebo síť, zprávy vám nepřijdou samy — jen tam, kde je máte předem nastavené.",
  offline: "Když vypadne signál, telefon ukáže jen to, co v něm už je.",
};

/*
  Zprávy a rádio (26. 9. 2026, na přání provozovatelky): odběry, čtečky
  a rádio. Krizové vysílání samo je samozřejmost (ZMINKY), ale bez rádia
  na baterie ho při výpadku proudu a sítě neuslyšíte.
*/
export const ODBERY: OtazkaDotazniku[] = [
  { id: "odb-radio", nazev: "Rádio na baterie nebo s kličkou (FM)", upresneni: "při výpadku proudu a mobilní sítě zachytí krizové vysílání Českého rozhlasu; mějte i náhradní baterie", odkaz: ZDROJ.hzsZavazadlo },
  { id: "odb-urady", nazev: "Zprávy úřadů ve čtečce nebo aplikaci", upresneni: "RSS kanály nebo účty HZS ČR, ČHMÚ a Policie ČR ve čtečce či aplikaci — zprávy přijdou samy, nemusíte je hledat" },
  { id: "odb-czechpatrol", nazev: "Upozornění CzechPatrol", upresneni: "ověřené zprávy o bezpečnosti v Telegramu nebo e-mailem; varování úřadů nenahrazuje", odkaz: { nazev: "jak se přihlásit", url: "/odber/" } },
];

export const BEZ_SIGNALU: OtazkaDotazniku[] = [
  { id: "off-svitilna", nazev: "Svítilna a náhradní baterie", upresneni: "ne jen telefon — ten budete potřebovat na zprávy a volání", odkaz: ZDROJ.hzsZavazadlo },
  { id: "off-powerbanka", nazev: "Nabitá powerbanka", upresneni: "dobijte ji po každém použití" },
  { id: "off-mapa", nazev: "Offline mapa svého kraje v telefonu", upresneni: "stáhněte ji předem — bez signálu se nová nenačte", aplikace: OFFLINE_MAPY },
  { id: "off-kontakty", nazev: "Důležitá čísla a adresy i na papíře", upresneni: "rodina, lékař, místo setkání — telefon se může vybít" },
];

/*
  Lékárnička podrobně (26. 9. 2026, na přání provozovatelky: „aby
  zachraňovala reálně“). Pořadí podle toho, co zachraňuje život: krvácení,
  dýchání, prochladnutí — položky z povinné autolékárničky (vyhláška
  341/2014 Sb.) — pak léky podle doporučení lékárníků a nakonec kontrola
  trvanlivosti. Postupy první pomoci web nepopisuje; na to je kurz.
*/
export const LEKARNICKA: OtazkaDotazniku[] = [
  { id: "lek-skrtidlo", nazev: "Škrtidlo", upresneni: "na silné krvácení z končetiny; je i v povinné autolékárničce", odkaz: ZDROJ.autolekarnicka },
  { id: "lek-obvazy", nazev: "Sterilní obvazy, krytí na rány a obinadla", upresneni: "hotové obvazy na zastavení krvácení tlakem, víc než jeden kus" },
  { id: "lek-rukavice", nazev: "Jednorázové rukavice a resuscitační rouška", upresneni: "ochrana vás i zraněného; obojí je v autolékárničce", odkaz: ZDROJ.autolekarnicka },
  { id: "lek-folie", nazev: "Izotermická (záchranná) fólie", upresneni: "proti prochladnutí zraněného" },
  { id: "lek-drobnosti", nazev: "Trojcípý šátek, nůžky, pinzeta, náplasti a dezinfekce" },
  { id: "lek-leky", nazev: "Léky na horečku a bolest, proti průjmu a výplach očí", upresneni: "pro děti ve vhodné formě (sirup, čípky) — poradí lékárník", odkaz: ZDROJ.lekarnici },
  { id: "lek-pravidelne", nazev: "Pravidelně užívané léky a pomůcky na několik dní dopředu" },
  { id: "lek-seznam", nazev: "Seznam léků, alergií a kontaktů na lékaře", upresneni: "pro každého člena domácnosti, i na papíře" },
  { id: "lek-prvni-pomoc", nazev: "Základy první pomoci", upresneni: "kurz nebo aplikace Záchranka" },
  { id: "lek-expirace", nazev: "Lékárnička zkontrolovaná za posledního půl roku", upresneni: "prošlé léky a obvazy vyměňte; prošlé léky vraťte do kterékoli lékárny, ne do koše", odkaz: ZDROJ.lekarniciVraceni },
];

export const UDALOSTI: OtazkaDotazniku[] = [
  { id: "udal-proud", nazev: "Výpadek elektřiny na několik hodin až dní" },
  { id: "udal-voda", nazev: "Výpadek pitné vody" },
  { id: "udal-site-platby", nazev: "Výpadek internetu, mobilní sítě nebo plateb kartou" },
  { id: "udal-povoden", nazev: "Povodeň nebo přívalový déšť" },
  { id: "udal-vedro", nazev: "Extrémní vedro" },
  { id: "udal-mraz", nazev: "Silný mráz nebo sněhová kalamita" },
  { id: "udal-pozar", nazev: "Požár v domě nebo v okolí" },
  { id: "udal-latka", nazev: "Únik nebezpečné látky", upresneni: "sirény, ukrytí v budově" },
  { id: "udal-evakuace", nazev: "Evakuace z domova", upresneni: "evakuační zavazadlo, kam jít" },
  { id: "udal-utocnik", nazev: "Útok ve veřejném prostoru", upresneni: "jak se zachovat a komu volat" },
];

/** Kolik otázek je zodpovězeno a kolik „mám". „Nevím" je odpověď, ale ne připravenost. */
export function souhrnOtazek(ids: string[], odpovedi: Odpovedi): { zodpovezeno: number; mam: number; celkem: number; hotovo: boolean } {
  const zodpovezeno = ids.filter((id) => odpovedi[id]).length;
  return { zodpovezeno, mam: ids.filter((id) => odpovedi[id] === "mam").length, celkem: ids.length, hotovo: ids.length > 0 && zodpovezeno === ids.length };
}
