import fs from "node:fs";
import path from "node:path";
import { ctiHtml, ctiRss, stahni } from "./nacti";
import { rozhodni, type Stazeno } from "./rozhodovani";
import { ZDROJE } from "./zdroje";
import type { Nalez, VysledekZdroje } from "./typy";

/**
 * Hodinový sběr.
 *
 * Jediné pravidlo, na kterém všechno stojí:
 *
 *   Sběrač smí sám potvrdit POUZE ZÁPOR. Když v úředních zdrojích není nic,
 *   zapíše „NE, ověřeno v <čas>“. Jakmile něco najde, hodnotu NEMĚNÍ —
 *   založí položku do fronty ke kontrole člověkem.
 *
 * Automat tedy nikdy nevyhlásí mobilizaci, stav ohrožení ani nic jiného.
 * Nejhorší, co se může stát při chybě, je zbytečná položka ve frontě.
 */

const KOREN = path.join(process.cwd(), "data");
const FRONTA = path.join(KOREN, "fronta");
const TED = new Date().toISOString();

function nactiJson<T>(soubor: string): T {
  return JSON.parse(fs.readFileSync(path.join(KOREN, soubor), "utf-8")) as T;
}

function zapisJson(soubor: string, data: unknown) {
  fs.writeFileSync(path.join(KOREN, soubor), JSON.stringify(data, null, 2) + "\n", "utf-8");
}

async function stahniVse(): Promise<Stazeno[]> {
  return Promise.all(
    ZDROJE.map(async (z): Promise<Stazeno> => {
      try {
        const { stav, telo } = await stahni(z.url);
        if (stav >= 400) {
          return { zdroj: z, ok: false, text: "", polozky: [], stav, chyba: `HTTP ${stav}` };
        }
        if (z.format === "rss") {
          const polozky = ctiRss(telo);
          return { zdroj: z, ok: true, stav, polozky, text: polozky.map((p) => `${p.nadpis} ${p.shrnuti}`).join(" ") };
        }
        return { zdroj: z, ok: true, stav, polozky: [], text: ctiHtml(telo) };
      } catch (e) {
        return { zdroj: z, ok: false, text: "", polozky: [], stav: null, chyba: String(e instanceof Error ? e.message : e) };
      }
    }),
  );
}

async function main() {
  const jenProvoz = process.argv.includes("--jen-provoz");
  fs.mkdirSync(FRONTA, { recursive: true });

  console.log(`[sber] start ${TED}`);
  const stazene = await stahniVse();

  const vysledky: VysledekZdroje[] = stazene.map((s) => ({
    klic: s.zdroj.klic,
    ok: s.ok,
    stav: s.stav,
    pocetPolozek: s.polozky.length,
    chyba: s.chyba,
  }));
  const nedostupne = vysledky.filter((v) => !v.ok);
  console.log(`[sber] zdrojů ${vysledky.length}, nedostupných ${nedostupne.length}`);

  const doFronty: Nalez[] = [];

  /* ---------- právní stav ---------- */
  if (!jenProvoz) {
    const pravni = nactiJson<{ overeno: string | null; polozky: Record<string, unknown>[] }>("pravni-stav.json");
    let potvrzeno = 0;
    for (const p of pravni.polozky) {
      const klic = p.klic as string;
      const r = rozhodni(klic, stazene);
      doFronty.push(...r.nalezy);
      if (r.ciste) {
        // Žádné vyhlášení v úředních zdrojích → zápor je ověřený.
        p.plati = false;
        p.hodnota = "NE";
        p.overeno = TED;
        potvrzeno++;
      } else if (r.nalezy.length) {
        // Něco se našlo. Hodnotu NEMĚNÍME — rozhodne člověk.
        console.log(`[sber] signál u „${klic}“ (${r.nalezy.length}) — ponecháno ke kontrole`);
      }
    }
    // Datum ověření zapisujeme jen tehdy, když se opravdu něco ověřit podařilo.
    // Jinak by web tvrdil, že proběhla kontrola, která neproběhla.
    if (potvrzeno > 0) pravni.overeno = TED;
    zapisJson("pravni-stav.json", pravni);

    /* ---------- NATO ---------- */
    const nato = nactiJson<{ overeno: string | null; polozky: Record<string, unknown>[] }>("nato.json");
    let potvrzenoNato = 0;
    for (const p of nato.polozky) {
      const klic = p.klic as string;
      if (klic === "vychodni-kridlo") continue; // dlouhodobý stav, ne automatická položka
      const r = rozhodni(klic, stazene);
      doFronty.push(...r.nalezy);
      if (r.ciste) {
        p.aktivni = false;
        p.hodnota = klic.startsWith("clanek") ? "neaktivován" : "bez veřejně oznámené změny";
        p.overeno = TED;
        potvrzenoNato++;
      }
    }
    if (potvrzenoNato > 0) nato.overeno = TED;
    zapisJson("nato.json", nato);
  }

  /* ---------- provozní dostupnost ---------- */
  const provoz = nactiJson<{ overeno: string | null; polozky: Record<string, unknown>[] }>("provoz.json");
  let potvrzenoProvoz = 0;
  for (const p of provoz.polozky) {
    const klic = p.klic as string;
    const r = rozhodni(klic, stazene);
    doFronty.push(...r.nalezy);
    if (r.ciste) {
      p.stav = "bezny";
      p.hodnota = vychoziHodnota(klic);
      p.overeno = TED;
      potvrzenoProvoz++;
    } else if (r.nalezy.length) {
      // Signál nezhoršuje stav automaticky — jen ho označí ke sledování.
      p.stav = "sledujeme";
      p.hodnota = "prověřujeme hlášení";
      p.overeno = TED;
    } else if (r.overeno.length === 0) {
      p.stav = "bez-zdroje";
      p.hodnota = "";
    }
  }
  if (potvrzenoProvoz > 0) provoz.overeno = TED;
  zapisJson("provoz.json", provoz);

  /* ---------- fronta ke kontrole ---------- */
  const den = TED.slice(0, 10);
  const souborFronty = path.join(FRONTA, `${den}.json`);
  const stavajici: Nalez[] = fs.existsSync(souborFronty)
    ? JSON.parse(fs.readFileSync(souborFronty, "utf-8"))
    : [];
  // Jedna věc se do fronty nezapíše dvakrát za den.
  const klicPolozky = (n: Nalez) => `${n.zdroj}|${n.tyka.join(",")}|${n.shody.join(",")}`;
  const znamé = new Set(stavajici.map(klicPolozky));
  const nove = doFronty.filter((n) => !znamé.has(klicPolozky(n)));
  if (nove.length) {
    fs.writeFileSync(souborFronty, JSON.stringify([...stavajici, ...nove], null, 2) + "\n", "utf-8");
  }

  fs.writeFileSync(
    path.join(FRONTA, "posledni-beh.json"),
    JSON.stringify({ kdy: TED, zdroje: vysledky, novychVeFronte: nove.length }, null, 2) + "\n",
    "utf-8",
  );

  console.log(`[sber] nových položek ve frontě: ${nove.length}`);
  if (nedostupne.length) {
    console.log("[sber] nedostupné zdroje:");
    for (const n of nedostupne) console.log(`  - ${n.klic}: ${n.chyba ?? "neznámá chyba"}`);
  }
  console.log("[sber] hotovo. Automat nic nezveřejnil — publikuje se až po lidské kontrole.");
}

function vychoziHodnota(klic: string): string {
  return {
    vycestovani: "bez mimořádného omezení",
    hranice: "běžný režim",
    palivo: "běžná dostupnost",
    elektrina: "bez stavu nouze",
    plyn: "bez stavu nouze",
    banky: "běžný provoz",
    komunikace: "bez celostátního výpadku",
    "bezny-zivot": "běžný režim",
  }[klic] ?? "běžný režim";
}

main().catch((e) => {
  console.error("[sber] selhalo:", e);
  process.exit(1);
});
