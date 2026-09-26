import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  Výkon (26. 9. 2026): klientská komponenta nesmí ani přes prostředníka
  naimportovat src/lib/data.ts ani velké datové soubory. Stalo se to
  u urgentni.tsx a dashboard.tsx — telefon pak stahoval všech 155 záznamů
  jako 437 kB skriptu na každé stránce (LCP 2,8 s, INP 300 ms).
  `import type` nevadí: do prohlížeče nejde.
*/
const KOREN = process.cwd();
const ZAKAZANE = [path.join(KOREN, "src/lib/data.ts")];
const VELKE_DATA = /data[\\/](incidenty|historie|kandidati|kampane|nepotvrzeno|svet|navrhy|fronta[\\/]odmitnute)\.json$/;

function vyres(z: string, spec: string): string | null {
  let zaklad: string;
  if (spec.startsWith("@/")) zaklad = path.join(KOREN, "src", spec.slice(2));
  else if (spec.startsWith(".")) zaklad = path.resolve(path.dirname(z), spec);
  else return null;
  for (const k of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) if (fs.existsSync(zaklad + k) && fs.statSync(zaklad + k).isFile()) return zaklad + k;
  return null;
}

function hodnotoveImporty(f: string): string[] {
  const t = fs.readFileSync(f, "utf-8");
  return [...t.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm)]
    .map((m) => vyres(f, m[1])).filter((x): x is string => Boolean(x));
}

function cesta(start: string): string[] | null {
  const videno = new Set<string>();
  const fronta: string[][] = [[start]];
  while (fronta.length) {
    const c = fronta.shift()!;
    const f = c[c.length - 1];
    if (videno.has(f)) continue;
    videno.add(f);
    if (ZAKAZANE.includes(f) || VELKE_DATA.test(f)) return c;
    if (!/\.tsx?$/.test(f)) continue;
    for (const d of hodnotoveImporty(f)) fronta.push([...c, d]);
  }
  return null;
}

const soubory = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? soubory(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
const klientske = soubory(path.join(KOREN, "src"))
  .filter((f) => /^\s*["']use client["']/.test(fs.readFileSync(f, "utf-8")))
  .filter((f) => !/[\\/]sprava|[\\/]spa[\\/]/.test(f));

describe("klientské komponenty nenesou data celého webu", () => {
  it("našly se", () => expect(klientske.length).toBeGreaterThan(20));
  it("žádná nevede k data.ts ani k velkým JSON", () => {
    const spatne = klientske.map((f) => cesta(f)).filter((c): c is string[] => Boolean(c)).map((c) => c.map((x) => path.relative(KOREN, x)).join(" → "));
    expect(spatne).toEqual([]);
  });
});
