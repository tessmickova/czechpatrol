/*
  Shoda dvou nezávislých hodnotitelů (metodika v2, plán ověření).
  Procento shody a Cohenova kappa: kolik shody je nad rámec náhody.
  Prázdná hodnota u kteréhokoli z dvojice se nepočítá.
*/
export interface ShodaPole { pole: string; parovych: number; shoda: number; kappa: number | null; neshody: { id: string; a: string; b: string }[] }

export function cohenKappa(a: readonly string[], b: readonly string[]): number | null {
  const pary = a.map((x, i) => [x, b[i]] as const).filter(([x, y]) => x !== "" && y !== "" && x !== undefined && y !== undefined);
  if (!pary.length) return null;
  const n = pary.length;
  const po = pary.filter(([x, y]) => x === y).length / n;
  const kategorie = new Set(pary.flatMap(([x, y]) => [x, y]));
  let pe = 0;
  for (const k of kategorie) pe += (pary.filter(([x]) => x === k).length / n) * (pary.filter(([, y]) => y === k).length / n);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

export function shodaPole(pole: string, radkyA: readonly Record<string, string>[], radkyB: readonly Record<string, string>[]): ShodaPole {
  const podleId = new Map(radkyB.map((r) => [r.id, r]));
  const a: string[] = [];
  const b: string[] = [];
  const neshody: ShodaPole["neshody"] = [];
  for (const r of radkyA) {
    const s = podleId.get(r.id);
    if (!s || !(r[pole] ?? "").trim() || !(s[pole] ?? "").trim()) continue;
    a.push(r[pole].trim());
    b.push(s[pole].trim());
    if (r[pole].trim() !== s[pole].trim()) neshody.push({ id: r.id, a: r[pole].trim(), b: s[pole].trim() });
  }
  return { pole, parovych: a.length, shoda: a.length ? (a.length - neshody.length) / a.length : 0, kappa: cohenKappa(a, b), neshody };
}
