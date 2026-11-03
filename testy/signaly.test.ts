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
