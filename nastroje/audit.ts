/**
 * Denní audit fronty: co z nasbíraného je opravdu nová událost.
 *
 *   npm run audit            projde frontu a připraví návrhy
 *   npm run audit -- --sucho nic nezapíše, jen vypíše, co by udělal
 *
 * Proč to existuje
 * ----------------
 * Mezi „zachycený titulek" a „záznam na webu" chyběl krok. Sběr dá do fronty
 * holé titulky; zveřejněný záznam musí mít fakta, zdroje a lidské ověření.
 * Ten krok dělaly denní rutiny, které ale nikdy nefungovaly — běžely
 * v prostředí bez přístupu k repozitáři. Poslední zveřejněný záznam je proto
 * z 13. 9. 2026, zatímco kandidáti přibývají dál.
 *
 * Tenhle audit dělá tutéž práci tam, kde věci fungují: v GitHub Actions,
 * nad frontou v repozitáři a s klíčem, který tam už je.
 *
 * Pravidla, která si nese z research handoffu (CLAUDE_DAILY_PROMPT.md)
 * -------------------------------------------------------------------
 * - Nový článek o známé věci NENÍ nová událost.
 * - Datum události není datum publikace ani datum nové atribuce.
 * - Závažnost, jistota a bezprostřednost jsou tři různé věci.
 * - Původce se nepřipisuje, dokud to nepotvrdí úřední závěr.
 * - Co není doložené, se napíše jako nedoložené — nedomýšlí se.
 *
 * Co audit NEDĚLÁ
 * ---------------
 * Nezveřejňuje. Výsledkem je návrh v data/navrhy.json, který čeká na člověka
 * (`npm run spravce navrhy`). Model tu třídí a připravuje; rozhoduje člověk.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { dostupnyPoskytovatel, strukturovane } from "../sber/model";

const koren = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cesta = (...c: string[]) => path.join(koren, ...c);
const cti = <T>(p: string, zaloha: T): T => {
  try {
    return JSON.parse(fs.readFileSync(cesta(p), "utf-8")) as T;
  } catch {
    return zaloha;
  }
};

/*
  Kolik kandidátů se pošle modelu naráz.

  Nejde jen o cenu. Druhý zdroj vzniká tím, že model najde dvě zprávy o téže
  události — a to může jen tehdy, když obě dorazí v jedné dávce. Při dvanácti
  se z osmdesáti kandidátů v okně potkaly málokdy a audit nevyrobil nic.
  Strop zůstává, aby ve zpravodajsky divoký den nevznikl obří dotaz.
*/
const NARAZ = 60;
/*
  Jak staré kandidáty má smysl posuzovat.

  Pro denní provoz stačí čtyři dny: starší zprávy už nejsou aktuality a nemá
  cenu na ně utrácet model. Jenže fronta, která se nahromadila, je celá starší
  — z 250 čekajících bylo v okně čtyř dnů šest. Úklidový běh proto potřebuje
  okno širší a nastavuje se přes AUDIT_DNI.
*/
const DNI = Math.min(60, Math.max(1, Number(process.env.AUDIT_DNI) || 4));

interface Kandidat {
  id: string;
  zachyceno: string;
  publikovano: string | null;
  titulek: string;
  shrnuti: string;
  kodZeme: string | null;
  zeme: string | null;
  kategorie: string[];
  zdroj: { nazev: string; url: string; typ: string; primarni: boolean };
  vyrez?: { text: string } | null;
  naliehave?: { druh: string } | null;
  stav: "ceka" | "vyrizen";
  vyrizeni?: { kdy: string; duvod: string; patriK: string | null; poznamka: string | null } | null;
}

const Posouzeni = z.object({
  polozky: z.array(
    z.object({
      id: z.string(),
      /** Je to nová věc, nebo jen další článek o něčem, co už evidujeme? */
      novaUdalost: z.boolean(),
      /** Proč — jednou větou, ať se dá rozhodnutí přečíst a nesouhlasit s ním. */
      duvod: z.string(),
      /** Slug existujícího záznamu, když jde o pokračování. */
      duplikatSlugu: z.string().nullable(),
      titulekCs: z.string(),
      /** Ověřitelná fakta z textu. Žádné domýšlení. */
      fakta: z.array(z.string()),
      /** Co z textu NEPLYNE a chybí k tomu doklad. */
      nedolozeno: z.array(z.string()),
      /** Kdy se to stalo (YYYY-MM-DD), podle textu. null = z textu to neplyne. */
      datumUdalosti: z.string().nullable(),
      /** Id dalších zachycených zpráv o TÉŽE události — druhý a další zdroj. */
      dalsiId: z.array(z.string()),
      kodZeme: z.string().nullable(),
      druh: z.enum(["pripad", "opatreni", "reakce", "neurceno"]),
      zavaznost: z.enum(["G1", "G2", "G3", "Y1", "Y2", "Y3", "O1", "O2", "O3", "R1", "R2", "R3"]),
      jistota: z.enum(["nizka", "stredni", "vysoka", "potvrzeno"]),
    }),
  ),
});

const POKYNY = [
  "Jsi pomocník bezpečnostního přehledu pro Česko. Posuzuješ zachycené zprávy a rozhoduješ, co je nová událost.",
  "",
  "Pravidla, která musíš dodržet:",
  "- Nový článek o známé věci NENÍ nová událost. Když jde o pokračování, vyplň duplikatSlugu.",
  "- Do duplikatSlugu patří VÝHRADNĚ slug ze seznamu znameZaznamy (např. nemecko-zeleznice-2022). Nikdy tam nedávej id zachycené zprávy (to, co začíná k-) — na spojení dvou zachycených zpráv je dalsiId. Když se nehodí žádný slug ze seznamu, dej null.",
  "- Datum události není datum publikace ani datum nové atribuce. Do datumUdalosti piš datum, kdy se to stalo, ve tvaru RRRR-MM-DD. Když se z textu určit nedá, dej null — nehádej podle data článku.",
  "- Do fakt piš jen to, co je v textu doložené. Nic nedomýšlej a nic nedopočítávej.",
  "- Původce (kdo to udělal) nepiš jako fakt, dokud to nepotvrdil úřední závěr. Podezření patří do nedolozeno.",
  "- Závažnost, jistota a bezprostřednost jsou tři různé věci. Zpravodajská spekulace není vysoká jistota.",
  "- Stupnice závažnosti: G = nízká, Y = střední, O = vysoká, R = vážná. Běžná zahraniční zpráva bez dopadu na Česko je G nebo Y.",
  "- Když je text kusý a nedá se z něj nic doložit, dej novaUdalost=false a napiš to do duvod.",
  "- Když tutéž událost hlásí víc zachycených zpráv, vyber jednu hlavní, ostatní jejich id vypiš do jejího dalsiId a u těch ostatních dej novaUdalost=false. Jedna událost = jedna položka s více zdroji.",
  "",
  "Odpovídej česky. Titulek je věcný: co se stalo a kde.",
].join("\n");

/**
 * Proč z posouzené zprávy vznikne nebo nevznikne návrh.
 *
 * Odděleně od zbytku, protože tohle je celé rozhodování auditu a má se dát
 * otestovat bez volání modelu.
 */
export function trideni(
  p: { novaUdalost: boolean; duplikatSlugu: string | null; fakta: string[] },
  znameSlugy: Set<string>,
): { duplikat: string | null; neznamySlug: string | null; zahozeno: string | null } {
  /*
    Slug na pokračování musí existovat. Když model ukáže na záznam, který tu
    není, je to vymyšlený údaj — a ten nesmí potichu zahodit návrh.
  */
  const duplikat = p.duplikatSlugu && znameSlugy.has(p.duplikatSlugu) ? p.duplikatSlugu : null;
  const neznamySlug = p.duplikatSlugu && !duplikat ? p.duplikatSlugu : null;

  /*
    Důvod se zapisuje vždy. Dřív se nikam nezapisoval a report hlásil
    „posouzeno 12, návrhů 0" bez vysvětlení — což vypadalo stejně jako porucha.

    Prázdný seznam nedoloženého návrh nebrzdí: zpráva, u které je všechno
    doložené, je ten nejlepší případ, ne důvod k zahození.
  */
  let zahozeno: string | null = null;
  if (!p.novaUdalost) zahozeno = "není nová událost";
  else if (duplikat) zahozeno = `pokračování záznamu ${duplikat}`;
  else if (!p.fakta.length) zahozeno = "z textu neplyne žádné doložené faktum";

  return { duplikat, neznamySlug, zahozeno };
}

/**
 * Zdroje návrhu: hlavní zachycená zpráva a další hlášení téže události.
 *
 * Táž zpráva se do sběru dostane i dvakrát (přetisk, agregátor), proto se
 * shoduje podle adresy — jinak by dva otisky jednoho článku vypadaly jako
 * dvě nezávislá hlášení a pravidlo o dvou zdrojích by bylo jen na oko.
 */
export function zdrojeNavrhu(
  kandidati: { titulek: string; publikovano?: string | null; zachyceno: string; zdroj: { nazev: string; url: string; primarni: boolean } }[],
): { nazev: string; url: string; typ: string; publikovano: string; primarni: boolean; jazyk: string }[] {
  const videnaUrl = new Set<string>();
  return kandidati
    .filter((z) => !videnaUrl.has(z.zdroj.url) && videnaUrl.add(z.zdroj.url))
    .map((z) => ({
      nazev: `${z.zdroj.nazev} — ${z.titulek}`.slice(0, 120),
      url: z.zdroj.url,
      typ: "media",
      publikovano: `${(z.publikovano ?? z.zachyceno).slice(0, 10)}T00:00:00Z`,
      primarni: z.zdroj.primarni,
      jazyk: "cs",
    }));
}

async function main() {
  const sucho = process.argv.includes("--sucho");

  /*
    Nasucho se nesmí sáhnout na data. Dřív tudy prošly i krátké reporty
    (chybí model, není co posuzovat) a zkušební běh přepsal výsledek
    skutečného běhu.
  */
  const zapisReport = (r: Record<string, unknown>) => {
    if (sucho) {
      console.log(`[audit] nasucho: report by byl ${JSON.stringify(r)}`);
      return;
    }
    fs.mkdirSync(cesta("data/fronta"), { recursive: true });
    fs.writeFileSync(cesta("data/fronta/audit.json"), `${JSON.stringify(r, null, 2)}\n`);
  };
  const poskytovatel = dostupnyPoskytovatel();

  if (!poskytovatel) {
    /*
      Chybějící model není chyba auditu, ale nesmí vypadat jako úspěch.
      Workflow tuhle návratovou hodnotu pozná a pošle hlášku správci.
    */
    console.log("[audit] MODEL NEDOSTUPNÝ — není nastaven ANTHROPIC_API_KEY ani OPENAI_API_KEY");
    zapisReport({ kdy: new Date().toISOString(), stav: "model-nedostupny", posouzeno: 0, navrhu: 0 });
    process.exit(3);
  }

  const kandidati = cti<Kandidat[]>("data/kandidati.json", []);
  const incidenty = cti<{ slug: string; titulek: string; zdroje: { url: string }[] }[]>("data/incidenty.json", []);
  const navrhy = cti<{ id: string; zdroje?: { url: string }[] }[]>("data/navrhy.json", []);

  const zname = new Set(incidenty.flatMap((i) => i.zdroje.map((z) => z.url)));
  const uzNavrzene = new Set(navrhy.flatMap((n) => (n.zdroje ?? []).map((z) => z.url)));
  const hranice = Date.now() - DNI * 86_400_000;

  const kPosouzeni = kandidati
    /*
      Jen to, co ještě čeká.
      
      Bez tohohle filtru audit posuzoval i zprávy, které sám dřív odepsal:
      rozpočet modelu padl na tutéž práci dokola a fronta se skoro nehýbala —
      24 posouzených, a ubyla jedna položka.
    */
    .filter((k) => k.stav === "ceka")
    .filter((k) => !zname.has(k.zdroj.url) && !uzNavrzene.has(k.zdroj.url))
    .filter((k) => new Date(k.publikovano ?? k.zachyceno).getTime() >= hranice)
    // Naléhavé napřed, pak nejnovější: když je rozpočet malý, ať padne na to podstatné.
    .sort((a, b) =>
      Number(Boolean(b.naliehave)) - Number(Boolean(a.naliehave)) ||
      (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, NARAZ);

  console.log(`[audit] poskytovatel ${poskytovatel}, k posouzení ${kPosouzeni.length} z ${kandidati.length}`);
  if (!kPosouzeni.length) {
    zapisReport({ kdy: new Date().toISOString(), stav: "nic-noveho", posouzeno: 0, navrhu: 0 });
    return;
  }

  const vysledek = await strukturovane({
    system: POKYNY,
    vstup: {
      znameZaznamy: incidenty.slice(-40).map((i) => ({ slug: i.slug, titulek: i.titulek })),
      kandidati: kPosouzeni.map((k) => ({
        id: k.id,
        titulek: k.titulek,
        shrnuti: k.shrnuti,
        publikovano: k.publikovano,
        zeme: k.zeme,
        kodZeme: k.kodZeme,
        zdroj: k.zdroj.nazev,
        text: (k.vyrez?.text ?? "").slice(0, 2500),
      })),
    },
    schema: Posouzeni,
    ucel: "denní audit fronty",
    maxTokens: 16000,
  });

  if (!vysledek) {
    /* Model je nastavený, ale nevrátil nic. To je porucha, ne klid. */
    console.log("[audit] MODEL SELHAL — volání nevrátilo výsledek");
    zapisReport({ kdy: new Date().toISOString(), stav: "model-selhal", posouzeno: 0, navrhu: 0 });
    process.exit(4);
  }

  const podleId = new Map(kPosouzeni.map((k) => [k.id, k]));
  const znameSlugy = new Set(incidenty.map((i) => i.slug));
  const nove: unknown[] = [];
  const prehled: unknown[] = [];

  for (const p of vysledek.polozky) {
    const k = podleId.get(p.id);
    if (!k) continue;

    const { duplikat, neznamySlug, zahozeno } = trideni(p, znameSlugy);

    prehled.push({
      id: p.id,
      titulek: p.titulekCs,
      novaUdalost: p.novaUdalost,
      duvod: p.duvod,
      duplikatSlugu: duplikat,
      neznamySlug,
      zahozeno,
    });
    if (zahozeno) continue;

    const kdyZachyceno = (k.publikovano ?? k.zachyceno).slice(0, 10);
    /*
      Datum události není datum článku — to je jedno ze základních pravidel
      projektu. Když ho model z textu nevyčte, nevyplní se potichu datem
      zveřejnění: zůstane tu, ale člověk se o tom dozví z neznameho.
    */
    const datumZTextu = /^\d{4}-\d{2}-\d{2}$/.test(p.datumUdalosti ?? "") ? p.datumUdalosti! : null;
    const kdy = datumZTextu ?? kdyZachyceno;
    const neznameho = datumZTextu
      ? p.nedolozeno
      : [...p.nedolozeno, `Datum události se z textu určit nedá. Uvedeno datum zveřejnění (${kdyZachyceno}) — ověřit.`];

    /*
      Jeden zdroj nestačí — to platí v celém projektu, u záznamů i u právě
      ověřovaných. Druhý zdroj je jiná zachycená zpráva o téže události;
      model je spojuje přes dalsiId.
    */
    const zdroje = zdrojeNavrhu([k, ...p.dalsiId.map((id) => podleId.get(id)).filter((x) => x !== undefined)]);

    if (zdroje.length < 2) {
      /* Ne potichu: v reportu je vidět, co čeká na dohledání druhého zdroje. */
      (prehled[prehled.length - 1] as { zahozeno: string | null }).zahozeno =
        "hlásí to jen jeden zdroj — druhý musí dohledat člověk";
      continue;
    }

    nove.push({
      kam: "zaznam",
      pripravil: "audit",
      pripraveno: new Date().toISOString(),
      id: `i-${kdy}-${p.id.replace(/^k-/, "").slice(0, 10)}`,
      slug: `${(p.kodZeme ?? k.kodZeme ?? "xx").toLowerCase()}-${p.id.replace(/^k-/, "").slice(0, 10)}`,
      titulek: p.titulekCs,
      /*
        Žádné slepé krácení. Dřív tu bylo slice(0, 48) a do veřejného kanálu
        odešlo „Polsko: armáda posiluje hraniční přechody s Ukra". Když je
        titulek dlouhý, zkrátí ho až rozhlas na hranici slova; tady se
        neseká nic.
      */
      kratkyTitulek: p.titulekCs,
      zeme: k.zeme ?? "—",
      kodZeme: p.kodZeme ?? k.kodZeme ?? "EU",
      kategorie: k.kategorie,
      datumUdalosti: `${kdy}T00:00:00Z`,
      datumZjisteni: `${kdyZachyceno}T00:00:00Z`,
      aktualizovano: new Date().toISOString(),
      zavaznost: p.zavaznost,
      jistota: p.jistota,
      stav: "bez-vysetrovani",
      atribuce: "neznama",
      /*
        „Neznámý" je pravdivá hodnota, ne výplň. Prázdné pole znamená, že se
        na otázku po původci nikdo neptal; „neznamy" znamená, že se ptal
        a odpověď nemá. Kontrola dat to u případu vyžaduje právě proto.
      */
      puvodce: p.druh === "pripad" ? "neznamy" : null,
      druh: p.druh === "neurceno" ? "reakce" : p.druh,
      fakta: p.fakta,
      neznameho,
      /*
        Prázdné, ne zástupný text. „[DOPLNIT]" se přes schválení dostalo na
        živý web a stálo tam místo vysvětlení. Prázdné pole se nezobrazí
        vůbec, což je pravda; zástupný text je chyba na očích čtenáře.
      */
      vyznam: "",
      eskalacniSpousteče: [],
      deeskalacniSignaly: [],
      zdroje,
      souvisejici: [],
      historie: [{ kdy: `${kdy}T00:00:00Z`, text: "Zachyceno automatickým sběrem, posouzeno před zařazením do fronty.", novySignal: true }],
      novy: true,
      zapocitanoTyden: kdy,
      aiZpracovano: true,
      lidskyOvereno: false,
      archivniZaznam: false,
    });
  }

  /*
    Posouzený kandidát se z fronty odepíše.

    Zachycený článek není událost — je to jeden doklad. Jakmile se ví, ke
    které události patří (nebo že k žádné), nemá stát ve frontě a tvářit se,
    že na něco čeká. Bez tohohle kroku fronta jen rostla: 300 položek, z nichž
    57 už bylo posouzeno.
  */
  const vyrizeno = new Map<string, { duvod: string; patriK: string | null }>();
  for (const p2 of vysledek.polozky) {
    const r = prehled.find((x) => (x as { id: string }).id === p2.id) as
      | { zahozeno: string | null; duplikatSlugu: string | null }
      | undefined;
    if (!r) continue;
    if (!r.zahozeno) {
      vyrizeno.set(p2.id, { duvod: "navrh", patriK: null });
      /* Zprávy, ze kterých se staly další zdroje návrhu, taky dořešené jsou. */
      for (const dalsi of p2.dalsiId) vyrizeno.set(dalsi, { duvod: "zdroj-navrhu", patriK: null });
    } else if (r.duplikatSlugu) {
      vyrizeno.set(p2.id, { duvod: "pokracovani", patriK: r.duplikatSlugu });
    } else if (r.zahozeno.startsWith("hlásí to jen jeden zdroj")) {
      /* Tenhle čeká na dohledání druhého zdroje — z fronty se neodepisuje. */
    } else {
      vyrizeno.set(p2.id, { duvod: "neudalost", patriK: null });
    }
  }

  const kdyVyrizeno = new Date().toISOString();
  let odepsano = 0;
  const kandidatiPoAuditu = kandidati.map((k) => {
    const v = vyrizeno.get(k.id);
    if (!v || k.stav !== "ceka") return k;
    odepsano++;
    return {
      ...k,
      stav: "vyrizen" as const,
      vyrizeni: { kdy: kdyVyrizeno, duvod: v.duvod, patriK: v.patriK, poznamka: null },
    };
  });

  const zprava = {
    kdy: new Date().toISOString(),
    stav: "ok",
    poskytovatel,
    posouzeno: vysledek.polozky.length,
    navrhu: nove.length,
    vyrizeno: odepsano,
    cekaDal: kandidatiPoAuditu.filter((k) => k.stav === "ceka").length,
    rozhodnuti: prehled,
  };

  console.log(
    `[audit] posouzeno ${vysledek.polozky.length}, nových návrhů ${nove.length}, z fronty odepsáno ${odepsano}`,
  );
  for (const r of prehled as { titulek: string; zahozeno: string | null; duvod: string; neznamySlug: string | null }[]) {
    console.log(`  ${r.zahozeno ? `— ${r.zahozeno}` : "NÁVRH"} · ${r.titulek.slice(0, 60)} — ${r.duvod.slice(0, 70)}`);
    if (r.neznamySlug) console.log(`      pozor: model ukázal na neexistující záznam ${r.neznamySlug}`);
  }

  zapisReport(zprava);
  if (sucho) {
    console.log("[audit] nasucho: návrhy se nezapisují");
    return;
  }
  if (nove.length) {
    fs.writeFileSync(cesta("data/navrhy.json"), `${JSON.stringify([...navrhy, ...nove], null, 2)}\n`);
  }
  if (odepsano) {
    fs.writeFileSync(cesta("data/kandidati.json"), `${JSON.stringify(kandidatiPoAuditu, null, 2)}\n`);
  }
}

/*
  Spustit jen při skutečném běhu (`npm run audit`). Při importu z testu se
  rozhodovací funkce jenom čte — audit se pouštět nemá a nemá ani sahat
  na model.
*/
if (process.argv[1] && /audit\.ts$/.test(process.argv[1])) {
  await main();
}
