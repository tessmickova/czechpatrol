import { describe, expect, it } from "vitest";
import { ctiDoughcon } from "../sber/pizza-index";

describe("Pizza index (DOUGHCON)", () => {
  it("přečte stupeň a popis v podobě ověřené 26. 9. 2026", () => {
    const html = `<div>Intel by the Slice</div><div><span>DOUGHCON</span> <span>5</span></div><div>FADE OUT • LOWEST STATE OF READINESS</div>`;
    expect(ctiDoughcon(html)).toEqual({ uroven: 5, popis: "FADE OUT" });
  });
  it("jiný stupeň", () => expect(ctiDoughcon("<p>DOUGHCON 2 FAST PACE • ELEVATED</p>")?.uroven).toBe(2));
  it("bez ukazatele nic nevymýšlí", () => {
    expect(ctiDoughcon("<html>Maintenance</html>")).toBeNull();
    expect(ctiDoughcon("<p>DOUGHCON 9</p>")).toBeNull();
  });
});

import { stavPizzy } from "../src/lib/pizza";
describe("Pizza index na webu", () => {
  const ted = Date.parse("2026-09-26T10:00:00Z");
  it("čerstvý údaj = jedno slovo a stupeň", () => {
    expect(stavPizzy({ uroven: 5, popis: "FADE OUT", nacteno: "2026-09-26T09:30:00Z" }, ted)).toMatchObject({ slovo: "klid", uroven: 5, aktualni: true });
  });
  it("starý nebo chybějící údaj není „klid“, ale „nezjištěno“", () => {
    expect(stavPizzy({ uroven: 5, popis: null, nacteno: "2026-09-26T05:00:00Z" }, ted).slovo).toBe("nezjištěno");
    expect(stavPizzy({ uroven: null, popis: null, nacteno: null }, ted).slovo).toBe("nezjištěno");
  });
});
