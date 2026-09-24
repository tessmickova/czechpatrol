/**
 * Bezpečné převzetí práce externího ověřovatele Patrola.
 *
 *   node nastroje/prevzit-od-patrola.mjs            # sloučí a zapíše
 *   node nastroje/prevzit-od-patrola.mjs --nacisto  # jen vypíše
 *
 * Proč takhle (audit 23. 9. 2026, B-03 a B-04):
 * - Dřív se z větve patrol/overovani převzal CELÝ adresář data/. Patrol tak
 *   mohl zapsat incidenty.json s lidskyOvereno: true, výstrahu nebo stav —
 *   a jeho starší kopie přepisovala novější data v main.
 * - Workflow se spouštěl pushem na Patrolovu větev, a GitHub v tom případě
 *   bere definici workflow Z TÉ VĚTVE: Patrol si ho mohl přepsat a spustit
 *   vlastní kód s právem zápisu. Převzetí teď dělá hodinový sběr z main.
 *
 * Co se přebírá: jen tři soubory —
 *   data/navrhy.json          návrhy (nové a upravené), vyčištěné, sloučením po id,
 *   data/fronta/pro-patrola.json  odpovědi k zadáním, která už v main jsou, po id,
 *   data/souhrn-situace.json  věta pod nadpis, jen když je novější a projde
 *                             pravidly v souhrn-situace.mjs (od 24. 9. 2026).
 * Nic jiného se z větve nečte. Nic se nemaže.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { maUredniZdroj } from "./uredni-zdroj.mjs";
import { chybySouhrnu } from "./souhrn-situace.mjs";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VETEV = "origin/patrol/overovani";

function zVetve(soubor) {
  try {
    return JSON.parse(execFileSync("git", ["show", `${VETEV}:${soubor}`], { cwd: koren, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return null;
  }
}
const cti = (soubor, vychozi) => {
  const p = path.join(koren, soubor);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : vychozi;
};

/**
 * Vyčistí návrh od Patrola. Patrol navrhuje, nerozhoduje: nikdy nemůže
 * označit návrh za lidsky ověřený ani určit, jak byl ověřen, a bez úředního
 * zdroje (podle adresy, ne podle příznaku) nedá jistotu „potvrzeno"/„vysoká"
 * ani úřední atribuci.
 */
export function vycistiNavrh(n) {
  const x = { ...n };
  x.lidskyOvereno = false;
  delete x.overeni;
  x.pripravil = x.pripravil ?? "patrol";
  const uredni = maUredniZdroj(x.zdroje ?? []);
  if (!uredni) {
    if (x.jistota === "potvrzeno" || x.jistota === "vysoka") x.jistota = "stredni";
    if (x.atribuce === "oficialni") x.atribuce = "nepotvrzena";
  }
  return x;
}

export function sloucitNavrhy(mainNavrhy, patrolNavrhy, { zverejnene = new Set(), zamitnute = new Set() } = {}) {
  const podleId = new Map(mainNavrhy.map((n) => [n.id, n]));
  let novych = 0, upravenych = 0;
  for (const n of patrolNavrhy ?? []) {
    if (!n || typeof n.id !== "string") continue;
    // Zveřejněné a zamítnuté se nevracejí: rozhodnutí v main platí.
    if (zverejnene.has(n.id) || zamitnute.has(n.id)) continue;
    const cisty = vycistiNavrh(n);
    if (podleId.has(n.id)) {
      if (JSON.stringify(podleId.get(n.id)) !== JSON.stringify(cisty)) { podleId.set(n.id, cisty); upravenych++; }
    } else { podleId.set(n.id, cisty); novych++; }
  }
  return { navrhy: [...podleId.values()], novych, upravenych };
}

/** Odpovědi Patrola jen k zadáním, která v main existují. Nová zadání si Patrol vytvořit nesmí. */
/**
 * Věta pod nadpis od Patrola. Vrátí nový obsah souboru, nebo null, když se
 * nic nepřebírá: chybí, není novější než ta v main, nebo neprošla pravidly.
 * Patrol nemůže větu smazat — prázdnou (veta: null) nepřebíráme; stará se
 * z webu stáhne sama po lhůtě platnosti.
 */
export function prevzitSouhrn(mainSouhrn, patrolSouhrn, ted = Date.now()) {
  if (!patrolSouhrn || typeof patrolSouhrn !== "object" || !patrolSouhrn.veta) return null;
  const chyby = chybySouhrnu(patrolSouhrn, ted);
  if (chyby.length) {
    console.log(`[patrol] souhrn situace se nepřebírá: ${chyby.join("; ")}`);
    return null;
  }
  const novejsi = !mainSouhrn?.aktualizovano || new Date(patrolSouhrn.aktualizovano).getTime() > new Date(mainSouhrn.aktualizovano).getTime();
  if (!novejsi) return null;
  console.log(`[patrol] souhrn situace převzat (${patrolSouhrn.aktualizovano})`);
  return {
    _poznamka: mainSouhrn?._poznamka,
    veta: patrolSouhrn.veta.trim(),
    aktualizovano: patrolSouhrn.aktualizovano,
    napsal: "patrol",
    podklady: patrolSouhrn.podklady.map(String),
  };
}

export function sloucitZadani(mainZadani, patrolZadani) {
  const jeho = new Map((patrolZadani ?? []).filter((z) => z && typeof z.id === "string").map((z) => [z.id, z]));
  let zmen = 0;
  const vysledek = mainZadani.map((z) => {
    const p = jeho.get(z.id);
    if (!p) return z;
    const nove = { ...z };
    for (const k of ["stav", "odpoved", "hotovo", "rozhodnuti"]) if (p[k] !== undefined) nove[k] = p[k];
    if (!["ceka", "hotovo", "odmitnuto", "nedokonceno", "propadlo"].includes(nove.stav)) nove.stav = z.stav;
    if (JSON.stringify(nove) !== JSON.stringify(z)) zmen++;
    return nove;
  });
  return { zadani: vysledek, zmen };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const nacisto = process.argv.includes("--nacisto");
  const patrolNavrhy = zVetve("data/navrhy.json");
  const patrolZadani = zVetve("data/fronta/pro-patrola.json");
  const patrolSouhrn = zVetve("data/souhrn-situace.json");
  if (!patrolNavrhy && !patrolZadani && !patrolSouhrn) {
    console.log("[patrol] větev nedostupná nebo bez dat, nic se nepřebírá");
    process.exit(0);
  }
  // Zveřejněné záznamy i položky „Právě ověřujeme" už rozhodnuté jsou.
  const zverejnene = new Set([...cti("data/incidenty.json", []), ...cti("data/overujeme.json", [])].map((i) => i.id));
  const zamitnute = new Set(cti("data/fronta/zamitnute-navrhy.json", []).map((z) => z.id));
  const n = sloucitNavrhy(cti("data/navrhy.json", []), patrolNavrhy ?? [], { zverejnene, zamitnute });
  const z = sloucitZadani(cti("data/fronta/pro-patrola.json", []), patrolZadani ?? []);
  console.log(`[patrol] návrhů nových ${n.novych}, upravených ${n.upravenych}; odpovědí k zadáním ${z.zmen}`);
  const souhrn = prevzitSouhrn(cti("data/souhrn-situace.json", { veta: null }), patrolSouhrn);
  if (!nacisto) {
    if (n.novych || n.upravenych) fs.writeFileSync(path.join(koren, "data/navrhy.json"), `${JSON.stringify(n.navrhy, null, 2)}\n`);
    if (z.zmen) fs.writeFileSync(path.join(koren, "data/fronta/pro-patrola.json"), `${JSON.stringify(z.zadani, null, 2)}\n`);
    if (souhrn) fs.writeFileSync(path.join(koren, "data/souhrn-situace.json"), `${JSON.stringify(souhrn, null, 2)}\n`);
  }
}
