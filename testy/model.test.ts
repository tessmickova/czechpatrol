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

  it("OpenAI má přednost, když jsou oba klíče", () => {
    nastav({ OPENAI_API_KEY: "x", ANTHROPIC_API_KEY: "y" });
    expect(dostupnyPoskytovatel()).toBe("openai");
  });

  it("Anthropic zůstává druhou cestou, aby se přechodem nic nerozbilo", () => {
    nastav({ ANTHROPIC_API_KEY: "y" });
    expect(dostupnyPoskytovatel()).toBe("anthropic");
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
