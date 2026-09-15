import fs from "node:fs";
import path from "node:path";
import { ctiHtml, ctiRss, stahni } from "./nacti";
import { rozhodni, type Stazeno } from "./rozhodovani";
import { ZDROJE } from "./zdroje";
import type { Nalez, VysledekZdroje } from "./typy";
import { lidskaZmena } from "../src/lib/archiv-text";
import { sbirejUdalosti } from "./udalosti";
import { sbirejPalivo } from "./palivo";

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
      const adresy = [z.url, ...(z.zalozniUrl ?? [])];
      let posledni: { stav: number | null; chyba: string } = { stav: null, chyba: "nezkoušeno" };
      for (const adresa of adresy) {
        try {
          const { stav, telo } = await stahni(adresa, adresa === z.url ? 3 : 1);
          if (stav >= 400) {
            posledni = { stav, chyba: `HTTP ${stav}` };
            continue;
          }
          if (adresa !== z.url) console.log(`[sber] ${z.klic}: zabrala náhradní adresa ${adresa}`);
          if (z.format === "rss") {
            const polozky = ctiRss(telo);
            return { zdroj: z, ok: true, stav, polozky, text: polozky.map((p) => `${p.nadpis} ${p.shrnuti}`).join(" ") };
          }
          return { zdroj: z, ok: true, stav, polozky: [], text: ctiHtml(telo) };
        } catch (e) {
          posledni = { stav: null, chyba: String(e instanceof Error ? e.message : e) };
        }
      }
      return { zdroj: z, ok: false, text: "", polozky: [], stav: posledni.stav, chyba: posledni.chyba };
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
  const blokujici = new Set(ZDROJE.filter((z) => z.ocekavaneBlokovani).map((z) => z.klic));
  const nedostupne = vysledky.filter((v) => !v.ok && !blokujici.has(v.klic));
  const ocekavane = vysledky.filter((v) => !v.ok && blokujici.has(v.klic));
  console.log(
    `[sber] zdrojů ${vysledky.length}, nedostupných ${nedostupne.length}` +
      (ocekavane.length ? `, blokujících automaty ${ocekavane.length} (očekávané)` : ""),
  );

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

  /* ---------- automatický sběr událostí ---------- */
  if (!jenProvoz) {
    try {
      const u = await sbirejUdalosti();
      console.log(
        `[sber] události: nových kandidátů ${u.novych}, ve frontě ${u.celkem} (s výřezem zdroje ${u.sVyrezem}), odmítnutých ${u.odmitnutych}` +
          (u.podezrelych ? `, z toho vážně vypadá ${u.podezrelych} — projít ve správě` : "") +
          (u.nedostupne.length ? `, nedostupné: ${u.nedostupne.join("; ")}` : ""),
      );
    } catch (e) {
      console.log(`[sber] sběr událostí selhal, ostatní pokračuje: ${e instanceof Error ? e.message : e}`);
    }
  }

  /* ---------- ceny pohonných hmot ---------- */
  /*
    Vlastní blok, ne součást provozní položky: cena je změřená řada, kdežto
    „dostupnost paliva" je stav ověřovaný proti úředním zdrojům. Kdyby se
    stahování rozbilo, nesmí to zablokovat zbytek sběru — proto try.
  */
  try {
    await sbirejPalivo();
  } catch (e) {
    console.log(`[sber] ceny paliv selhaly, ostatní pokračuje: ${e instanceof Error ? e.message : e}`);
  }

  /* ---------- archiv v čase ---------- */
  zapisSnimek();

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
  console.log("[sber] hotovo. Kandidáti jsou na webu označení jako neověření; do počtů vstupují až po lidské kontrole.");
}

const NAZVY_UROVNI: Record<string, string> = {
  G1: "Nízká", G2: "Nízká", G3: "Nízká",
  Y1: "Mírně zvýšená", Y2: "Střední", Y3: "Zvýšená", YO: "Zvýšená",
  O1: "Vysoká", O2: "Vysoká", O3: "Vysoká",
  R1: "Vážná", R2: "Vážná", R3: "Vážná",
};

const uroven = (u: string | null) => (u ? (NAZVY_UROVNI[u] ?? u) : "neurčeno");
const anoNe = (b: boolean | null) => (b === null ? "neověřeno" : b ? "ANO" : "NE");

/**
 * Popis změny úrovně.
 *
 * Vnitřní stupnice je jemnější než ta, kterou vidí čtenář. Když se posun
 * odehraje uvnitř jednoho pásma, nesmí se napsat „Střední → Střední“ —
 * to nic neříká a vypadá to jako chyba. Napíše se, co se opravdu stalo.
 */
function zmenaUrovne(co: string, stary: string | null, novy: string | null): string {
  const a = uroven(stary);
  const b = uroven(novy);
  return a === b ? `${co}: posun v rámci úrovně ${b}` : `${co}: ${a} → ${b}`;
}

/**
 * Uloží snímek stavu — ale jen tehdy, když se něco změnilo.
 *
 * Zapisovat každou hodinu bez ohledu na obsah by z archivu udělalo řadu
 * shodných záznamů, která budí dojem, že se pořád něco děje. Přitom by
 * znamenala pravý opak.
 */
function zapisSnimek() {
  type Snimek = {
    kdy: string;
    uroven: string | null;
    hybridni: string | null;
    primyStret: string | null;
    pravni: Record<string, boolean | null>;
    nato: Record<string, boolean | null>;
    provoz: Record<string, string>;
    udalosti: number;
    zmeny: string[];
  };

  const pravni = nactiJson<{ polozky: { klic: string; plati: boolean | null }[] }>("pravni-stav.json");
  const nato = nactiJson<{ polozky: { klic: string; aktivni: boolean | null }[] }>("nato.json");
  const provoz = nactiJson<{ polozky: { klic: string; stav: string }[] }>("provoz.json");
  const stav = nactiJson<{ uroven: string | null }>("stav.json");
  const hyb = nactiJson<{ celkem: string | null; podkategorie: { klic: string; uroven: string | null }[] }>(
    "hybridni-tlak.json",
  );
  const udalosti = nactiJson<{ lidskyOvereno: boolean }[]>("incidenty.json").filter((i) => i.lidskyOvereno).length;

  const novy: Snimek = {
    kdy: TED,
    uroven: stav.uroven,
    hybridni: hyb.celkem,
    primyStret: hyb.podkategorie.find((x) => x.klic === "primy")?.uroven ?? null,
    pravni: Object.fromEntries(pravni.polozky.map((p) => [p.klic, p.plati])),
    nato: Object.fromEntries(nato.polozky.map((p) => [p.klic, p.aktivni])),
    provoz: Object.fromEntries(provoz.polozky.map((p) => [p.klic, p.stav])),
    udalosti,
    zmeny: [],
  };

  const archiv = nactiJson<{ zacatek: string | null; snimky: Snimek[] }>("historie.json");
  const stary = archiv.snimky[archiv.snimky.length - 1];

  if (!stary) {
    novy.zmeny = ["začátek archivu"];
    zapisJson("historie.json", { zacatek: TED, snimky: [novy] });
    console.log("[sber] archiv založen");
    return;
  }

  const zmeny: string[] = [];
  if (stary.uroven !== novy.uroven) zmeny.push(zmenaUrovne("celková úroveň", stary.uroven, novy.uroven));
  if (stary.hybridni !== novy.hybridni) zmeny.push(zmenaUrovne("hybridní tlak", stary.hybridni, novy.hybridni));
  if (stary.primyStret !== novy.primyStret)
    zmeny.push(zmenaUrovne("přímý střet", stary.primyStret, novy.primyStret));
  for (const [k, v] of Object.entries(novy.pravni))
    if (stary.pravni[k] !== v) zmeny.push(lidskaZmena(`právní stav — ${k}: ${anoNe(stary.pravni[k] ?? null)} → ${anoNe(v)}`));
  for (const [k, v] of Object.entries(novy.nato))
    if (stary.nato[k] !== v) zmeny.push(lidskaZmena(`NATO — ${k}: ${anoNe(stary.nato[k] ?? null)} → ${anoNe(v)}`));
  for (const [k, v] of Object.entries(novy.provoz))
    if (stary.provoz[k] !== v) zmeny.push(lidskaZmena(`provoz — ${k}: ${stary.provoz[k] ?? "?"} → ${v}`));
  if (stary.udalosti !== novy.udalosti)
    zmeny.push(`zveřejněné události: ${stary.udalosti} → ${novy.udalosti}`);

  if (!zmeny.length) {
    console.log("[sber] beze změny, archiv se nedoplňuje");
    return;
  }

  novy.zmeny = zmeny;
  zapisJson("historie.json", {
    zacatek: archiv.zacatek ?? TED,
    snimky: [...archiv.snimky, novy],
  });
  console.log(`[sber] archiv doplněn o ${zmeny.length} změn`);
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
