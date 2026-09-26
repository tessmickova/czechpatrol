/**
 * Čas v Europe/Prague.
 *
 * Datum bez známého času se nikdy neukazuje s vymyšleným 00:00. Záznamy
 * v datech nesou ISO datum s půlnocí UTC jen jako technický zápis — proto
 * se u nich zobrazuje jen den. Skutečný čas (ověření sběračem) se ukazuje
 * s hodinou a minutou v pražském čase včetně letního posunu.
 */

const ZONA = "Europe/Prague";

/** Má hodnota skutečný čas, nebo je to jen datum zapsané jako půlnoc UTC? */
export function maCas(iso: string): boolean {
  return !/T00:00(:00(\.0+)?)?(Z|\+00:00)$/.test(iso) && /T\d\d:\d\d/.test(iso);
}

export function datumPraha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Datum bez času bereme jako kalendářní den, ne jako okamžik — jinak by
  // půlnoc UTC v zimě spadla do předchozího dne.
  if (!maCas(iso)) {
    const [y, m, day] = iso.slice(0, 10).split("-").map(Number);
    return `${day}. ${m}. ${y}`;
  }
  const c = casti(d);
  return `${c.d}. ${c.m}. ${c.y}`;
}

export function datumCasPraha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (!maCas(iso)) return datumPraha(iso);
  const c = casti(d);
  return `${c.d}. ${c.m}. ${c.y} · ${String(c.h).padStart(2, "0")}:${String(c.mi).padStart(2, "0")}`;
}

function casti(d: Date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA, hour12: false, year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const c: Record<string, string> = {};
  for (const p of f.formatToParts(d)) c[p.type] = p.value;
  return { y: +c.year, m: +c.month, d: +c.day, h: +c.hour % 24, mi: +c.minute };
}

/** Stáří v hodinách; null pro neznámý čas. */
export function stariHodin(iso: string | null | undefined, ted = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (ted - t) / 3_600_000);
}

export type Cerstvost = "cerstve" | "starsi" | "zastarale" | "nezname" | "budoucnost";

/*
  Lhůty čerstvosti podle typu údaje.

  Jedna univerzální lhůta nedávala smysl: týdenní šetření cen paliva je po
  třech dnech pořád aktuální, kdežto provozní stav po třech dnech neříká nic.
  Každý údaj má proto vlastní okno podle toho, jak rychle se doopravdy mění.
*/
export const LHUTY = {
  /** Provozní stavy a úřední opatření — mění se v řádu hodin. */
  provoz: { cerstve: 6, starsi: 24 },
  /** Hodnocení a přehledy, které se přepočítávají denně. */
  prehled: { cerstve: 24, starsi: 72 },
  /** Týdenní šetření (ceny pohonných hmot). Nové číslo přijde jednou za týden. */
  tydenni: { cerstve: 8 * 24, starsi: 14 * 24 },
} as const;

export type Lhuta = keyof typeof LHUTY;

/**
 * Čerstvost podkladu.
 *
 * Čas z budoucnosti dostane vlastní stav, ne zelenou: je to chyba dat nebo
 * špatně nastavené hodiny a tvářit se u toho, že je všechno ověřené,
 * by bylo nejhorší možné chování. Neznámý a nečitelný čas zelený není nikdy.
 */
export function cerstvost(iso: string | null | undefined, ted = Date.now(), lhuta: Lhuta = "prehled"): Cerstvost {
  if (!iso) return "nezname";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "nezname";

  // Minutová rezerva na rozdíl hodin mezi serverem a prohlížečem.
  const hodinDopredu = (t - ted) / 3_600_000;
  if (hodinDopredu > 0.05) return "budoucnost";

  const h = Math.max(0, (ted - t) / 3_600_000);
  const l = LHUTY[lhuta];
  if (h <= l.cerstve) return "cerstve";
  if (h <= l.starsi) return "starsi";
  return "zastarale";
}

export function stariSlovy(iso: string | null | undefined, ted = Date.now()): string {
  if (iso) {
    const t = new Date(iso).getTime();
    // Čas z budoucnosti se nepřevádí na „před 0 h“ — to by vypadalo jako čerstvost.
    if (!Number.isNaN(t) && t - ted > 3 * 60_000) return "čas z budoucnosti";
  }
  const h = stariHodin(iso, ted);
  if (h === null) return "neověřeno";
  if (h < 1) return "před méně než hodinou";
  if (h < 48) return `před ${Math.round(h)} h`;
  return `před ${Math.round(h / 24)} dny`;
}

/** Jen hodiny a minuty v pražském čase. Pro pruhy, kde je na datum málo místa. */
export function casPraha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("cs-CZ", { timeZone: ZONA, hour12: false, hour: "2-digit", minute: "2-digit" }).format(d);
}

/**
 * „dnes 6:40“, „včera 22:10“, jinak „25. 9. 6:40“ — v pražském čase.
 *
 * Pro Rychlý přehled: čas kontroly musí být vidět i s dnem. Samotné
 * „06:40“ (casPraha) po výpadku přes půlnoc tvrdí, že kontrola byla dnes.
 */
export function kdyKratce(iso: string, ted = Date.now()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "neznámo kdy";
  const c = casti(d);
  const t = casti(new Date(ted));
  const vcera = casti(new Date(ted - 86_400_000));
  const hm = `${c.h}:${String(c.mi).padStart(2, "0")}`;
  if (c.y === t.y && c.m === t.m && c.d === t.d) return `dnes ${hm}`;
  if (c.y === vcera.y && c.m === vcera.m && c.d === vcera.d) return `včera ${hm}`;
  return `${c.d}. ${c.m}.${c.y !== t.y ? ` ${c.y}` : ""} ${hm}`;
}

/** „před 25 min“, „před 3 h“, „před 2 dny“ — bez zaokrouhlení na „před chvílí“. */
export function predKolika(iso: string, ted = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "neznámo kdy";
  const min = Math.round((ted - t) / 60_000);
  if (min < -3) return "čas z budoucnosti";
  if (min < 1) return "před méně než minutou";
  if (min < 90) return `před ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `před ${h} h`;
  return `před ${Math.round(h / 24)} dny`;
}
