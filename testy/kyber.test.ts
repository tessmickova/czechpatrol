import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { druhZpravy, rozdelTitulek, stavKyber, vyberZpravy, type ZpravaKyber } from "../src/lib/kyber";
// @ts-expect-error — .mjs nástroj bez typů
import { radekKyber, sestavKyber, vyberKyber } from "../nastroje/rozhlas.mjs";
// @ts-expect-error — .mjs nástroj bez typů
import { privilegovanePokyny } from "../nastroje/privilegovane-pokyny.mjs";

/*
  Internet v Česku (1. 10. 2026): útoky, podvody, výpadky. Jeden článek
  poplach nedělá a Telegram dostane zprávu nejvýš jednou za 24 hodin.
*/
const ted = Date.parse("2026-10-01T06:00:00Z");
const pred = (h: number) => new Date(ted - h * 3_600_000).toUTCString();
const p = (nadpis: string, h = 2) => ({ nadpis, odkaz: `https://news.google.com/rss/articles/${encodeURIComponent(nadpis)}`, publikovano: pred(h) });
const z = (o: Partial<ZpravaKyber>): ZpravaKyber => ({ id: "x", druh: "ddos", titulek: "t", vydavatel: "A", odkaz: "https://x", kdy: new Date(ted - 3_600_000).toISOString(), uredni: false, ...o });

describe("výběr zpráv o internetu", () => {
  it("vydavatel z titulku Google News", () => {
    expect(rozdelTitulek("Hackeři přetížili weby krajů - iROZHLAS")).toEqual({ titulek: "Hackeři přetížili weby krajů", vydavatel: "iROZHLAS" });
  });
  it("pozná druh zprávy", () => {
    expect(druhZpravy("Proruští hackeři NoName057(16) útočí DDoS na české weby")).toBe("ddos");
    expect(druhZpravy("Policie varuje před podvodnými SMS jménem České pošty")).toBe("podvod");
    expect(druhZpravy("Výpadek bankovní aplikace, hlásí Downdetector")).toBe("vypadek");
    expect(druhZpravy("Fotbalová liga začíná")).toBeNull();
    // Běžné zprávy z obecných kanálů do banneru o internetu nepatří.
    expect(druhZpravy("Soud poslal podvodníka, který okradl seniory, do vězení")).toBeNull();
    expect(druhZpravy("Výpadek proudu zasáhl tři obce na Vysočině")).toBeNull();
    expect(druhZpravy("Přetížená urgentní příjmová oddělení nemocnic")).toBeNull();
    expect(druhZpravy("Muž byl napaden v tramvaji")).toBeNull();
    expect(druhZpravy("Pozor na falešné e-shopy s levnou elektronikou")).toBe("podvod");
    expect(druhZpravy("Hackeři zahltili weby krajů")).toBe("ddos");
    expect(druhZpravy("Hackeři napadli systém nemocnice ransomwarem")).toBe("utok");
    expect(druhZpravy("Útočníci zahltili weby ministerstev")).toBe("ddos");
    expect(druhZpravy("Výpadek bankovnictví ČSOB, klienti se nemohou přihlásit")).toBe("vypadek");
    // Falešné výpadky z prvního ostrého běhu 1. 10. 2026.
    expect(druhZpravy("Vymáhání z ciziny příliš nefunguje, řidiče čeká v Česku přísnější systém pokut")).toBeNull();
    expect(druhZpravy("Heslo do BIOSu už dnes skoro nikdo nenastavuje. Přesto na základní desce najdete piny pro jeho vymazání")).toBeNull();
    expect(druhZpravy("Internetové bankovnictví Komerční banky nefunguje")).toBe("vypadek");
    expect(druhZpravy("Výpadek mobilní sítě O2 zasáhl celé Česko")).toBe("vypadek");
  });
  it("jen české, jen čerstvé, bez duplicit; úřad se pozná podle vydavatele", () => {
    const v = vyberZpravy([
      p("DDoS útok vyřadil weby krajů - iROZHLAS"),
      p("DDoS útok vyřadil weby krajů - Novinky.cz"),
      p("Policie ČR varuje před podvodnými SMS - Policie ČR"),
      p("DDoS attack hits Spanish ministry - Reuters"),
      p("Hackeři útočí na weby krajů - Seznam Zprávy", 24 * 9),
    ], ted);
    expect(v.map((x) => x.titulek)).toEqual(["DDoS útok vyřadil weby krajů", "Policie ČR varuje před podvodnými SMS"]);
    expect(v.find((x) => x.druh === "podvod")?.uredni).toBe(true);
  });
});

describe("stav internetu", () => {
  it("jeden článek poplach nedělá", () => {
    expect(stavKyber([z({})], ted)).toBe("klid");
  });
  it("dva různí vydavatelé o přetěžování = vlna útoků", () => {
    expect(stavKyber([z({ id: "a", vydavatel: "A" }), z({ id: "b", vydavatel: "B" })], ted)).toBe("utok");
  });
  it("úřad hlásí útok = vlna útoků; úřad varuje před podvody = pozor", () => {
    expect(stavKyber([z({ uredni: true })], ted)).toBe("utok");
    expect(stavKyber([z({ druh: "podvod", uredni: true })], ted)).toBe("pozor");
  });
  it("výpadky samy pozornost nezvedají; staré zprávy taky ne", () => {
    expect(stavKyber([z({ druh: "vypadek", id: "a" }), z({ druh: "vypadek", id: "b" })], ted)).toBe("klid");
    expect(stavKyber([z({ id: "a", vydavatel: "A", kdy: new Date(ted - 50 * 3_600_000).toISOString() }), z({ id: "b", vydavatel: "B", kdy: new Date(ted - 50 * 3_600_000).toISOString() })], ted)).toBe("pozor");
  });
});

describe("internet v Telegramu", () => {
  const snimek = (o: object) => ({ nacteno: new Date(ted - 3_600_000).toISOString(), stav: "utok", zpravy: [z({ uredni: true, vydavatel: "NÚKIB" })], ...o });
  it("začátek vlny pošle jednou, pak nejvýš jednou za 24 hodin", () => {
    expect(vyberKyber(snimek({}), {}, { ted })).toEqual({ duvod: "vlna" });
    expect(vyberKyber(snimek({}), { kyber: { stav: "utok", posledni: new Date(ted - 2 * 3_600_000).toISOString(), varovani: [] } }, { ted })).toBeNull();
    expect(vyberKyber(snimek({}), { kyber: { stav: "utok", posledni: new Date(ted - 30 * 3_600_000).toISOString(), varovani: ["x"] } }, { ted })).toBeNull();
  });
  it("nové varování úřadu jde jednou; stará data nic nepošlou", () => {
    const s = snimek({ stav: "pozor", zpravy: [z({ druh: "podvod", uredni: true, id: "v1" })] });
    expect(vyberKyber(s, {}, { ted })?.duvod).toBe("varovani");
    expect(vyberKyber(s, { kyber: { varovani: ["v1"] } }, { ted })).toBeNull();
    expect(vyberKyber(snimek({ nacteno: new Date(ted - 10 * 3_600_000).toISOString() }), {}, { ted })).toBeNull();
  });
  it("zpráva je krátká, klidná a bez pokynů k evakuaci a podobně", () => {
    const t = sestavKyber(snimek({}), { duvod: "vlna" });
    expect(t.split("\n").length).toBeLessThanOrEqual(5);
    expect(t).toContain("Peníze ani data tím ohrožené nejsou");
    expect(privilegovanePokyny(t)).toEqual([]);
    expect(radekKyber(snimek({}), ted)).toContain("vlna útoků");
    expect(radekKyber(snimek({ stav: "klid" }), ted)).toBeNull();
  });
  it("rozhlas se spustí i při změně dat o internetu", () => {
    expect(fs.readFileSync(".github/workflows/rozhlas.yml", "utf-8")).toContain('"data/kyber.json"');
  });
});

describe("zdroje pro internet", () => {
  it("přímé kanály úřadů a médií, žádné vyhledávání Google News (robots.txt ho zakazuje)", async () => {
    const { zdrojeKyber } = await import("../sber/kyber");
    const z = zdrojeKyber();
    expect(z.length).toBeGreaterThanOrEqual(12);
    expect(z.some((x) => x.klic === "aktualne")).toBe(false);
    expect(z.some((x) => x.klic === "nukib-rss" && x.primarni)).toBe(true);
    expect(z.every((x) => !x.url.includes("news.google.com"))).toBe(true);
  });
  it("přímý kanál: vydavatel ze zdroje, úřad podle zdroje", () => {
    const v = vyberZpravy([{ nadpis: "Upozornění na podvodné SMS jménem Policie ČR", odkaz: "https://www.policie.cz/x", publikovano: new Date(ted - 3_600_000).toISOString(), zdroj: "Policie ČR", uredniZdroj: true }], ted);
    expect(v[0]).toMatchObject({ vydavatel: "Policie ČR", uredni: true, druh: "podvod" });
  });
});

describe("hromadný výpadek zdrojů se nahlásí", () => {
  it("známé blokace robots.txt nehlásí znovu; nové ano; ostatní výpadky od čtvrtiny", async () => {
    const { zpravaOVypadku } = await import("../sber/udalosti");
    const gn = Array.from({ length: 150 }, (_, i) => ({ klic: `t-${i}`, chyba: "robots.txt stahování nepovoluje" }));
    const zname = gn.map((c) => c.klic);
    expect(zpravaOVypadku(270, gn, zname).zprava).toBeNull();
    expect(zpravaOVypadku(270, [...gn, { klic: "novinky", chyba: "robots.txt stahování nepovoluje" }], zname).zprava).toContain("nově zakazuje čtení robots.txt u 1 zdrojů (novinky)");
    const vypadky = Array.from({ length: 30 }, (_, i) => ({ klic: `p-${i}`, chyba: "HTTP 500" }));
    expect(zpravaOVypadku(270, [...gn, ...vypadky], zname).zprava).toContain("nečte se 30 z 120 dostupných zdrojů");
    expect(zpravaOVypadku(270, [...gn, ...vypadky.slice(0, 10)], zname).zprava).toBeNull();
  });
});

/*
  Box Internet v Česku (4. 11. 2026): krátké názvy toho, co se děje,
  s vlajkou země, aby „útok na krevní banky“ nevypadal jako Česko.
  Titulky jsou skutečné z archivu.
*/
import { coZpravy, radkyInternetu, zemeZpravy } from "../src/lib/kyber";
import { sestavSouhrnInternetu } from "../src/lib/kyber-souhrn";

describe("co se děje a kde", () => {
  it("pozná zemi z titulku; původce není místo", () => {
    expect(zemeZpravy("Krevní banky ve Francii čelily kyberútoku, ale zasáhly včas")).toBe("FR");
    expect(zemeZpravy("Až 50 stupňů v lednici. Obchody v Belgii, Lucembursku a Švédsku zasáhl kyberútok, podobný jako ve Francii")).toBe("BE");
    expect(zemeZpravy("ČVUT čelí kybernetickému útoku, údajně doplatilo na kritickou chybu v PHP")).toBe("CZ");
    expect(zemeZpravy("Obchodních řetězců v Česku se francouzský kyberútok nedotkl, krizové plány však mají")).toBe("CZ");
    expect(zemeZpravy("Největší hackerská krádež v historii. Z burzy Binance zmizelo 133 miliard korun, podezření padá na KLDR")).toBeNull();
    expect(zemeZpravy("Masivní kyberútok zasáhl Discord")).toBeNull();
  });
  it("pojmenuje cíl: krevní banky, chlazení v obchodech, univerzita, podvodné e-maily", () => {
    expect(coZpravy({ druh: "utok", titulek: "Další kybernetický útok. Francie čelila úderu na krevní banky" })).toBe("útok na krevní banky");
    expect(coZpravy({ druh: "utok", titulek: "Belgie a Švédsko hlásí kyberútoky na chladicí boxy v supermarketech" })).toBe("útok na chlazení v obchodech");
    expect(coZpravy({ druh: "utok", titulek: "ČVUT čelí kybernetickému útoku, doplatilo na kritickou chybu v PHP" })).toBe("útok na univerzitu");
    expect(coZpravy({ druh: "vypadek", titulek: "Albert má už druhý den výpadek aplikace. Schovejte si účtenky, radí řetězec" })).toBe("výpadek: obchody");
    expect(coZpravy({ druh: "podvod", titulek: "Český rozhlas varuje před podvodnými e-maily. Vyzývají k platbě poplatků a hrozí exekucí" })).toBe("podvodné e-maily");
    expect(coZpravy({ druh: "ddos", titulek: "Hackeři přetížili weby krajů" })).toBe("přetížené weby: úřady");
    expect(coZpravy({ druh: "utok", titulek: "Masivní kyberútok zasáhl Discord" })).toBe("útok na sociální síť");
  });
  it("táž věc z více redakcí je jeden řádek s počtem; nejvýš tři řádky", () => {
    const r = radkyInternetu([
      { druh: "utok", titulek: "Krevní banky ve Francii čelily kyberútoku", kdy: "2026-11-04T10:00:00Z" },
      { druh: "utok", titulek: "Další kybernetický útok. Francie čelila úderu na krevní banky", kdy: "2026-11-04T09:00:00Z" },
      { druh: "utok", titulek: "Belgie a Švédsko hlásí kyberútoky na chladicí boxy v supermarketech", kdy: "2026-11-02T11:00:00Z" },
      { druh: "podvod", titulek: "Pneumatiky nikde, peníze fuč. Firma naletěla falešnému e-shopu", kdy: "2026-11-03T08:00:00Z" },
      { druh: "utok", titulek: "Masivní kyberútok zasáhl Discord", kdy: "2026-10-08T08:00:00Z" },
    ]);
    expect(r).toEqual([
      { kodZeme: "FR", co: "útok na krevní banky", pocet: 2 },
      { kodZeme: null, co: "falešné e-shopy", pocet: 1 },
      { kodZeme: "BE", co: "útok na chlazení v obchodech", pocet: 1 },
    ]);
  });
  it("souhrn bere zprávy za 72 h ze snímku i archivu, bez duplicit; bez čerstvého snímku nic netvrdí", () => {
    const ted = Date.parse("2026-11-04T18:00:00Z");
    const a = z({ id: "a", druh: "utok", titulek: "Krevní banky ve Francii čelily kyberútoku", kdy: "2026-11-04T10:00:00Z" });
    const b = z({ id: "b", druh: "utok", titulek: "Belgie a Švédsko hlásí kyberútoky na chladicí boxy v supermarketech", kdy: "2026-11-02T11:00:00Z" });
    const stary = z({ id: "c", druh: "utok", titulek: "Kyberútok na Rohlík", kdy: "2026-10-11T10:00:00Z" });
    const s = sestavSouhrnInternetu({ aktualizovano: "2026-11-04T17:00:00Z", nacteno: "2026-11-04T17:00:00Z", stav: "klid", zpravy: [a] }, [a, b, stary], ted);
    expect(s.cerstve).toBe(true);
    expect(s.pocet72).toBe(2);
    expect(s.radky.map((r) => r.co)).toEqual(["útok na krevní banky", "útok na chlazení v obchodech"]);
    expect(s.posledni.map((p) => p.id)).toEqual(["a", "b"]);
    const bezDat = sestavSouhrnInternetu({ aktualizovano: null, nacteno: "2026-11-02T10:00:00Z", stav: "klid", zpravy: [] }, [a], ted);
    expect(bezDat.cerstve).toBe(false);
    expect(bezDat.stav).toBeNull();
  });
});
