import fs from "node:fs";
import path from "node:path";
import { stahni } from "./nacti";
import { KRAJE } from "../src/lib/prehled/typy";
import type { InformaceVstup, Uzemi, VysledekPokusu } from "../src/lib/prehled/typy";

/*
  Výstrahy ČHMÚ ve formátu CAP 1.2 — první strukturovaný zdroj oficiálních
  výstrah s vydavatelem, územím a platností (26. 9. 2026).

  Adresa a tvar ověřené během „Ověření zdrojů“ ze sítě sběru (26. 9. 2026,
  run 36222390575): jeden <alert> s bloky <info>; v každém <area> je
  <areaDesc> s názvem kraje a geokódy CISORP (obce s rozšířenou působností).
  Soubor je úplný stav: kromě výstrah obsahuje i bloky „Žádná výstraha…“
  pro celé území. Z nich se pozná, kolik ORP kraj má — a tedy jestli
  výstraha pokrývá celý kraj, nebo jen jeho část.

  Pravidla, která drží přehled poctivý:
  - Soubor bez <alert> CAP nebo bez jediného <area> není „žádná výstraha“,
    ale nečekaný obsah: předchozí výstrahy zůstávají a zdroj je neúplný.
  - Kraj se bere jen ze známého seznamu. Co se nepřiřadí, má území
    „nelze určit“ — nikdy se nezahodí ani nepřiřadí odhadem.
  - Popis a pokyn se přebírají doslova (znění vydavatele), nic se nedoplňuje.
*/

export const CHMI_CAP_URL = "https://vystrahy-cr.chmi.cz/data/XOCZ50_OKPR.xml";
export const CHMI_ODKAZ = "https://vystrahy-cr.chmi.cz/";
const SOUBOR = path.join(process.cwd(), "data", "vystrahy-chmi.json");

export interface SouborVystrahChmi {
  /** Kdy se soubor naposledy úspěšně přečetl. */
  nacteno: string | null;
  /** Kdy ČHMÚ stav odeslal (<sent>). */
  odeslano: string | null;
  identifikator: string | null;
  vystrahy: InformaceVstup[];
}

const dekoduj = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .trim();
const tag = (xml: string, jmeno: string) => {
  const m = xml.match(new RegExp(`<${jmeno}>([\\s\\S]*?)</${jmeno}>`));
  return m ? dekoduj(m[1]) : "";
};
const bloky = (xml: string, jmeno: string) => [...xml.matchAll(new RegExp(`<${jmeno}>[\\s\\S]*?</${jmeno}>`, "g"))].map((m) => m[0]);

/** „Středočeský kraj“ → „Středočeský“; „Kraj Vysočina“ → „Vysočina“. Neznámé → null. */
export function krajZNazvu(areaDesc: string): string | null {
  const n = areaDesc.replace(/\s+/g, " ").trim();
  const bez = n.replace(/^kraj\s+/i, "").replace(/\s+kraj$/i, "").trim();
  return (KRAJE as readonly string[]).find((k) => k === n || k === bez) ?? null;
}

const iso = (s: string) => {
  if (!s) return null;
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};

interface Oblast { kraj: string | null; popis: string; orp: string[] }

function oblasti(info: string): Oblast[] {
  return bloky(info, "area").map((a) => {
    const popis = tag(a, "areaDesc");
    const orp = bloky(a, "geocode").filter((g) => tag(g, "valueName") === "CISORP").map((g) => tag(g, "value")).filter(Boolean);
    return { kraj: krajZNazvu(popis), popis, orp };
  });
}

/**
 * Blok, který výstrahou NENÍ: „Žádná výstraha …“, „Žádný výhled
 * nebezpečných jevů“ a podobné. Slouží jen k tomu, aby soubor pokryl celé
 * území (a z něj se spočítaly ORP krajů).
 *
 * 26. 9. 2026 prošel do přehledu blok „Žádný výhled nebezpečných jevů“ —
 * filtr znal jen „Žádná výstraha“ — a web ho hodinu ukazoval jako platnou
 * výstrahu pro všechny kraje. Proto dvě nezávislé pojistky: záporná věta
 * na začátku (žádná/žádný/žádné) A CAP příznaky „nic nehrozí“ (typ reakce
 * None a jistota Unlikely). Stačí jedna.
 */
export function neniVystraha(info: string, udalost: string): boolean {
  // Bez \b: v JS regulárních výrazech „ý“ není písmeno slova a \b by za ním nesedlo.
  if (/^\s*žádn[áýéí](\s|$)/iu.test(udalost) || /^\s*bez\s+(výstrah|nebezpeč)/iu.test(udalost)) return true;
  return tag(info, "responseType") === "None" && tag(info, "certainty") === "Unlikely";
}

/**
 * Přečte CAP ČHMÚ. `ok: false` = soubor nelze použít (jiný obsah, chybí
 * oblasti) — volající pak nechá předchozí výstrahy beze změny.
 */
export function ctiCapChmi(xml: string): { ok: true; odeslano: string | null; identifikator: string | null; vystrahy: InformaceVstup[] } | { ok: false; duvod: string } {
  if (!/<alert\b[^>]*urn:oasis:names:tc:emergency:cap:1\.2/.test(xml)) return { ok: false, duvod: "není to CAP 1.2" };
  const infa = bloky(xml, "info").filter((i) => !tag(i, "language") || tag(i, "language").toLowerCase().startsWith("cs"));
  if (!infa.length) return { ok: false, duvod: "žádný blok <info>" };
  const vsechnyOblasti = infa.map(oblasti);
  if (!vsechnyOblasti.some((o) => o.length)) return { ok: false, duvod: "žádná oblast" };

  // Kolik ORP má který kraj — z celého souboru, včetně bloků „Žádná výstraha“.
  const orpKraje = new Map<string, Set<string>>();
  for (const o of vsechnyOblasti.flat()) {
    if (!o.kraj) continue;
    const s = orpKraje.get(o.kraj) ?? new Set<string>();
    for (const c of o.orp) s.add(c);
    orpKraje.set(o.kraj, s);
  }

  const alertMsg = tag(xml.replace(/<info>[\s\S]*<\/info>/g, ""), "msgType");
  const odeslano = iso(tag(xml.replace(/<info>[\s\S]*<\/info>/g, ""), "sent"));
  const identifikator = tag(xml.replace(/<info>[\s\S]*<\/info>/g, ""), "identifier") || null;
  // Celý stav zrušen: žádná výstraha neplatí. Soubor je ale platný, takže „ok“.
  if (alertMsg === "Cancel") return { ok: true, odeslano, identifikator, vystrahy: [] };

  const vystrahy: InformaceVstup[] = [];
  infa.forEach((info, i) => {
    const udalost = tag(info, "event");
    if (!udalost || neniVystraha(info, udalost)) return;
    const obl = vsechnyOblasti[i];
    const cele: string[] = [];
    const casti: Oblast[] = [];
    const nezname: string[] = [];
    for (const o of obl) {
      if (!o.kraj) { nezname.push(o.popis); continue; }
      const vse = orpKraje.get(o.kraj);
      // Celý kraj jen tehdy, když výstraha jmenuje všechny jeho ORP ze souboru.
      if (vse && o.orp.length && [...vse].every((c) => o.orp.includes(c))) cele.push(o.kraj);
      else casti.push(o);
    }
    const zaklad = {
      titulek: udalost,
      text: tag(info, "description") || tag(info, "headline") || udalost,
      textJe: "zneni-vydavatele" as const,
      pokyn: tag(info, "instruction") || null,
      vydavatel: tag(info, "senderName") || "ČHMÚ",
      odkaz: tag(info, "web") || CHMI_ODKAZ,
      vydano: odeslano,
      platiOd: iso(tag(info, "onset")) ?? iso(tag(info, "effective")),
      platiDo: iso(tag(info, "expires")),
      odvolano: null,
      opraveno: null,
      coNevime: [],
      jistota: tag(info, "certainty") || null,
      puvod: "ČHMÚ, výstražná služba (CAP)",
      detail: null,
    };
    const typ = zaklad.pokyn ? "oficialni-pokyn" : "oficialni-vystraha";
    const klic = `chmi:${udalost}:${zaklad.platiOd ?? ""}`;
    const pridej = (uzemi: Uzemi, pripona: string) => vystrahy.push({ id: `${klic}:${pripona}`, typ, uzemi, ...zaklad });
    if (cele.length) pridej({ druh: "kraje", kraje: cele }, cele.join(","));
    for (const c of casti) pridej({ druh: "cast", popis: `část kraje: ${c.popis} (${c.orp.length} z ${orpKraje.get(c.kraj!)?.size ?? "?"} obcí s rozšířenou působností)`, kraje: [c.kraj!] }, `cast:${c.kraj}`);
    if (nezname.length) pridej({ druh: "nezname", popis: nezname.join(", ") }, "nezname");
  });
  return { ok: true, odeslano, identifikator, vystrahy };
}

/**
 * Stáhne, přečte a při úspěchu zapíše data/vystrahy-chmi.json.
 * Výsledek jde do stavu zdrojů jako „chmi-cap“ (ok / obsah / chyba).
 */
export async function sbirejVystrahyChmi(ted: string): Promise<{ vysledek: VysledekPokusu; stav: number | null; pocet: number; chyba?: string }> {
  let stav: number | null = null;
  try {
    const r = await stahni(CHMI_CAP_URL, 2);
    stav = r.stav;
    if (r.stav >= 400) return { vysledek: "chyba", stav, pocet: 0, chyba: `HTTP ${r.stav}` };
    const cteni = ctiCapChmi(r.telo);
    if (!cteni.ok) return { vysledek: "obsah", stav, pocet: 0, chyba: cteni.duvod };
    const soubor: SouborVystrahChmi = { nacteno: ted, odeslano: cteni.odeslano, identifikator: cteni.identifikator, vystrahy: cteni.vystrahy };
    fs.writeFileSync(SOUBOR, JSON.stringify(soubor, null, 2) + "\n", "utf-8");
    return { vysledek: "ok", stav, pocet: cteni.vystrahy.length };
  } catch (e) {
    return { vysledek: "chyba", stav, pocet: 0, chyba: String(e instanceof Error ? e.message : e) };
  }
}
