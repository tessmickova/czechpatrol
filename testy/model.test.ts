import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { dostupnyPoskytovatel, strukturovane } from "../sber/model";
import { z } from "zod";

/*
  Volba poskytovatele.

  Klíče tu nejsou a nikdy nebudou — testuje se rozhodovací logika, ne volání.
  Podstatné je, že bez klíče nic nespadne: sběr dat se nesmí zastavit kvůli
  tomu, že došel kredit nebo nikdo nenastavil tajemství.
*/
const puvodni = { ...process.env };
afterEach(() => {
  process.env = { ...puvodni };
});

function nastav(env: Record<string, string | undefined>) {
  for (const k of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "POSKYTOVATEL_MODELU"]) delete process.env[k];
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
}

describe("který poskytovatel se použije", () => {
  it("bez klíče žádný", () => {
    nastav({});
    expect(dostupnyPoskytovatel()).toBeNull();
  });

  it("Anthropic má přednost, když jsou oba klíče", () => {
    nastav({ OPENAI_API_KEY: "x", ANTHROPIC_API_KEY: "y" });
    expect(dostupnyPoskytovatel()).toBe("anthropic");
  });

  it("OpenAI zůstává druhou cestou, aby se přechodem nic nerozbilo", () => {
    nastav({ OPENAI_API_KEY: "x" });
    expect(dostupnyPoskytovatel()).toBe("openai");
  });

  it("vynucení přes proměnnou prostředí platí", () => {
    nastav({ OPENAI_API_KEY: "x", ANTHROPIC_API_KEY: "y", POSKYTOVATEL_MODELU: "anthropic" });
    expect(dostupnyPoskytovatel()).toBe("anthropic");
  });

  it("vynucený poskytovatel bez svého klíče není dostupný", () => {
    // Radši nic než tiché přepnutí na druhého poskytovatele, o kterém nikdo neví.
    nastav({ ANTHROPIC_API_KEY: "y", POSKYTOVATEL_MODELU: "openai" });
    expect(dostupnyPoskytovatel()).toBeNull();
  });
});

describe("chování bez modelu", () => {
  it("vrací null místo výjimky", async () => {
    nastav({});
    const v = await strukturovane({
      system: "nic",
      vstup: [],
      schema: z.object({ a: z.string() }),
      ucel: "test",
    });
    expect(v).toBeNull();
  });
});

describe("volba modelu Anthropic", () => {
  /*
    Haiku 4.5 a Sonnet 4.5 odmítají `effort` chybou 400. Chyby se v tomhle
    modulu záměrně polykají (sběr nesmí spadnout kvůli modelu), takže by se
    taková vada projevila jen tím, že model tiše přestane fungovat. Proto
    se hlídá tady.
  */
  const BEZ_EFFORTU = /^claude-(haiku|sonnet)-4-5/;

  it("modelům 4.5 se effort neposílá", () => {
    expect(BEZ_EFFORTU.test("claude-haiku-4-5")).toBe(true);
    expect(BEZ_EFFORTU.test("claude-sonnet-4-5")).toBe(true);
  });

  it("novějším modelům se posílá dál", () => {
    expect(BEZ_EFFORTU.test("claude-opus-5")).toBe(false);
    expect(BEZ_EFFORTU.test("claude-sonnet-5")).toBe(false);
    expect(BEZ_EFFORTU.test("claude-opus-4-8")).toBe(false);
  });

  it("výchozí model je v kódu, ne v proměnné", () => {
    /* Bez klíče se nic nevolá, ale název se nemá hádat za běhu. */
    const zdroj = readFileSync(new URL("../sber/model.ts", import.meta.url), "utf-8");
    expect(zdroj).toContain('"claude-sonnet-5"');
  });

  it("nabídka ve správě a záloha v kódu se nerozejdou", () => {
    /*
      Správa nabízí pevný seznam modelů. Kdyby v něm chyběl ten, který je
      v kódu jako záloha, přepnutí na něj by po výpadku nastavení skončilo
      u modelu, který si správce nikdy nevybral.
    */
    const kod = readFileSync(new URL("../sber/model.ts", import.meta.url), "utf-8");
    const sprava = readFileSync(new URL("../api/src/nastaveni.ts", import.meta.url), "utf-8");
    const zaloha = kod.match(/ANTHROPIC_MODEL\?\.trim\(\) \|\| "([^"]+)"/)?.[1];
    expect(zaloha, "záloha modelu v sber/model.ts").toBeTruthy();
    expect(sprava, `${zaloha} chybí v nabídce správy`).toContain(`"${zaloha}"`);
  });
});
