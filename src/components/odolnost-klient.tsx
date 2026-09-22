"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUcet } from "@/lib/ucet";
import { zaznamejUdalost } from "@/lib/mereni";
import {
  DUVODY_NEMOHU, FUNKCE, HORIZONTY_DNI, lidskaDoba, nactiProfil, PRAZDNY_PROFIL, souhrn, ulozProfil, VERZE_KATALOGU, ZAVISLOSTI,
  type Doporuceni, type HodnoceniFunkce, type Horizont, type Profil,
} from "@/lib/odolnost";
import { POLE, Popisek, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Ikona } from "./ikony";
import { Zamceno } from "./muj-prehled-klient";
import { Sdeleni } from "./ui";
import { Otaznik } from "./zaklad";

/*
  Odolnost domácnosti — pro přihlášené.

  Všechno se počítá v prohlížeči z katalogu a z toho, co člověk zaškrtl.
  Profil se ukládá jen v zařízení; účet je klíč ke dveřím, ne místo, kam
  by se posílalo, co kdo doma má. Bez skóre 0–100: jedno číslo by
  tvrdilo přesnost, kterou model nemá. Místo něj: kolik funkcí má
  nezávislou zálohu, které závislosti vypínají víc funkcí naráz, a jak
  dlouho vydrží zásoby — vždy s předpoklady.
*/

const SLOVA_REDUNDANCE: Record<0 | 1 | 2 | 3, { slovo: string; trida: string }> = {
  0: { slovo: "bez cesty", trida: "text-akcent" },
  1: { slovo: "jediná cesta", trida: "text-jantar" },
  2: { slovo: "záloha, společné selhání", trida: "text-jantar" },
  3: { slovo: "nezávislé cesty", trida: "text-klid-text" },
};

const SLOVA_HORIZONTU: Record<Horizont["stav"], { slovo: string; trida: string }> = {
  pripraveno: { slovo: "připraveno", trida: "text-klid-text" },
  castecne: { slovo: "částečně", trida: "text-jantar" },
  slabe: { slovo: "slabé", trida: "text-akcent" },
  nehodnoceno: { slovo: "nehodnoceno", trida: "text-tlum2" },
};

function cislo(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function OdolnostKlient() {
  const { ucet, nacita } = useUcet();
  const [p, setP] = useState<Profil>(PRAZDNY_PROFIL);
  const [nacteno, setNacteno] = useState(false);
  const [ulozisteFunguje, setUlozisteFunguje] = useState(true);
  const [ukazDoporuceni, setUkazDoporuceni] = useState(false);

  useEffect(() => {
    const n = nactiProfil();
    if (n) setP(n); else setUlozisteFunguje(false);
    setNacteno(true);
  }, []);

  const uloz = (nove: Profil) => {
    setP(nove);
    if (!ulozProfil(nove)) setUlozisteFunguje(false);
  };

  const s = useMemo(() => souhrn(p), [p]);

  if (nacita) return <Sdeleni ikona="zamek">Ověřuji přihlášení…</Sdeleni>;
  if (!ucet) return <Zamceno co="Odolnost domácnosti" />;
  if (!nacteno) return null;

  const prepniCestu = (funkce: string, cesta: string) => {
    const dnes = p.cesty[funkce] ?? [];
    uloz({ ...p, cesty: { ...p.cesty, [funkce]: dnes.includes(cesta) ? dnes.filter((c) => c !== cesta) : [...dnes, cesta] } });
  };
  const nastavNemohu = (funkce: string, duvod: string) => {
    const nemohu = { ...p.nemohu };
    if (duvod) nemohu[funkce] = duvod; else delete nemohu[funkce];
    uloz({ ...p, nemohu });
  };

  const exportuj = () => {
    const telo = JSON.stringify({ verzeKatalogu: VERZE_KATALOGU, exportovano: new Date().toISOString(), profil: p, souhrn: { horizonty: s.horizonty.map((h) => ({ dni: h.dni, stav: h.stav })), body: s.body.map((b) => ({ zavislost: b.zavislost, vypne: b.vypne.map((f) => f.klic) })), doporuceni: s.doporuceni } }, null, 2);
    const url = URL.createObjectURL(new Blob([telo], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "czechpatrol-odolnost.json"; a.click();
    URL.revokeObjectURL(url);
    zaznamejUdalost("preference_save", { co: "odolnost-export" });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* ---------- vstupy ---------- */}
      <div className="min-w-0 space-y-8">
        {!ulozisteFunguje && (
          <Sdeleni ton="pozor" ikona="vykricnik">Úložiště prohlížeče nefunguje (soukromé okno?). Vše se počítá, ale po zavření stránky se to neuloží.</Sdeleni>
        )}

        <section className="rounded-[22px] border border-linka2 bg-plocha p-5">
          <div className="stitek mb-3">Domácnost</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Popisek pro="od-osob">Kolik lidí</Popisek>
              <input id="od-osob" type="number" min={0} className={`${POLE} cislice`} value={p.osob} onChange={(e) => uloz({ ...p, osob: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
            <div>
              <Popisek pro="od-zvirat">Kolik zvířat, která pijí a jedí s vámi</Popisek>
              <input id="od-zvirat" type="number" min={0} className={`${POLE} cislice`} value={p.zvirat} onChange={(e) => uloz({ ...p, zvirat: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
          </div>
          <p className="mt-3 text-drobne text-tlum2">Jmenovatel pro vodu. Nic dalšího o lidech se neukládá.</p>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="stitek">Jak u vás fungují základní věci</span>
            <Otaznik popis={<span className="block">U každé potřeby zaškrtněte cesty, které opravdu máte. Každá cesta má pevně dané závislosti (elektřina, síť, vodovod…). Z toho se počítá, co vypadne s čím. Co nemůžete vyřešit, označte — místo červeného varování dostanete, co jde místo toho.</span>} />
          </div>
          <ul className="space-y-3">
            {s.hodnoceni.map((h) => <KartaFunkce key={h.funkce.klic} h={h} vybrane={p.cesty[h.funkce.klic] ?? []} naCestu={(c) => prepniCestu(h.funkce.klic, c)} naNemohu={(d) => nastavNemohu(h.funkce.klic, d)} />)}
          </ul>
        </section>

        <section className="rounded-[22px] border border-linka2 bg-plocha p-5">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="stitek">Zásoby a energie</span>
            <Otaznik popis={<span className="block">Prázdné pole znamená „nevím“, ne nulu. Nula je nula. Předpoklady spotřeby jsou u výsledku a jdou přečíst; nejsou to normy.</span>} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Popisek pro="od-voda">Pitná voda uložená (litry)</Popisek><input id="od-voda" inputMode="decimal" className={`${POLE} cislice`} value={p.zasoby.pitnaVodaL ?? ""} onChange={(e) => uloz({ ...p, zasoby: { ...p.zasoby, pitnaVodaL: cislo(e.target.value) } })} placeholder="nevím" /></div>
            <div><Popisek pro="od-uzitkova">Užitková voda (litry)</Popisek><input id="od-uzitkova" inputMode="decimal" className={`${POLE} cislice`} value={p.zasoby.uzitkovaVodaL ?? ""} onChange={(e) => uloz({ ...p, zasoby: { ...p.zasoby, uzitkovaVodaL: cislo(e.target.value) } })} placeholder="nevím" /></div>
            <div><Popisek pro="od-jidlo">Jídlo bez nákupu (dny pro celou domácnost)</Popisek><input id="od-jidlo" inputMode="decimal" className={`${POLE} cislice`} value={p.zasoby.jidloDni ?? ""} onChange={(e) => uloz({ ...p, zasoby: { ...p.zasoby, jidloDni: cislo(e.target.value) } })} placeholder="nevím" /></div>
            <div><Popisek pro="od-leky">Léky a pomůcky (dny, podle lékaře)</Popisek><input id="od-leky" inputMode="decimal" className={`${POLE} cislice`} value={p.zasoby.lekyDni ?? ""} onChange={(e) => uloz({ ...p, zasoby: { ...p.zasoby, lekyDni: cislo(e.target.value) } })} placeholder="nevím / netýká se" /></div>
            <div><Popisek pro="od-kap">Vlastní zdroj energie: kapacita (Wh)</Popisek><input id="od-kap" inputMode="decimal" className={`${POLE} cislice`} value={p.energie.kapacitaWh || ""} onChange={(e) => uloz({ ...p, energie: { ...p.energie, kapacitaWh: cislo(e.target.value) ?? 0 } })} placeholder="0 = nemám" /></div>
            <div><Popisek pro="od-potreba">Nouzová spotřeba za den (Wh)</Popisek><input id="od-potreba" inputMode="decimal" className={`${POLE} cislice`} value={p.energie.potrebaDenWh || ""} onChange={(e) => uloz({ ...p, energie: { ...p.energie, potrebaDenWh: cislo(e.target.value) ?? 0 } })} placeholder="součet W × hodin" /></div>
          </div>
          <label className="mt-4 flex items-start gap-3 text-male text-tlum">
            <input type="checkbox" checked={p.energie.dobijeni} onChange={(e) => uloz({ ...p, energie: { ...p.energie, dobijeni: e.target.checked } })} className="mt-1 h-4 w-4 accent-akcent" />
            Umím zdroj dobíjet bez sítě (solár, generátor, auto)
          </label>
          <p className="mt-3 text-drobne text-tlum2">Spotřebu sečtěte ze štítků zařízení: příkon ve W × hodiny denně. Web hodnoty nedosazuje, u každého zařízení se liší.</p>
        </section>

        <section className="rounded-[22px] border border-linka2 bg-plocha p-5">
          <div className="stitek mb-2">Za 0 Kč</div>
          <p className="text-male text-tlum">Co zvýší odolnost bez nákupu, u funkcí, které zatím nemají nezávislou zálohu.</p>
          <ul className="mt-3 space-y-2">
            {s.hodnoceni.filter((h) => h.redundance < 3).flatMap((h) => h.funkce.nulaKc.slice(0, 2).map((r) => ({ f: h.funkce.nazev, r }))).slice(0, 8).map((x, i) => (
              <li key={i} className="flex gap-2 text-male text-tlum"><Ikona nazev="fajfka" velikost={13} tah={2.2} trida="mt-1 shrink-0 text-klid-text" /><span><b className="font-semibold text-inkoust">{x.f}:</b> {x.r}</span></li>
            ))}
          </ul>
        </section>
      </div>

      {/* ---------- přehled ---------- */}
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-[84px] lg:self-start">
        <section className="rounded-[22px] border border-linka2 bg-plocha p-5">
          <div className="stitek mb-3">Horizont domácnosti</div>
          <ul className="divide-y divide-linka2">
            {s.horizonty.map((h) => (
              <li key={h.dni} className="flex items-center justify-between py-2">
                <span className="cislice text-male text-inkoust">{h.dni === 1 ? "24 h" : h.dni === 3 ? "72 h" : `${h.dni} dní`}</span>
                <span className={`text-male font-semibold uppercase tracking-[0.04em] ${SLOVA_HORIZONTU[h.stav].trida}`}>{SLOVA_HORIZONTU[h.stav].slovo}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-drobne text-tlum2">Plánovací horizont domácnosti, ne předpověď, jak dlouho co vydrží ve státě.</p>
        </section>

        <section className="rounded-[22px] border border-linka2 bg-plocha p-5">
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className="stitek">Nezávislá záloha</dt><dd className="cislice mt-1 text-cislo font-bold text-inkoust">{s.vyreseno.n} <span className="text-tlum2">/ {s.vyreseno.z}</span></dd></div>
            <div><dt className="stitek">Kritické závislosti</dt><dd className="cislice mt-1 text-cislo font-bold text-inkoust">{s.body.filter((b) => b.vypne.length >= 2).length}</dd></div>
            <div className="col-span-2"><dt className="stitek">Nejslabší článek</dt><dd className="mt-1 text-zaklad font-semibold text-inkoust">{s.nejslabsi ? `${s.nejslabsi.funkce.nazev} · ${SLOVA_REDUNDANCE[s.nejslabsi.redundance].slovo}` : "—"}</dd></div>
          </dl>
          {s.body.filter((b) => b.vypne.length >= 2).slice(0, 2).map((b) => (
            <p key={b.zavislost} className="mt-3 flex items-start gap-2 text-male text-tlum">
              <span className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-akcent" />
              <span>Výpadek: <b className="font-semibold text-inkoust">{b.nazev.toLowerCase()}</b> u vás vypne {b.vypne.length} {b.vypne.length < 5 ? "funkce" : "funkcí"}: {b.vypne.map((f) => f.nazev.toLowerCase()).join(", ")}.</span>
            </p>
          ))}
        </section>

        <section className="rounded-[22px] border border-linka2 bg-plocha p-5">
          <div className="mb-2 flex items-center gap-1.5"><span className="stitek">Jak dlouho vydrží</span><Otaznik popis={<span className="block">Předpoklady jsou u každé položky. Skutečná spotřeba se liší; číslo je k plánování, ne k uklidnění.</span>} /></div>
          <ul className="divide-y divide-linka2">
            {s.vydrze.filter((v) => v.klic !== "energie" || p.energie.kapacitaWh > 0).map((v) => (
              <li key={v.klic} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-1.5 text-male text-inkoust">{v.nazev}<Otaznik popis={<span className="block">{v.predpoklad}</span>} /></span>
                <span className="cislice shrink-0 text-male font-semibold text-inkoust">{v.dni === null ? <span className="text-tlum2">nezadáno</span> : lidskaDoba(v.dni)}</span>
              </li>
            ))}
          </ul>
        </section>

        <button type="button" onClick={() => { setUkazDoporuceni(true); zaznamejUdalost("filter_apply", { co: "odolnost-co-chybi" }); }} className={`${TLACITKO_AKCENT} w-full justify-center`}>
          <Ikona nazev="lupa" velikost={15} tah={2} /> Co má teď největší smysl?
        </button>
        {ukazDoporuceni && (
          <section aria-live="polite" className="space-y-3">
            {s.doporuceni.length === 0 ? (
              <Sdeleni ton="klid" ikona="fajfka" nadpis="Nic naléhavého.">Každá důležitá funkce má nezávislou zálohu a zásoby vydrží přes 72 hodin. Další zlepšení má menší přínos než otestovat, co máte.</Sdeleni>
            ) : s.doporuceni.map((d, i) => <KartaDoporuceni key={i} d={d} poradi={i + 1} />)}
          </section>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportuj} className={TLACITKO_TICHE}><Ikona nazev="instalace" velikost={14} tah={2} /> Stáhnout plán (JSON)</button>
          <button type="button" onClick={() => window.print()} className={TLACITKO_TICHE}><Ikona nazev="dokument" velikost={14} tah={2} /> Tisk</button>
        </div>
        <p className="text-drobne text-tlum2">Uloženo jen v tomto zařízení. Plán je váš i bez účtu: stažený soubor otevřete kdekoli. Katalog verze {VERZE_KATALOGU}. <Link href="/pripravenost/" className="odkaz">Oficiální nástroje a 72h základ</Link></p>
      </aside>
    </div>
  );
}

function KartaFunkce({ h, vybrane, naCestu, naNemohu }: { h: HodnoceniFunkce; vybrane: string[]; naCestu: (c: string) => void; naNemohu: (d: string) => void }) {
  const [otevreno, setOtevreno] = useState(false);
  const f = h.funkce;
  const r = SLOVA_REDUNDANCE[h.redundance];
  return (
    <li className="rounded-[22px] border border-linka2 bg-plocha">
      <button type="button" onClick={() => setOtevreno((x) => !x)} aria-expanded={otevreno} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className={`h-[8px] w-[8px] shrink-0 rounded-full ${h.redundance === 3 ? "bg-klid" : h.redundance === 0 ? "bg-akcent" : "bg-jantar"}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-zaklad font-semibold text-inkoust">{f.nazev}</span>
          <span className={`block text-drobne ${h.nemohu ? "text-tlum2" : r.trida}`}>{h.nemohu ? `řešeno jinak · ${DUVODY_NEMOHU.find((d) => d.klic === h.nemohu)?.nazev ?? ""}` : r.slovo}{vybrane.length ? ` · ${vybrane.length} ${vybrane.length === 1 ? "cesta" : vybrane.length < 5 ? "cesty" : "cest"}` : ""}</span>
        </span>
        <Ikona nazev="dolu" velikost={13} tah={2} trida={`shrink-0 text-tlum2 transition-transform ${otevreno ? "rotate-180" : ""}`} />
      </button>
      {otevreno && (
        <div className="border-t border-linka2 px-4 py-3">
          <p className="text-male text-tlum">Potřeba: {f.potreba}.</p>
          <ul className="mt-2 space-y-1.5">
            {f.cesty.map((c) => (
              <li key={c.klic}>
                <label className="flex cursor-pointer items-start gap-3 rounded-[12px] px-2 py-1.5 hover:bg-plocha2">
                  <input type="checkbox" checked={vybrane.includes(c.klic)} onChange={() => naCestu(c.klic)} className="mt-1 h-4 w-4 accent-akcent" />
                  <span className="min-w-0">
                    <span className="block text-male text-inkoust">{c.nazev}{c.zadarmo && <span className="ml-1.5 text-mikro text-klid-text">0 Kč</span>}{c.externi && <span className="ml-1.5 text-mikro text-tlum2">externí služba</span>}</span>
                    <span className="block text-drobne text-tlum2">
                      {c.zavislosti.length ? `závisí na: ${c.zavislosti.map((z) => ZAVISLOSTI[z]?.nazev.toLowerCase() ?? z).join(", ")}` : "bez vnější závislosti"}
                      {c.poznamka ? ` · ${c.poznamka}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {h.spolecne.length > 0 && h.redundance === 2 && (
            <p className="mt-2 text-drobne text-jantar">Vaše zálohy sdílejí závislost: {h.spolecne.map((z) => ZAVISLOSTI[z]?.nazev.toLowerCase() ?? z).join(", ")}. Když vypadne, vypadnou spolu.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-male text-tlum" htmlFor={`nemohu-${f.klic}`}>Tohle nemohu vyřešit:</label>
            <select id={`nemohu-${f.klic}`} value={h.nemohu ?? ""} onChange={(e) => naNemohu(e.target.value)} className={`${POLE} !w-auto`}>
              <option value="">ne, řeším</option>
              {DUVODY_NEMOHU.map((d) => <option key={d.klic} value={d.klic}>{d.nazev}</option>)}
            </select>
          </div>
          {h.nemohu && (
            <ul className="mt-2 space-y-1 rounded-[14px] border border-dashed border-linka px-3 py-2">
              {f.kompenzace.map((k) => <li key={k} className="text-male text-tlum">{k}</li>)}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function KartaDoporuceni({ d, poradi }: { d: Doporuceni; poradi: number }) {
  return (
    <article className="rounded-[22px] border border-akcent/40 bg-plocha p-4">
      <div className="flex items-start gap-3">
        <span className="cislice grid h-7 w-7 shrink-0 place-items-center rounded-full bg-akcent/15 text-male font-bold text-akcent">{poradi}</span>
        <div className="min-w-0">
          <h3 className="text-zaklad font-bold text-inkoust">{d.nadpis}</h3>
          <dl className="mt-2 space-y-1.5 text-male">
            <div><dt className="stitek inline">Proč to vidíte:</dt> <dd className="inline text-tlum">{d.proc}</dd></div>
            <div><dt className="stitek inline">Na čem to stojí:</dt> <dd className="inline text-tlum">{d.zaklad}</dd></div>
            <div><dt className="stitek inline">Co to řeší:</dt> <dd className="inline text-tlum">{d.resi.join(", ")}</dd></div>
            {d.alternativy.length > 0 && (
              <div><dt className="stitek">Možnosti:</dt><dd><ul className="mt-1 list-disc space-y-0.5 pl-5 text-tlum">{d.alternativy.map((a) => <li key={a}>{a}</li>)}</ul></dd></div>
            )}
            <div><dt className="stitek inline">Kdy to není potřeba:</dt> <dd className="inline text-tlum">{d.kdyNeni}</dd></div>
          </dl>
        </div>
      </div>
    </article>
  );
}

