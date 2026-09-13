/**
 * Doplní chybějící překlady rozhraní pro všechny jazyky.
 *
 *   node nastroje/preloz.mjs            doplní, co chybí
 *   node nastroje/preloz.mjs --jazyk pl jen jeden jazyk
 *   node nastroje/preloz.mjs --znovu    přeloží všechno znovu
 *
 * Překládá se jen to, co chybí. Jednou přeložená věta se už nesahá, takže
 * opakované spuštění nic nestojí a ruční opravu překladu nikdo nepřepíše.
 *
 * Potřebuje ANTHROPIC_API_KEY. Bez něj skončí a nic nezmění — neúplný překlad
 * se nikdy nedoplňuje odhadem, chybějící věta zůstane česky.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(koren, "data", "preklady", "ui");
const zdroj = JSON.parse(fs.readFileSync(path.join(dir, "zdroj.json"), "utf-8"));

const JAZYKY = JSON.parse(
  fs.readFileSync(path.join(koren, "data", "preklady", "jazyky.json"), "utf-8"),
);

const arg = process.argv.slice(2);
const znovu = arg.includes("--znovu");
const jenJazyk = arg.includes("--jazyk") ? arg[arg.indexOf("--jazyk") + 1] : null;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Chybí ANTHROPIC_API_KEY. Nic se nemění — nepřeložená věta zůstane česky.");
  process.exit(1);
}

const client = new Anthropic();
const Vysledek = z.object({
  polozky: z.array(z.object({ cesky: z.string(), preklad: z.string() })),
});

const POKYNY = [
  "Překládáš rozhraní českého webu, který sleduje doložené bezpečnostní incidenty v Evropě.",
  "Je to věcný, úřední tón: krátké popisky, nadpisy a tlačítka. Žádný marketing, žádné vykřičníky, žádné zdrobněliny.",
  "Zachovej délku co nejblíž originálu — jsou to popisky v rozhraní, dlouhý překlad rozbije rozvržení.",
  "Zachovej velká písmena na začátku a interpunkci na konci přesně jako v originálu.",
  "Neformátuj: žádné uvozovky navíc, žádný markdown.",
  "Zástupné značky jako {pocet} nebo %s nech beze změny a na stejném místě.",
  "CzechPatrol je název webu a nepřekládá se. NATO, EU, Telegram a názvy zemí přelož podle úzu cílového jazyka.",
  "Nepřidávej nic, co v originálu není, a nic nevynechávej.",
  "Vrať každou českou větu přesně jednou.",
].join(" ");

let celkem = 0;

for (const j of JAZYKY) {
  if (jenJazyk && j.kod !== jenJazyk) continue;

  const soubor = path.join(dir, `${j.kod}.json`);
  const stavajici = fs.existsSync(soubor) ? JSON.parse(fs.readFileSync(soubor, "utf-8")) : {};
  const chybi = znovu ? zdroj : zdroj.filter((v) => !stavajici[v]?.trim());

  if (!chybi.length) {
    console.log(`${j.kod}: úplné (${Object.keys(stavajici).length})`);
    continue;
  }

  console.log(`${j.kod} (${j.nazev}): chybí ${chybi.length}`);
  let doplneno = 0;

  for (let i = 0; i < chybi.length; i += 40) {
    const davka = chybi.slice(i, i + 40);
    try {
      const odpoved = await client.messages.parse({
        model: "claude-opus-5",
        max_tokens: 16000,
        output_config: { effort: "low", format: zodOutputFormat(Vysledek) },
        system: `${POKYNY} Cílový jazyk: ${j.nazev} (${j.kod}).`,
        messages: [{ role: "user", content: JSON.stringify(davka) }],
      });
      if (odpoved.stop_reason === "refusal" || !odpoved.parsed_output) {
        console.log(`  dávka ${i / 40 + 1}: model odmítl, přeskakuji`);
        continue;
      }
      for (const p of odpoved.parsed_output.polozky) {
        if (!p.preklad?.trim()) continue;
        stavajici[p.cesky] = p.preklad.trim();
        doplneno++;
      }
    } catch (e) {
      console.log(`  dávka ${i / 40 + 1} selhala: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Věty, které už v kódu nejsou, se ze slovníku uklidí — ať nezůstává balast.
  const zive = new Set(zdroj);
  const uklizeno = Object.fromEntries(
    Object.entries(stavajici)
      .filter(([k]) => zive.has(k))
      .sort(([a], [b]) => a.localeCompare(b, "cs")),
  );

  fs.writeFileSync(soubor, JSON.stringify(uklizeno, null, 2) + "\n", "utf-8");
  console.log(`  doplněno ${doplneno}, celkem ${Object.keys(uklizeno).length}`);
  celkem += doplneno;
}

console.log(`\nHotovo. Doplněno ${celkem} překladů.`);
