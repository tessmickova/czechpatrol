/**
 * Neveřejné porovnání metodiky v1 a v2 (pilot, 9. 11. 2026).
 *
 *   npm run metodika:porovnani            dnešek
 *   npm run metodika:porovnani -- --dny 30   posledních 30 dní po dnech
 *
 * Čte data z data/, počítá v2 (src/lib/metodika2) a vedle ní ukazuje, co
 * dnes hlásí web (data/stav.json). Výsledek zapíše do .metodika-v2/, kterou
 * git ignoruje: repozitář je veřejný a porovnání se nemá zveřejnit dřív, než
 * ho posoudí provozovatelka (docs/metodika-v2/05-MIGRACE.md). Nic na webu ani
 * v datech nemění. Změna metody není změna bezpečnosti — výstup to říká.
 */
import fs from "node:fs";
import path from "node:path";
import { hodnoceniV2, NAZVY_PASEM, type VyjimkaV2 } from "../src/lib/metodika2";
import { UROVNE } from "../src/lib/skala";
import type { Incident, MimoradnySignal, PravniPolozka, ProvozniPolozka, VystrahaSoubor } from "../src/lib/typy";
import type { InformaceVstup } from "../src/lib/prehled/typy";

const koren = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cti = <T>(soubor: string, nahradni: T): T => { try { return JSON.parse(fs.readFileSync(path.join(koren, "data", soubor), "utf-8")) as T; } catch { return nahradni; } };

const zaznamy = cti<Incident[]>("incidenty.json", []);
const provoz = cti<{ polozky: ProvozniPolozka[] }>("provoz.json", { polozky: [] }).polozky;
const pravni = cti<{ polozky: PravniPolozka[] }>("pravni-stav.json", { polozky: [] }).polozky;
const vystraha = cti<VystrahaSoubor | null>("vystraha.json", null);
const chmi = cti<{ vystrahy: InformaceVstup[] }>("vystrahy-chmi.json", { vystrahy: [] }).vystrahy;
const stav = cti<{ uroven: string | null; shrnuti?: string; overovaniStoji?: string | null }>("stav.json", { uroven: null });
/* Provozní údaj z data/stav.json; do v2 jde jen jako „podklady neúplné“, podrobnost zůstane v tomhle neveřejném výpisu. */
const neuplne = (d: number) => (d === 0 && stav.overovaniStoji ? { podkladyNeuplne: true, podkladyNeuplnePoznamka: `ověřování zachycených zpráv stojí od ${stav.overovaniStoji.slice(0, 10)}` } : { podkladyNeuplne: false });
const beh = cti<{ kdy?: string; zdroje?: { ok: boolean }[] }>("fronta/posledni-beh.json", {});
/* Dnešní mimořádné signály nemají schvalující roli ani datum revize; v2 je proto nepoužije a řekne to. */
const vyjimky: VyjimkaV2[] = (cti<{ signaly?: MimoradnySignal[] }>("mimoradne-signaly.json", {}).signaly ?? []).map((s) => ({ id: s.id, duvod: s.kratce, podklady: s.zaznam ? [s.zaznam] : [], schvalil: null, revize: null, vyhodnoceno: s.vyhodnoceno, platiDo: s.platiDo }));

const arg = process.argv.slice(2);
const dny = arg.includes("--dny") ? Math.max(1, Number(arg[arg.indexOf("--dny") + 1]) || 1) : 1;
const ted = Date.now();
const vystup: unknown[] = [];

for (let d = dny - 1; d >= 0; d--) {
  const t = ted - d * 86_400_000;
  /* U minulých dní kvalitu podkladů neznáme; počítá se jako dnes a výstup to uvádí. */
  const h = hodnoceniV2({
    zaznamy, provoz, pravni, vystraha, chmi, vyjimky, ted: t,
    kvalita: { posledniSber: d === 0 ? beh.kdy ?? null : new Date(t).toISOString(), ...neuplne(d), zdrojuPrecteno: (beh.zdroje ?? []).filter((z) => z.ok).length, zdrojuCelkem: (beh.zdroje ?? []).length },
  });
  const v2 = h.a.pasmo ? `${NAZVY_PASEM[h.a.pasmo]}${h.a.spodniOdhad ? " (spodní odhad)" : ""}` : "nelze určit";
  if (dny > 1) console.log(`${new Date(t).toISOString().slice(0, 10)}  v2: ${v2.padEnd(26)} pravidla: ${h.a.pravidla.join(", ")}`);
  vystup.push({ den: new Date(t).toISOString().slice(0, 10), v2: h });
  if (d === 0) {
    console.log("\n=== Porovnání metodik (neveřejné) ===");
    console.log(`v1 (web dnes): ${stav.uroven ? `${UROVNE[stav.uroven as keyof typeof UROVNE]?.nazev} (${stav.uroven})` : "Nestanoveno"}`);
    console.log(`v2 vrstva A:   ${v2}`);
    console.log(`               ${h.a.vysvetleni}`);
    console.log(`               kvalita: ${h.a.kvalita.stav}${h.a.kvalita.duvody.length ? ` — ${h.a.kvalita.duvody.join("; ")}` : ""}${h.a.kvalita.duvodyInterni.length ? ` (interně: ${h.a.kvalita.duvodyInterni.join("; ")})` : ""}`);
    if (h.a.vyjimka) console.log(`               výjimka: ${h.a.vyjimka.duvod}`);
    console.log(`v2 vrstva B:   ${h.b.souhrn}`);
    console.log(`v2 vrstva C:   ${h.c.plati.length ? h.c.plati.map((x) => `${x.co} (${x.vydal}, ${x.uzemi})`).join("; ") : "žádná platná úřední výstraha ani krizový stav v kontrolovaných zdrojích"}`);
    console.log("Souhrn:");
    for (const [k, v] of Object.entries(h.souhrn)) console.log(`  ${k}: ${Array.isArray(v) ? v.join(" | ") : v}`);
    console.log(`\nRozhodující: ${h.a.rozhodujici.length}, kontext: ${h.a.kontext.length}, nezapočteno: ${h.a.nezapocteno.length}, neaktuální: ${h.a.neaktualni.length}`);
    console.log("Pozn.: rozdíl mezi v1 a v2 je změna metody, ne změna bezpečnosti.");
  }
}

const cil = path.join(koren, ".metodika-v2");
fs.mkdirSync(cil, { recursive: true });
const soubor = path.join(cil, `porovnani-${new Date(ted).toISOString().slice(0, 10)}.json`);
fs.writeFileSync(soubor, `${JSON.stringify({ verze: "2.0-pilot", v1: stav, dny: vystup }, null, 2)}\n`);
console.log(`\nZapsáno do ${path.relative(koren, soubor)} (git ho ignoruje).`);
