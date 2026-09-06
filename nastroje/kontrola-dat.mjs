/**
 * Provozní kontrola dat. Spouští se v CI před sestavením a ručně:
 *
 *   node nastroje/kontrola-dat.mjs
 *
 * Chyba (nenulový návrat) = něco, co nesmí do produkce:
 *   duplicitní id nebo slug, aktualizace bez existujícího případu,
 *   opatření nebo reakce s původcem, „potvrzený“ záznam bez odkazu,
 *   neplatné datum, zjištění před událostí, oprava bez cíle.
 * Varování = k prověření, ale nezastaví nasazení:
 *   případ bez zdroje s URL, ověření starší než 72 h, chybějící čas.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cti = (f) => JSON.parse(fs.readFileSync(path.join(koren, "data", f), "utf-8"));

const incidenty = cti("incidenty.json");
const nepotvrzene = cti("nepotvrzeno.json");
const opravy = cti("opravy.json");
const pravni = cti("pravni-stav.json");
const nato = cti("nato.json");
const provoz = cti("provoz.json");
const kandidati = fs.existsSync(path.join(koren, "data", "kandidati.json")) ? cti("kandidati.json") : [];
const svet = fs.existsSync(path.join(koren, "data", "svet.json")) ? cti("svet.json") : null;

const chyby = [];
const varovani = [];
const druh = (i) => i.druh ?? (i.puvodce ? "pripad" : "reakce");
const platneDatum = (d) => typeof d === "string" && !Number.isNaN(new Date(d).getTime());

// 1. jedinečnost
const ids = new Map(), slugy = new Map();
for (const i of incidenty) {
  ids.set(i.id, (ids.get(i.id) ?? 0) + 1);
  slugy.set(i.slug, (slugy.get(i.slug) ?? 0) + 1);
}
for (const [k, n] of ids) if (n > 1) chyby.push(`duplicitní id ${k} (${n}×)`);
for (const [k, n] of slugy) if (n > 1) chyby.push(`duplicitní slug ${k} (${n}×)`);

// 2. vazby a druhy
for (const i of incidenty) {
  const d = druh(i);
  if (d === "aktualizace" && !slugy.has(i.navazujeNa)) chyby.push(`${i.slug}: aktualizace bez existujícího případu (${i.navazujeNa})`);
  if ((d === "opatreni" || d === "reakce") && i.puvodce) chyby.push(`${i.slug}: ${d} nesmí mít původce`);
  if (d === "pripad" && !i.puvodce) chyby.push(`${i.slug}: případ bez původce (aspoň „neznamy“)`);
  if (!platneDatum(i.datumUdalosti)) chyby.push(`${i.slug}: neplatné datum události`);
  if (i.datumZjisteni && !platneDatum(i.datumZjisteni)) chyby.push(`${i.slug}: neplatné datum zjištění`);
  if (i.datumZjisteni && i.datumZjisteni.slice(0, 10) < i.datumUdalosti.slice(0, 10)) chyby.push(`${i.slug}: zjištění dřív než událost`);
  const sUrl = (i.zdroje ?? []).some((z) => z.url);
  if ((i.jistota === "potvrzeno" || i.jistota === "vysoka") && !sUrl) chyby.push(`${i.slug}: jistota „${i.jistota}“ bez odkazu na zdroj`);
  if (d === "pripad" && !sUrl) varovani.push(`${i.slug}: případ bez zdroje s URL${i.archivniZaznam ? " (označen jako archivní)" : ""}`);
  if (!i.lidskyOvereno) varovani.push(`${i.slug}: neprošel lidskou kontrolou — na webu se nezobrazí`);
  for (const z of i.zdroje ?? []) if (z.url && !/^https?:\/\//.test(z.url)) chyby.push(`${i.slug}: zdroj „${z.nazev}“ má neplatnou adresu`);
}
for (const n of nepotvrzene) {
  if (!(n.zdroje ?? []).some((z) => z.url)) varovani.push(`nepotvrzeno/${n.id}: bez zdroje s URL`);
  if (!["vyvraceno", "nepotvrzeno"].includes(n.stav)) chyby.push(`nepotvrzeno/${n.id}: neznámý stav ${n.stav}`);
}
for (const o of opravy) {
  const cil = o.tykaSe;
  const ok = slugy.has(cil) || cil === "metodika" || cil === "historicke-zaznamy" || (cil.startsWith("nepotvrzeno/") && nepotvrzene.some((n) => n.id === cil.slice(12)));
  if (!ok) chyby.push(`oprava ${o.id}: neznámý cíl ${cil}`);
  if (!platneDatum(o.datum)) chyby.push(`oprava ${o.id}: neplatné datum`);
}

// 2b. kandidáti: adresa, datum, žádná shoda s už zveřejněným záznamem
const adresyZaznamu = new Set(incidenty.flatMap((i) => (i.zdroje ?? []).map((z) => z.url)));
const idKandidatu = new Set();
for (const k of kandidati) {
  if (idKandidatu.has(k.id)) chyby.push(`kandidát ${k.id}: duplicitní id`);
  idKandidatu.add(k.id);
  if (!/^https?:\/\//.test(k.zdroj?.url ?? "")) chyby.push(`kandidát ${k.id}: neplatná adresa zdroje`);
  if (!platneDatum(k.zachyceno)) chyby.push(`kandidát ${k.id}: neplatné datum zachycení`);
  if (adresyZaznamu.has(k.zdroj?.url)) varovani.push(`kandidát ${k.id}: stejná adresa jako zveřejněný záznam — sběr ho příště odloží`);
  if (k.stav !== "ceka") chyby.push(`kandidát ${k.id}: neznámý stav ${k.stav}`);
}

// 2c. svět: každé tvrzení odkazuje na existující zdroj, postoje mají správnou délku
if (svet) {
  if (!platneDatum(svet.aktualizovano)) chyby.push("svet: neplatné datum aktualizace");
  for (const a of svet.aktori) {
    const n = a.zdroje.length;
    for (const z of a.zdroje) if (!/^https?:\/\//.test(z.url)) chyby.push(`svet/${a.klic}: neplatná adresa zdroje „${z.nazev}“`);
    for (const t of [...a.deklarovane, ...a.postup]) {
      if (!t.zdroje.length) chyby.push(`svet/${a.klic}: tvrzení bez zdroje: ${t.text.slice(0, 50)}`);
      for (const i of t.zdroje) if (i < 0 || i >= n) chyby.push(`svet/${a.klic}: odkaz na neexistující zdroj [${i + 1}]`);
    }
    if (a.priblizeni.stupen < 0 || a.priblizeni.stupen >= svet.stupne.length) chyby.push(`svet/${a.klic}: stupeň mimo stupnici`);
    if ((svet.stret.postoje[a.klic] ?? []).length !== svet.stret.otazky.length) chyby.push(`svet/${a.klic}: počet postojů neodpovídá počtu otázek`);
  }
  const hSvet = (Date.now() - new Date(svet.aktualizovano).getTime()) / 3_600_000;
  if (hSvet > 14 * 24) varovani.push(`svet: hodnocení staré ${Math.round(hSvet / 24)} dní`);
}

// 3. konzistence agregací: součet po zemích = celkem případů
const pripady = incidenty.filter((i) => i.lidskyOvereno && druh(i) === "pripad");
const poZemich = new Map();
for (const i of pripady) poZemich.set(i.kodZeme, (poZemich.get(i.kodZeme) ?? 0) + 1);
const soucet = [...poZemich.values()].reduce((a, b) => a + b, 0);
if (soucet !== pripady.length) chyby.push(`součet případů po zemích (${soucet}) ≠ celkem (${pripady.length})`);

// 4. stáří ověření
const ted = Date.now();
for (const [nazev, sada] of [["právní stav", pravni], ["NATO", nato], ["provoz", provoz]]) {
  for (const p of sada.polozky) {
    if (!p.overeno) { varovani.push(`${nazev}/${p.klic}: nikdy neověřeno`); continue; }
    const h = (ted - new Date(p.overeno).getTime()) / 3_600_000;
    if (h > 72) varovani.push(`${nazev}/${p.klic}: ověření staré ${Math.round(h / 24)} dní`);
  }
}

// výstup
const shrnuti = `záznamů ${incidenty.length} (případů ${pripady.length}, aktualizací ${incidenty.filter((i) => druh(i) === "aktualizace").length}, opatření ${incidenty.filter((i) => druh(i) === "opatreni").length}, reakcí ${incidenty.filter((i) => druh(i) === "reakce").length}), neprošlých ${nepotvrzene.length}, oprav ${opravy.length}, kandidátů ${kandidati.length}`;
console.log(`Kontrola dat: ${shrnuti}`);
for (const v of varovani) console.log(`  varování: ${v}`);
for (const c of chyby) console.log(`  CHYBA: ${c}`);
console.log(`${chyby.length} chyb, ${varovani.length} varování`);
process.exit(chyby.length ? 1 : 0);
