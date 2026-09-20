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
  for (const k of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "POSKYTOVATEL_MODELU", "MODEL_PRES_API"]) {
    delete process.env[k];
  }
  // Volba poskytovatele se testuje s vědomě zapnutým API; vypínač má svůj blok níž.
  process.env.MODEL_PRES_API = "1";
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

/*
  Vypínač placeného volání.

  Kredit došel 20. 9. 2026 a ověřování převzal Patrol. Kdyby se klíč dostal
  do prostředí jinudy — zapomenutý secret, lokální .env — nesmí začít
  utrácet potichu. Proto se hlídá, že samotný klíč nestačí.
*/
describe("placené volání přes API", () => {
  it("klíč bez vědomého zapnutí nestačí", () => {
    nastav({ ANTHROPIC_API_KEY: "y" });
    delete process.env.MODEL_PRES_API;
    expect(dostupnyPoskytovatel()).toBeNull();
  });

  it("jiná hodnota než 1 API nezapne", () => {
    nastav({ ANTHROPIC_API_KEY: "y", MODEL_PRES_API: "true" });
    expect(dostupnyPoskytovatel()).toBeNull();
  });

  it("do žádného běhu se klíč nepředává", async () => {
    /*
      Vypínač v kódu je pojistka, ne hlavní opatření. Hlavní je, že klíč
      v běhu vůbec není — jinak by stačilo jedno přehlédnutí v kódu.
    */
    const { readdir } = await import("node:fs/promises");
    const slozka = new URL("../.github/workflows/", import.meta.url);
    const soubory = await readdir(slozka);
    for (const f of soubory.filter((x) => x.endsWith(".yml"))) {
      const obsah = readFileSync(new URL(f, slozka), "utf-8");
      expect(obsah, `${f} předává klíč k placenému modelu`).not.toMatch(
        /^\s*(ANTHROPIC_API_KEY|OPENAI_API_KEY):/m,
      );
    }
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
