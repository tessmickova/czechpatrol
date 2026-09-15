"use client";

import { useState } from "react";
import { API_URL, KOMUNITA, TIPY_MAIL, UCTY_ZAPNUTE } from "@/config/web";
import { Hlaska, POLE, Popisek, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Ikona } from "./ikony";

/*
  „Chybí tu nějaká událost?“

  Formulář bez účtu. S API se hlášení uloží pro správce; bez API se
  otevře e-mail. Kontakt je dobrovolný — kdo ho nechá prázdný, hlásí
  anonymně. Nic z toho se nezveřejní automaticky.
*/
export function Nahlaseni() {
  const [otevreno, setOtevreno] = useState(false);
  const [popis, setPopis] = useState("");
  const [odkaz, setOdkaz] = useState("");
  const [jmeno, setJmeno] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [past, setPast] = useState("");
  const [stav, setStav] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const [odesila, setOdesila] = useState(false);

  const mailto = () => {
    const telo = [popis, odkaz && `Odkaz na úřední zdroj: ${odkaz}`, jmeno && `Jméno: ${jmeno}`, telefon && `Telefon: ${telefon}`].filter(Boolean).join("\n\n");
    return `mailto:${TIPY_MAIL}?subject=${encodeURIComponent("CzechPatrol: chybějící událost")}&body=${encodeURIComponent(telo)}`;
  };

  const odesli = async (e: React.FormEvent) => {
    e.preventDefault();
    setStav(null);
    if (popis.trim().length < 20) {
      setStav({ typ: "chyba", text: "Popište prosím, co chybí — aspoň pár vět." });
      return;
    }
    if (!UCTY_ZAPNUTE) {
      if (TIPY_MAIL) window.location.href = mailto();
      else setStav({ typ: "chyba", text: "Příjem hlášení se připravuje. Zkuste to prosím znovu později." });
      return;
    }
    setOdesila(true);
    try {
      const r = await fetch(`${API_URL}/tipy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ popis, odkaz, jmeno, email, telefon, past }),
      });
      const data = (await r.json().catch(() => ({}))) as { chyba?: string };
      if (!r.ok) throw new Error(data.chyba ?? "Nepovedlo se odeslat.");
      setStav({ typ: "ok", text: "Díky. Hlášení máme, správce ho projde. Pokud jste nechali kontakt, ozveme se jen v případě dotazu." });
      setPopis(""); setOdkaz(""); setJmeno(""); setEmail(""); setTelefon("");
    } catch (err) {
      setStav({ typ: "chyba", text: err instanceof Error ? err.message : "Nepovedlo se odeslat." });
    } finally {
      setOdesila(false);
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOtevreno((x) => !x)}
        aria-expanded={otevreno}
        className={`${otevreno ? TLACITKO_TICHE : TLACITKO_AKCENT}`}
      >
        <Ikona nazev="plus" velikost={14} tah={2.2} /> Chybí tu nějaká událost? Napište nám
      </button>

      {otevreno && (
        <form onSubmit={odesli} className="sklo mt-4 w-full max-w-[720px] rounded-[18px] p-5 sm:p-6">
          <div className="stitek mb-1 !text-akcent">Hlášení události</div>
          <p className="mb-4 text-zaklad leading-relaxed text-tlum">
            Nejlepší je odkaz na úřední zdroj — policii, vládu, NATO, EU. Bez zdroje záznam nezveřejníme, ale rádi ho dohledáme.
            Kontakt je dobrovolný; použijeme ho jen na doptání a po roce smažeme.
          </p>
          <div className="space-y-4">
            <div>
              <Popisek pro="tip-popis">Co se stalo, kde a kdy</Popisek>
              <textarea id="tip-popis" required value={popis} onChange={(e) => setPopis(e.target.value)} rows={4} className={POLE} placeholder="Datum, místo, co se stalo, kdo to oznámil." />
            </div>
            <div>
              <Popisek pro="tip-odkaz">Odkaz na oficiální web</Popisek>
              <input id="tip-odkaz" type="url" value={odkaz} onChange={(e) => setOdkaz(e.target.value)} className={POLE} placeholder="https://" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Popisek pro="tip-jmeno">Jméno (nepovinné)</Popisek>
                <input id="tip-jmeno" value={jmeno} onChange={(e) => setJmeno(e.target.value)} className={POLE} autoComplete="name" />
              </div>
              <div>
                <Popisek pro="tip-email">E-mail (nepovinné)</Popisek>
                <input id="tip-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={POLE} autoComplete="email" />
              </div>
              <div>
                <Popisek pro="tip-telefon">Telefon (nepovinné)</Popisek>
                <input id="tip-telefon" type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} className={`${POLE} cislice`} autoComplete="tel" />
              </div>
            </div>
            {/* past na roboty — lidé pole nevidí */}
            <input tabIndex={-1} autoComplete="off" value={past} onChange={(e) => setPast(e.target.value)} className="hidden" aria-hidden />
            {stav && <Hlaska typ={stav.typ}>{stav.text}</Hlaska>}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={odesila} className={TLACITKO_AKCENT}>
                <Ikona nazev="odeslat" velikost={14} tah={2} /> {odesila ? "Odesílám…" : UCTY_ZAPNUTE ? "Odeslat správci" : TIPY_MAIL ? "Odeslat e-mailem" : "Odeslat"}
              </button>
              {KOMUNITA.diskuse && (
                <a href={KOMUNITA.diskuse} target="_blank" rel="noopener noreferrer" className="text-male text-tlum underline underline-offset-4 hover:text-inkoust">
                </a>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
