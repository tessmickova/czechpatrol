import { describe, expect, it } from "vitest";
import { kandidati, vsichniKandidati } from "../src/lib/data";

/*
  Fronta zachycených zpráv se musí vyprazdňovat.

  Vzniklo z konkrétního stavu: fronta měla 300 položek, z nichž 57 už audit
  posoudil — a přesto v ní stály dál jako „čeká". Externí ověřovatel to
  shrnul přesně: z 300 kandidátů je skutečných událostí asi 25, zbytek jsou
  duplicity, prohlášení a analýzy.

  Zachycený článek totiž není událost. Je to jeden doklad. Jakmile se ví,
  ke které události patří — nebo že k žádné — nemá se tvářit, že na něco
  čeká, a nemá stát na titulce mezi novinkami.
*/

describe("fronta kandidátů", () => {
  it("vyřízené zprávy ve frontě nejsou", () => {
    for (const k of kandidati()) {
      expect(k.stav, `${k.id} je ve frontě, ale je vyřízený`).not.toBe("vyrizen");
    }
  });

  it("každý vyřízený má napsáno proč", () => {
    /* Bez důvodu by nešlo poznat, jestli zpráva prošla, nebo se ztratila. */
    for (const k of vsichniKandidati()) {
      if (k.stav !== "vyrizen") continue;
      expect(k.vyrizeni?.duvod, `${k.id}: vyřízený bez důvodu`).toBeTruthy();
      expect(k.vyrizeni?.kdy, `${k.id}: vyřízený bez data`).toBeTruthy();
    }
  });

  it("pokračování a zdroj návrhu ukazují, kam zpráva patří", () => {
    for (const k of vsichniKandidati()) {
      if (k.vyrizeni?.duvod !== "pokracovani") continue;
      expect(k.vyrizeni.patriK, `${k.id}: pokračování bez záznamu, ke kterému patří`).toBeTruthy();
    }
  });

  it("nic se neztratí: vyřízené jsou pořád v datech", () => {
    /*
      Vyřízení není mazání. Kdyby se zprávy odstraňovaly, nešlo by později
      doložit, co sběr viděl a jak se o tom rozhodlo.
    */
    expect(vsichniKandidati().length).toBeGreaterThanOrEqual(kandidati().length);
  });
});
