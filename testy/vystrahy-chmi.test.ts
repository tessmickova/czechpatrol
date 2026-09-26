import { describe, expect, it } from "vitest";
import { ctiCapChmi, krajZNazvu } from "../sber/vystrahy-chmi";
import { sestavPrehled, type KonfiguraceCerstvosti } from "../src/lib/prehled/model";
import konfigurace from "../data/cerstvost-zdroju.json";

/*
  Vzorek ve tvaru ověřeném ze sítě sběru 26. 9. 2026 (vystrahy-cr.chmi.cz,
  XOCZ50_OKPR.xml): <area> = kraj, geokódy CISORP a EMMA_ID, bloky
  „Žádná výstraha…“ pro zbytek území.
*/
const oblast = (kraj: string, orp: string[]) =>
  `<area><areaDesc>${kraj}</areaDesc>${orp.map((c) => `<geocode><valueName>CISORP</valueName><value>${c}</value></geocode><geocode><valueName>EMMA_ID</valueName><value>CZ0${c}</value></geocode>`).join("")}</area>`;
const info = (udalost: string, oblasti: string, extra = "") =>
  `<info><language>cs</language><category>Met</category><event>${udalost}</event><urgency>Immediate</urgency><severity>Moderate</severity><certainty>Likely</certainty><onset>2026-09-26T10:00:00+02:00</onset><expires>2026-09-26T22:00:00+02:00</expires><senderName>ČHMÚ</senderName><description>Očekávají se nárazy větru 70 až 90 km/h.</description>${extra}<web>https://vystrahy-cr.chmi.cz/</web>${oblasti}</info>`;
const alert = (infa: string, msgType = "Update") =>
  `<?xml version="1.0" encoding="UTF-8"?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>2.49.0.0.203.0.CZ.X</identifier><sender>chmi@chmi.cz</sender><sent>2026-09-26T08:00:00+02:00</sent><status>Actual</status><msgType>${msgType}</msgType><scope>Public</scope>${infa}</alert>`;

const JMK = ["6201", "6202", "6203"];
const zadna = info("Žádná výstraha před silným větrem", oblast("Jihomoravský kraj", JMK) + oblast("Kraj Vysočina", ["6101", "6102"]) + oblast("Hlavní město Praha", ["1100"]));

describe("výstrahy ČHMÚ (CAP)", () => {
  it("kraj se mapuje jen na známé názvy", () => {
    expect(krajZNazvu("Středočeský kraj")).toBe("Středočeský");
    expect(krajZNazvu("Kraj Vysočina")).toBe("Vysočina");
    expect(krajZNazvu("Hlavní město Praha")).toBe("Hlavní město Praha");
    expect(krajZNazvu("Neznámý okres")).toBeNull();
  });
  it("bloky „Žádná výstraha“ nejsou výstrahy", () => {
    const r = ctiCapChmi(alert(zadna));
    expect(r.ok && r.vystrahy).toEqual([]);
  });
  it("výstraha přes všechny ORP kraje = celý kraj; se zněním vydavatele a platností", () => {
    const r = ctiCapChmi(alert(zadna + info("Silný vítr", oblast("Jihomoravský kraj", JMK))));
    if (!r.ok) throw new Error(r.duvod);
    expect(r.vystrahy).toHaveLength(1);
    const v = r.vystrahy[0];
    expect(v.uzemi).toEqual({ druh: "kraje", kraje: ["Jihomoravský"] });
    expect(v.vydavatel).toBe("ČHMÚ");
    expect(v.textJe).toBe("zneni-vydavatele");
    expect(v.platiDo).toBe("2026-09-26T20:00:00.000Z");
    expect(v.typ).toBe("oficialni-vystraha");
  });
  it("jen část ORP = část kraje, v přehledu „nelze určit“", () => {
    const r = ctiCapChmi(alert(zadna + info("Silný vítr", oblast("Jihomoravský kraj", ["6201"]))));
    if (!r.ok) throw new Error(r.duvod);
    expect(r.vystrahy[0].uzemi).toMatchObject({ druh: "cast", kraje: ["Jihomoravský"] });
  });
  it("pokyn se převezme doslova, jen když v originále je", () => {
    const r = ctiCapChmi(alert(zadna + info("Silný vítr", oblast("Jihomoravský kraj", JMK), "<instruction>Zajistěte volně uložené předměty.</instruction>")));
    if (!r.ok) throw new Error(r.duvod);
    expect(r.vystrahy[0].pokyn).toBe("Zajistěte volně uložené předměty.");
    expect(r.vystrahy[0].typ).toBe("oficialni-pokyn");
  });
  it("neznámé území se nezahodí, jen se nepřiřadí", () => {
    const r = ctiCapChmi(alert(zadna + info("Silný vítr", oblast("Krkonoše — hřebeny", ["9999"]))));
    if (!r.ok) throw new Error(r.duvod);
    expect(r.vystrahy[0].uzemi).toEqual({ druh: "nezname", popis: "Krkonoše — hřebeny" });
  });
  it("HTTP 200 s chybovou stránkou nebo prázdným alertem není „žádná výstraha“", () => {
    expect(ctiCapChmi("<html><body>Údržba</body></html>").ok).toBe(false);
    expect(ctiCapChmi(alert("")).ok).toBe(false);
    expect(ctiCapChmi(alert(info("Silný vítr", ""))).ok).toBe(false);
  });
  it("zrušení celého stavu je platná odpověď bez výstrah", () => {
    const r = ctiCapChmi(alert(zadna, "Cancel"));
    expect(r.ok && r.vystrahy).toEqual([]);
  });
  it("výstraha pro celý kraj se v přehledu ukáže jako oficiální výstraha pro ten kraj", () => {
    const r = ctiCapChmi(alert(zadna + info("Silný vítr", oblast("Jihomoravský kraj", JMK))));
    if (!r.ok) throw new Error(r.duvod);
    const ted = Date.parse("2026-09-26T12:00:00Z");
    const t = new Date(ted - 20 * 60_000).toISOString();
    const K = konfigurace as unknown as KonfiguraceCerstvosti;
    const zdroje = K.skupiny.flatMap((s) => s.zdroje).map((klic) => ({ klic, nazev: klic, odkaz: "", blokovany: false, posledniUspech: t, posledniPokus: t, posledniVysledek: "ok" as const, chyba: null, neuspechuZaSebou: 0 }));
    const s = { verze: 1 as const, generovano: t, beh: { kdy: t, zdroju: zdroje.length, ok: zdroje.length }, zdroje, sluzby: { aktualizovano: t }, palivo: { aktualizovano: t }, informace: r.vystrahy, neovereno: { signalu24h: 0, vyvracenych: 0, oznacenoUradem: 0 } };
    expect(sestavPrehled(s, { druh: "kraj", kraj: "Jihomoravský" }, K, ted).hlavni.druh).toBe("vystraha");
    expect(sestavPrehled(s, { druh: "kraj", kraj: "Zlínský" }, K, ted).hlavni.druh).toBe("bez-vystrahy");
    expect(sestavPrehled(s, { druh: "kraj", kraj: "Zlínský" }, K, ted).mimoOblast).toBe(1);
  });
});
