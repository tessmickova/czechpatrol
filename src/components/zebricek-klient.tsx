"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UCTY_ZAPNUTE } from "@/config/web";
import { zaznamejUdalost } from "@/lib/mereni";
import { KRAJE_ODOLNOSTI, nactiProfil, pocty, skore, souhrn } from "@/lib/odolnost";
import { api, useUcet } from "@/lib/ucet";
import { Hlaska, POLE, Popisek, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Ikona } from "./ikony";
import { Otaznik } from "./zaklad";

/*
  Žebříček připravenosti — pro přihlášené anonymní účty.

  Záznam patří účtu: jeden na účet, nové vyplnění přepíše skóre a datum,
  přezdívka (vygenerovaná) zůstává. Kdo vyplní audit bez přihlášení,
  dostane otázku: přihlásit se anonymně a být v žebříčku, nebo v žebříčku
  nebýt — druhá volba se pamatuje v zařízení a otázka se už neptá.

  Veřejně je vidět přezdívka, skóre, datum a kraj. Kontakt (e-mail,
  telefon) je nepovinný, jde jen správci a k pozvání do komunity; web to
  říká u polí. Bez šifrovacího klíče se pole ani nenabídnou.
*/

interface Zaznam { prezdivka: string; skore: number; datum: string; kraj: string | null }
interface Verejny { bezi: boolean; kontakt: boolean; pocet: number; prumer: number | null; zaznamy: Zaznam[] }
interface Muj { prezdivka: string; skore: number; datum: string; kraj: string | null; poradi: number; kontakt: boolean }

const KLIC_ODMITNUTI = "czechpatrol:zebricek:nechci";

function odmitnuto(): boolean {
  try { return localStorage.getItem(KLIC_ODMITNUTI) === "1"; } catch { return false; }
}

export function Zebricek() {
  const { ucet, nacita } = useUcet();
  const [data, setData] = useState<Verejny | null>(null);
  const [muj, setMuj] = useState<Muj | null>(null);
  const [moje, setMoje] = useState<number | null>(null);
  const [nechci, setNechci] = useState(false);
  const [form, setForm] = useState({ email: "", telefon: "", souhlas: false });
  const [ukazKontakt, setUkazKontakt] = useState(false);
  const [odesila, setOdesila] = useState(false);
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);

  const nactiVerejny = useCallback(async () => {
    if (!UCTY_ZAPNUTE) return;
    try { setData(await api<Verejny>("/zebricek")); } catch { setData(null); }
  }, []);

  useEffect(() => {
    const p = nactiProfil();
    if (p) {
      const s = souhrn(p);
      const vyplneno = s.hodnoceni.filter((h) => h.mam.length > 0 || h.nemohu).length;
      setMoje(vyplneno >= 3 ? skore(s) : null);
    }
    setNechci(odmitnuto());
    nactiVerejny();
  }, [nactiVerejny]);

  useEffect(() => {
    if (!ucet) { setMuj(null); return; }
    api<{ zaznam: Muj | null }>("/ja/zebricek").then((v) => setMuj(v.zaznam)).catch(() => setMuj(null));
  }, [ucet]);

  const nazevKraje = (k: string | null) => KRAJE_ODOLNOSTI.find((x) => x.klic === k)?.nazev ?? null;

  const zaradit = async () => {
    const p = nactiProfil();
    if (!p) return;
    const s = souhrn(p);
    setHlaska(null);
    setOdesila(true);
    try {
      const v = await api<{ prezdivka: string; opakovane?: boolean }>("/ja/zebricek", {
        method: "PUT",
        telo: { skore: skore(s), kraj: p.kontext.kraj || null, osob: p.osob, souhrn: pocty(s), email: ukazKontakt ? form.email : "", telefon: ukazKontakt ? form.telefon : "", souhlas: form.souhlas },
      });
      setHlaska({ typ: "ok", text: v.opakovane ? "Váš záznam je aktualizovaný." : `Jste v žebříčku jako ${v.prezdivka}.` });
      zaznamejUdalost("feedback_submit", { co: "zebricek" });
      setForm({ email: "", telefon: "", souhlas: false });
      setUkazKontakt(false);
      const m = await api<{ zaznam: Muj | null }>("/ja/zebricek");
      setMuj(m.zaznam);
      nactiVerejny();
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." });
    } finally {
      setOdesila(false);
    }
  };

  const odejit = async () => {
    setHlaska(null);
    try {
      await api("/ja/zebricek", { method: "DELETE" });
      setMuj(null);
      nactiVerejny();
      setHlaska({ typ: "ok", text: "Záznam i případný kontakt jsou smazané." });
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." });
    }
  };

  const zmena = muj !== null && moje !== null && muj.skore !== moje;

  return (
    <section className="mt-14 border-t border-linka2 pt-8" aria-labelledby="zebricek-nadpis">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 id="zebricek-nadpis" className="text-vetsi font-bold text-inkoust">Jak jste na tom proti ostatním</h2>
            <Otaznik popis={<span className="block">Skóre 0–100 je orientační hra pro srovnání: 70 bodů za zálohy (podle důležitosti oblastí), 30 za horizonty. Není to hodnocení člověka ani doklad o připravenosti.</span>} />
          </div>
          {moje !== null ? (
            <p className="mt-2 flex items-baseline gap-3">
              <span className="cislice text-cislo-l font-bold leading-none text-inkoust">{moje}</span>
              <span className="text-male text-tlum">vaše skóre z 100{data?.prumer !== null && data?.prumer !== undefined ? ` · průměr ostatních ${data.prumer}` : ""}</span>
            </p>
          ) : (
            <p className="mt-2 text-male text-tlum">Skóre se objeví, až vyplníte aspoň tři oblasti nahoře.</p>
          )}

          {!UCTY_ZAPNUTE ? (
            <p className="mt-4 text-male text-tlum">Žebříček připravujeme. Poběží s účty.</p>
          ) : nacita ? null : !ucet ? (
            moje !== null && !nechci ? (
              /* Otázka nepřihlášenému: účet je anonymní klíč k záznamu, ne sběr údajů. */
              <div className="mt-5 rounded-[22px] border border-linka2 p-5">
                <p className="text-zaklad font-semibold text-inkoust">Chcete být v žebříčku?</p>
                <p className="mt-1 text-male text-tlum">Žebříček stojí na anonymních účtech, aby měl každý záznam jednoho vlastníka. Účet je bez jména a e-mailu, jen passkey v zařízení; přezdívku vám vygenerujeme.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/ucet/" className={TLACITKO_AKCENT}><Ikona nazev="zamek" velikost={14} tah={2} /> Přihlásit se anonymně</Link>
                  <button type="button" className={TLACITKO_TICHE} onClick={() => { try { localStorage.setItem(KLIC_ODMITNUTI, "1"); } catch { /* bez úložiště se otázka objeví znovu */ } setNechci(true); }}>Nechci být v žebříčku</button>
                </div>
              </div>
            ) : nechci ? (
              <p className="mt-4 text-drobne text-tlum2">V žebříčku nejste. <button type="button" className="underline underline-offset-4 hover:text-inkoust" onClick={() => { try { localStorage.removeItem(KLIC_ODMITNUTI); } catch { /* nic */ } setNechci(false); }}>Rozmyslet si to</button></p>
            ) : null
          ) : (
            <div className="mt-5">
              {muj ? (
                <p className="text-male text-tlum">Jste v žebříčku jako <b className="font-semibold text-inkoust">{muj.prezdivka}</b>, {muj.poradi}. místo, skóre {muj.skore} ({muj.datum}).{muj.kontakt ? " Kontakt pro pozvání je uložený." : ""}</p>
              ) : (
                <p className="text-male text-tlum">Zatím v žebříčku nejste. Uloží se skóre, datum, kraj a počet osob; přezdívku vám vygenerujeme.</p>
              )}
              {data?.kontakt && !muj?.kontakt && (
                <div className="mt-3">
                  {!ukazKontakt ? (
                    <button type="button" className="text-male text-tlum underline underline-offset-4 hover:text-inkoust" onClick={() => setUkazKontakt(true)}>Nechat kontakt pro pozvání do komunity (nepovinné)</button>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div><Popisek pro="zb-email">E-mail</Popisek><input id="zb-email" type="email" autoComplete="email" className={POLE} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                        <div><Popisek pro="zb-tel">Telefon</Popisek><input id="zb-tel" type="tel" autoComplete="tel" className={`${POLE} cislice`} placeholder="+420 777 123 456" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} /></div>
                      </div>
                      <label className="flex items-start gap-2 text-drobne text-tlum">
                        <input type="checkbox" checked={form.souhlas} onChange={(e) => setForm({ ...form, souhlas: e.target.checked })} className="mt-[3px] h-4 w-4 accent-akcent" />
                        <span>Souhlasím s uložením kontaktu. Uloží se šifrovaně, vidí ho jen provozovatel a použije ho k pozvání do komunity; veřejně není vidět nic z něj. Kdykoli ho smažu odchodem ze žebříčku. <Link href="/soukromi/" className="odkaz">Soukromí</Link></span>
                      </label>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" disabled={odesila || moje === null || (ukazKontakt && (form.email.trim() !== "" || form.telefon.trim() !== "") && !form.souhlas)} onClick={zaradit} className={TLACITKO_AKCENT}>
                  {odesila ? "Ukládám…" : muj ? (zmena ? `Aktualizovat na ${moje}` : "Aktualizovat záznam") : "Zařadit se do žebříčku"}
                </button>
                {muj && <button type="button" onClick={odejit} className={TLACITKO_TICHE}>Odejít ze žebříčku</button>}
              </div>
              {moje === null && <p className="mt-2 text-drobne text-tlum2">Nejdřív vyplňte aspoň tři oblasti nahoře.</p>}
              {hlaska && <div className="mt-3"><Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska></div>}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="stitek">Žebříček</h3>
            {data && <span className="cislice text-drobne text-tlum2">{data.pocet} {data.pocet === 1 ? "záznam" : data.pocet < 5 ? "záznamy" : "záznamů"}</span>}
          </div>
          {!data || data.zaznamy.length === 0 ? (
            <p className="mt-2 text-male text-tlum2">{data ? "Zatím prázdný. Buďte první." : UCTY_ZAPNUTE ? "Žebříček se nepodařilo načíst." : "Žebříček připravujeme."}</p>
          ) : (
            <ol className="mt-2 divide-y divide-linka2">
              {data.zaznamy.map((z, i) => (
                <li key={`${z.prezdivka}-${z.datum}-${i}`} className={`flex items-center gap-3 py-2 text-male ${muj && z.prezdivka === muj.prezdivka ? "font-semibold" : ""}`}>
                  <span className="cislice w-6 shrink-0 text-drobne text-tlum2">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate text-inkoust">{z.prezdivka}{z.kraj && nazevKraje(z.kraj) ? <span className="font-normal text-tlum2"> · {nazevKraje(z.kraj)}</span> : ""}</span>
                  <span className="cislice shrink-0 text-drobne text-tlum2">{z.datum}</span>
                  <span className="cislice w-9 shrink-0 text-right font-bold text-inkoust">{z.skore}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
