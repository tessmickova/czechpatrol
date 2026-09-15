import { describe, expect, it } from "vitest";
import { druhZRadku, isoTyden, konecTydne, naCislo, naDatum, odkazyZeZaznamu, rozdelRadek, zCsv } from "../sber/palivo";

/*
  Čtení úřední datové sady s cenami pohonných hmot.

  Přesný tvar sady neumíme ověřit ze sandboxu, proto se sloupce poznávají
  podle obsahu. Tyhle testy hlídají obě strany té volnosti: že se běžné tvary
  přečtou, a hlavně že se nesrozumitelná data zahodí s důvodem místo toho,
  aby z nich vypadlo číslo, které si parser domyslel.
*/

// Zjednodušený tvar otevřených dat ČSÚ: dvojice kód/název a jeden sloupec hodnoty.
const CSV_CSU = [
  "idhod;hodnota;stapro_kod;stapro_txt;uzemi_kod;uzemi_txt;casref_do",
  '1;38,79;1234;"Motorová nafta";19;"Česká republika";2026-09-07',
  '2;35,20;1235;"Benzin automobilový bezolovnatý 95 O";19;"Česká republika";2026-09-07',
  '3;36,99;1234;"Motorová nafta";19;"Česká republika";2026-08-31',
  '4;34,80;1235;"Benzin automobilový bezolovnatý 95 O";19;"Česká republika";2026-08-31',
].join("\n");

describe("dílčí převody", () => {
  it("rozdělí řádek a nechá čárku uvnitř uvozovek na pokoji", () => {
    expect(rozdelRadek('a;"b;c";d', ";")).toEqual(["a", "b;c", "d"]);
    expect(rozdelRadek('a,"říká ""ano""",c', ",")).toEqual(["a", 'říká "ano"', "c"]);
  });

  it("pozná palivo podle názvu, ne podle pořadí sloupce", () => {
    expect(druhZRadku('1;"Motorová nafta";2026-09-07')).toBe("nafta");
    expect(druhZRadku('2;"Benzin automobilový bezolovnatý 95 O"')).toBe("benzin95");
    expect(druhZRadku('3;"Benzin automobilový bezolovnatý 98 O"')).toBeNull();
    expect(druhZRadku('4;"Zemní plyn stlačený"')).toBeNull();
  });

  it("přečte datum v úředním i českém tvaru", () => {
    expect(naDatum("2026-09-07")).toBe("2026-09-07");
    expect(naDatum("2026-09-07T00:00:00Z")).toBe("2026-09-07");
    expect(naDatum("7. 9. 2026")).toBe("2026-09-07");
    expect(naDatum("Česká republika")).toBeNull();
  });

  it("přečte číslo s desetinnou čárkou, ale ne text", () => {
    expect(naCislo("38,79")).toBe(38.79);
    expect(naCislo("1 234,5")).toBe(1234.5);
    expect(naCislo("n/a")).toBeNull();
    expect(naCislo("")).toBeNull();
  });

  it("spočítá ISO týden", () => {
    expect(isoTyden("2026-09-07")).toBe("2026-W37");
    // Přelom roku: 1. leden patří podle ISO ještě do posledního týdne loňska.
    expect(isoTyden("2027-01-01")).toBe("2026-W53");
  });
});

describe("čtení sady", () => {
  it("z úřední sady složí týdenní řadu", () => {
    const v = zCsv(CSV_CSU);
    expect(v.chyba).toBeNull();
    expect(v.rada).toHaveLength(2);
    // Seřazeno od nejstaršího — na tom stojí „poslední cena".
    expect(v.rada[0].konec).toBe("2026-08-31");
    expect(v.rada[1]).toMatchObject({ konec: "2026-09-07", tyden: "2026-W37", nafta: 38.79, benzin95: 35.2 });
  });

  it("z krajské sady vezme jen celostátní řádky", () => {
    const sKraji = [
      "hodnota;stapro_txt;uzemi_txt;casref_do",
      '38,79;"Motorová nafta";"Česká republika";2026-09-07',
      '39,90;"Motorová nafta";"Hlavní město Praha";2026-09-07',
      '37,50;"Motorová nafta";"Jihomoravský kraj";2026-09-07',
    ].join("\n");
    const v = zCsv(sKraji);
    expect(v.chyba).toBeNull();
    expect(v.rada).toHaveLength(1);
    expect(v.rada[0].nafta).toBe(38.79);
  });

  it("dvě různé ceny pro týž týden sadu odmítnou, místo aby si vybrala", () => {
    const rozporne = [
      "hodnota;stapro_txt;casref_do",
      '38,79;"Motorová nafta";2026-09-07',
      '41,20;"Motorová nafta";2026-09-07',
    ].join("\n");
    const v = zCsv(rozporne);
    expect(v.rada).toHaveLength(0);
    expect(v.chyba).toContain("různé ceny");
  });

  it("stejná cena dvakrát není rozpor", () => {
    const opakovana = [
      "hodnota;stapro_txt;casref_do",
      '38,79;"Motorová nafta";2026-09-07',
      '38,79;"Motorová nafta";2026-09-07',
    ].join("\n");
    expect(zCsv(opakovana).chyba).toBeNull();
  });

  it("cizí sada se nepřečte a řekne proč", () => {
    const cizi = ["kod;nazev;pocet", "1;Kolo;12", "2;Auto;7"].join("\n");
    const v = zCsv(cizi);
    expect(v.rada).toHaveLength(0);
    expect(v.chyba).toBeTruthy();
    // V důvodu musí být vidět, co vlastně přišlo — jinak se to nedá opravit.
    expect(v.chyba).toContain("hlavička");
  });

  it("stránka HTML místo dat neprojde jako prázdná řada", () => {
    const v = zCsv("<!doctype html>\n<html><body>Stránka nenalezena</body></html>");
    expect(v.rada).toHaveLength(0);
    expect(v.chyba).toBeTruthy();
  });

  it("prázdný soubor je chyba, ne nula", () => {
    expect(zCsv("").chyba).toBeTruthy();
  });

  it("poradí si s čárkou jako oddělovačem a tečkou v ceně", () => {
    const anglicky = ["value,product,date", "38.79,Motorova nafta,2026-09-07"].join("\n");
    const v = zCsv(anglicky);
    expect(v.chyba).toBeNull();
    expect(v.rada[0].nafta).toBe(38.79);
  });
});

describe("sada ČSÚ bez sloupce s datem", () => {
  /*
    Skutečný tvar sady vdb.czso.cz/pll/eweb/cenyphm.data (běh 02:16 UTC):
    datum v ní není, jsou tam sloupce `rok` a `tyden`.
  */
  const CSV_TYDNY = [
    "idhod;hodnota;ukazatel_kod;polozka_kod;obdobi;rok;tyden;uzemi_kod;ukazatel_txt;polozka_txt",
    '1;38,79;1;1;37;2026;37;19;"Průměrná cena";"Motorová nafta"',
    '2;35,20;1;2;37;2026;37;19;"Průměrná cena";"Benzin automobilový bezolovnatý 95 O"',
    '3;36,99;1;1;36;2026;36;19;"Průměrná cena";"Motorová nafta"',
  ].join("\n");

  it("spočítá konec týdne z roku a čísla týdne", () => {
    // ISO týden 37 roku 2026 končí v neděli.
    expect(konecTydne(2026, 37)).toBe("2026-09-13");
    expect(konecTydne(2026, 1)).toBe("2026-01-04");
    // Nesmysly se nedopočítávají.
    expect(konecTydne(2026, 0)).toBeNull();
    expect(konecTydne(2026, 54)).toBeNull();
    expect(konecTydne(NaN, 37)).toBeNull();
  });

  it("přečte sadu, která místo data nese rok a týden", () => {
    const v = zCsv(CSV_TYDNY);
    expect(v.chyba).toBeNull();
    expect(v.rada).toHaveLength(2);
    expect(v.rada[1]).toMatchObject({ konec: "2026-09-13", nafta: 38.79, benzin95: 35.2 });
  });

  it("čísla 1–53 v kódech se za týden nevydávají", () => {
    /*
      Kdyby se sloupec s týdnem hledal podle obsahu, vyhrál by kterýkoli
      číselníkový kód — a z cen by vypadla data, která nikdo nikdy neměřil.
      Bez sloupce jménem „tyden" se sada raději nepřečte.
    */
    const bezTydne = [
      "hodnota;polozka_cis;uzemi_kod;polozka_txt",
      '38,79;37;19;"Motorová nafta"',
    ].join("\n");
    const v = zCsv(bezTydne);
    expect(v.rada).toHaveLength(0);
    expect(v.chyba).toContain("nenašel se sloupec s datem");
    // V důvodu je i ukázka řádku, aby šlo poznat, co vlastně přišlo.
    expect(v.chyba).toContain("první řádek");
  });
});

describe("odkazy ze záznamu sady v katalogu", () => {
  it("z JSON-LD vytáhne soubor ke stažení a dá ho před ostatní odkazy", () => {
    /*
      Tvar podle otevřené formální normy DCAT-AP-CZ, kterou ČSÚ používá.
      Klíče jsou české; na jejich přesné znění se ale nespoléháme, proto
      test hlídá jen pořadí: soubor ke stažení musí být první.
    */
    const zaznam = JSON.stringify({
      "@context": "https://ofn.gov.cz/dcat-ap-cz.../kontexty.jsonld",
      iri: "https://vdb.czso.cz/pll/eweb/lkod_ld.datova_sada?nazev=Ceny_PHM_tydny",
      název: { cs: "Průměrné spotřebitelské ceny pohonných hmot" },
      distribuce: [
        {
          "přístupové_URL": "https://vdb.czso.cz/pll/eweb/cenyphm.stranka",
          "soubor_ke_stažení": "https://vdb.czso.cz/pll/eweb/ceny_phm_tydny.csv",
        },
      ],
    });
    const odkazy = odkazyZeZaznamu(zaznam);
    expect(odkazy[0]).toBe("https://vdb.czso.cz/pll/eweb/ceny_phm_tydny.csv");
    expect(odkazy).toContain("https://vdb.czso.cz/pll/eweb/cenyphm.stranka");
  });

  it("z HTML stránky seberou odkazy z textu", () => {
    const html = '<a href="https://vdb.czso.cz/data.csv">data</a> <a href="https://priklad.invalid/x">x</a>';
    expect(odkazyZeZaznamu(html)).toEqual(["https://vdb.czso.cz/data.csv", "https://priklad.invalid/x"]);
  });

  it("z prázdné odpovědi nevyrobí žádný odkaz", () => {
    expect(odkazyZeZaznamu("")).toEqual([]);
    expect(odkazyZeZaznamu("{}")).toEqual([]);
  });
});
