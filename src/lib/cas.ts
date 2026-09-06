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

export type Cerstvost = "cerstve" | "starsi" | "zastarale" | "nezname";

/**
 * Čerstvost podkladu: do 24 h čerstvé, do 72 h starší, pak zastaralé.
 * Neověřené nikdy nevypadá jako čerstvé.
 */
export function cerstvost(iso: string | null | undefined, ted = Date.now()): Cerstvost {
  const h = stariHodin(iso, ted);
  if (h === null) return "nezname";
  if (h <= 24) return "cerstve";
  if (h <= 72) return "starsi";
  return "zastarale";
}

export function stariSlovy(iso: string | null | undefined, ted = Date.now()): string {
  const h = stariHodin(iso, ted);
  if (h === null) return "neověřeno";
  if (h < 1) return "před méně než hodinou";
  if (h < 48) return `před ${Math.round(h)} h`;
  return `před ${Math.round(h / 24)} dny`;
}
