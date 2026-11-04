import { describe, expect, it } from "vitest";
import { spocitejStav } from "../sber/hodnoceni";
import type { Incident } from "../src/lib/typy";

const TED = Date.parse("2026-09-23T12:00:00Z");
const z = (zavaznost: string, dniZpet: number, kod = "PL", extra: Partial<Incident> = {}) =>
  ({
    id: `${zavaznost}-${dniZpet}-${kod}`, zavaznost, kodZeme: kod, zeme: kod, druh: "pripad", lidskyOvereno: true,
    datumUdalosti: new Date(TED - dniZpet * 864e5).toISOString(), datumZjisteni: new Date(TED - dniZpet * 864e5).toISOString(),
    ...extra,
  }) as unknown as Incident;
const beh = new Date(TED - 3_600_000).toISOString();

describe("automatické celkové hodnocení", () => {
  it("jediná závažná událost hodnocení nezvedne", () => {
    const s = spocitejStav([z("R1", 1), z("Y1", 2), z("Y1", 3), z("Y1", 4)], TED, beh);
    expect(s.uroven).toBe("G3"); // Y1 v zahraničí = o stupeň níž
  });

  it("událost v Česku se nesnižuje", () => {
    expect(spocitejStav([z("Y2", 1, "CZ"), z("Y2", 2, "CZ"), z("Y2", 3, "CZ")], TED, beh).uroven).toBe("Y2");
  });

  it("neověřené úředně, reakce a staré záznamy nevstupují", () => {
    const s = spocitejStav([
      z("R3", 1, "PL", { lidskyOvereno: false, overeni: "neovereno" }),
      z("R3", 1, "PL", { druh: "reakce" }),
      z("R3", 30),
    ], TED, beh);
    expect(s.uroven).toBeNull(); // prázdné okno úroveň nestanoví (4. 11. 2026)
    expect(s.noveSignaly.celkem).toBe(0);
  });

  it("když sběr den neběžel, trend se nepočítá", () => {
    const s = spocitejStav([z("O1", 1), z("O1", 2), z("O1", 3)], TED, new Date(TED - 2 * 864e5).toISOString());
    expect(s.trend).toBeNull();
  });

  it("nárůst o čtvrtinu a aspoň o 3 body je trend nahoru", () => {
    const s = spocitejStav([z("O1", 1), z("O1", 2), z("O1", 3), z("Y1", 9)], TED, beh);
    expect(s.trend).toBe("nahoru");
  });
});

describe("mimořádný signál redakce", () => {
  const signal = (od: number, doDni: number) => ({
    id: "s", zaznam: null, kratce: "k", proc: "p", mez: "m",
    vyhodnoceno: new Date(TED - od * 864e5).toISOString(), platiDo: new Date(TED + doDni * 864e5).toISOString(),
  });
  const pripady = [z("Y3", 1), z("Y3", 2), z("Y3", 3)]; // v zahraničí → Y2

  it("zvedne hodnocení o jeden stupeň a nese spočtenou úroveň", () => {
    const s = spocitejStav(pripady, TED, beh, [signal(1, 10)]);
    expect(s.uroven).toBe("Y3");
    expect(s.mimoradny?.zakladni).toBe("Y2");
  });
  it("víc signálů zvedá pořád jen o jeden stupeň", () => {
    expect(spocitejStav(pripady, TED, beh, [signal(1, 10), signal(2, 10)]).uroven).toBe("Y3");
  });
  it("po platnosti se hodnocení samo vrátí", () => {
    const s = spocitejStav(pripady, TED, beh, [signal(15, -1)]);
    expect(s.uroven).toBe("Y2");
    expect(s.mimoradny).toBeNull();
  });
  it("nad nejvyšší úroveň nejde", () => {
    const r = [z("R3", 1, "CZ"), z("R3", 2, "CZ"), z("R3", 3, "CZ")];
    expect(spocitejStav(r, TED, beh, [signal(1, 10)]).uroven).toBe("R3");
  });

  it("prázdné okno úroveň nestanoví; mimořádný signál ji i tak zvedne nad výchozí (4. 11. 2026)", () => {
    const prazdne = spocitejStav([], TED, beh);
    expect(prazdne.uroven).toBeNull();
    expect(prazdne.shrnuti).toMatch(/nestanovuje/);
    expect(prazdne.shrnuti).not.toMatch(/ověřování|fronta/i);
    expect(spocitejStav([z("Y1", 1)], TED, beh).uroven).toBeNull(); // jeden případ je pořád málo
    expect(spocitejStav([z("Y1", 1), z("Y1", 2)], TED, beh).uroven).toBe("G3");
    expect(spocitejStav([], TED, beh, [signal(1, 10)]).uroven).toBe("G3");
  });
});

describe("ověřování stojí (31. 10. 2026)", () => {
  it("poslední rozhodnutí starší než 48 h: trend se nepočítá, veřejné texty o tom mlčí", () => {
    const stare = new Date(TED - 5 * 864e5).toISOString();
    const s = spocitejStav([], TED, beh, [], stare);
    expect(s.overovaniStoji).toBe(stare);
    expect(s.trend).toBeNull();
    // Provozní stav na veřejný web nepatří (provozovatelka 1. 11. 2026).
    expect(`${s.shrnuti} ${s.trendPopis}`).not.toMatch(/ověřování|stojí|Patrol|výpadek/i);
  });
  it("čerstvé rozhodnutí nebo nic ve frontě: nic se netvrdí", () => {
    expect(spocitejStav([], TED, beh, [], new Date(TED - 3_600_000).toISOString()).overovaniStoji).toBeNull();
    expect(spocitejStav([], TED, beh, [], null).overovaniStoji).toBeNull();
    expect(spocitejStav([], TED, beh).trend).toBe("beze-zmeny");
  });
  it("poslední rozhodnutí se čte z fronty, jen když něco čeká", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const { posledniOvereniFronty } = await import("../sber/hodnoceni");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hodnoceni-"));
    fs.mkdirSync(path.join(dir, "fronta"));
    fs.writeFileSync(path.join(dir, "fronta", "vyrizene.json"), JSON.stringify([{ kdy: "2026-10-18T16:46:09Z" }, { kdy: "2026-10-17T10:00:00Z" }, { kdy: "nesmysl" }]));
    fs.writeFileSync(path.join(dir, "kandidati.json"), JSON.stringify([{ stav: "ceka" }]));
    expect(posledniOvereniFronty(dir)).toBe("2026-10-18T16:46:09Z");
    fs.writeFileSync(path.join(dir, "kandidati.json"), JSON.stringify([]));
    expect(posledniOvereniFronty(dir)).toBeNull();
    fs.writeFileSync(path.join(dir, "kandidati.json"), "{rozbité");
    expect(posledniOvereniFronty(dir)).toBeNull();
  });
});

describe("provozní stav není na veřejném webu (1. 11. 2026)", () => {
  it("stránky ani veřejné JSON nevypisují overovaniStoji", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const soubory: string[] = [];
    const projdi = (d: string) => {
      for (const p of fs.readdirSync(d, { withFileTypes: true })) {
        const cesta = path.join(d, p.name);
        if (p.isDirectory()) projdi(cesta);
        else if (/\.tsx?$/.test(p.name) && !cesta.endsWith(path.join("lib", "typy.ts"))) soubory.push(cesta);
      }
    };
    projdi(path.join(__dirname, "..", "src"));
    const kde = soubory.filter((f) => fs.readFileSync(f, "utf-8").includes("overovaniStoji"));
    expect(kde).toEqual([]);
  });
});
