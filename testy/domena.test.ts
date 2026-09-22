// @ts-nocheck — skript je prostý ES modul bez typů; test hlídá chování, typy hlídá běh.
import { describe, expect, it } from "vitest";
import { CIL, DOMENA, PRAVIDLO_WWW, WWW, rozhodniDns, shrnuti } from "../nastroje/domena.mjs";

/*
  Nastavení domény na Cloudflare dělá skript, ne klikání. Síť se v testu
  nevolá; hlídá se rozhodování — hlavně to, co se smí smazat. Špatné
  rozhodnutí tady je smazaný záznam DNS v ostrém účtu.
*/

const z = (type, name, content, dalsi = {}) => ({ id: `${type}-${name}`, type, name, content, proxied: false, ...dalsi });

describe("doména: rozhodnutí o záznamech DNS", () => {
  it("čistá zóna: založí CNAME na Pages pro holou doménu i www, obojí přes proxy", () => {
    const r = rozhodniDns([]);
    expect(r.smazat).toEqual([]);
    expect(r.zalozit.map((x) => [x.type, x.name, x.content, x.proxied])).toEqual([
      ["CNAME", DOMENA, CIL, true],
      ["CNAME", WWW, CIL, true],
    ]);
  });

  it("import od Forpsi: parkovací záznamy a hvězdička pryč, pošta a cizí poddomény zůstávají", () => {
    const zaznamy = [
      z("A", DOMENA, "81.2.196.19"),
      z("CNAME", `*.${DOMENA}`, DOMENA),
      z("CNAME", WWW, DOMENA),
      z("MX", DOMENA, "mail.example.cz", { priority: 10 }),
      z("TXT", DOMENA, "v=spf1 -all"),
      z("A", `api.${DOMENA}`, "10.0.0.1"),
    ];
    const r = rozhodniDns(zaznamy);
    expect(r.smazat.map((x) => x.id)).toEqual([`A-${DOMENA}`, `CNAME-*.${DOMENA}`, `CNAME-${WWW}`]);
    expect(r.ponechat.map((x) => x.id)).toEqual([`MX-${DOMENA}`, `TXT-${DOMENA}`, `A-api.${DOMENA}`]);
    expect(r.zalozit.map((x) => x.name)).toEqual([DOMENA, WWW]);
  });

  it("už nastavené: nic nemaže ani nezakládá", () => {
    const r = rozhodniDns([z("CNAME", DOMENA, CIL, { proxied: true }), z("CNAME", WWW, CIL, { proxied: true })]);
    expect(r.smazat).toEqual([]);
    expect(r.zalozit).toEqual([]);
    expect(r.ponechat).toHaveLength(2);
  });

  it("velikost písmen a tečka na konci nerozhodují", () => {
    const r = rozhodniDns([z("CNAME", DOMENA.toUpperCase(), `${CIL}.`)]);
    expect(r.smazat).toEqual([]);
    expect(r.zalozit.map((x) => x.name)).toEqual([WWW]);
  });

  it("hvězdička, která neukazuje na holou doménu, není z importu a nechá se být", () => {
    const r = rozhodniDns([z("CNAME", `*.${DOMENA}`, "jinde.example.cz")]);
    expect(r.smazat).toEqual([]);
    expect(r.ponechat).toHaveLength(1);
  });
});

describe("doména: souhrn pro člověka", () => {
  const zaklad = { domena: DOMENA, zona: null, dns: null, pages: null, presmerovaniWww: null, chybejiciPrava: [] };
  const aktivni = { nalezena: true, stav: "active", nameserveryCloudflare: [], puvodniNameservery: [] };

  it("bez zóny řekne, že chybí nebo ji token nesmí číst", () => {
    expect(shrnuti({ ...zaklad, zona: { nalezena: false } }).join(" ")).toMatch(/se v účtu Cloudflare nenašla/);
  });

  it("čekající zóna vypíše nameservery, které se mají zadat u registrátora, i ty původní", () => {
    const text = shrnuti({
      ...zaklad,
      zona: { nalezena: true, stav: "pending", nameserveryCloudflare: ["a.ns.cloudflare.com", "b.ns.cloudflare.com"], puvodniNameservery: ["ns.forpsi.cz"] },
    }).join(" ");
    expect(text).toContain("a.ns.cloudflare.com a b.ns.cloudflare.com");
    expect(text).toContain("ns.forpsi.cz");
  });

  it("aktivní zóna a aktivní domény v Pages = web běží", () => {
    const text = shrnuti({
      ...zaklad,
      zona: aktivni,
      pages: { domeny: [{ jmeno: DOMENA, stav: "active" }, { jmeno: WWW, stav: "active" }], chyby: [], pridano: [] },
    }).join(" ");
    expect(text).toContain(`Web běží na https://${DOMENA}`);
  });

  it("domény v Pages, které ještě čekají, se vypíší jmenovitě", () => {
    const text = shrnuti({
      ...zaklad,
      zona: aktivni,
      pages: { domeny: [{ jmeno: DOMENA, stav: "pending" }, { jmeno: WWW, stav: "active" }], chyby: [], pridano: [] },
    }).join(" ");
    expect(text).toContain(`${DOMENA} (pending)`);
    expect(text).not.toContain("Web běží");
  });

  it("odstraněné záznamy vypíše i s obsahem, aby šly vrátit", () => {
    const text = shrnuti({ ...zaklad, zona: aktivni, dns: { odstraneno: [{ typ: "A", jmeno: DOMENA, obsah: "81.2.196.19" }], zalozeno: [], chyby: [] } }).join(" ");
    expect(text).toContain("A czechpatrol.cz → 81.2.196.19");
  });

  it("web na doméně: odpovídá, parkuje, nebo neodpovídá", () => {
    const web = (w) => shrnuti({ ...zaklad, zona: aktivni, web: { www: { http: 0, konecnaAdresa: null }, ...w } }).join(" ");
    expect(web({ http: 200, commit: "abcdef0123" })).toContain("Web na https://czechpatrol.cz odpovídá (commit abcdef0)");
    expect(web({ http: 200, commit: null })).toContain("něco jiného než web");
    expect(web({ http: 0, commit: null, chyba: "fetch failed" })).toContain("fetch failed");
    expect(web({ http: 200, commit: "abcdef0123", www: { http: 200, konecnaAdresa: "https://www.czechpatrol.cz/" } })).toContain("www zatím nepřesměrovává");
    expect(web({ http: 200, commit: "abcdef0123", www: { http: 200, konecnaAdresa: "https://czechpatrol.cz/" } })).not.toContain("nepřesměrovává");
  });

  it("chybějící práva vypíše jmenovitě", () => {
    const text = shrnuti({ ...zaklad, zona: aktivni, chybejiciPrava: ["Zone · DNS · Edit"] }).join(" ");
    expect(text).toContain("Zone · DNS · Edit");
  });
});

describe("doména: pravidlo přesměrování", () => {
  it("míří z www na holou doménu trvale a zachová cestu i dotaz", () => {
    expect(PRAVIDLO_WWW.expression).toContain(WWW);
    expect(PRAVIDLO_WWW.action_parameters.from_value.target_url.expression).toContain(`https://${DOMENA}`);
    expect(PRAVIDLO_WWW.action_parameters.from_value.preserve_query_string).toBe(true);
    expect(PRAVIDLO_WWW.action_parameters.from_value.status_code).toBe(301);
  });
});
