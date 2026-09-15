import { describe, expect, it } from "vitest";
// @ts-expect-error — pravidla jsou sdílená s nástroji v .mjs, typy k nim nejsou
import { chybyVystrahy } from "../nastroje/vystraha-pravidla.mjs";
import souborVystrahy from "../data/vystraha.json";

/*
  Mimořádná výstraha je nejsilnější sdělení, jaké web má: červený pruh přes
  celou šířku na každé stránce. Tyhle testy hlídají, za jakých podmínek smí
  vzniknout — a hlavně za jakých nesmí.

  Pozadí: web dokumentuje případy, kdy někdo rozeslal podvržený dokument se
  znakem úřadu a lidé podle něj jednali. Výstraha bez doložení by byla přesně
  takový dokument, jen s naším logem.
*/

const OK = {
  klic: "z-2026-09-15",
  druh: "mobilizace-rusko",
  nadpis: "Zkušební nadpis o tom, co se stalo",
  text: "Dvě věty o tom, co se ví.",
  kdy: "2026-09-15T08:00:00Z",
  overeno: "2026-09-15T09:00:00Z",
  overil: "jméno",
  uroven: "R1",
  zdroje: [
    { nazev: "Zdroj A", url: "https://a.example/1", publikovano: "2026-09-15T08:30:00Z", primarni: true, typ: "primary", jazyk: "cs" },
    { nazev: "Zdroj B", url: "https://b.example/2", publikovano: "2026-09-15T08:45:00Z", primarni: false, typ: "media", jazyk: "cs" },
  ],
  coToZnamena: ["Něco doložitelného."],
  coToNeznamena: ["Něco, co z toho neplyne."],
  platiDo: null,
};

const TED = new Date("2026-09-15T12:00:00Z").getTime();

describe("mimořádná výstraha", () => {
  it("úplná a doložená výstraha projde", () => {
    expect(chybyVystrahy(OK, TED)).toEqual([]);
  });

  it("jediný zdroj nestačí", () => {
    const v = { ...OK, zdroje: [OK.zdroje[0]] };
    expect(chybyVystrahy(v, TED).join(" ")).toContain("aspoň dva zdroje");
  });

  it("dva zdroje z téže domény nejsou dvě potvrzení", () => {
    /*
      Dvě okna téhož webu přebírajícího tutéž agenturní zprávu vypadají jako
      shoda dvou nezávislých míst, ale je to jeden zdroj.
    */
    const v = {
      ...OK,
      zdroje: [OK.zdroje[0], { ...OK.zdroje[1], url: "https://a.example/jiny-clanek" }],
    };
    expect(chybyVystrahy(v, TED).join(" ")).toContain("stejné domény");
  });

  it("zdroj vydaný před událostí ji nedokládá", () => {
    const v = {
      ...OK,
      zdroje: [OK.zdroje[0], { ...OK.zdroje[1], publikovano: "2026-09-01T00:00:00Z" }],
    };
    expect(chybyVystrahy(v, TED).join(" ")).toContain("vyšel dřív než sama událost");
  });

  it("bez ověření člověkem výstraha není", () => {
    expect(chybyVystrahy({ ...OK, overil: "" }, TED).join(" ")).toContain("overil");
    expect(chybyVystrahy({ ...OK, overeno: "" }, TED).join(" ")).toContain("overeno");
  });

  it("chybějící „co to neznamená“ je chyba, ne kosmetika", () => {
    expect(chybyVystrahy({ ...OK, coToNeznamena: [] }, TED).join(" ")).toContain("poplach");
  });

  it("výstraha neradí, co má člověk dělat", () => {
    const v = { ...OK, text: "Situace se změnila. Vyberte hotovost a natankujte." };
    expect(chybyVystrahy(v, TED).join(" ")).toContain("radí");
  });

  it("událost z budoucnosti neprojde", () => {
    const v = { ...OK, kdy: "2027-01-01T00:00:00Z" };
    expect(chybyVystrahy(v, TED).join(" ")).toContain("budoucnosti");
  });

  it("v repozitáři neleží rozdělaná výstraha", () => {
    /*
      Web se sestavuje z toho, co je v datech. Kdyby se do souboru dostala
      neúplná výstraha a nikdo si toho nevšiml, nasazení ji zveřejní.
    */
    const a = (souborVystrahy as { aktivni: unknown }).aktivni;
    if (a) expect(chybyVystrahy(a)).toEqual([]);
  });
});
