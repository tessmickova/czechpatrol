/**
 * Zadání pro externího ověřovatele — jmenovitý seznam, který musí projít celý.
 *
 *   node nastroje/zadani-pro-patrola.mjs          zapíše zadání
 *   node nastroje/zadani-pro-patrola.mjs --sucho  jen vypíše, co by zapsal
 *
 * Proč to existuje
 * ----------------
 * Frontu posuzoval denní audit modelem přes API. 20. 9. 2026 došel kredit,
 * placené volání se vyplo a fronta se přestala hýbat. Posuzovat umí i Patrol,
 * kterému se neúčtuje; chybělo jediné — říct mu, co má vzít.
 *
 * Proč jmenovitý seznam
 * ---------------------
 * První zadání znělo „posuď frontu“. Odpověď na něj byla souvislý text: část
 * zpráv vyřízená, část okomentovaná, u části se z odpovědi nedalo poznat, jestli
 * se k ní vůbec dostal. Nešlo tedy říct, jestli je hotovo — a nehotová práce,
 * o které se neví, že je nehotová, je horší než práce nezačatá.
 *
 * Zadání proto nese SEZNAM konkrétních položek s id. Hotovost se nezjišťuje
 * z toho, co ověřovatel napsal, ale z dat: položka je vyřízená tehdy, když
 * je po ní v repozitáři stopa. Sebehodnocení se neověřuje sebehodnocením.
 *
 * Co se stane s nedodělkem
 * ------------------------
 * Při každém dalším běhu se předchozí zadání změří. Když je hotové, zavře se.
 * Když ne, vypíše se, co zbylo, a nedodělky jdou do nového zadání jako první —
 * a je u nich napsáno, pokolikáté se vracejí.
 */
import fs from "node:fs";
import path from "node:path";
import { maUredniZdroj } from "./uredni-zdroj.mjs";

const koren = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cesta = (...c) => path.join(koren, ...c);
const cti = (p, zaloha) => {
  try {
    return JSON.parse(fs.readFileSync(cesta(p), "utf-8"));
  } catch {
    return zaloha;
  }
};

/** Kolik položek se vejde do jednoho zadání. Víc už není seznam, ale hromada. */
const NEJVYS = 40;

/**
 * Jak dlouho se čeká na vyřízení.
 *
 * Dvanáct hodin stačí i na velkou frontu. Delší čekání by znamenalo, že jeden
 * neodepsaný příznak umí zastavit celý provoz — a přesně to se 19. 9. stalo.
 */
const PLATNOST_HODIN = 12;

const sucho = process.argv.includes("--sucho");

const kandidati = cti("data/kandidati.json", []);
const navrhy = cti("data/navrhy.json", []);
const incidenty = cti("data/incidenty.json", []);
const fronta = cti("data/fronta/pro-patrola.json", []);

/*
  Co je ještě k práci.

  Dvě různé věci, obě se poznají z dat:

  - kandidát ve stavu „ceka“ — nikdo o něm nerozhodl,
  - návrh bez úředního zdroje — je zpracovaný, ale nemůže se zveřejnit sám.
    Tohle je od 20. 9. 2026 ta podstatnější půlka: úředních zdrojů sběr
    najednou čte pětatřicet, takže druhý zdroj k dohledání většinou existuje.
*/
function kPraci() {
  const ceka = kandidati
    .filter((k) => k.stav === "ceka")
    .map((k) => ({
      druh: "kandidat",
      id: k.id,
      popis: `${(k.publikovano ?? k.zachyceno).slice(0, 10)} · ${k.zeme ?? "—"} · ${k.titulek}`,
      url: k.zdroj?.url ?? null,
    }));

  const bezUradu = navrhy
    .filter((n) => (n.kam ?? "zaznam") === "zaznam" && !maUredniZdroj(n.zdroje ?? []))
    .map((n) => ({
      druh: "navrh",
      id: n.id,
      popis: `${(n.datumUdalosti ?? "").slice(0, 10)} · ${n.zeme ?? "—"} · ${n.titulek}`,
      url: (n.zdroje ?? [])[0]?.url ?? null,
    }));

  return { ceka, bezUradu };
}

/**
 * Je položka vyřízená? Poznává se z dat, ne z toho, co kdo napsal.
 *
 * - kandidát: už nečeká ve frontě (stal se návrhem, záznamem, nebo se odepsal),
 * - návrh: má úřední zdroj, nebo ve frontě návrhů vůbec není (zveřejnil se,
 *   nebo byl zamítnut).
 */
function jeVyrizena(polozka) {
  if (polozka.druh === "kandidat") {
    const k = kandidati.find((x) => x.id === polozka.id);
    return !k || k.stav !== "ceka";
  }
  const n = navrhy.find((x) => x.id === polozka.id);
  if (!n) return true;
  return maUredniZdroj(n.zdroje ?? []);
}

/* ---- 1. změřit předchozí zadání ------------------------------------- */

const puvodni = Array.isArray(fronta) ? fronta : [];
const hranice = Date.now() - PLATNOST_HODIN * 3_600_000;

/** Kolikrát už se položka vrátila v nějakém zadání. */
const kolikratZadano = new Map();
for (const z of puvodni) {
  for (const p of z.seznam ?? []) kolikratZadano.set(p.id, (kolikratZadano.get(p.id) ?? 0) + 1);
}

let nedodelky = [];
const ocistena = puvodni.map((z) => {
  if (z.stav !== "ceka") return z;

  const seznam = z.seznam ?? [];
  /*
    Zadání bez seznamu se změřit nedá — je to ruční úkol, nebo zadání z doby
    před seznamy. Jediné, co o něm víme, je jestli na ně někdo odpověděl.
    Odpověď se bere jako vyřízení; bez ní se po lhůtě zadání zavře jako
    propadlé, ať neblokuje provoz donekonečna.
  */
  if (!seznam.length) {
    if (String(z.odpoved ?? "").trim()) {
      console.log(`[zadani] ${z.id} bez seznamu, ale s odpovědí — zavírá se jako vyřízené`);
      return { ...z, stav: "hotovo", uzavreno: new Date().toISOString() };
    }
    if (new Date(z.zadano).getTime() >= hranice) return z;
    console.log(`[zadani] ${z.id} propadlo bez odpovědi`);
    return { ...z, stav: "propadlo", uzavreno: new Date().toISOString() };
  }

  const zbyva = seznam.filter((p) => !jeVyrizena(p));
  const hotovo = seznam.length - zbyva.length;

  if (!zbyva.length) {
    console.log(`[zadani] předchozí zadání ${z.id} hotové: ${hotovo} z ${seznam.length}`);
    return { ...z, stav: "hotovo", uzavreno: new Date().toISOString(), splneno: `${hotovo}/${seznam.length}` };
  }

  /* Ještě běží a lhůta neuplynula — nové zadání nevzniká, ať se nepřekrývají. */
  if (new Date(z.zadano).getTime() >= hranice) {
    console.log(`[zadani] ${z.id} se pořád dělá: hotovo ${hotovo} z ${seznam.length}, nové zadání nevzniká`);
    return { ...z, postup: `${hotovo}/${seznam.length}` };
  }

  console.log(`[zadani] ${z.id} NEDOKONČENO: hotovo ${hotovo} z ${seznam.length}, zbývá ${zbyva.length}`);
  nedodelky = [...nedodelky, ...zbyva];
  return {
    ...z,
    stav: "nedokonceno",
    uzavreno: new Date().toISOString(),
    splneno: `${hotovo}/${seznam.length}`,
    nedodelano: zbyva.map((p) => p.id),
  };
});

/* Když se na předchozím ještě pracuje, končíme — dvě zadání naráz by znamenala dvojí práci. */
if (ocistena.some((z) => z.stav === "ceka")) {
  console.log("[zadani] předchozí zadání se pořád dělá, nové nevzniká.");
  if (!sucho) fs.writeFileSync(cesta("data/fronta/pro-patrola.json"), `${JSON.stringify(ocistena, null, 2)}\n`);
  process.exit(0);
}

/* ---- 2. sestavit nové zadání ---------------------------------------- */

const { ceka, bezUradu } = kPraci();
const nedodelekId = new Set(nedodelky.map((p) => p.id));

/*
  Pořadí: nedodělky, pak návrhy bez úředního zdroje, pak neposouzení kandidáti.

  Nedodělky napřed proto, že jinak by se vracely donekonečna — pokaždé by je
  přeskočilo něco čerstvějšího.
*/
const seznam = [
  ...nedodelky,
  ...bezUradu.filter((p) => !nedodelekId.has(p.id)),
  ...ceka.filter((p) => !nedodelekId.has(p.id)),
].slice(0, NEJVYS);

if (!seznam.length) {
  console.log("[zadani] není co zadat: fronta je prázdná a každý návrh má úřední zdroj.");
  if (!sucho) fs.writeFileSync(cesta("data/fronta/pro-patrola.json"), `${JSON.stringify(ocistena, null, 2)}\n`);
  process.exit(0);
}

const poradi = (p, i) => {
  const vraceni = kolikratZadano.get(p.id) ?? 0;
  const znacka = vraceni ? ` [vráceno už ${vraceni}×]` : "";
  return `${String(i + 1).padStart(2, " ")}. ${p.id} · ${p.popis}${znacka}${p.url ? `\n    ${p.url}` : ""}`;
};

const navrhyVSeznamu = seznam.filter((p) => p.druh === "navrh");
const kandidatiVSeznamu = seznam.filter((p) => p.druh === "kandidat");

const casti = [
  `Seznam k vyřízení: ${seznam.length} položek. Projdi ho celý.`,
  "",
  "U KAŽDÉ položky musí po tobě zůstat stopa v datech — buď zápis, nebo",
  "odepsání s důvodem. Položka, ke které nic nenapíšeš, se počítá jako",
  "nevyřízená a vrátí se ti v dalším zadání.",
  "",
  "Pravidla jsou v PATROL.md na tvé větvi a nemění se. Nejčastěji to padá na:",
  "dva nezávislé zdroje vždycky, datum události není datum článku, původce až",
  "po úředním závěru, [DOPLNIT] se nenahrazuje odhadem.",
];

if (navrhyVSeznamu.length) {
  casti.push(
    "",
    `A) ${navrhyVSeznamu.length} NÁVRHŮ BEZ ÚŘEDNÍHO ZDROJE — dohledej ho`,
    "",
    "Tyhle jsou zpracované a na webu už jsou vidět jako nepotvrzené. Chybí jim",
    "druhý doklad z první ruky: úřad, policie, armáda, národní CERT nebo",
    "provozovatel zasažené infrastruktury. S ním se záznam zveřejní sám.",
    "",
    "Sběr od 20. 9. 2026 čte 35 úředních kanálů — vlády, ministerstva vnitra",
    "a obrany, bezpečnostní služby, CERTy a policie sledovaných zemí, k tomu",
    "NATO, ENISA, Evropskou komisi a provozovatele sítí (ČEPS, Správa železnic,",
    "ProRail). Seznam je v sber/zdroje-udalosti.ts v poli URADY. Hledej nejdřív",
    "tam; u nizozemské železnice je správný zdroj ProRail, ne médium.",
    "",
    "Když je u návrhu titulek cizojazyčný, přelož ho česky. Model, který to",
    "dělal při sběru, je od 20. 9. 2026 vypnutý.",
    "",
    "POZOR na to, na čem se to už jednou zlomilo: úřední zdroj je odkaz NA ÚŘAD.",
    "Zrcadlo tiskové zprávy (globalsecurity.org), distribuce (mynewsdesk.com)",
    "ani veřejnoprávní vysílatel (irozhlas.cz) úřední zdroj nejsou. Kvůli tomu",
    "se 20. 9. musely stáhnout z webu dva záznamy, které se zveřejnily samy.",
    "",
    ...navrhyVSeznamu.map(poradi),
  );
}

if (kandidatiVSeznamu.length) {
  casti.push(
    "",
    `B) ${kandidatiVSeznamu.length} NEPOSOUZENÝCH ZACHYCENÝCH ZPRÁV`,
    "",
    "Rozhodni, co je nová událost a co ne. U toho, co ne, napiš proč —",
    "tichý zápor vypadá zvenčí stejně jako porucha.",
    "",
    "TITULEK PIŠ ČESKY. Tohle je nové: do 20. 9. 2026 překládal cizojazyčné",
    "titulky model při sběru, jenže placené volání je vypnuté. Od té doby jdou",
    "na web anglicky, což je na české stránce vidět na první pohled. Překlad je",
    "teď na tobě — věcně, co se stalo a kde, bez ozdob.",
    "",
    "DATUM UDÁLOSTI URČI Z TEXTU. Zachycená zpráva nese datum vydání zdroje,",
    "a když ho zdroj neuvádí, datum, kdy si toho sběr všiml — takže dnešní.",
    "Na webu pak vypadají všechny zprávy jako dnešní, přestože se staly dřív.",
    "Do datumUdalosti patří den, kdy se to stalo. Když se z textu určit nedá,",
    "nech ho prázdný a napiš to do neznameho; nehádej podle data článku.",
    "",
    ...kandidatiVSeznamu.map(poradi),
  );
}

casti.push(
  "",
  "Až budeš hotov, napiš do odpovědi u tohohle zadání shrnutí po položkách.",
  "Hotovost se ale nepočítá z odpovědi, nýbrž z dat — kandidát nesmí zůstat",
  "ve stavu „ceka“ a návrh musí mít úřední zdroj, nebo být pryč.",
  "",
  "Frontu kandidátů odepisovat nemusíš: srovná ji automaticky běh, který tvou",
  "práci přebírá. Tvoje je rozhodnutí a zdroje, ne účetnictví.",
);

const zadani = casti.join("\n").slice(0, 12000);

if (sucho) {
  console.log(zadani);
  console.log(`\n[zadani] nasucho: ${seznam.length} položek (${navrhyVSeznamu.length} návrhů, ${kandidatiVSeznamu.length} kandidátů)`);
  process.exit(0);
}

fs.mkdirSync(cesta("data/fronta"), { recursive: true });
fs.writeFileSync(
  cesta("data/fronta/pro-patrola.json"),
  `${JSON.stringify([...ocistena, {
    id: `z-${Date.now().toString(36)}`,
    zadano: new Date().toISOString(),
    zadal: "fronta",
    stav: "ceka",
    seznam,
    zadani,
  }], null, 2)}\n`,
);
console.log(`[zadani] zapsáno ${seznam.length} položek: ${navrhyVSeznamu.length} návrhů bez úředního zdroje, ${kandidatiVSeznamu.length} kandidátů, z toho ${nedodelky.length} nedodělků.`);
