import fs from "node:fs";
import path from "node:path";
import { UROVNE } from "../src/lib/skala";
import type { CelkovyStav, Incident, MimoradnySignal, Uroven } from "../src/lib/typy";

/*
  Celkové hodnocení počítá automat.

  Rozhodnutí provozovatelky z 23. 9. 2026: celkové hodnocení nestanovuje
  člověk a nesmí být starší než jeden den. Do té doby stálo v data/stav.json
  ručně zapsané hodnocení z 5. 9. — osmnáct dní staré, a web ho přitom
  ukazoval jako dnešní stav.

  Hodnocení je MĚŘENÍ, ne předpověď (pravidlo č. 3c): počítá se jen z už
  zveřejněných a ověřených záznamů, pravidlem, které jde přepočítat ručně.

  Pravidlo
  --------
  - Vstupují případy a aktualizace ověřené člověkem nebo doložené úředním
    zdrojem (overeni „automaticke“). Záznamy „neověřeno úředně“, reakce,
    opatření a historické záznamy nevstupují — neověřené nesmí hýbat
    hodnocením (pravidlo č. 0, bod 4).
  - Okno je 14 dní podle data zjištění (nové úřední zjištění ke staršímu
    případu je signál, metodika to tak říká).
  - Úroveň je MEDIÁN závažnosti případů v okně. Jediná událost hodnocení
    nezvedne; zvedne ho až opakování — to je „změna vzorce“ z metodiky.
    Při méně než třech případech rozhoduje nejmírnější z nich, bez případu
    je úroveň Nízká (G2).
  - Případ mimo Česko se počítá o jeden stupeň níž. Závažnost záznamu se
    určuje pro zemi, kde se to stalo; celkové hodnocení je pohled z Česka.
    Kalibrováno 23. 9. 2026 na ručních hodnoceních z archivu: za září
    (od kdy běží úplný monitoring) dává pravidlo přesně tutéž úroveň jako
    ruční hodnocení (YO), bez posunu o stupeň nahoru, který by dala
    neupravená závažnost.
  - Trend porovnává součet závažností (čísla z 10) za posledních 7 dní se
    7 dny předtím: o čtvrtinu a aspoň o 3 body víc = nahoru, o pětinu
    a aspoň o 3 body míň = dolů, jinak beze změny.
*/

/*
  Mimořádný signál vyhodnocený redakcí (rozhodnutí provozovatelky 26. 9. 2026).

  Medián z ověřených případů nezachytí výrok, který sám nic nezničil, ale
  v minulosti předcházel válce — Putinovo tvrzení z 25. 9. 2026, že Pobaltí
  porušuje práva ruskojazyčných obyvatel, stejné jako před útoky na Ukrajinu
  v letech 2014 a 2022. Takový signál smí zapsat jen provozovatelka do
  data/mimoradne-signaly.json a pojistky drží výjimku malou:

  - zvedá nejvýš o JEDEN stupeň, i když platí signálů víc,
  - platí jen do `platiDo`, nejvýš 14 dní (hlídá kontrola dat); pak se
    hodnocení samo vrátí na spočtenou úroveň,
  - stav nese i spočtenou úroveň a důvod, a web je u hodnocení ukáže —
    čtenář vždy vidí, že jde o naše vyhodnocení a že výrok nemusí být pravdivý.
*/
export function platneSignaly(signaly: MimoradnySignal[], ted = Date.now()): MimoradnySignal[] {
  return signaly
    .filter((s) => new Date(s.vyhodnoceno).getTime() <= ted && ted <= new Date(s.platiDo).getTime())
    .sort((a, b) => b.vyhodnoceno.localeCompare(a.vyhodnoceno));
}

const OKNO_DNI = 14;
const DEN = 86_400_000;

const pripad = (i: Incident) => (i.druh ?? (i.puvodce ? "pripad" : "reakce"));
const kdy = (i: Incident) => new Date(i.datumZjisteni ?? i.datumUdalosti).getTime();
const cislo = (u: Uroven) => UROVNE[u].poradi;
const PORADI = (Object.keys(UROVNE) as Uroven[]).sort((a, b) => cislo(a) - cislo(b));
const zDeseti = (u: Uroven) => Math.round((UROVNE[u].poradi / 13) * 10 * 10) / 10;

export function vstupujeDoHodnoceni(i: Incident): boolean {
  const d = pripad(i);
  if (d !== "pripad" && d !== "aktualizace") return false;
  if (i.historicky || i.archivniZaznam) return false;
  return i.lidskyOvereno === true || i.overeni === "automaticke";
}

const pripadu = (n: number) => `${n} ${n === 1 ? "případ" : n >= 2 && n <= 4 ? "případy" : "případů"}`;

/*
  `posledniSber` = kdy naposledy doběhl sběr. Když je starší než den, trend
  se nepočítá: méně záznamů by pak neznamenalo klid, ale výpadek — a zápor
  z nedostupných zdrojů se nepotvrzuje (pravidlo č. 4). 23. 9. 2026 by
  jinak web ukázal „trend dolů" jen proto, že sběr stál.
*/
export function spocitejStav(incidenty: Incident[], ted = Date.now(), posledniSber: string | null = null, signaly: MimoradnySignal[] = []): CelkovyStav {
  const platne = incidenty.filter(vstupujeDoHodnoceni);
  const vOkne = platne.filter((i) => kdy(i) > ted - OKNO_DNI * DEN && kdy(i) <= ted);
  const tyden = vOkne.filter((i) => kdy(i) > ted - 7 * DEN);
  const predtim = vOkne.filter((i) => kdy(i) <= ted - 7 * DEN);

  const upravene = vOkne.map((i) => Math.max(1, cislo(i.zavaznost) - (i.kodZeme === "CZ" ? 0 : 1))).sort((a, b) => a - b);
  const poradi = !upravene.length ? cislo("G2") : upravene.length < 3 ? upravene[0] : upravene[Math.floor((upravene.length - 1) / 2)];
  const zakladni = PORADI[poradi - 1];
  const signal = platneSignaly(signaly, ted)[0] ?? null;
  const uroven = signal ? PORADI[Math.min(PORADI.length, poradi + 1) - 1] : zakladni;

  const soucet = (xs: Incident[]) => Math.round(xs.reduce((s, i) => s + zDeseti(i.zavaznost), 0) * 10) / 10;
  const s1 = soucet(tyden);
  const s0 = soucet(predtim);
  const sberStoji = !posledniSber || ted - new Date(posledniSber).getTime() > DEN;
  const trend: CelkovyStav["trend"] = sberStoji
    ? null
    : s1 >= s0 * 1.25 && s1 - s0 >= 3 ? "nahoru" : s1 <= s0 * 0.8 && s0 - s1 >= 3 ? "dolu" : "beze-zmeny";

  const pasmo = (i: Incident) => UROVNE[i.zavaznost].pasmo;
  const noveSignaly = {
    celkem: tyden.length,
    kriticke: tyden.filter((i) => pasmo(i) === "cervena").length,
    vysoke: tyden.filter((i) => pasmo(i) === "oranzova").length,
    stredni: tyden.filter((i) => pasmo(i) === "zluta").length,
  };

  const zeme = new Set(vOkne.map((i) => i.zeme));
  const shrnuti = vOkne.length
    ? `Spočteno z ověřených případů za posledních 14 dní (${pripadu(vOkne.length)}) v ${zeme.size} ${zeme.size === 1 ? "zemi" : "zemích"}. Úroveň je jejich střední závažnost z pohledu Česka, jediná událost ji nezvedne. Je to měření, ne předpověď.`
    : "Za posledních 14 dní není žádný ověřený případ. Je to měření, ne předpověď.";

  return {
    aktualizovano: new Date(ted).toISOString(),
    uroven,
    trend,
    trendPopis: sberStoji
      ? "Sběr dat den neproběhl, trend se proto nepočítá."
      : `Posledních 7 dní: ${pripadu(tyden.length)} (součet závažnosti ${s1}). Týden předtím: ${pripadu(predtim.length)} (${s0}).`,
    shrnuti: signal ? `${shrnuti} Teď o jeden stupeň výš kvůli mimořádnému signálu, který jsme vyhodnotili sami: ${signal.kratce}.` : shrnuti,
    noveSignaly,
    mimoradny: signal
      ? { zakladni, kratce: signal.kratce, proc: signal.proc, mez: signal.mez, zaznam: signal.zaznam ?? null, platiDo: signal.platiDo }
      : null,
  };
}

/*
  Zápis jen při změně, nebo když je hodnocení starší než 20 hodin. Hodinový
  sběr by jinak commitoval stav.json každou hodinu jen kvůli času, a web by
  se kvůli tomu zbytečně přestavoval.
*/
export function aktualizujStav(koren = path.join(process.cwd(), "data"), ted = Date.now()): { zmena: boolean; stav: CelkovyStav } {
  const incidenty = JSON.parse(fs.readFileSync(path.join(koren, "incidenty.json"), "utf-8")) as Incident[];
  const soubor = path.join(koren, "stav.json");
  const stary = fs.existsSync(soubor) ? (JSON.parse(fs.readFileSync(soubor, "utf-8")) as CelkovyStav) : null;
  const beh = path.join(koren, "fronta", "posledni-beh.json");
  const posledniSber = fs.existsSync(beh) ? ((JSON.parse(fs.readFileSync(beh, "utf-8")) as { kdy?: string }).kdy ?? null) : null;
  const souborSignalu = path.join(koren, "mimoradne-signaly.json");
  /* Poškozený soubor signálů nesmí zastavit přepočet — hodnocení pak jde bez něj. */
  let signaly: MimoradnySignal[] = [];
  try { if (fs.existsSync(souborSignalu)) signaly = (JSON.parse(fs.readFileSync(souborSignalu, "utf-8")) as { signaly?: MimoradnySignal[] }).signaly ?? []; } catch { signaly = []; }
  const novy = spocitejStav(incidenty, ted, posledniSber, signaly);
  const bezCasu = (s: CelkovyStav | null) => (s ? JSON.stringify({ ...s, aktualizovano: null }) : "");
  const stari = stary?.aktualizovano ? ted - new Date(stary.aktualizovano).getTime() : Infinity;
  if (bezCasu(stary) === bezCasu(novy) && stari < 20 * 3_600_000) return { zmena: false, stav: stary! };
  fs.writeFileSync(soubor, `${JSON.stringify(novy, null, 2)}\n`, "utf-8");
  return { zmena: true, stav: novy };
}
