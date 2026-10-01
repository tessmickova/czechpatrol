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
    expect(z.some((x) => x.klic === "nukib-rss" && x.primarni)).toBe(true);
    expect(z.every((x) => !x.url.includes("news.google.com"))).toBe(true);
  });
  it("přímý kanál: vydavatel ze zdroje, úřad podle zdroje", () => {
    const v = vyberZpravy([{ nadpis: "Upozornění na podvodné SMS jménem Policie ČR", odkaz: "https://www.policie.cz/x", publikovano: new Date(ted - 3_600_000).toISOString(), zdroj: "Policie ČR", uredniZdroj: true }], ted);
    expect(v[0]).toMatchObject({ vydavatel: "Policie ČR", uredni: true, druh: "podvod" });
  });
});

describe("hromadný výpadek zdrojů se nahlásí", () => {
  it("od čtvrtiny katalogu; řekne, kolik zakazuje robots.txt", async () => {
    const { zpravaOVypadku } = await import("../sber/udalosti");
    expect(zpravaOVypadku(100, Array(10).fill("HTTP 500"))).toBeNull();
    expect(zpravaOVypadku(100, [...Array(30).fill("robots.txt stahování nepovoluje"), "HTTP 500"])).toBe("Sběr událostí: nečte se 31 z 100 zdrojů, z toho 30 zakazuje robots.txt. Bez nich sběr může přehlédnout události.");
  });
});
