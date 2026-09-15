import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { rozhodni, type Stazeno } from "../sber/rozhodovani";
import { ZDROJE } from "../sber/zdroje";
import type { RegistrZdroj } from "../sber/typy";
import { blueskyFeed, ctenaProfily, mastodonRss, telegramNahled } from "../sber/socialni";

const zdroj = (
  klic: string, tyka: string[], klicova: string[], sledovana: string[] = [],
  navic: Partial<RegistrZdroj> = {},
): RegistrZdroj => ({
  klic, nazev: klic, druh: "pravni", url: `https://example.invalid/${klic}`,
  format: "html", jazyk: "cs", primarni: true, klicova, sledovana, tyka, overenaAdresa: false,
  ...navic,
});

/** Text musí být delší než práh obsahu, jinak se počítá jako prázdná stránka. */
const VYPLN = "Úřední stránka s běžným obsahem. ".repeat(20);

const stazeno = (z: RegistrZdroj, text: string, ok = true, stav?: number): Stazeno => ({
  zdroj: z, ok, text, polozky: [], stav: stav ?? (ok ? 200 : 503),
});

const MOBILIZACE = zdroj(
  "urad",
  ["mobilizace"],
  ["naridil mobilizaci", "vyhlasil valecny stav"],
  ["mobilizace"],
);

describe("co smí automat tvrdit o stavu opatření", () => {
  it("nenález v tiskové stránce úřadu zápor NEDOKLÁDÁ", () => {
    /*
      Tohle je jádro celé opravy. Dřív stačilo stáhnout jeden relevantní zdroj
      a nenajít v něm frázi, a sběr přepsal právní stav na „neplatí" a obnovil
      datum ověření. Z toho, že o opatření tisková stránka nepíše, ale neplyne,
      že neexistuje — plyne z toho jen to, že o něm ta stránka nepíše.
    */
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, `Běžná tisková zpráva. ${VYPLN}`)]);
    expect(r.kontrolaDokoncena).toBe(true);
    expect(r.pokryti).toBe("orientacni");
    expect(r.vecneOvereno).toBe(false);
    expect(r.duvod).toContain("úplný seznam");
  });

  it("úplný autoritativní seznam zápor doložit smí", () => {
    const registr = zdroj("registr", ["mobilizace"], ["naridil mobilizaci"], [], { autoritativni: true });
    const r = rozhodni("mobilizace", [stazeno(registr, `Seznam vyhlášených opatření: žádné. ${VYPLN}`)]);
    expect(r.pokryti).toBe("autoritativni");
    expect(r.vecneOvereno).toBe(true);
  });

  it("fráze o vyhlášení blokuje zápor i v autoritativním seznamu", () => {
    const registr = zdroj("registr", ["mobilizace"], ["naridil mobilizaci"], [], { autoritativni: true });
    const r = rozhodni("mobilizace", [stazeno(registr, `Prezident naridil mobilizaci. ${VYPLN}`)]);
    expect(r.signal).toBe(true);
    expect(r.vecneOvereno).toBe(false);
    expect(r.nalezy[0].shody).toContain("naridil mobilizaci");
    expect(r.nalezy[0].polozka.shrnuti.length).toBeGreaterThan(0);
  });

  it("najde frázi i s diakritikou v textu", () => {
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, `Parlament VYHLÁSIL VÁLEČNÝ STAV. ${VYPLN}`)]);
    expect(r.signal).toBe(true);
    expect(r.nalezy[0].shody).toContain("vyhlasil valecny stav");
  });

  it("tematická zmínka jde do fronty, ale není signál o vyhlášení", () => {
    // Slovo „mobilizace" je trvale v menu i v archivu úředních webů.
    const r = rozhodni("mobilizace", [
      stazeno(MOBILIZACE, `Sekce Obrana státu: mobilizace, branná povinnost, zálohy. ${VYPLN}`),
    ]);
    expect(r.signal).toBe(false);
    expect(r.nalezy).toHaveLength(1);
    expect(r.nalezy[0].shody).toContain("mobilizace");
  });

  it("prázdné HTML ani JS skořápka nejsou provedená kontrola", () => {
    // Úřad vrátí HTTP 200 a v těle skoro nic. To není doklad, to je ticho.
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, "<div id=app></div>")]);
    expect(r.zpracovano).toEqual([]);
    expect(r.kontrolaDokoncena).toBe(false);
    expect(r.pokryti).toBe("nedostupne");
    expect(r.vecneOvereno).toBe(false);
  });

  it("při výpadku zdroje se nic neověřuje", () => {
    const r = rozhodni("mobilizace", [stazeno(MOBILIZACE, "", false)]);
    expect(r.pokryti).toBe("nedostupne");
    expect(r.selhalo).toEqual(["urad"]);
    expect(r.vecneOvereno).toBe(false);
  });

  it("jeden funkční a jeden potřebný nefunkční zdroj kontrolu nedokončí", () => {
    /*
      Regresní scénář ze zadání: dřív stačil jediný úspěšný zdroj a selhání
      druhého potřebného výsledek nezablokovalo.
    */
    const druhy = zdroj("druhy", ["mobilizace"], ["naridil mobilizaci"], [], { autoritativni: true });
    const r = rozhodni("mobilizace", [
      stazeno(MOBILIZACE, `Nic zvláštního. ${VYPLN}`),
      stazeno(druhy, "", false),
    ]);
    expect(r.kontrolaDokoncena).toBe(false);
    expect(r.vecneOvereno).toBe(false);
    expect(r.duvod).toContain("druhy");
  });

  it("stačí jediný zdroj s frází, i když ostatní mlčí", () => {
    const druhy = zdroj("druhy", ["mobilizace"], ["naridil mobilizaci"]);
    const r = rozhodni("mobilizace", [
      stazeno(MOBILIZACE, `Nic zvláštního. ${VYPLN}`),
      stazeno(druhy, `Prezident nařídil mobilizaci. ${VYPLN}`),
    ]);
    expect(r.signal).toBe(true);
    expect(r.nalezy).toHaveLength(1);
  });

  it("bez relevantního zdroje se nic nepotvrzuje", () => {
    const jiny = zdroj("jiny", ["elektrina"], ["stav nouze"]);
    const r = rozhodni("mobilizace", [stazeno(jiny, `Nic zvláštního. ${VYPLN}`)]);
    expect(r.pokryti).toBe("nedostupne");
    expect(r.stazeno).toHaveLength(0);
  });

  it("zdroj blokující automaty kontrolu nezdrží", () => {
    // Web prezidenta vrací 403. Kdyby byl povinný, položka by byla trvale nedostupná.
    const blokujici = zdroj("hrad", ["mobilizace"], ["naridil mobilizaci"], [], { ocekavaneBlokovani: "blokuje" });
    const r = rozhodni("mobilizace", [
      stazeno(MOBILIZACE, `Nic zvláštního. ${VYPLN}`),
      stazeno(blokujici, "", false),
    ]);
    expect(r.kontrolaDokoncena).toBe(true);
    expect(r.pokryti).toBe("orientacni");
  });
});

describe("dnešní registr zdrojů", () => {
  it("žádný zdroj se nevydává za úplný seznam", () => {
    /*
      Schválně. Ani e-Sbírka, ani tisková stránka vlády nejsou načítané tak,
      aby z nich šlo doložit, že opatření NEEXISTUJE. Dokud to nebude platit,
      web zápor nedokládá a píše, co v kontrolovaných zdrojích není.
      Až někdo označí zdroj jako autoritativní, musí zároveň doložit, které
      území a typ opatření pokrývá celý a jak se pozná úplné načtení.
    */
    expect(ZDROJE.filter((z) => z.autoritativni).map((z) => z.klic)).toEqual([]);
  });
});

describe("registr zdrojů", () => {
  it("nemá duplicitní klíče", () => {
    const klice = ZDROJE.map((z) => z.klic);
    expect(new Set(klice).size).toBe(klice.length);
  });

  it("používá jen https", () => {
    for (const z of ZDROJE) expect(z.url.startsWith("https://"), z.klic).toBe(true);
  });

  it("každý zdroj s klíčovými slovy říká, čeho se týká", () => {
    for (const z of ZDROJE) {
      if (z.klicova?.length) expect(z.tyka?.length, z.klic).toBeGreaterThan(0);
    }
  });

  it("blokující fráze jsou fráze, ne jednotlivá témata", () => {
    // Jednoslovné „mobilizace“ nebo „article 5“ je v menu každého úředního
    // webu. Jako blokující klíč by zápor neumožnilo potvrdit nikdy.
    for (const z of ZDROJE) {
      for (const k of z.klicova ?? []) {
        expect(k.trim().split(/\s+/).length, `${z.klic}: „${k}“`).toBeGreaterThan(1);
      }
    }
  });
});

describe("pokrytí sledovaných položek", () => {
  it("žádnou položku nedrží jediný čitelný zdroj", () => {
    /*
      Dvě věci se tu hlídají najednou.

      Zdroj, ze kterého automat nic nepřečte — vrací 403, prázdnou slupku
      dokreslovanou JavaScriptem, nebo neodpovídá — se do pokrytí nepočítá.
      Kdyby se počítal, web by u položky hlásil dva zdroje a fakticky neměl
      ani jeden.

      A čitelný zdroj nesmí být jediný. Když vypadne, nezbude o položce nic
      a web u ní mlčí — přesně ve chvíli, kdy na ni lidé koukají.
    */
    const citelne = ZDROJE.filter((z) => !z.ocekavaneBlokovani);
    const polozky = new Set(ZDROJE.flatMap((z) => z.tyka ?? []));
    for (const k of polozky) {
      const kryji = citelne.filter((z) => (z.tyka ?? []).includes(k));
      expect(kryji.length, `položku „${k}“ kryje ${kryji.length} čitelných zdrojů: ${kryji.map((z) => z.klic).join(", ") || "žádný"}`)
        .toBeGreaterThanOrEqual(2);
    }
  });
});

describe("profily na sociálních sítích", () => {
  it("seznam obsahuje jen profily s doloženou pravostí", () => {
    /*
      Modrý odznak si koupí kdokoli. Pravost účtu se dokládá odkazem
      z vlastního webu instituce — bez něj se profil nečte, protože bychom
      jinak připisovali instituci příspěvky někoho úplně jiného.
    */
    for (const p of ctenaProfily()) {
      expect(p.pravostDolozena, p.klic).toMatch(/^https?:\/\//);
      expect(p.overenaAdresa, p.klic).toBe(true);
    }
  });

  it("nečte se profil bez dokladu pravosti, ani když má ověřenou adresu", () => {
    const podvrh = {
      klic: "x", kdo: "Ministr", role: "ministr", sit: "mastodon" as const, ucet: "x@example.invalid",
      url: "https://example.invalid/@x.rss", odkaz: "https://example.invalid/@x", jazyk: "cs",
      pravostDolozena: "", overenaAdresa: true,
    };
    expect([podvrh].filter((p) => p.pravostDolozena && p.overenaAdresa)).toHaveLength(0);
  });

  it("adresy se skládají podle veřejných rozhraní jednotlivých sítí", () => {
    expect(mastodonRss("social.example", "urad")).toBe("https://social.example/@urad.rss");
    expect(blueskyFeed("urad.example")).toContain("public.api.bsky.app");
    expect(telegramNahled("kanal")).toBe("https://t.me/s/kanal");
  });
});

describe("sběr nesmí tiše vynechat celý krok", () => {
  it("hodinový běh volá sběr událostí", () => {
    /*
      Tenhle test existuje kvůli skutečné chybě: při přepisu rozhodovací
      logiky 15. 9. 2026 vypadlo z běhu celé volání sbirejUdalosti(). Sběr
      dál hlásil úspěch, jen přestal zachytávat události — a nikde to nebylo
      vidět, protože „nula nových kandidátů" vypadá stejně jako klid.
    */
    const beh = fs.readFileSync(new URL("../sber/index.ts", import.meta.url), "utf-8");
    expect(beh).toContain("await sbirejUdalosti()");
    expect(beh).toContain("await sbirejPalivo()");
  });
});
