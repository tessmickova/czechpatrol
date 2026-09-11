/** První pád — pro údaj bez dne („srpen 2026“). */
const MESICE_NAZEV = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

const MESICE = [
  "ledna", "února", "března", "dubna", "května", "června",
  "července", "srpna", "září", "října", "listopadu", "prosince",
];

function d(iso: string): Date {
  return new Date(iso);
}

/** 4. 9. 2026 */
export function datum(iso: string): string {
  const x = d(iso);
  return `${x.getUTCDate()}. ${x.getUTCMonth() + 1}. ${x.getUTCFullYear()}`;
}

/** 4. září 2026 */
export function datumSlovy(iso: string): string {
  const x = d(iso);
  return `${x.getUTCDate()}. ${MESICE[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

/** 4. 9. 2026 · 13:22 — vždy absolutní čas, nikdy „před 2 hodinami“. */
export function datumCas(iso: string): string {
  const x = d(iso);
  const h = String(x.getUTCHours()).padStart(2, "0");
  const m = String(x.getUTCMinutes()).padStart(2, "0");
  return `${datum(iso)} · ${h}:${m}`;
}

/** 13:22 */
export function cas(iso: string): string {
  const x = d(iso);
  return `${String(x.getUTCHours()).padStart(2, "0")}:${String(x.getUTCMinutes()).padStart(2, "0")}`;
}

/** 31. 8. – 6. 9. */
export function rozsah(od: string, do_: string): string {
  const a = d(od), b = d(do_);
  return `${a.getUTCDate()}. ${a.getUTCMonth() + 1}. – ${b.getUTCDate()}. ${b.getUTCMonth() + 1}.`;
}

/** Skloňování: 1 signál, 2–4 signály, 5+ signálů. */
export function pocet(n: number, jeden: string, dva: string, pet: string): string {
  if (n === 1) return `${n} ${jeden}`;
  if (n >= 2 && n <= 4) return `${n} ${dva}`;
  return `${n} ${pet}`;
}

/**
 * Datum u zdroje.
 *
 * Některé zdroje mají doložený jen měsíc vydání, u některých starších ani
 * ten. Vypíše se tedy přesně to, co je doložené — domyslet si první den
 * nebo první měsíc jen proto, aby údaj vypadal přesně, by bylo horší než
 * přiznat, že přesnější datum nemáme.
 */
export function datumZdroje(iso: string): string {
  if (/^\d{4}$/.test(iso)) return iso;
  const m = /^(\d{4})-(\d{2})$/.exec(iso);
  if (m) return `${MESICE_NAZEV[Number(m[2]) - 1]} ${m[1]}`;
  return datum(iso);
}
