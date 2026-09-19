import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kamOdejde, NEJSTARSI_DNI } from "../src/lib/kam-odejde";

/*
  Co se stane s návrhem po schválení.

  Správa tuhle větu ukazuje u tlačítka Schválit, aby se nerozhodovalo naslepo.
  Pravidlo je ale opsané z nastroje/rozhlas.mjs — tam běží doopravdy. Kdyby
  se obě strany rozešly, Správa by slibovala něco jiného, než se stane,
  a to je horší než neříct nic.
*/

const TED = new Date("2026-09-19T12:00:00Z").getTime();
const dnesMinus = (d: number) => new Date(TED - d * 86_400_000).toISOString();

describe("kam odejde po schválení", () => {
  it("vážný případ jde do kanálu hned", () => {
    for (const z of ["O1", "O3", "R1", "R3"]) {
      const v = kamOdejde({ druh: "pripad", zavaznost: z, datumUdalosti: dnesMinus(1) }, TED);
      expect(v.kam, `závažnost ${z}`).toBe("hned");
    }
  });

  it("mírný případ počká na denní souhrn", () => {
    for (const z of ["G1", "G3", "Y1", "Y3"]) {
      const v = kamOdejde({ druh: "pripad", zavaznost: z, datumUdalosti: dnesMinus(1) }, TED);
      expect(v.kam, `závažnost ${z}`).toBe("souhrn");
    }
  });

  it("opatření jde hned bez ohledu na závažnost", () => {
    expect(kamOdejde({ druh: "opatreni", zavaznost: "G1", datumUdalosti: dnesMinus(1) }, TED).kam).toBe("hned");
  });

  it("stará událost do kanálu nejde", () => {
    const v = kamOdejde({ druh: "pripad", zavaznost: "R3", datumUdalosti: dnesMinus(NEJSTARSI_DNI + 1) }, TED);
    expect(v.kam).toBe("ticho");
  });

  it("archivní záznam do kanálu nejde", () => {
    const v = kamOdejde({ druh: "opatreni", zavaznost: "R3", datumUdalosti: dnesMinus(1), archivniZaznam: true }, TED);
    expect(v.kam).toBe("ticho");
  });

  it("bez druhu se odvodí z původce, stejně jako v rozhlasu", () => {
    /* rozhlas.mjs:102 — druh = i.druh ?? (i.puvodce ? "pripad" : "reakce") */
    expect(kamOdejde({ puvodce: "někdo", zavaznost: "R1", datumUdalosti: dnesMinus(1) }, TED).kam).toBe("hned");
    expect(kamOdejde({ puvodce: null, zavaznost: "R1", datumUdalosti: dnesMinus(1) }, TED).kam).toBe("souhrn");
  });

  it("pravidlo se nerozešlo s rozhlasem", () => {
    const zdroj = readFileSync(new URL("../nastroje/rozhlas.mjs", import.meta.url), "utf-8");
    /* Tytéž tři věci, na kterých rozhodnutí stojí. */
    expect(zdroj).toContain("/^[OR]/.test(i.zavaznost)");
    expect(zdroj).toContain('d === "opatreni" || (d === "pripad" && vazne(i))');
    expect(zdroj).toContain(`const NEJSTARSI_DNI = ${NEJSTARSI_DNI}`);
  });
});
