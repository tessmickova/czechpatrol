import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  Vlastní dialogy místo nativních.

  Nativní alert/confirm/prompt nejdou ovlivnit: vypadají jinak na každém
  systému, nadepíšou se adresou webu a nedá se v nich vysvětlit, co se stane.
  Prohlížeč je navíc smí potlačit — potlačený confirm() vrátí false a kód
  to přečte jako „člověk odmítl", aniž by se ho kdokoli zeptal.

  Nativní dialogy WebAuthn (passkey) a instalace PWA se tímhle testem
  nehlídají, protože je vyvolává prohlížeč přes své vlastní rozhraní
  a nahradit je nelze ani nemá smysl.
*/

function souboryTsx(adresar: string): string[] {
  return readdirSync(adresar, { withFileTypes: true }).flatMap((p) => {
    const cesta = path.join(adresar, p.name);
    if (p.isDirectory()) return souboryTsx(cesta);
    return /\.tsx?$/.test(p.name) ? [cesta] : [];
  });
}

const KOREN = path.join(process.cwd(), "src");
const soubory = souboryTsx(KOREN).filter((f) => !f.endsWith(path.join("components", "dialog.tsx")));

describe("dialogy", () => {
  it("nikde se nevolá alert, confirm ani prompt", () => {
    /*
      Tečka před `prompt` je povolená: `udalost.prompt()` je metoda události
      beforeinstallprompt, tedy instalační dialog prohlížeče, ne window.prompt.
    */
    const zavadne = /(^|[^.\w])(alert|confirm|prompt)\s*\(/;
    for (const f of soubory) {
      readFileSync(f, "utf-8")
        .split("\n")
        .forEach((radek, i) => {
          /* Komentáře o tom, co se nahradilo, nejsou volání. */
          if (/^\s*(\/\/|\*|\/\*)/.test(radek)) return;
          if (zavadne.test(radek)) {
            expect.fail(`${path.relative(process.cwd(), f)}:${i + 1} volá nativní dialog: ${radek.trim()}`);
          }
        });
    }
  });

  it("dialog je dostupný z rozvržení", () => {
    /* Bez poskytovatele by useDialog spadl až za běhu, při prvním kliknutí. */
    const layout = readFileSync(path.join(KOREN, "app/layout.tsx"), "utf-8");
    expect(layout).toContain("DialogProvider");
  });

  it("dialog drží pravidlo o barvě z docs/ZNACKA.md", () => {
    /*
      Žádné tónované pozadí ani barevný rámeček. Červená smí být jen na
      hlavní akci, a ta si ji nese v TLACITKO_AKCENT.
    */
    const zdroj = readFileSync(path.join(KOREN, "components/dialog.tsx"), "utf-8");
    expect(zdroj).not.toMatch(/className="[^"]*bg-akcent\//);
    expect(zdroj).not.toMatch(/className="[^"]*border-akcent/);
    expect(zdroj).not.toMatch(/drop-shadow|text-akcent/);
  });

  it("dialog jde zavřít klávesou i bez myši", () => {
    const zdroj = readFileSync(path.join(KOREN, "components/dialog.tsx"), "utf-8");
    expect(zdroj).toContain("Escape");
    expect(zdroj).toContain('aria-modal="true"');
  });
});
