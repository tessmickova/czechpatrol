import type { z } from "zod";

/*
  Jeden vstup k modelu pro celý projekt.

  Model se u nás používá na tři věci a všechny jsou pomocné: třídění kandidátů,
  druhé čtení odmítnutých zpráv a překlad rozhraní. Ani jedna z nich nic
  nezveřejňuje — to dělá vždycky člověk. Proto tenhle modul nikdy nevyhazuje
  výjimku ven: když model není k dispozici nebo selže, vrátí null a volající
  pokračuje bez něj. Sběr dat nesmí spadnout kvůli tomu, že došel kredit.

  Poskytovatel se bere podle toho, který klíč je nastavený. OPENAI_API_KEY má
  přednost; ANTHROPIC_API_KEY zůstává jako druhá cesta, aby se přechodem nic
  nerozbilo. Vynutit jde přes POSKYTOVATEL_MODELU=openai|anthropic.
*/

export type Poskytovatel = "openai" | "anthropic";

export function dostupnyPoskytovatel(): Poskytovatel | null {
  const vynuceny = process.env.POSKYTOVATEL_MODELU?.trim().toLowerCase();
  if (vynuceny === "openai") return process.env.OPENAI_API_KEY ? "openai" : null;
  if (vynuceny === "anthropic") return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

/*
  Který model OpenAI použít.

  Název se nehádá. Když není v OPENAI_MODEL, zeptáme se účtu, co má k dispozici,
  a vybereme první z pořadníku, který tam opravdu je. Pořadník míří na levné
  varianty — tohle je třídění šumu a překlad popisků, ne psaní záznamu.

  Kdyby se seznam nepodařilo načíst, necháme volbu na proměnné prostředí a
  řekneme to nahlas, místo abychom poslali vymyšlený název.
*/
const PORADNIK = ["gpt-5-mini", "gpt-5", "gpt-4.1-mini", "gpt-4o-mini", "gpt-4.1", "gpt-4o"];

let zvolenyModel: Promise<string | null> | null = null;

async function vyberModel(client: { models: { list: () => Promise<{ data: { id: string }[] }> } }): Promise<string | null> {
  const zEnv = process.env.OPENAI_MODEL?.trim();
  if (zEnv) return zEnv;

  try {
    const seznam = await client.models.list();
    const id = seznam.data.map((m) => m.id);
    for (const chteny of PORADNIK) {
      const nalezeny = id.find((x) => x === chteny) ?? id.find((x) => x.startsWith(`${chteny}-`));
      if (nalezeny) return nalezeny;
    }
    // Nic z pořadníku: vezmeme aspoň něco z rodiny gpt, ať to nespadne na názvu.
    const nahradni = id.filter((x) => x.startsWith("gpt-")).sort()[0];
    if (nahradni) return nahradni;
    console.log("[model] účet nenabízí žádný model gpt-*; nastav OPENAI_MODEL");
    return null;
  } catch (e) {
    console.log(`[model] seznam modelů se nepodařilo načíst (${e instanceof Error ? e.message : e}); nastav OPENAI_MODEL`);
    return null;
  }
}

export interface Zadani<T> {
  /** Pokyny, které platí pro celou dávku. */
  system: string;
  /** Data k posouzení. Serializují se do JSON. */
  vstup: unknown;
  /** Tvar odpovědi. Co se do něj nevejde, se zahodí. */
  schema: z.ZodType<T>;
  /** Jen do logu, ať je poznat, který průchod selhal. */
  ucel: string;
  /** Strop pro odpověď. Platí jen pro Anthropic; OpenAI si ho řídí samo. */
  maxTokens?: number;
}

/**
 * Jedno volání modelu se strukturovanou odpovědí.
 *
 * Vrací `null`, když model není k dispozici, odmítne odpovědět nebo selže.
 * Nikdy nevyhazuje — volající se má umět obejít bez modelu.
 */
export async function strukturovane<T>({ system, vstup, schema, ucel, maxTokens = 8000 }: Zadani<T>): Promise<T | null> {
  const kdo = dostupnyPoskytovatel();
  if (!kdo) return null;

  try {
    if (kdo === "openai") {
      const { default: OpenAI } = await import("openai");
      const { zodResponseFormat } = await import("openai/helpers/zod");
      const client = new OpenAI();

      zvolenyModel ??= vyberModel(client);
      const model = await zvolenyModel;
      if (!model) return null;

      const odpoved = await client.chat.completions.parse({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(vstup) },
        ],
        response_format: zodResponseFormat(schema, "vysledek"),
      });

      const zprava = odpoved.choices[0]?.message;
      if (zprava?.refusal) {
        console.log(`[model] ${ucel}: model odmítl odpovědět`);
        return null;
      }
      return (zprava?.parsed as T) ?? null;
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
    const client = new Anthropic();

    const odpoved = await client.messages.parse({
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5",
      max_tokens: maxTokens,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: JSON.stringify(vstup) }],
    });

    if (odpoved.stop_reason === "refusal") {
      console.log(`[model] ${ucel}: model odmítl odpovědět`);
      return null;
    }
    return (odpoved.parsed_output as T) ?? null;
  } catch (e) {
    console.log(`[model] ${ucel} selhalo: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/** Jen pro testy: zapomene zvolený model, ať se vybere znovu. */
export function zapomenModel() {
  zvolenyModel = null;
}
