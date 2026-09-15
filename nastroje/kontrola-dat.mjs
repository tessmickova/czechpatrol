/**
 * Provozní kontrola dat. Spouští se v CI před sestavením a ručně:
 *
 *   node nastroje/kontrola-dat.mjs
 *
 * Chyba (nenulový návrat) = něco, co nesmí do produkce:
 *   duplicitní id nebo slug, aktualizace bez existujícího případu,
 *   opatření nebo reakce s původcem, „potvrzený“ záznam bez odkazu,
 *   neplatné datum, zjištění před událostí, oprava bez cíle,
 *   zdroj vydaný víc než měsíc před událostí (nemůže ji dokládat).
 * Varování = k prověření, ale nezastaví nasazení:
 *   případ bez zdroje s URL, ověření starší než 72 h, chybějící čas,
 *   zdroj o pár dní starší než událost, úřední atribuce bez primárního zdroje.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chybyVystrahy } from "./vystraha-pravidla.mjs";

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
const overujeme = fs.existsSync(path.join(koren, "data", "overujeme.json")) ? cti("overujeme.json") : [];
const vystrahy = fs.existsSync(path.join(koren, "data", "vystraha.json")) ? cti("vystraha.json") : { aktivni: null, archiv: [] };
const tipy = fs.existsSync(path.join(koren, "data", "tipy.json")) ? cti("tipy.json") : [];

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

  /*
    Sociální síť sama o sobě nic nedokládá.

    Příspěvek na profilu — i na pravém profilu ministra — je signál, ne důkaz.
    Nedá se z něj ověřit, co se stalo, a u podvrženého profilu ani to, kdo ho
    napsal. Záznam, pod kterým nestojí nic než sítě, proto nesmí mít vysokou
    jistotu ani úřední připsání odpovědnosti.
  */
  const jenSite = (i.zdroje ?? []).length > 0 && (i.zdroje ?? []).every((z) => z.typ === "social");
  if (jenSite) {
    if (i.jistota === "potvrzeno" || i.jistota === "vysoka") {
      chyby.push(`${i.slug}: jistota „${i.jistota}“ jen ze sociálních sítí — ty samy nic nedokládají`);
    }
    if (i.atribuce === "oficialni") {
      chyby.push(`${i.slug}: úřední připsání odpovědnosti jen ze sociálních sítí`);
    }
  }
  if (d === "pripad" && !sUrl) varovani.push(`${i.slug}: případ bez zdroje s URL${i.archivniZaznam ? " (označen jako archivní)" : ""}`);
  if (!i.lidskyOvereno) varovani.push(`${i.slug}: neprošel lidskou kontrolou — na webu se nezobrazí`);
  for (const z of i.zdroje ?? []) if (z.url && !/^https?:\/\//.test(z.url)) chyby.push(`${i.slug}: zdroj „${z.nazev}“ má neplatnou adresu`);

  /*
    Dokument vydaný dlouho PŘED událostí ji nemůže dokládat.

    Odkud to pravidlo je: u záznamu o uzavření moldavského vzdušného prostoru
    (8. 9. 2026) stál jako úřední zdroj dokument norské vlády ze 13. 2. 2025 —
    obecné odsouzení narušování moldavského vzdušného prostoru, které tuhle
    událost nepopisuje. V datech u něj přitom bylo napsané datum 9. 9. 2026
    a záznam z něj měl úřední připsání odpovědnosti. Úřední doména, funkční
    odkaz ani HTTP 200 nejsou doklad obsahu.

    Den rozdílu je běžný: agentura píše o chystané cestě večer předtím, jiné
    časové pásmo posune datum. Měsíc a víc už není ta samá věc.
  */
  for (const z of i.zdroje ?? []) {
    if (!z.publikovano || !platneDatum(z.publikovano) || !platneDatum(i.datumUdalosti)) continue;
    const dni = (new Date(i.datumUdalosti).getTime() - new Date(z.publikovano).getTime()) / 86_400_000;
    if (dni > 30) {
      chyby.push(
        `${i.slug}: zdroj „${z.nazev}“ je z ${z.publikovano.slice(0, 10)}, ` +
          `tedy ${Math.round(dni)} dní před událostí (${i.datumUdalosti.slice(0, 10)}) — nemůže ji dokládat`,
      );
    } else if (dni > 1) {
      varovani.push(
        `${i.slug}: zdroj „${z.nazev}“ vyšel ${Math.round(dni)} dní před událostí — ověřit, že ji opravdu popisuje`,
      );
    }
  }

  /*
    Úřední připsání odpovědnosti potřebuje úřední doklad. Bez primárního zdroje
    je to převzaté tvrzení, ne úřední akt — a na webu se přitom počítá do
    „úředně přisouzeno“.
  */
  if (i.atribuce === "oficialni" && !(i.zdroje ?? []).some((z) => z.primarni)) {
    varovani.push(`${i.slug}: úřední připsání odpovědnosti bez primárního zdroje`);
  }
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

// 3b. právě ověřované zprávy
//
// Tvrdší kontrola než jinde. Je to jediné místo na webu, kde se objevuje
// něco nepotvrzeného; když by tu chyběl úřední protipól, lhůta nebo pokyn
// pro čtenáře, zbyla by z toho holá fáma. Proto chyba, ne varování.
const tedOv = Date.now();
for (const o of overujeme) {
  const kde = `ověřované/${o.slug ?? o.id}`;
  if (!o.lidskyOvereno) chyby.push(`${kde}: bez lidské kontroly — automat sem nic dávat nesmí`);
  if (!Array.isArray(o.kdoHlasi) || o.kdoHlasi.length < 2) {
    chyby.push(`${kde}: musí uvádět aspoň dva nezávislé zdroje, které to hlásí`);
  }
  for (const z of o.kdoHlasi ?? []) {
    if (!z.url || !/^https?:\/\//.test(z.url)) chyby.push(`${kde}: zdroj „${z.nazev}“ bez odkazu`);
  }
  if (!Array.isArray(o.coRikajiUrady) || !o.coRikajiUrady.length) {
    chyby.push(`${kde}: chybí, co k tomu říkají úřady — to je ta ověřená část`);
  }
  if (!o.coDelatTed || o.coDelatTed.length < 15) chyby.push(`${kde}: chybí pokyn, co má čtenář dělat teď`);
  if (!o.kdybyPlatilo || o.kdybyPlatilo.length < 15) chyby.push(`${kde}: chybí, co by to znamenalo, kdyby to platilo`);
  if (!platneDatum(o.zacalo) || !platneDatum(o.uzavritDo)) chyby.push(`${kde}: neplatné datum`);
  else if (new Date(o.uzavritDo) <= new Date(o.zacalo)) chyby.push(`${kde}: lhůta na uzavření nesmí být před začátkem`);
  else if (new Date(o.uzavritDo) - new Date(o.zacalo) > 7 * 86400000) {
    chyby.push(`${kde}: lhůta delší než týden — neuzavřená zpráva se nesmí vléct`);
  }
  if (o.stav !== "overujeme" && !o.jakDopadlo) chyby.push(`${kde}: uzavřeno bez zápisu, jak to dopadlo`);
  if (o.stav === "overujeme" && new Date(o.uzavritDo).getTime() <= tedOv) {
    varovani.push(`${kde}: uplynula lhůta, stáhlo se z přehledu — dopiš, jak to dopadlo`);
  }
}
const zivych = overujeme.filter((o) => o.stav === "overujeme" && new Date(o.uzavritDo).getTime() > tedOv).length;
if (zivych > 3) chyby.push(`právě ověřovaných je ${zivych}; nejvýš 3, jinak se z přehledu stane proud fám`);

// 3c. mimořádná výstraha
//
// Pruh přes celou šířku na každé stránce je to nejsilnější, co web umí říct.
// Proto se kontroluje i tady, ne jen v nástroji, kterým se vyhlašuje: mezi
// vyhlášením a nasazením může soubor sáhnout kdokoli a cokoli.
for (const c of chybyVystrahy(vystrahy.aktivni ?? undefined)) {
  if (vystrahy.aktivni) chyby.push(`výstraha: ${c}`);
}
if (vystrahy.aktivni) {
  const stari = (Date.now() - new Date(vystrahy.aktivni.overeno).getTime()) / 3_600_000;
  // Výstraha, kterou nikdo dva dny nepotvrdil, přestává být zprávou o dnešku.
  if (stari > 48) varovani.push(`výstraha platí ${Math.round(stari / 24)} dní bez nového ověření — potvrď ji, nebo sundej`);
}
for (const a of vystrahy.archiv ?? []) {
  if (!a.procSundano) chyby.push(`výstraha v archivu (${a.klic}): chybí, proč se sundala`);
}

// 3d. tipy k přípravě
//
// Tip jde i do telegramového kanálu, takže platí totéž co pro záznam: bez
// doloženého zdroje ven nesmí. A musí být krátký — tip na deset vět nikdo
// nepřečte a v kanálu zabere celou obrazovku.
for (const t of tipy) {
  const kde = `tip/${t.klic ?? "?"}`;
  if (!t.klic || !t.nadpis || !t.text || !t.kdy) chyby.push(`${kde}: chybí klíč, nadpis, text nebo datum`);
  if (!(t.zdroje ?? []).some((z) => /^https?:\/\//.test(z?.url ?? ""))) chyby.push(`${kde}: bez zdroje s adresou`);
  if (t.kdy && !platneDatum(t.kdy)) chyby.push(`${kde}: neplatné datum`);
  if ((t.text ?? "").length > 400) chyby.push(`${kde}: text je delší než 400 znaků`);
  if (/\b(odjeďte|utíkejte|vyberte hotovost|nakupte|zásobte se)\b/i.test(`${t.nadpis ?? ""} ${t.text ?? ""}`)) {
    chyby.push(`${kde}: tip radí, co má člověk dělat v krizi — to tenhle web nedělá`);
  }
}

// 4. stáří ověření
const ted = Date.now();
for (const [nazev, sada] of [["právní stav", pravni], ["NATO", nato], ["provoz", provoz]]) {
  for (const p of sada.polozky) {
    if (!p.overeno) { varovani.push(`${nazev}/${p.klic}: nikdy neověřeno`); continue; }
    const h = (ted - new Date(p.overeno).getTime()) / 3_600_000;
    if (h > 72) varovani.push(`${nazev}/${p.klic}: ověření staré ${Math.round(h / 24)} dní`);
  }
}

// 4b. odmítnuté zprávy — pracovní přehled, ne archiv
//
// Je to podklad pro člověka. Hlídá se hlavně to, aby nepřerostl: soubor je
// v gitu a přehled, který se nedá projít, nikdo neprojde.
const cestaOdmitnutych = path.join(koren, "data", "fronta", "odmitnute.json");
if (fs.existsSync(cestaOdmitnutych)) {
  let odmitnute = [];
  try {
    odmitnute = JSON.parse(fs.readFileSync(cestaOdmitnutych, "utf-8"));
  } catch {
    chyby.push("data/fronta/odmitnute.json nejde přečíst");
  }
  if (!Array.isArray(odmitnute)) chyby.push("data/fronta/odmitnute.json není pole");
  else {
    if (odmitnute.length > 500) chyby.push(`odmítnutých je ${odmitnute.length}; strop je 500, jinak to nikdo neprojde`);
    const adresy = new Set();
    for (const o of odmitnute) {
      const kde = `odmítnutá ${o.id ?? "bez id"}`;
      if (!o.id || !o.titulek || !o.zdroj?.url) { chyby.push(`${kde}: chybí id, titulek nebo odkaz`); continue; }
      if (adresy.has(o.zdroj.url)) chyby.push(`${kde}: stejná adresa je v přehledu dvakrát`);
      adresy.add(o.zdroj.url);
      if (!["vylouceno-tematem", "bez-skutku", "bez-mista"].includes(o.duvod)) {
        chyby.push(`${kde}: neznámý důvod odmítnutí „${o.duvod}“`);
      }
      if (o.posouzeni && !["vysoke", "stredni", "zadne"].includes(o.posouzeni.podezreni)) {
        chyby.push(`${kde}: neznámá míra podezření „${o.posouzeni.podezreni}“`);
      }
      // Odmítnutá zpráva nikdy nesmí být zároveň zveřejněným záznamem.
      if (adresyZaznamu.has(o.zdroj.url)) chyby.push(`${kde}: tahle adresa už je zveřejněný záznam`);
    }
    const vazne = odmitnute.filter((o) => o.posouzeni?.podezreni === "vysoke").length;
    if (vazne) varovani.push(`odmítnutých označených jako vážné: ${vazne} — projít ve správě`);
    const neposouzene = odmitnute.filter((o) => !o.posouzeni).length;
    if (neposouzene) varovani.push(`neposouzených odmítnutých: ${neposouzene}`);
  }
}

// 5. překlady rozhraní
//
// Klíčem je česká věta, takže chybějící překlad nikdy nevyrobí prázdné místo —
// zobrazí se čeština. Hlídá se proto úplnost jako varování, ne jako chyba:
// rozestavěný překlad nesmí zastavit nasazení bezpečnostního webu.
const dirUi = path.join(koren, "data", "preklady", "ui");
if (fs.existsSync(path.join(dirUi, "zdroj.json"))) {
  const zdrojVet = JSON.parse(fs.readFileSync(path.join(dirUi, "zdroj.json"), "utf-8"));
  const jazyky = JSON.parse(fs.readFileSync(path.join(koren, "data", "preklady", "jazyky.json"), "utf-8"));
  if (!Array.isArray(zdrojVet) || !zdrojVet.length) varovani.push("zdroj překladů je prázdný — spusť nastroje/vytez-preklady.mjs --zapis");

  for (const j of jazyky) {
    const soubor = path.join(dirUi, `${j.kod}.json`);
    if (!fs.existsSync(soubor)) { chyby.push(`jazyk ${j.kod} nemá soubor data/preklady/ui/${j.kod}.json`); continue; }
    const slovnik = JSON.parse(fs.readFileSync(soubor, "utf-8"));
    const chybi = zdrojVet.filter((v) => !String(slovnik[v] ?? "").trim());
    const navic = Object.keys(slovnik).filter((k) => !zdrojVet.includes(k));
    if (chybi.length) varovani.push(`překlad ${j.kod}: chybí ${chybi.length} z ${zdrojVet.length} vět (zobrazí se česky)`);
    if (navic.length) varovani.push(`překlad ${j.kod}: ${navic.length} vět navíc, které už v kódu nejsou`);
  }
}

// výstup
const shrnuti = `záznamů ${incidenty.length} (případů ${pripady.length}, aktualizací ${incidenty.filter((i) => druh(i) === "aktualizace").length}, opatření ${incidenty.filter((i) => druh(i) === "opatreni").length}, reakcí ${incidenty.filter((i) => druh(i) === "reakce").length}), neprošlých ${nepotvrzene.length}, oprav ${opravy.length}, kandidátů ${kandidati.length}, ověřovaných ${overujeme.length}`;
console.log(`Kontrola dat: ${shrnuti}`);
for (const v of varovani) console.log(`  varování: ${v}`);
for (const c of chyby) console.log(`  CHYBA: ${c}`);
console.log(`${chyby.length} chyb, ${varovani.length} varování`);
process.exit(chyby.length ? 1 : 0);
