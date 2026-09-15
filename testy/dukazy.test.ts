import { describe, expect, it } from "vitest";
import { DNI_VYLOUCENO, stavDokladu } from "../src/lib/dukazy";
import { incidenty } from "../src/lib/data";

/*
  Doklad ke tvrzení.

  Tenhle soubor existuje kvůli jedné konkrétní chybě: dokument norské vlády
  ze 13. 2. 2025 byl u záznamu veden jako úřední doklad události z 8. 9. 2026
  a zvedal jí připsání odpovědnosti na úřední. Test proto obsahuje přesně
  ten nesoulad — rok 2025 proti roku 2026.
*/
describe("časový vztah zdroje a události", () => {
  it("dokument z roku 2025 nemůže dokládat událost z roku 2026", () => {
    expect(stavDokladu("2026-09-08T00:00:00Z", "2025-02-13T00:00:00Z")).toBe("nemuze-dokladat");
  });

  it("dokument vydaný po události ji dokládat může", () => {
    expect(stavDokladu("2026-09-08T00:00:00Z", "2026-09-09T00:00:00Z")).toBe("doklada");
    expect(stavDokladu("2026-09-08T00:00:00Z", "2026-09-10T00:00:00Z")).toBe("doklada");
  });

  it("den předem je běžný, týden už je k ověření", () => {
    // Agentura píše o chystané cestě večer předtím; jiné pásmo posune datum.
    expect(stavDokladu("2026-07-21T00:00:00Z", "2026-07-20T00:00:00Z")).toBe("doklada");
    expect(stavDokladu("2026-07-21T00:00:00Z", "2026-07-14T00:00:00Z")).toBe("overit");
  });

  it("neznámé datum vydání se nehodnotí ani jedním směrem", () => {
    // Chybějící údaj není důkaz. Vymyslet si ho by bylo horší než ho nemít.
    expect(stavDokladu("2026-09-08T00:00:00Z", null)).toBe("doklada");
    expect(stavDokladu("2026-09-08T00:00:00Z", "nesmysl")).toBe("doklada");
  });
});

describe("skutečná data", () => {
  it("žádný zveřejněný záznam nestojí na dokumentu vydaném dlouho před událostí", () => {
    const vadne = incidenty().flatMap((i) =>
      (i.zdroje ?? [])
        .filter((z) => stavDokladu(i.datumUdalosti, z.publikovano) === "nemuze-dokladat")
        .map((z) => `${i.slug}: ${z.nazev} (${z.publikovano})`),
    );
    expect(vadne, `zdroj starší než ${DNI_VYLOUCENO} dní před událostí`).toEqual([]);
  });

  it("moldavský záznam už nemá úřední připsání odpovědnosti bez úředního dokladu", () => {
    const i = incidenty().find((x) => x.slug === "moldavsko-dron-uzavrel-vzdusny-prostor-2026");
    expect(i, "záznam nesmí zmizet — událost je doložená zpravodajstvím").toBeTruthy();
    expect(i!.atribuce).not.toBe("oficialni");
    // Nesouvisející dokument nesmí zůstat mezi zdroji ani jako „vedlejší".
    expect(i!.zdroje.some((z) => z.url.includes("regjeringen.no"))).toBe(false);
    expect(i!.fakta.some((f) => f.includes("Norská vláda"))).toBe(false);
  });
});
