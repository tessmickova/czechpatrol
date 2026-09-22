import { describe, expect, it } from "vitest";
import { sestavEmail, maskujEmail, platnyEmail } from "../src/emaily";
import { ABECEDA_KODU, maskuj, normalizujKodKreditu, novyKodKreditu, platnyTvarKodu } from "../src/kredity";
import { platneK } from "../src/opravneni";
import { pouzijStav, prechod } from "../src/platby";
import { maPravoPodle } from "../src/prava";
import { desifruj, sifrovaniNastaveno, zasifruj } from "../src/sifrovani";
import type { Env } from "../src/typy";

/*
  Premium: peníze a kódy. Testy hlídají to, co se nesmí pokazit ani
  jednou — tvar kódu, stavový automat plateb, že dva webhooky neodemknou
  dvakrát, že správce bez zvláštního práva nevydá kredit, a že šifrování
  vrátí, co dostalo.
*/

describe("kód kreditu", () => {
  it("má tvar CP-XXXX-XXXX bez záměnných znaků", () => {
    for (let i = 0; i < 200; i++) {
      const k = novyKodKreditu();
      expect(k).toMatch(/^CP-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(k).not.toMatch(/[0O1IL]/);
    }
    expect(ABECEDA_KODU).not.toMatch(/[0O1IL]/);
  });

  it("normalizace snese malá písmena, mezery i chybějící CP-", () => {
    expect(normalizujKodKreditu(" cp-ab23-x9pq ")).toBe("AB23X9PQ");
    expect(normalizujKodKreditu("AB23X9PQ")).toBe("AB23X9PQ");
    expect(normalizujKodKreditu("AB23 X9PQ")).toBe("AB23X9PQ");
    expect(platnyTvarKodu("AB23X9PQ")).toBe(true);
    expect(platnyTvarKodu("AB23X9P0")).toBe(false);
    expect(platnyTvarKodu("AB23")).toBe(false);
  });

  it("maska ukazuje jen poslední čtyři znaky", () => {
    expect(maskuj("X9PQ")).toBe("CP-****-X9PQ");
  });

  it("je jiný pokaždé", () => {
    const s = new Set(Array.from({ length: 500 }, () => novyKodKreditu()));
    expect(s.size).toBe(500);
  });
});

describe("práva správců", () => {
  it("běžná práva plynou z role, ruční kredit ne", () => {
    expect(maPravoPodle("admin", "platby.cist", [])).toBe(true);
    expect(maPravoPodle("admin", "kredity.nahradit", [])).toBe(true);
    expect(maPravoPodle("admin", "kredity.vydat_rucne", [])).toBe(false);
    expect(maPravoPodle("admin", "kredity.vydat_rucne", ["kredity.vydat_rucne"])).toBe(true);
    expect(maPravoPodle("obcan", "platby.cist", ["platby.cist"])).toBe(false);
  });
});

describe("oprávnění", () => {
  const kdy = new Date("2026-09-22T12:00:00Z");
  it("platí jen ACTIVE v časovém okně", () => {
    expect(platneK({ stav: "ACTIVE", platne_od: "2026-09-01T00:00:00Z", platne_do: null }, kdy)).toBe(true);
    expect(platneK({ stav: "ACTIVE", platne_od: "2026-09-01T00:00:00Z", platne_do: "2026-09-22T11:59:00Z" }, kdy)).toBe(false);
    expect(platneK({ stav: "ACTIVE", platne_od: "2026-10-01T00:00:00Z", platne_do: null }, kdy)).toBe(false);
    expect(platneK({ stav: "REVOKED", platne_od: "2026-09-01T00:00:00Z", platne_do: null }, kdy)).toBe(false);
  });
});

describe("stavový automat plateb", () => {
  it("PAID jen z CREATED/PENDING; z PAID nikam", () => {
    expect(prechod("CREATED", "PAID")).toBe("PAID");
    expect(prechod("PENDING", "PAID")).toBe("PAID");
    expect(prechod("PAID", "PAID")).toBeNull();
    expect(prechod("PAID", "CANCELLED")).toBeNull();
    expect(prechod("REFUNDED", "PAID")).toBeNull();
    expect(prechod("PENDING", "CANCELLED")).toBe("CANCELLED");
    expect(prechod("PENDING", "PENDING")).toBeNull();
    expect(prechod("PENDING", "AUTHORIZED")).toBeNull();
    expect(prechod("CANCELLED", "PAID")).toBeNull();
  });
});

/* Napodobenina D1 pro dávku PAID: hlídá UNIQUE (zdroj_druh, zdroj_id) u oprávnění. */
function falesnaDb() {
  const zdroje = new Set<string>();
  const zapisy: string[] = [];
  const stmt = (sql: string) => {
    let args: unknown[] = [];
    const s = {
      bind: (...a: unknown[]) => { args = a; return s; },
      run: async () => {
        if (sql.startsWith("INSERT INTO opravneni")) {
          const k = `${args[4]}|${args[5]}`;
          if (zdroje.has(k)) throw new Error("UNIQUE constraint failed: opravneni.zdroj_druh, opravneni.zdroj_id");
          zdroje.add(k);
        }
        zapisy.push(sql.split(" ").slice(0, 3).join(" "));
        return { success: true, meta: { changes: 1 } };
      },
      first: async () => (sql.includes("email_sifrovany") ? { email_sifrovany: null } : null),
      all: async () => ({ results: [] }),
    };
    return s;
  };
  const db = {
    prepare: stmt,
    batch: async (davka: { run: () => Promise<unknown> }[]) => {
      // D1 dávka je atomická: první selhání zahodí všechno.
      const pred = zapisy.length;
      try { for (const d of davka) await d.run(); } catch (e) { zapisy.length = pred; throw e; }
      return [];
    },
  };
  return { db: db as unknown as D1Database, zapisy, zdroje };
}

const KLIC = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // 32 bajtů base64url (samé nuly) — jen pro test

describe("dávka po zaplacení", () => {
  const platba = { id: "p-1", ucet_id: "u-1", produkt: "premium-odolnost" as const, castka_haleru: 15000, mena: "CZK", stav: "PENDING", provider_payment_id: "T1" };

  it("PAID zapíše platbu, oprávnění, kredit a audit; druhý webhook nic", async () => {
    const { db, zapisy, zdroje } = falesnaDb();
    const env = { DB: db, KLIC_SIFROVANI: KLIC } as unknown as Env;
    expect(await pouzijStav(env, platba, "PAID", 15000, "CZK")).toBe("PAID");
    expect(zapisy.filter((z) => z.startsWith("INSERT INTO opravneni")).length).toBe(1);
    expect(zapisy.filter((z) => z.startsWith("INSERT INTO kredity")).length).toBe(1);
    expect(zapisy.filter((z) => z.startsWith("INSERT INTO audit")).length).toBe(3);
    expect(zdroje.has("platba|p-1")).toBe(true);
    // Stejná platba znovu (souběžný webhook, který ještě četl PENDING):
    const pred = zapisy.length;
    expect(await pouzijStav(env, platba, "PAID", 15000, "CZK")).toBe("beze-zmeny");
    expect(zapisy.length).toBe(pred);
  });

  it("jiná částka u brány neodemkne, jen označí k rozhodnutí", async () => {
    const { db, zapisy } = falesnaDb();
    const env = { DB: db, KLIC_SIFROVANI: KLIC } as unknown as Env;
    expect(await pouzijStav(env, platba, "PAID", 100, "CZK")).toBe("nesedi-castka");
    expect(zapisy.some((z) => z.startsWith("INSERT INTO opravneni"))).toBe(false);
  });

  it("už zaplacená platba se nemění", async () => {
    const { db, zapisy } = falesnaDb();
    const env = { DB: db, KLIC_SIFROVANI: KLIC } as unknown as Env;
    expect(await pouzijStav(env, { ...platba, stav: "PAID" }, "PAID", 15000, "CZK")).toBe("beze-zmeny");
    expect(zapisy.length).toBe(0);
  });
});

describe("šifrování", () => {
  it("bez klíče není nastavené, s klíčem vrátí totéž", async () => {
    expect(sifrovaniNastaveno({} as Env)).toBe(false);
    const env = { KLIC_SIFROVANI: KLIC } as Env;
    expect(sifrovaniNastaveno(env)).toBe(true);
    const s = await zasifruj(env, "CP-AB23-X9PQ");
    expect(s.startsWith("v1.")).toBe(true);
    expect(s).not.toContain("AB23");
    expect(await desifruj(env, s)).toBe("CP-AB23-X9PQ");
    expect(await zasifruj(env, "x")).not.toBe(await zasifruj(env, "x"));
  });
});

describe("e-mail s kódem", () => {
  it("obsahuje kód, hodnotu, odkaz do účtu a pravdu o e-shopu", () => {
    const e = sestavEmail("kredit-vydan", { kod: "CP-AB23-X9PQ", hodnotaHaleru: 15000, mena: "CZK", stav: "ACTIVE", eshopBezi: false, web: "https://czechpatrol.cz", nazevWebu: "CzechPatrol" });
    expect(e.predmet).toBe("Váš CzechPatrol kredit 150 Kč");
    expect(e.text).toContain("CP-AB23-X9PQ");
    expect(e.text).toContain("150 Kč");
    expect(e.text).toContain("po spuštění CzechPatrol e-shopu");
    expect(e.text).toContain("/ucet/#kredity");
    const b = sestavEmail("kredit-nahrada", { kod: "CP-AB23-X9PQ", hodnotaHaleru: 15000, mena: "CZK", stav: "ACTIVE", eshopBezi: true, web: "https://czechpatrol.cz", nazevWebu: "CzechPatrol" });
    expect(b.text).toContain("náhradní kód");
    expect(b.text).toContain("v košíku");
  });
  it("maska e-mailu a kontrola", () => {
    expect(maskujEmail("jana@example.cz")).toBe("j***@example.cz");
    expect(platnyEmail("jana@example.cz")).toBe(true);
    expect(platnyEmail("jana")).toBe(false);
  });
});

import { normalizujTelefon, novaPrezdivka, platnyTelefon } from "../src/zebricek";

describe("žebříček", () => {
  it("přezdívka je slovo, zvíře a číslo — nikdy zadaná", () => {
    expect(novaPrezdivka(() => 0)).toBe("Bdělý ježek 10");
    expect(novaPrezdivka()).toMatch(/^[A-ZÁ-Ž][a-zá-ž]+ [a-zá-ž]+ \d{2}$/);
  });
  it("telefon: české devítimístné i mezinárodní", () => {
    expect(platnyTelefon("777 123 456")).toBe(true);
    expect(platnyTelefon("+420 777 123 456")).toBe(true);
    expect(platnyTelefon("12345")).toBe(false);
    expect(normalizujTelefon("777 123 456")).toBe("+420777123456");
  });
});
