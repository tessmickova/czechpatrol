import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  Spolehlivost odkazů (26. 9. 2026): klik musí vést tam, kam má.

  Z kódu se vyberou všechny interní odkazy (href=, kam=, href: "…") a každý
  musí vést na existující stránku přímo — ne na smazanou adresu (5 odkazů
  na /opravy/ vedlo do správy), ne přes přesměrování (zbytečný skok a
  u /cr/ → /#opatreni i riziko, že kotva chybí) a z veřejné části nikdy
  do /sprava/.
*/
const KOREN = process.cwd();
const soubory = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? soubory(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });

const trasy = soubory(path.join(KOREN, "src/app"))
  .filter((f) => /[\\/]page\.tsx$/.test(f) || /[\\/]route\.ts$/.test(f))
  .map((f) => path.relative(path.join(KOREN, "src/app"), path.dirname(f)).split(path.sep).filter(Boolean));
const presmerovane = new Set(
  fs.readFileSync(path.join(KOREN, "public/_redirects"), "utf-8").split("\n")
    .filter((r) => r.trim() && !r.startsWith("#")).map((r) => r.trim().split(/\s+/)[0].replace(/\/$/, "")).filter((z) => !z.includes("*")),
);

function existuje(cesta: string): boolean {
  const casti = cesta.split("/").filter(Boolean);
  if (!casti.length) return true;
  if (fs.existsSync(path.join(KOREN, "public", ...casti))) return true;
  return trasy.some((t) => t.length === casti.length && t.every((s, i) => s.startsWith("[") ? true : casti[i] !== "[x]" && s === casti[i]));
}

// Za cestou může následovat ${…} (odkaz s proměnnou, např. /incident/${slug}/) — pak se počítá o úsek víc.
const VZOR = /(?:href|kam)=\{?["'`](\/[^"'`#?{}$\s]*)(\$\{)?|href:\s*["'`](\/[^"'`#?{}$\s]*)(\$\{)?/g;
const odkazy = soubory(path.join(KOREN, "src")).flatMap((f) => {
  const text = fs.readFileSync(f, "utf-8");
  return [...text.matchAll(VZOR)].map((m) => {
    const cesta = (m[1] ?? m[3]) as string;
    const promenna = Boolean(m[2] ?? m[4]);
    return { soubor: path.relative(KOREN, f), cesta: promenna ? `${cesta.replace(/\/?$/, "/")}[x]` : cesta };
  });
});
/*
  Výjimky s důvodem: odkaz do správy v menu se vykreslí jen správci
  (u.role === "admin" v postranni-panel.tsx).
*/
const VYJIMKY = new Set(["src/components/postranni-panel.tsx: /sprava/"]);
const verejne = odkazy.filter((o) => !/sprava|[\\/]spa[\\/]/.test(o.soubor) && !VYJIMKY.has(`${o.soubor}: ${o.cesta}`));

describe("interní odkazy", () => {
  it("našly se (jinak by test nic nehlídal)", () => {
    expect(verejne.length).toBeGreaterThan(50);
  });
  it("vedou na existující stránku", () => {
    expect(verejne.filter((o) => !existuje(o.cesta)).map((o) => `${o.soubor}: ${o.cesta}`)).toEqual([]);
  });
  it("nevedou přes přesměrování", () => {
    expect(verejne.filter((o) => presmerovane.has(o.cesta.replace(/\/$/, ""))).map((o) => `${o.soubor}: ${o.cesta}`)).toEqual([]);
  });
  it("z veřejné části nevedou do správy", () => {
    expect(verejne.filter((o) => o.cesta.startsWith("/sprava")).map((o) => `${o.soubor}: ${o.cesta}`)).toEqual([]);
  });
});
