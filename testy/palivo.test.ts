import { describe, expect, it } from "vitest";
import {
  NAZVY_PALIV,
  PRAH_SKOKU,
  PRAH_ZPRAVY,
  radaCen,
  stavPaliva,
  stavPaliv,
  vetaOCene,
  type RadaCen,
  type TydenCeny,
} from "../src/lib/palivo";

/*
  Cena paliva.

  Tyhle testy nehlídají hezká čísla — hlídají, že dlaždice nikdy neřekne víc,
  než na co má změřený doklad. Chybějící týden nesmí vyrobit změnu, jediný
  záznam nesmí vyrobit „nejvýš za X měsíců“ a práh pro zprávu do kanálu se
  nesmí nepozorovaně snížit. Zpráva do Telegramu jde tisícům lidí; falešné
  „nafta skokově zdražila“ by poslalo lidi zbytečně na pumpy.
*/

/** Pomocník: týden končící daným datem. */
function tyden(konec: string, nafta: number | null, benzin95: number | null = null): TydenCeny {
  return { tyden: konec.slice(0, 7), konec, nafta, benzin95 };
}

function rada(body: TydenCeny[]): RadaCen {
  return {
    aktualizovano: "2026-09-15T00:00:00.000Z",
    zdroj: { nazev: "test", url: "https://example.invalid", typ: "primary", primarni: true },
    poznamka: "testovací data",
    chyba: null,
    rada: body,
  };
}

describe("cena paliva", () => {
  it("bez dat nic netvrdí", () => {
    const s = stavPaliva("nafta", rada([]));
    expect(s.cena).toBeNull();
    expect(s.zaTyden).toBeNull();
    expect(s.odZacatku).toBe(false);
    expect(s.skok).toBe(false);
    expect(vetaOCene(s)).toBeNull();
  });

  it("jediný týden dá cenu, ale žádnou změnu", () => {
    const s = stavPaliva("nafta", rada([tyden("2026-09-07", 38.1)]));
    expect(s.cena).toBe(38.1);
    expect(s.zaTyden).toBeNull();
    expect(s.zaCtvrtleti).toBeNull();
    // Jeden bod není „nejvýš za celou dobu“ — to by tvrdilo srovnání, které nemáme.
    expect(s.odZacatku).toBe(false);
    expect(s.mesicuNaMaximu).toBeNull();
  });

  it("týdenní změna se počítá proti předchozímu týdnu", () => {
    const s = stavPaliva("nafta", rada([tyden("2026-08-31", 36.99), tyden("2026-09-07", 38.79)]));
    expect(s.zaTyden).toBe(1.8);
    expect(s.cena).toBe(38.79);
  });

  it("mezera v šetření nevydává dvoutýdenní změnu za týdenní", () => {
    /*
      Skutečná mezera z řady ČSÚ: kolem Nového roku se týden nešetří.
      2024-12-22 → 2025-01-05 je čtrnáct dní a cena nafty klesla o 2,26 Kč.
      Kdyby se brala prostě předchozí položka, hlásil by web „za týden
      −2,26 Kč" — a při prahu dvou korun by to odešlo i do kanálu jako
      skoková změna, která se nikdy za týden nestala.
    */
    const s = stavPaliva("nafta", rada([tyden("2024-12-22", 37.26), tyden("2025-01-05", 35.0)]));
    expect(s.cena).toBe(35);
    expect(s.zaTyden).toBeNull();
    expect(s.skok).toBe(false);
    expect(s.proZpravu).toBe(false);
    expect(vetaOCene(s)).not.toContain("za týden");
  });

  it("čtvrtletní změna se měří datem, ne třináctou položkou odzadu", () => {
    // V řadě s mezerami je třináctý záznam odzadu něco jiného než čtvrtletí.
    const body: TydenCeny[] = [
      tyden("2026-06-14", 40.0), // zhruba 91 dní zpět — sem se má měřit
      tyden("2026-08-30", 44.0),
      tyden("2026-09-13", 45.0),
    ];
    expect(stavPaliva("nafta", rada(body)).zaCtvrtleti).toBe(5);

    // Bez dostatečně staré položky se čtvrtletí neříká vůbec.
    const kratka = [tyden("2026-08-30", 44.0), tyden("2026-09-06", 45.0)];
    expect(stavPaliva("nafta", rada(kratka)).zaCtvrtleti).toBeNull();
  });

  it("chybějící týden nevyrobí dopočítanou změnu", () => {
    /*
      Uprostřed řady chybí u nafty číslo. Změna se musí počítat proti
      poslednímu týdnu, kde nafta opravdu je — ne proti prázdnu a už vůbec
      ne proti interpolaci.
    */
    const s = stavPaliva(
      "nafta",
      rada([tyden("2026-08-24", 36.5), tyden("2026-08-31", null), tyden("2026-09-07", 37.5)]),
    );
    expect(s.cena).toBe(37.5);
    /*
      Poslední týden s naftou před 7. 9. je 24. 8. — čtrnáct dní zpátky.
      Změna „za týden" se tedy neřekne; dvoutýdenní rozdíl není týdenní.
    */
    expect(s.zaTyden).toBeNull();
  });

  it("palivo, které v řadě vůbec není, zůstane prázdné", () => {
    const s = stavPaliva("benzin95", rada([tyden("2026-09-07", 38.79, null)]));
    expect(s.cena).toBeNull();
    expect(s.nazev).toBe(NAZVY_PALIV.benzin95);
  });

  it("„nejvýš za X měsíců“ měří k poslednímu týdnu, kdy bylo dráž", () => {
    const body: TydenCeny[] = [
      tyden("2025-07-06", 40.0), // dráž — sem se má měřit
      tyden("2025-10-05", 35.0),
      tyden("2026-06-07", 36.0),
      tyden("2026-09-06", 38.79),
    ];
    const s = stavPaliva("nafta", rada(body));
    expect(s.odZacatku).toBe(false);
    expect(s.mesicuNaMaximu).toBe(14);
    expect(vetaOCene(s)).toContain("nejvýš za 14 měsíců");
  });

  it("maximum celé řady se řekne jinak než „za X měsíců“", () => {
    const s = stavPaliva("nafta", rada([tyden("2024-01-05", 34.0), tyden("2026-09-06", 39.5)]));
    expect(s.odZacatku).toBe(true);
    expect(s.mesicuNaMaximu).toBeNull();
    expect(vetaOCene(s)).toContain("nejvýš za celou sledovanou dobu");
  });

  it("krátký odstup se do věty nepíše", () => {
    // Nejvýš za dva týdny není informace, jen šum. Věta o tom mlčí.
    const s = stavPaliva("nafta", rada([tyden("2026-08-23", 38.0), tyden("2026-08-30", 37.0), tyden("2026-09-06", 37.5)]));
    expect(s.mesicuNaMaximu).toBe(1);
    expect(vetaOCene(s)).not.toContain("nejvýš");
  });

  it("skok a zpráva se spustí až na prahu, ne pod ním", () => {
    const pod = stavPaliva("nafta", rada([tyden("2026-08-30", 37.0), tyden("2026-09-06", 37.0 + PRAH_SKOKU - 0.01)]));
    expect(pod.skok).toBe(false);

    const na = stavPaliva("nafta", rada([tyden("2026-08-30", 37.0), tyden("2026-09-06", 37.0 + PRAH_SKOKU)]));
    expect(na.skok).toBe(true);
    expect(na.proZpravu).toBe(false);

    const zprava = stavPaliva("nafta", rada([tyden("2026-08-30", 37.0), tyden("2026-09-06", 37.0 + PRAH_ZPRAVY)]));
    expect(zprava.proZpravu).toBe(true);
  });

  it("zlevnění je skok stejně jako zdražení", () => {
    // Prudký pokles je taky měřená skutečnost. Hlásit jen zdražení by bylo zkreslení.
    const s = stavPaliva("nafta", rada([tyden("2026-08-30", 40.0), tyden("2026-09-06", 37.5)]));
    expect(s.zaTyden).toBe(-2.5);
    expect(s.skok).toBe(true);
    expect(s.proZpravu).toBe(true);
    expect(vetaOCene(s)).toContain("−2,50 Kč");
  });

  it("práh pro zprávu je přísnější než práh pro zmínku", () => {
    // Kdyby se to obrátilo, do kanálu by odešlo víc zpráv než na web.
    expect(PRAH_ZPRAVY).toBeGreaterThan(PRAH_SKOKU);
  });

  it("věta je česky a jen ze změřených údajů", () => {
    const s = stavPaliva("nafta", rada([tyden("2026-08-30", 36.99), tyden("2026-09-06", 38.79)]));
    const v = vetaOCene(s)!;
    expect(v).toContain("Nafta 38,79 Kč/l");
    expect(v).toContain("za týden +1,80 Kč");
    // Žádná předpověď. Tohle je tvrdý zákaz, ne stylistika.
    expect(v).not.toMatch(/bude|poroste|očekáv|natankuj|předpov/i);
  });

  it("nulová změna se do věty nepíše", () => {
    const s = stavPaliva("nafta", rada([tyden("2026-08-30", 37.5), tyden("2026-09-06", 37.5)]));
    expect(s.zaTyden).toBe(0);
    expect(vetaOCene(s)).not.toContain("za týden");
  });

  it("obě paliva se vrací, nafta první", () => {
    const oba = stavPaliv(rada([tyden("2026-09-06", 38.79, 35.2)]));
    expect(oba.map((s) => s.druh)).toEqual(["nafta", "benzin95"]);
    expect(oba[1].cena).toBe(35.2);
  });

  it("řada v repozitáři je seřazená a bez zdvojených týdnů", () => {
    /*
      Hlídá sběr, ne výpočet. Dvakrát tentýž týden by zdvojil poslední bod a
      vyrobil nulovou změnu; přeházené pořadí by ukázalo starou cenu jako
      nejnovější. Prázdná řada projde — nemít data je v pořádku, mít je
      rozbitá není.
    */
    const { rada: body } = radaCen();
    const konce = body.map((t) => t.konec);
    expect(new Set(konce).size).toBe(konce.length);
    expect([...konce].sort()).toEqual(konce);
  });

  it("ceny v repozitáři jsou kladné, nebo tam nejsou vůbec", () => {
    for (const s of stavPaliv()) {
      if (s.cena !== null) expect(s.cena, s.druh).toBeGreaterThan(0);
    }
  });

});
