"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, EMAIL_ODBER_BEZI, UCTY_ZAPNUTE } from "@/config/web";
import { zaznamejUdalost } from "@/lib/mereni";
import { KRAJE_ODOLNOSTI, nactiProfil, pocty, skore, souhrn } from "@/lib/odolnost";
import { Hlaska, POLE, Popisek, TLACITKO_AKCENT } from "./formulare";
import { Otaznik } from "./zaklad";

/*
  Žebříček připravenosti.

  Veřejně: přezdívka (vygenerovaná), skóre 0–100, datum. Zařadit se může
  ten, kdo vyplnil audit a nechá e-mail a telefon. Web u formuláře říká,
  komu kontakt jde a k čemu — bez toho by sběr nebyl v souladu s GDPR
  (čl. 13). Formulář se ukáže, jen když je uvedený provozovatel a běží
  API; jinak je tu jen seznam, nebo věta „připravujeme“.
*/

interface Zaznam { prezdivka: string; skore: number; datum: string; kraj: string | null }

export function Zebricek() {
  const [data, setData] = useState<{ bezi: boolean; pocet: number; prumer: number | null; zaznamy: Zaznam[] } | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [moje, setMoje] = useState<number | null>(null);
  const [profilJe, setProfilJe] = useState(false);
  const [form, setForm] = useState({ email: "", telefon: "", souhlas: false, past: "" });
  const [odesila, setOdesila] = useState(false);
  const [vysledek, setVysledek] = useState<{ prezdivka: string; opakovane?: boolean } | null>(null);

  useEffect(() => {
    const p = nactiProfil();
    if (p) {
      const s = souhrn(p);
      const vyplneno = s.hodnoceni.filter((h) => h.mam.length > 0 || h.nemohu).length;
      setProfilJe(vyplneno >= 3);
      setMoje(vyplneno >= 3 ? skore(s) : null);
    }
    if (!UCTY_ZAPNUTE) return;
    fetch(`${API_URL}/zebricek`, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((v) => setData(v))
      .catch(() => setData(null));
  }, []);

  const kraj = useMemo(() => nactiProfil()?.kontext.kraj ?? "", []);
  const nazevKraje = (k: string | null) => KRAJE_ODOLNOSTI.find((x) => x.klic === k)?.nazev ?? null;

  const odesli = async () => {
    const p = nactiProfil();
    if (!p) return;
    const s = souhrn(p);
    setChyba(null);
    setOdesila(true);
    try {
      const r = await fetch(`${API_URL}/zebricek`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ skore: skore(s), kraj: p.kontext.kraj || null, osob: p.osob, souhrn: pocty(s), email: form.email, telefon: form.telefon, souhlas: form.souhlas, past: form.past }),
      });
      const v = (await r.json()) as { ok?: boolean; prezdivka?: string; opakovane?: boolean; chyba?: string };
      if (!r.ok) throw new Error(v.chyba ?? `Chyba ${r.status}`);
      setVysledek({ prezdivka: v.prezdivka ?? "", opakovane: v.opakovane });
      zaznamejUdalost("feedback_submit", { co: "zebricek" });
      const z = await (await fetch(`${API_URL}/zebricek`, { headers: { Accept: "application/json" } })).json();
      setData(z);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Nepovedlo se odeslat.");
    } finally {
      setOdesila(false);
    }
  };

  const formularBezi = EMAIL_ODBER_BEZI && data?.bezi;

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

          {formularBezi ? (
            vysledek ? (
              <Hlaska typ="ok">{vysledek.opakovane ? "Váš záznam jsme aktualizovali." : "Jste v žebříčku."} Vaše přezdívka: <b>{vysledek.prezdivka}</b>. Kontakt vidí jen provozovatel.</Hlaska>
            ) : (
              <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); odesli(); }}>
                <p className="text-male text-tlum">Zařadit se do žebříčku. Uložíme skóre, datum, kraj a počet osob; přezdívku vám vygenerujeme.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Popisek pro="zb-email">E-mail</Popisek><input id="zb-email" type="email" autoComplete="email" required className={POLE} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Popisek pro="zb-tel">Telefon</Popisek><input id="zb-tel" type="tel" autoComplete="tel" required className={`${POLE} cislice`} placeholder="+420 777 123 456" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} /></div>
                </div>
                <input type="text" name="web" tabIndex={-1} autoComplete="off" className="hidden" value={form.past} onChange={(e) => setForm({ ...form, past: e.target.value })} aria-hidden />
                <label className="flex items-start gap-2 text-drobne text-tlum">
                  <input type="checkbox" checked={form.souhlas} onChange={(e) => setForm({ ...form, souhlas: e.target.checked })} className="mt-[3px] h-4 w-4 accent-akcent" />
                  <span>
                    Souhlasím s uložením e-mailu a telefonu. Veřejně je vidět jen přezdívka, skóre a datum. Kontakt vidí pouze provozovatel a použije ho ke dvěma věcem: k pozvání do komunity a k upozornění na kritickou událost, o kterém rozhoduje člověk, ne automat. Kdykoli požádám o smazání. <a href="/soukromi/" className="odkaz">Soukromí</a>
                  </span>
                </label>
                {chyba && <Hlaska typ="chyba">{chyba}</Hlaska>}
                <button type="submit" disabled={odesila || !profilJe || !form.souhlas} className={TLACITKO_AKCENT}>{odesila ? "Odesílám…" : "Zařadit se do žebříčku"}</button>
                {!profilJe && <p className="text-drobne text-tlum2">Nejdřív vyplňte aspoň tři oblasti nahoře.</p>}
              </form>
            )
          ) : (
            <p className="mt-4 text-male text-tlum">Zařazení do žebříčku připravujeme. Jakmile poběží, půjde se zařadit s e-mailem a telefonem; veřejně bude vidět jen přezdívka, skóre a datum.</p>
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
                <li key={`${z.prezdivka}-${z.datum}-${i}`} className="flex items-center gap-3 py-2 text-male">
                  <span className="cislice w-6 shrink-0 text-drobne text-tlum2">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate text-inkoust">{z.prezdivka}{z.kraj && nazevKraje(z.kraj) ? <span className="text-tlum2"> · {nazevKraje(z.kraj)}</span> : ""}</span>
                  <span className="cislice shrink-0 text-drobne text-tlum2">{z.datum}</span>
                  <span className="cislice w-9 shrink-0 text-right font-bold text-inkoust">{z.skore}</span>
                </li>
              ))}
            </ol>
          )}
          {kraj && data && data.zaznamy.some((z) => z.kraj === kraj) && <p className="mt-2 text-drobne text-tlum2">Váš kraj: {nazevKraje(kraj)}.</p>}
        </div>
      </div>
    </section>
  );
}
