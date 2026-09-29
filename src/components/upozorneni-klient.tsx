"use client";

import { useEffect, useState } from "react";
import { DRUHY_UPOZORNENI, VYCHOZI_DRUHY, aktualniOdber, podpora, stavOdberu, vypnout, zapnout, zkouska, type DruhUpozorneni, type Podpora } from "@/lib/push";
import { Hlaska, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Ikona } from "./ikony";

/*
  Zapnutí upozornění do telefonu. Tři stavy, které člověk vidí:
  nejde to (a proč), vypnuto (výběr + tlačítko), zapnuto (výběr, zkouška,
  vypnutí). Svolení prohlížeče se žádá až po kliknutí, nikdy samo.
*/
export function UpozorneniKlient() {
  const [moznost, setMoznost] = useState<Podpora | null>(null);
  const [zapnuto, setZapnuto] = useState(false);
  const [zakazano, setZakazano] = useState(false);
  const [druhy, setDruhy] = useState<DruhUpozorneni[]>(VYCHOZI_DRUHY);
  const [pracuji, setPracuji] = useState(false);
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);

  useEffect(() => {
    const p = podpora();
    setMoznost(p);
    if (p !== "ano") return;
    setZakazano(Notification.permission === "denied");
    aktualniOdber()
      .then((o) => (o ? stavOdberu() : { prihlaseno: false as const }))
      .then((s) => {
        setZapnuto(s.prihlaseno);
        if (s.prihlaseno && "druhy" in s && s.druhy?.length) setDruhy(s.druhy);
      })
      .catch(() => {});
  }, []);

  const akce = async (co: () => Promise<void>, ok: string) => {
    setPracuji(true);
    setHlaska(null);
    try {
      await co();
      setHlaska({ typ: "ok", text: ok });
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Něco se nepovedlo. Zkuste to prosím znovu." });
    } finally {
      setPracuji(false);
      if ("Notification" in window) setZakazano(Notification.permission === "denied");
    }
  };

  const prepni = (k: DruhUpozorneni) => setDruhy((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));

  if (moznost === null) return <div className="h-40 animate-pulse rounded-[18px] bg-plocha" />;

  if (moznost === "bez-api") {
    return <Hlaska typ="info">Upozornění do telefonu se právě spouštějí. Zkuste to prosím za chvíli.</Hlaska>;
  }
  if (moznost === "ios-plocha") {
    return (
      <div className="rounded-[18px] border border-akcent/50 bg-akcent/10 p-4 text-zaklad leading-relaxed text-inkoust">
        <b className="font-semibold">Na iPhonu to jde jen z aplikace na ploše.</b>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-tlum">
          <li>Dole v Safari klepněte na <b className="text-inkoust">Sdílet</b> (čtvereček se šipkou nahoru).</li>
          <li>Vyberte <b className="text-inkoust">Přidat na plochu</b> a potvrďte.</li>
          <li>Otevřete CzechPatrol <b className="text-inkoust">z ikony na ploše</b> a vraťte se sem — tlačítko pro zapnutí už tu bude.</li>
        </ol>
        <p className="mt-2 text-male text-tlum2">Potřebujete iOS 16.4 nebo novější.</p>
      </div>
    );
  }
  if (moznost === "ne") {
    return <Hlaska typ="info">Tenhle prohlížeč upozornění neumí. Zkuste Chrome, Edge, Firefox nebo Samsung Internet; na iPhonu Safari s aplikací přidanou na plochu.</Hlaska>;
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="stitek mb-2">Co chcete dostávat</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DRUHY_UPOZORNENI.map((d) => {
            const aktivni = druhy.includes(d.klic);
            return (
              <li key={d.klic}>
                <label className={`flex min-h-[56px] cursor-pointer items-start gap-3 rounded-[18px] border px-3.5 py-3 transition-colors ${aktivni ? "border-akcent/60 bg-akcent/10" : "border-linka hover:border-akcent/50"}`}>
                  <input type="checkbox" checked={aktivni} onChange={() => prepni(d.klic)} className="mt-1 h-4 w-4 accent-akcent" />
                  <span className="min-w-0">
                    <span className="block text-male font-semibold text-inkoust">{d.nazev}</span>
                    <span className="block text-drobne text-tlum">{d.popis}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {zakazano && (
        <Hlaska typ="chyba">Upozornění z czechpatrol.cz máte v prohlížeči zakázaná. Povolte je v nastavení webu (ikona zámku u adresy → Oznámení), pak to zkuste znovu.</Hlaska>
      )}

      <div className="flex flex-wrap gap-2">
        {!zapnuto ? (
          <button
            type="button"
            disabled={pracuji || !druhy.length}
            onClick={() => akce(async () => { await zapnout(druhy); setZapnuto(true); }, "Hotovo. Upozornění jsou zapnutá — zkuste si poslat zkušební.")}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-akcent px-5 text-zaklad font-semibold text-papir hover:bg-akcent-svetla disabled:opacity-60"
          >
            <Ikona nazev="zvonek" velikost={16} tah={2} /> {pracuji ? "Zapínám…" : "Zapnout upozornění"}
          </button>
        ) : (
          <>
            <button type="button" disabled={pracuji || !druhy.length} onClick={() => akce(() => zapnout(druhy), "Výběr uložen.")} className={TLACITKO_AKCENT}>
              Uložit výběr
            </button>
            <button type="button" disabled={pracuji} onClick={() => akce(zkouska, "Zkušební upozornění je na cestě. Mělo by přijít do minuty.")} className={TLACITKO_TICHE}>
              Poslat zkušební upozornění
            </button>
            <button type="button" disabled={pracuji} onClick={() => akce(async () => { await vypnout(); setZapnuto(false); }, "Upozornění jsou vypnutá. Nic dalšího o vás nemáme.")} className={TLACITKO_TICHE}>
              Vypnout
            </button>
          </>
        )}
      </div>
      {!druhy.length && <p className="text-male text-tlum">Vyberte aspoň jednu možnost.</p>}
      {hlaska && <Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska>}
    </div>
  );
}
