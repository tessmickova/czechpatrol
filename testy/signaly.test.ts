import { describe, expect, it } from "vitest";
import { jeCiziVeFronte, jeSignal } from "../src/lib/signaly";
import { naliehaveVOkne } from "../src/lib/naliehave";

/*
  Sloupec „Signály z médií“ a box „Souhrn situace“ stojí na stejných
  zachycených zprávách. Co Souhrn počítá jako naléhavé, musí být vidět
  i ve sloupci — bez ohledu na jazyk titulku.
*/
const nal = { druh: "vzdusny-prostor-nato", proc: "test" };

describe("signály z médií", () => {
  it("naléhavá zpráva se bere i v cizím jazyce", () => {
    expect(jeSignal({ titulek: "Drone crashes in Latvia: NATO aircraft deployed", kodZeme: "LV", naliehave: nal })).toBe(true);
    expect(jeSignal({ titulek: "Poľsko posilňuje hranicu s Kaliningradom", kodZeme: "PL", naliehave: nal })).toBe(true);
  });
  it("běžná cizojazyčná zpráva zůstává jen ve frontě", () => {
    const k = { titulek: "Drone debris found on Romanian beach", kodZeme: "RO", naliehave: null };
    expect(jeSignal(k)).toBe(false);
    expect(jeCiziVeFronte(k)).toBe(true);
  });
  it("česká zpráva projde, projev bez skutku a údery uvnitř Ukrajiny ne", () => {
    expect(jeSignal({ titulek: "Polsko zřídilo speciální jednotku kvůli možným sabotážím", kodZeme: "PL", naliehave: null })).toBe(true);
    expect(jeSignal({ titulek: "Prezident varoval před hrozbou pro Evropu", kodZeme: "CZ", naliehave: null })).toBe(false);
    expect(jeSignal({ titulek: "Rusko v noci zasáhlo drony elektrárnu u Charkova", kodZeme: "UA", naliehave: null })).toBe(false);
  });
  it("naléhavé, které počítá Souhrn situace, jsou všechny i signálem", () => {
    const ted = Date.parse("2026-11-03T09:00:00Z");
    const fronta = [
      { id: "a", titulek: "Drone crashes in Latvia", kodZeme: "LV", naliehave: nal, publikovano: "2026-11-03T06:09:00Z", zachyceno: "2026-11-03T07:00:00Z" },
      { id: "b", titulek: "Polsko zahájilo operaci u Kaliningradské oblasti", kodZeme: "PL", naliehave: nal, publikovano: "2026-11-02T10:00:00Z", zachyceno: "2026-11-02T11:00:00Z" },
      { id: "c", titulek: "Old urgent item", kodZeme: "PL", naliehave: nal, publikovano: "2026-10-20T10:00:00Z", zachyceno: "2026-10-20T11:00:00Z" },
    ];
    for (const k of naliehaveVOkne(fronta, ted)) expect(jeSignal(k), k.id).toBe(true);
    expect(fronta.filter(jeCiziVeFronte)).toEqual([]);
  });
});

/*
  Jedna událost, víc zpráv (3. 11. 2026): nouzové přistání u Varšavy přišlo
  z pěti redakcí a ve sloupci stálo pětkrát. Titulky jsou skutečné.
*/
import { pocetZdroju, seskupSignaly } from "../src/lib/signaly";

const z = (id: string, kod: string, kdy: string, nazev: string, url: string, titulek: string, naliehave: { druh: string } | null = null) =>
  ({ id, kodZeme: kod, publikovano: kdy, zachyceno: kdy, zdroj: { nazev, url }, titulek, naliehave });

// Pozadí: běžné titulky, aby „dopadl“ nebo „vesnice“ byla častá slova a nerozhodovala.
const pozadi = Array.from({ length: 30 }, (_, i) => z(`p${i}`, "MD", "2026-10-01T10:00:00Z", "Zdroj", `https://x.md/${i}`, "Moldavsko: dron dopadl a explodoval u vesnice, policie zajistila místo"));

describe("jedna událost, víc zpráv", () => {
  const varsava = [
    z("a", "PL", "2026-11-03T09:30:00Z", "SME (Slovensko)", "https://www.sme.sk/x", "Bombová hrozba prinútila lietadlo so 181 ľuďmi na palube núdzovo pristáť pri Varšave"),
    z("b", "PL", "2026-11-03T10:14:00Z", "Seznam Zprávy", "https://www.seznamzpravy.cz/x", "Na letišti u Varšavy neplánovaně přistál letoun kvůli bombové hrozbě"),
    z("c", "PL", "2026-11-03T09:52:00Z", "iDNES.cz — zpravodajství", "https://www.idnes.cz/x", "U Varšavy přistál letoun kvůli bombové hrozbě, letiště uzavřeli"),
    z("d", "PL", "2026-11-03T09:43:00Z", "Novinky.cz", "https://www.novinky.cz/x", "Na letišti v Modlině u Varšavy kvůli bombové hrozbě neplánovaně přistál letoun z Londýna se 181 lidmi"),
  ];
  it("české redakce i slovenská o témže přistání jsou jedna událost; zastupuje ji nejnovější česká", () => {
    const s = seskupSignaly([...pozadi, ...varsava]).filter((g) => g.polozky.some((p) => p.kodZeme === "PL"));
    expect(s).toHaveLength(1);
    expect(s[0].hlavni.id).toBe("b");
    expect(s[0].polozky.map((p) => p.id)).toEqual(["b", "c", "d", "a"]);
    expect(pocetZdroju(s[0].polozky)).toBe(4);
  });
  it("dvě různé události v téže zemi téhož dne se neslijí", () => {
    const d1 = z("m1", "MD", "2026-10-01T09:00:00Z", "A", "https://a.md/1", "Moldavsko: dron Geran-4 dopadl a explodoval u vesnice Cotiujeni v okrese Briceni");
    const d2 = z("m2", "MD", "2026-10-01T11:00:00Z", "B", "https://b.md/2", "Moldavsko: dron s kamerou dopadl a explodoval u vesnice Cernița v okrese Florești");
    const s = seskupSignaly([...pozadi, d1, d2]);
    expect(s.find((g) => g.polozky.some((p) => p.id === "m1"))!.polozky.map((p) => p.id)).toEqual(["m1"]);
  });
  it("naléhavé zprávy stejného druhu o téže zemi patří k sobě i přes jazyky; jiná země ne", () => {
    const n = { druh: "vzdusny-prostor-nato" };
    const lv1 = z("l1", "LV", "2026-11-03T10:44:00Z", "Novinky.cz", "https://www.novinky.cz/y", "Lotyšům se nepodařilo sestřelit dron, který narušil vzdušný prostor", n);
    const lv2 = z("l2", "LV", "2026-11-03T06:09:00Z", "Ukrainska Pravda (anglicky)", "https://www.pravda.com.ua/eng/y", "Drone crashes in Latvia: NATO aircraft and interceptor drones deployed", n);
    const pl = z("p", "PL", "2026-11-02T10:00:00Z", "Novinky.cz", "https://www.novinky.cz/z", "Polsko zahájilo speciální bezpečnostní operaci u Kaliningradské oblasti", { druh: "hranice-nato" });
    const s = seskupSignaly([...pozadi, lv1, lv2, pl]);
    expect(s.find((g) => g.hlavni.id === "l1")!.polozky.map((p) => p.id)).toEqual(["l1", "l2"]);
    expect(s.find((g) => g.hlavni.id === "p")!.polozky).toHaveLength(1);
  });
  it("zpráva, která sdílí slova s jednou skupinou a druh s druhou, obě spojí (Polsko u Kaliningradu 2. 11. 2026)", () => {
    const n = { druh: "hranice-nato" };
    const polsko = [
      z("ki", "PL", "2026-11-03T06:04:00Z", "The Kyiv Independent", "https://kyivindependent.com/x", "Poland deploys counterterrorism police near Russian border amid sabotage warnings"),
      z("nov", "PL", "2026-11-02T19:22:00Z", "Novinky.cz", "https://www.novinky.cz/a", "Polsko zřídilo speciální jednotku kvůli možným ruským sabotážím", n),
      z("idn", "PL", "2026-11-02T16:46:00Z", "iDNES.cz — zpravodajství", "https://www.idnes.cz/a", "Polsko zahájilo speciální bezpečnostní operaci u Kaliningradské oblasti", n),
      z("nfp", "PL", "2026-11-02T14:34:00Z", "Notes from Poland", "https://notesfrompoland.com/a", "Poland launches operation along Russian border in response to reports of planned sabotage", n),
    ];
    const s = seskupSignaly([...pozadi, ...polsko]).filter((g) => g.polozky.some((p) => p.kodZeme === "PL"));
    expect(s).toHaveLength(1);
    expect(s[0].hlavni.id).toBe("nov");
    expect(s[0].polozky.map((p) => p.id)).toEqual(["ki", "nov", "idn", "nfp"]);
    expect(pocetZdroju(s[0].polozky)).toBe(4);
  });
  it("zprávy dál než dva dny od sebe k sobě nepatří", () => {
    const a = varsava[1];
    const b = { ...varsava[2], id: "x", publikovano: "2026-11-06T09:52:00Z", zachyceno: "2026-11-06T09:52:00Z" };
    expect(seskupSignaly([...pozadi, a, b]).filter((g) => g.polozky.some((p) => p.kodZeme === "PL"))).toHaveLength(2);
  });
});

/*
  Jen o útoku nebo ohrožení (4. 11. 2026). Titulky jsou skutečné z fronty:
  síto je pustilo kvůli jednomu slovu, do sloupce na úvodu nepatří.
*/
import { jeOUtoku } from "../src/lib/signaly";

describe("do sloupce jen zprávy o útoku nebo ohrožení", () => {
  it("útoky, hrozby, drony, sabotáže, špionáž projdou", () => {
    for (const t of [
      "Francie zachytila útok na krevní banky, měl zvýšit teploty na vysoké úrovně",
      "V Německu zatkli třetího Turka kvůli zapálení stanice Starlinku u Varšavy v září",
      "Na letišti v Modlině u Varšavy kvůli bombové hrozbě neplánovaně přistál letoun z Londýna",
      "Lotyšům se nepodařilo sestřelit dron, který narušil vzdušný prostor",
      "Polsko zabránilo snahám o provokaci na hranici s Ruskem, oznámil Tusk",
      "Soud zprostil obžaloby čínského občana viněného ze špionáže",
      "Supermarkety vo Švédsku a Belgicku zasiahli kyberútoky na chladiace zariadenia",
    ]) expect(jeOUtoku(t), t).toBe(true);
  });
  it("komedie, nehody, historie, domácí politika a cvičení neprojdou", () => {
    for (const t of [
      "Český černý humor a boj o dědictví. Komedie Něco jako rodina představuje…",
      "Muž se vážně popálil při práci na domě, vybuchla mu plynová kartuše",
      "Našli ostatky, odebrali DNA a čekají. Historici hledali pozůstatky polských vojáků",
      "Nawrockého „sabotáže“ a Tuskovo řešení „silou“. Ústavní krize trvá už dekádu",
      "Z manévrů v motolské nemocnici byl planý poplach, zásahovku zburcoval cizí telefonát",
      "Vláda za účasti prezidenta Pavla projedná novou koncepci armády do roku 2040",
    ]) expect(jeOUtoku(t), t).toBe(false);
    expect(jeSignal({ titulek: "Český černý humor a boj o dědictví. Komedie Něco jako rodina", kodZeme: "CZ", naliehave: null })).toBe(false);
  });
});
