import { describe, expect, it } from "vitest";
import { hodnoceniV2, vrstvaA, vrstvaB, vrstvaC, type V2Zaznam, type VstupKvality } from "../src/lib/metodika2";
import { naliehavost } from "../sber/udalosti";
import type { Incident, ProvozniPolozka } from "../src/lib/typy";

/*
  Metodika v2 (pilot) — 18 scénářů ze zadání (9. 11. 2026), každý
  s očekávaným chováním. Modelové záznamy, ne skutečné události.
*/
const DEN = 86_400_000;
const TED = Date.parse("2026-11-09T12:00:00Z");
const pred = (dni: number) => new Date(TED - dni * DEN).toISOString();
const KVALITA_OK: VstupKvality = { posledniSber: pred(0.02), podkladyNeuplne: false, zdrojuPrecteno: 35, zdrojuCelkem: 35 };
const BEZ_STAVU = { stavOhrozeni: false, valecnyStav: false };

let n = 0;
function zaznam(p: Partial<Incident> & { v2?: V2Zaznam } = {}, zdroju = 2): Incident {
  n += 1;
  return {
    id: `i-${n}`, slug: `u-${n}`, titulek: `Modelová událost ${n}`, kratkyTitulek: `Modelová událost ${n}`,
    zeme: "Polsko", kodZeme: "PL", kategorie: ["sabotaz"],
    datumUdalosti: pred(2), datumZjisteni: pred(2), aktualizovano: pred(2),
    zavaznost: "O1", jistota: "vysoka", stav: "probiha", atribuce: "vysetrovana", druh: "pripad",
    fakta: ["modelový fakt"], neznameho: [], vyznam: "", eskalacniSpousteče: [], deeskalacniSignaly: [],
    zdroje: Array.from({ length: zdroju }, (_, i) => ({ nazev: `Redakce ${i}`, url: `https://redakce${i}.cz/clanek-${n}`, typ: "media", publikovano: pred(2), primarni: false, jazyk: "cs" })),
    souvisejici: [], historie: [{ kdy: pred(2), text: "zapsáno", novySignal: true }], novy: false, zapocitanoTyden: "2026-11-02",
    aiZpracovano: true, lidskyOvereno: true, overeni: "lidske",
    ...p,
  } as unknown as Incident;
}
const A = (zaznamy: Incident[], kvalita = KVALITA_OK, uredni = BEZ_STAVU) => vrstvaA({ zaznamy, ted: TED, kvalita, uredni });
const provozBezny: ProvozniPolozka[] = ["elektrina", "plyn", "komunikace", "banky", "palivo", "hranice", "vycestovani", "bezny-zivot"].map((klic) => ({
  klic, nazev: klic, ikona: "", stav: "bezny", hodnota: "běžný provoz", detail: "", coByZmenilo: [], overeno: null, zkontrolovano: pred(0.1), pokryti: "orientacni", zdroje: [],
} as unknown as ProvozniPolozka));

describe("metodika v2 — scénáře ze zadání", () => {
  it("1. dvacet článků o jednom incidentu dá stejný výsledek jako jeden doložený záznam", () => {
    const jeden = zaznam({ slug: "jeden" }, 2);
    const dvacet = { ...jeden, zdroje: zaznam({}, 20).zdroje };
    const aktualizace = Array.from({ length: 19 }, () => zaznam({ druh: "aktualizace", navazujeNa: "jeden", datumZjisteni: pred(1) }));
    const a1 = A([jeden]);
    expect(A([dvacet]).pasmo).toBe(a1.pasmo);
    const a20 = A([jeden, ...aktualizace]);
    expect(a20.pasmo).toBe(a1.pasmo);
    expect(a20.rozhodujici).toHaveLength(1);
    expect(a20.noveZjisteni).toHaveLength(19);
  });

  it("2. jediný závažný aktuální incident stačí; menší události ho nezředí", () => {
    const cz = zaznam({ kodZeme: "CZ", zeme: "Česko", zavaznost: "R1", jistota: "potvrzeno" });
    expect(A([cz]).pasmo).toBe("mimoradny");
    expect(A([cz]).pravidla).toContain("A-M1");
    const male = Array.from({ length: 5 }, () => zaznam({ kodZeme: "CZ", zeme: "Česko", zavaznost: "Y1" }));
    expect(A([cz, ...male]).pasmo).toBe("mimoradny");
  });

  it("3. nový článek o starém útoku nepřidá nový útok ani aktuální dopad", () => {
    const stary = zaznam({ datumUdalosti: pred(60), datumZjisteni: pred(1), kodZeme: "CZ", zeme: "Česko", zavaznost: "O2" });
    const a = A([stary]);
    expect(a.pasmo).toBe("omezeny");
    expect(a.rozhodujici).toHaveLength(0);
    const nove = zaznam({ druh: "aktualizace", navazujeNa: stary.slug, datumZjisteni: pred(1), datumUdalosti: pred(60) });
    const b = A([stary, nove]);
    expect(b.pasmo).toBe("omezeny");
    expect(b.noveZjisteni.map((x) => x.slug)).toContain(nove.slug);
  });

  it("4. výpadek české služby s vyloučeným útokem: zůstane praktický dopad, ne sabotáž", () => {
    const vypadek = zaznam({
      kodZeme: "CZ", zeme: "Česko", kategorie: ["infrastruktura"], zavaznost: "O1",
      v2: { povaha: "nehoda-porucha", dopad: [{ funkce: "elektrina", intenzita: "vypadek-funkce", uzemi: "CZ Praha", rozsah: "regionalni", od: pred(0.5), stav: "dolozeno", overeno: pred(0.1) }] },
    });
    const a = A([vypadek]);
    expect(a.pasmo).toBe("omezeny");
    expect(a.nezapocteno[0].duvod).toMatch(/nehoda nebo porucha/);
    const b = vrstvaB({ zaznamy: [vypadek], provoz: provozBezny, ted: TED });
    const el = b.funkce.find((f) => f.funkce === "elektrina")!;
    expect(el.stav).toBe("omezeni");
    expect(el.intenzita).toBe("vypadek-funkce");
  });

  it("5. přihlášení hackerů bez potvrzení neprokáže útok ani původce", () => {
    const prihlaseni = zaznam({
      kodZeme: "CZ", zeme: "Česko", kategorie: ["kyber"], zavaznost: "O2", atribuce: "nepotvrzena",
      v2: { tvrzeni: [{ o: "udalost", stav: "nepotvrzeno", text: "skupina se přihlásila k útoku", zdroje: [] }, { o: "puvodce", stav: "nepotvrzeno", text: "přihlášení", zdroje: [] }] },
    });
    const a = A([prihlaseni]);
    expect(a.pasmo).toBe("omezeny");
    expect(a.nezapocteno[0].duvod).toMatch(/není potvrzená/);
    expect(a.coByZmenilo.join(" ")).toMatch(/Kdyby se doložilo/);
  });

  it("6. závažný incident u spojence bez českých omezení: strategický význam a civilní dopad zůstanou oddělené", () => {
    const spojenec = zaznam({ kodZeme: "PL", zavaznost: "O1", jistota: "potvrzeno", v2: { vazba: { typ: "spojenci", mechanismus: "útok na přenosovou soustavu členského státu" }, zasahFunkci: true } });
    expect(A([spojenec]).pasmo).toBe("vysoky");
    expect(A([spojenec]).pravidla).toContain("A-V2");
    const b = vrstvaB({ zaznamy: [spojenec], provoz: provozBezny, ted: TED });
    expect(b.funkce.every((f) => f.stav !== "omezeni")).toBe(true);
    expect(b.souhrn).toMatch(/bez doloženého celostátního omezení/);
  });

  it("7. zahraniční dodavatel s doloženým českým dopadem: dopad se nesníží podle vzdálenosti", () => {
    const dopad = { funkce: "platby" as const, intenzita: "vypadek-funkce" as const, uzemi: "CZ", rozsah: "celostatni" as const, od: pred(1), stav: "dolozeno" as const, overeno: pred(0.2) };
    const dodavatel = zaznam({ kodZeme: "DE", zeme: "Německo", kategorie: ["kyber"], v2: { vazba: { typ: "zavislost", mechanismus: "zpracovatel plateb pro české banky" }, dopad: [dopad] } });
    const domaci = zaznam({ kodZeme: "CZ", zeme: "Česko", kategorie: ["kyber"], v2: { dopad: [dopad] } });
    const zDodavatele = vrstvaB({ zaznamy: [dodavatel], provoz: provozBezny, ted: TED }).funkce.find((f) => f.funkce === "platby")!;
    const zDomova = vrstvaB({ zaznamy: [domaci], provoz: provozBezny, ted: TED }).funkce.find((f) => f.funkce === "platby")!;
    expect(zDodavatele.intenzita).toBe(zDomova.intenzita);
    expect(zDodavatele.dopady[0].rozsah).toBe("celostatni");
    expect(A([dodavatel]).pravidla).toContain("A-Z3");
  });

  it("8. článek 4 NATO nevygeneruje mobilizaci, uzavření hranic ani doporučení k odjezdu", () => {
    const konzultace = zaznam({ druh: "opatreni", kategorie: ["nato"], zavaznost: "O1", titulek: "Polsko požádalo o konzultace podle článku 4 NATO" });
    const h = hodnoceniV2({ zaznamy: [konzultace], provoz: provozBezny, pravni: [], vystraha: null, chmi: [], kvalita: KVALITA_OK, ted: TED });
    expect(h.a.pasmo).toBe("omezeny");
    expect(h.c.plati).toHaveLength(0);
    expect(`${h.souhrn.coDelat} ${h.souhrn.dopad}`).not.toMatch(/mobiliz|uzavř|odje[dz]|evakuac|nakup/i);
    /* Síto: článek 4 je konzultace (stupeň 2, nahoru ve frontě), ne článek 5. */
    expect(naliehavost("Polsko požádalo o konzultace podle článku 4 NATO")).toMatchObject({ druh: "clanek-4-nato", stupen: 2 });
  });

  it("9. místní život ohrožující událost: výrazná místní informace, ne ohrožení celé ČR", () => {
    const mistni = zaznam({
      kodZeme: "CZ", zeme: "Česko", zavaznost: "O1", jistota: "potvrzeno",
      v2: { rozsah: "mistni", dopad: [{ funkce: "bezpeci-osob", intenzita: "ohrozeni-zivota", uzemi: "CZ obec v okrese X", rozsah: "mistni", od: pred(0.2), stav: "dolozeno", overeno: pred(0.1) }] },
    });
    const a = A([mistni]);
    expect(a.pasmo).toBe("zvyseny");
    expect(a.pravidla).toContain("A-Z1");
    const b = vrstvaB({ zaznamy: [mistni], provoz: provozBezny, ted: TED });
    expect(b.mistni).toHaveLength(1);
    expect(b.mistni[0].kde).toMatch(/obec/);
    expect(b.souhrn).not.toMatch(/celá ČR|celostátní omezení:/);
  });

  it("10. nedostupné zásadní zdroje a fronta neověřených zpráv: žádný falešně uklidňující souhrn", () => {
    const spatne = { posledniSber: pred(0.02), podkladyNeuplne: true, zdrojuPrecteno: 10, zdrojuCelkem: 35 };
    const a = A([], spatne);
    expect(a.pasmo).toBeNull();
    expect(a.pravidla).toContain("A-N1");
    expect(a.vysvetleni).toMatch(/není k dispozici/);
    /* Provozní příčina na veřejný web nepatří (provozovatelka 1. 11. 2026): veřejně jen obecný důvod. */
    expect(a.vysvetleni).not.toMatch(/ověřování|fronta|stojí/i);
    /* Doloženou závažnou událost výpadek jiných zdrojů nezakryje: ukáže se jako spodní odhad. */
    const zavazna = zaznam({ kodZeme: "CZ", zeme: "Česko", zavaznost: "O1" });
    const b = A([zavazna], spatne);
    expect(b.pasmo).toBe("zvyseny");
    expect(b.spodniOdhad).toBe(true);
  });

  it("11. obnovení služby: dopad klesne podle ověření, historie zůstane", () => {
    const z = zaznam({ kodZeme: "CZ", zeme: "Česko", v2: { povaha: "nehoda-porucha", dopad: [{ funkce: "voda", intenzita: "vypadek-funkce", uzemi: "CZ Brno", rozsah: "mistni", od: pred(3), do: pred(1), stav: "dolozeno", overeno: pred(1) }] } });
    const ted = vrstvaB({ zaznamy: [z], provoz: provozBezny, ted: TED }).funkce.find((f) => f.funkce === "voda")!;
    expect(ted.stav).not.toBe("omezeni");
    expect(ted.obnoveno).toHaveLength(1);
    const tehdy = vrstvaB({ zaznamy: [z], provoz: provozBezny, ted: TED - 2 * DEN }).funkce.find((f) => f.funkce === "voda")!;
    expect(tehdy.stav).toBe("omezeni");
    expect(z.historie).toHaveLength(1);
  });

  it("12. neověřená koordinace několika požárů se nestane potvrzenou kampaní", () => {
    const pozary = (koordinace: "nepotvrzeno" | "dolozeno") => Array.from({ length: 3 }, () => zaznam({ v2: { serie: { id: "pozary-2026-11", koordinace } } }));
    const nepotvrzena = A(pozary("nepotvrzeno"));
    expect(nepotvrzena.pasmo).toBe("zvyseny");
    expect(nepotvrzena.pravidla).not.toContain("A-V3");
    const dolozena = A(pozary("dolozeno"));
    expect(dolozena.pasmo).toBe("vysoky");
    expect(dolozena.pravidla).toContain("A-V3");
  });

  it("13. odvrácený plánovaný útok: závažnost plánu se nezamění za probíhající ohrožení", () => {
    const plan = zaznam({ kodZeme: "CZ", zeme: "Česko", zavaznost: "O2", jistota: "potvrzeno", v2: { stavHrozby: { stav: "odvraceno", overeno: pred(1) } } });
    const a = A([plan]);
    expect(a.pasmo).toBe("omezeny");
    expect(a.noveZjisteni.map((x) => x.slug)).toContain(plan.slug);
  });

  it("14. přidání nových médií do sběru samo nezpůsobí nárůst ani změnu trendu", () => {
    const z = zaznam({ datumUdalosti: pred(3), datumZjisteni: pred(3) });
    const vic = { ...z, zdroje: zaznam({}, 12).zdroje };
    const a = A([z]);
    const b = A([vic]);
    expect([b.pasmo, b.pravidla, b.zmena]).toEqual([a.pasmo, a.pravidla, a.zmena]);
  });

  it("15. vyvrácení klíčového tvrzení přepočítá souhrn a je vidět proč", () => {
    const z = zaznam({ kodZeme: "CZ", zeme: "Česko", zavaznost: "R1", jistota: "potvrzeno" });
    expect(A([z]).pasmo).toBe("mimoradny");
    const vyvraceny = { ...z, v2: { tvrzeni: [{ o: "udalost" as const, stav: "vyvraceno" as const, text: "úřad událost vyvrátil", zdroje: ["https://urad.cz/x"] }] } };
    const a = A([vyvraceny]);
    expect(a.pasmo).toBe("omezeny");
    expect(a.nezapocteno[0].duvod).toMatch(/vyvráceno/);
  });

  it("16. stejná závažnost a podklady při změně státu nebo původce: stejné zacházení", () => {
    const p1 = zaznam({ kodZeme: "PL", zeme: "Polsko", puvodce: "rusko", atribuce: "oficialni" });
    const p2 = zaznam({ kodZeme: "LT", zeme: "Litva", puvodce: "ukrajina", atribuce: "oficialni" });
    const [a1, a2] = [A([p1]), A([p2])];
    expect([a2.pasmo, a2.pravidla]).toEqual([a1.pasmo, a1.pravidla]);
  });

  it("17. dlouhodobě závažný stabilní stav se nezmění na bezpečno jen absencí nového článku", () => {
    const trva = (overeno: string) => zaznam({ kodZeme: "CZ", zeme: "Česko", zavaznost: "O1", jistota: "potvrzeno", datumUdalosti: pred(60), datumZjisteni: pred(60), v2: { rozsah: "celostatni", stavHrozby: { stav: "probiha", overeno } } });
    expect(A([trva(pred(2))]).pasmo).toBe("vysoky");
    const neovereno = A([trva(pred(20))]);
    expect(neovereno.pasmo).toBeNull();
    expect(neovereno.pravidla).toContain("A-N2");
  });

  it("18. čerstvá autentická úřední výstraha se ukáže hned, s vydavatelem a územím, i když hodnocení čeká", () => {
    const c = vrstvaC({
      pravni: [], vystraha: null, ted: TED,
      chmi: [{ id: "w1", typ: "vystraha", titulek: "Silný vítr", text: "", textJe: "zneni-vydavatele", pokyn: "Zajistěte volně uložené předměty.", vydavatel: "ČHMÚ", odkaz: "https://www.chmi.cz/", vydano: pred(0.1), platiOd: pred(0.1), platiDo: new Date(TED + DEN).toISOString(), odvolano: null, opraveno: null, uzemi: { druh: "kraje", kraje: ["Vysočina"] }, coNevime: [], jistota: null, puvod: null, detail: null } as never],
    });
    expect(c.plati).toHaveLength(1);
    expect(c.plati[0]).toMatchObject({ vydal: "ČHMÚ", uzemi: "Vysočina", prevzato: true });
    const a = A([], { posledniSber: pred(0.02), podkladyNeuplne: true, zdrojuPrecteno: 35, zdrojuCelkem: 35 });
    expect(a.pasmo).toBeNull();
  });
});

describe("metodika v2 — pojistky", () => {
  it("výjimka bez schvalující role a revize se nepoužije a výsledek to řekne", () => {
    const a = vrstvaA({ zaznamy: [], ted: TED, kvalita: KVALITA_OK, uredni: BEZ_STAVU, vyjimky: [{ id: "s1", duvod: "výrok", podklady: ["x"], schvalil: null, revize: null, vyhodnoceno: pred(1), platiDo: pred(-5) }] });
    expect(a.pasmo).toBe("omezeny");
    expect(a.vyjimka?.pouzita).toBe(false);
  });
  it("úplná výjimka zvedne nejvýš o jedno pásmo a výsledek nese pásmo bez ní", () => {
    const a = vrstvaA({ zaznamy: [], ted: TED, kvalita: KVALITA_OK, uredni: BEZ_STAVU, vyjimky: [{ id: "s2", duvod: "výrok", podklady: ["x"], schvalil: "provozovatelka", revize: pred(-3), vyhodnoceno: pred(1), platiDo: pred(-5) }] });
    expect([a.pasmo, a.pasmoBezVyjimky, a.vyjimka?.pouzita]).toEqual(["zvyseny", "omezeny", true]);
  });
  it("úředně platný stav ohrožení státu dá Mimořádný podle A-M2, i bez události", () => {
    expect(A([], KVALITA_OK, { stavOhrozeni: true, valecnyStav: false }).pravidla).toContain("A-M2");
  });
  it("vysoké pásmo bez redakčního posouzení je předběžné; po posouzení ne", () => {
    const bez = zaznam({ kodZeme: "PL", zavaznost: "O1", jistota: "potvrzeno", v2: { vazba: { typ: "spojenci", mechanismus: "m" }, zasahFunkci: true } });
    const a = A([bez]);
    expect([a.pasmo, a.predbezne, a.cekaNaPosouzeni]).toEqual(["vysoky", true, [bez.slug]]);
    const s = zaznam({ kodZeme: "PL", zavaznost: "O1", jistota: "potvrzeno", v2: { vazba: { typ: "spojenci", mechanismus: "m" }, zasahFunkci: true, kontrola: { role: "redakce", kdy: pred(0.5) } } });
    expect(A([s]).predbezne).toBe(false);
    /* Zvýšené pásmo posouzení před vydáním nepotřebuje. */
    expect(A([zaznam()]).predbezne).toBe(false);
  });
  it("neověřený záznam (jen média) do pásma nevstupuje", () => {
    expect(A([zaznam({ kodZeme: "CZ", zeme: "Česko", zavaznost: "R1", overeni: "neovereno", lidskyOvereno: false })]).pasmo).toBe("omezeny");
  });
  it("vysvětlení jmenuje pravidlo a kontext", () => {
    const a = A([zaznam({ titulek: "Rozhodující", kratkyTitulek: "Rozhodující" }), zaznam({ titulek: "Vzdálená", kratkyTitulek: "Vzdálená", kodZeme: "JP", zeme: "Japonsko" })]);
    expect(a.vysvetleni).toMatch(/„Rozhodující“ splnila pravidlo A-Z2; „Vzdálená“ je pouze kontext; proto pásmo Zvýšený/);
  });
});

import { cohenKappa, shodaPole } from "../src/lib/metodika2/shoda";

describe("metodika v2 — shoda dvou hodnotitelů", () => {
  it("kappa: úplná shoda 1, shoda jen náhodou kolem 0, prázdné se nepočítají", () => {
    expect(cohenKappa(["a", "b", "a", "b"], ["a", "b", "a", "b"])).toBe(1);
    expect(cohenKappa(["a", "a", "b", "b"], ["a", "b", "a", "b"])).toBe(0);
    expect(cohenKappa(["a", ""], ["a", "b"])).toBe(1);
    expect(cohenKappa([], [])).toBeNull();
  });
  it("neshody se vypíšou podle id", () => {
    const s = shodaPole("vazba", [{ id: "1", vazba: "spojenci" }, { id: "2", vazba: "kontext" }], [{ id: "1", vazba: "spojenci" }, { id: "2", vazba: "spojenci" }]);
    expect([s.parovych, s.shoda, s.neshody]).toEqual([2, 0.5, [{ id: "2", a: "kontext", b: "spojenci" }]]);
  });
});
