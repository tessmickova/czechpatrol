"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UCTY_ZAPNUTE } from "@/config/web";
import { datumCas } from "@/lib/format";
import { zaznamejUdalost } from "@/lib/mereni";
import { kc, STAV_EMAILU, STAV_KREDITU, STAV_PLATBY, usePremium, zacniPlatbu, type Kredit } from "@/lib/premium";
import { api } from "@/lib/ucet";
import { Hlaska, POLE, Popisek, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Ikona } from "./ikony";
import { Karta } from "./zaklad";

/*
  Premium „Odolnější domácnost“ — nabídka, kredity, komunita.

  Pravidla, která tu platí bez výjimky:
  * nic se nenabízí jako funkční, dokud to nefunguje: bez brány je místo
    tlačítka věta „odemknutí připravujeme“,
  * cena i kredit přicházejí z API, web je neopisuje,
  * nabídka je pod souhrnem a pod bezpečnostními nálezy, ne nad nimi,
  * bez odpočtů a strašení; jedna věta, proč to děláme.
*/

/** Co Premium obsahuje. Jeden seznam pro nabídku i pro účet, ať se neliší. */
export const OBSAH_PREMIUM = [
  "vaše kritické závislosti a co selže jako první",
  "odolnost na 7, 14, 30, 45 a 60 dní",
  "jak dlouho vydrží voda, jídlo, léky a energie — s předpoklady",
  "rozpočet energie po režimech a odhad soláru",
  "co dokoupit, s odkazy do obchodů, až poběží",
  "plán ke stažení a tisku, uložení na server a historie",
  "přístup do komunity a chatu",
];

export function KartaPremium({ vyplneno }: { vyplneno: number }) {
  const { ucet, verejne, premium, nacita } = usePremium();
  const [chyba, setChyba] = useState<string | null>(null);
  const [pracuje, setPracuje] = useState(false);
  const [email, setEmail] = useState("");
  const [souhlas, setSouhlas] = useState(false);

  useEffect(() => {
    if (!nacita && !premium) zaznamejUdalost("premium_view");
  }, [nacita, premium]);

  if (nacita || premium) return null;
  const bezi = Boolean(UCTY_ZAPNUTE && verejne?.bezi);
  const cena = verejne ? kc(verejne.cenaHaleru) : null;
  const kredit = verejne ? kc(verejne.kreditHaleru) : null;

  const odemknout = async () => {
    zaznamejUdalost("premium_click");
    setChyba(null);
    setPracuje(true);
    try {
      if (email.trim()) {
        if (!souhlas) throw new Error("Bez souhlasu e-mail neuložíme. Můžete pole nechat prázdné; kód uvidíte v účtu.");
        await api("/ja/email", { method: "PUT", telo: { email: email.trim(), souhlas: true } });
      }
      const v = await zacniPlatbu();
      zaznamejUdalost("payment_start");
      window.location.href = v.presmerovani;
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Nepovedlo se.");
      setPracuje(false);
    }
  };

  return (
    <div className="pt-5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-akcent" />
        <span className="nadpis-boxu">Premium</span>
      </div>
      <h2 className="mt-2 text-velke font-bold text-inkoust">Chcete vidět, kde přesně může vaše domácnost selhat?</h2>
      <ul className="mt-3 space-y-1">
        {OBSAH_PREMIUM.map((o) => (
          <li key={o} className="flex items-start gap-2 text-male text-tlum"><Ikona nazev="zamek" velikost={12} tah={2} trida="mt-[4px] shrink-0 text-akcent" />{o}</li>
        ))}
      </ul>

      {bezi ? (
        <div className="mt-4">
          {ucet ? (
            <>
              {!ucet.email && (
                <div className="mb-3">
                  <Popisek pro="pr-email">Kam poslat kód kreditu (nepovinné)</Popisek>
                  <input id="pr-email" type="email" autoComplete="email" className={POLE} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Kód uvidíte i v účtu" />
                  {email.trim() && (
                    <label className="mt-2 flex items-start gap-2 text-drobne text-tlum">
                      <input type="checkbox" checked={souhlas} onChange={(e) => setSouhlas(e.target.checked)} className="mt-[3px] h-4 w-4 accent-akcent" />
                      <span>Souhlasím s uložením e-mailu k účtu pro zaslání kódu. Kdykoli ho v účtu smažete.</span>
                    </label>
                  )}
                </div>
              )}
              <button type="button" disabled={pracuje || vyplneno === 0} onClick={odemknout} className={`${TLACITKO_AKCENT} w-full`}>
                {pracuje ? "Přesměrovávám na bránu…" : `Odemknout můj plán — ${cena}`}
              </button>
              {vyplneno === 0 && <p className="mt-2 text-drobne text-tlum2">Nejdřív zaškrtněte, jak u vás fungují základní věci. Bez vyplněného auditu není co odemykat.</p>}
            </>
          ) : (
            <Link href="/ucet/" className={`${TLACITKO_AKCENT} w-full`}>Přihlásit a odemknout — {cena}</Link>
          )}
          {chyba && <div className="mt-3"><Hlaska typ="chyba">{chyba}</Hlaska></div>}
          <p className="mt-3 text-male text-tlum">Celých {kredit} vám vrátíme jako kredit {kredit} na nákup v CzechPatrol e-shopu.</p>
          <p className="mt-2 text-drobne text-tlum2">
            <b className="font-semibold text-tlum">Proč to děláme?</b> Když do nějakého cíle sami něco vložíme, máme často větší motivaci ho dokončit. Proto nechceme, aby těch {cena} skončilo jako poplatek za výsledek — dostanete je zpět jako kredit na praktickou přípravu.
          </p>
          {!verejne?.eshopBezi && <p className="mt-2 text-drobne text-tlum2">E-shop připravujeme. Kredit bude možné využít po jeho spuštění, podle <Link href="/podminky/" className="odkaz">podmínek</Link>. Kredit je vázaný na účet.</p>}
          {verejne?.test && <p className="mt-2 text-drobne text-tlum2">Brána běží v testovacím režimu: platba je zkušební, nic se neúčtuje.</p>}
        </div>
      ) : (
        <p className="mt-4 text-male text-tlum">
          <b className="font-semibold text-inkoust">Odemknutí připravujeme.</b> Až poběží, bude jednorázové{cena ? ` za ${cena}` : ""}{kredit ? ` a celou částku vrátíme jako kredit ${kredit} na výbavu` : ""}. Souhrn, bezpečnostní nálezy a rady za 0 Kč zůstávají zdarma.
        </p>
      )}
    </div>
  );
}

/* ---------- účet: Premium, e-mail, kredity, komunita ---------- */

export function PremiumVUctu({ maEmail, obnovUcet }: { maEmail: boolean; obnovUcet: () => void }) {
  const { verejne, premium, komunita, opravneni, nacita } = usePremium();
  const [kredity, setKredity] = useState<Kredit[]>([]);
  const [eshopBezi, setEshopBezi] = useState(false);
  const [ukaz, setUkaz] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [souhlas, setSouhlas] = useState(false);
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);

  const nactiKredity = async () => {
    try {
      const v = await api<{ kredity: Kredit[]; eshopBezi: boolean }>("/ja/kredity");
      setKredity(v.kredity);
      setEshopBezi(v.eshopBezi);
    } catch {
      setKredity([]);
    }
  };
  useEffect(() => { nactiKredity(); }, []);

  const ulozEmail = async () => {
    setHlaska(null);
    try {
      const v = await api<{ email: string }>("/ja/email", { method: "PUT", telo: { email: email.trim(), souhlas } });
      setHlaska({ typ: "ok", text: `Uloženo: ${v.email}` });
      setEmail("");
      obnovUcet();
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." });
    }
  };
  const smazEmail = async () => {
    await api("/ja/email", { method: "DELETE" });
    obnovUcet();
  };
  const poslatZnovu = async (id: string) => {
    setHlaska(null);
    try {
      await api(`/ja/kredity/${id}/email`, { method: "POST" });
      setHlaska({ typ: "ok", text: "Zařazeno k odeslání. Odchází do několika minut." });
      nactiKredity();
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." });
    }
  };

  if (nacita) return null;

  return (
    <Karta className="p-6" id="kredity">
      <div className="stitek mb-2">Odolnější domácnost — Premium</div>
      {premium ? (
        <>
          <p className="flex items-center gap-2 text-vetsi font-bold text-inkoust"><span aria-hidden className="h-[7px] w-[7px] rounded-full bg-klid" />Odemčeno</p>
          <p className="mt-1 text-male text-tlum">
            {opravneni.filter((o) => o.platne).map((o) => `${o.druh === "dar" ? "uděleno správcem" : "jednorázové odemknutí"} od ${datumCas(o.platneOd)}${o.platneDo ? ` do ${datumCas(o.platneDo)}` : ""}`).join(" · ")}
          </p>
          <p className="mt-3"><Link href="/odolnost/" className={TLACITKO_TICHE}><Ikona nazev="stit" velikost={15} tah={1.9} /> Otevřít odolnost domácnosti</Link></p>
          <div className="mt-5 pt-4">
            <div className="stitek mb-2">Komunita a chat</div>
            {komunita?.telegram || komunita?.whatsapp ? (
              <div className="flex flex-wrap gap-2">
                {komunita.telegram && <a href={komunita.telegram} target="_blank" rel="noopener noreferrer" className={TLACITKO_TICHE}>Telegram — skupina</a>}
                {komunita.whatsapp && <a href={komunita.whatsapp} target="_blank" rel="noopener noreferrer" className={TLACITKO_TICHE}>WhatsApp — chat</a>}
              </div>
            ) : (
              <p className="text-male text-tlum">Pozvánky připravujeme. Objeví se tady, jakmile skupina a chat poběží; nic vám neuteče.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-male text-tlum">
            Zatím neodemčeno. {verejne?.bezi ? `Odemknutí je jednorázové za ${kc(verejne.cenaHaleru)}; celou částku vracíme jako kredit ${kc(verejne.kreditHaleru)} na výbavu.` : "Odemknutí připravujeme."}
          </p>
          <p className="mt-3"><Link href="/odolnost/" className={TLACITKO_TICHE}><Ikona nazev="stit" velikost={15} tah={1.9} /> Udělat si audit domácnosti (zdarma)</Link></p>
        </>
      )}

      {/* e-mail */}
      <div className="mt-5 pt-4">
        <div className="stitek mb-2">E-mail pro kód kreditu</div>
        {maEmail ? (
          <p className="text-male text-tlum">Uložený. Používá se jen k zaslání kódu kreditu. <button type="button" onClick={smazEmail} className="underline underline-offset-4 hover:text-inkoust">Smazat</button></p>
        ) : (
          <div>
            <p className="text-male text-tlum">Nepovinné. Kód kreditu uvidíte i tady v účtu.</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1"><Popisek pro="uc-email">E-mail</Popisek><input id="uc-email" type="email" autoComplete="email" className={POLE} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <button type="button" disabled={!email.trim() || !souhlas} onClick={ulozEmail} className={TLACITKO_TICHE}>Uložit</button>
            </div>
            <label className="mt-2 flex items-start gap-2 text-drobne text-tlum">
              <input type="checkbox" checked={souhlas} onChange={(e) => setSouhlas(e.target.checked)} className="mt-[3px] h-4 w-4 accent-akcent" />
              <span>Souhlasím s uložením e-mailu k účtu pro zaslání kódu kreditu. Ukládá se šifrovaně; kdykoli ho smažete.</span>
            </label>
          </div>
        )}
      </div>

      {/* kredity */}
      <div className="mt-5 pt-4">
        <div className="stitek mb-2">Moje kredity</div>
        {kredity.length === 0 ? (
          <p className="text-male text-tlum">Zatím žádný. Kredit vzniká po zaplacení odemknutí.</p>
        ) : (
          <ul>
            {kredity.map((k) => (
              <li key={k.id} className="py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="cislice text-zaklad font-bold text-inkoust">{kc(k.hodnotaHaleru)}</span>
                  <span className="flex items-center gap-1.5 text-male text-tlum"><span aria-hidden className={`h-[6px] w-[6px] rounded-full ${k.stav === "ACTIVE" ? "bg-klid" : k.stav === "REDEEMED" ? "bg-tlum2" : "bg-jantar"}`} />{STAV_KREDITU[k.stav] ?? k.stav}</span>
                  <span className="text-drobne text-tlum2">{datumCas(k.vytvoreno)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <code className="cislice select-all rounded-[10px] border border-linka px-2 py-1 text-zaklad tracking-[0.06em] text-inkoust">{ukaz === k.id ? k.kod : k.maska}</code>
                  <button type="button" onClick={() => setUkaz(ukaz === k.id ? null : k.id)} className="text-male text-tlum underline underline-offset-4 hover:text-inkoust">{ukaz === k.id ? "Skrýt" : "Ukázat kód"}</button>
                  {k.stav === "ACTIVE" && maEmail && <button type="button" onClick={() => poslatZnovu(k.id)} className="text-male text-tlum underline underline-offset-4 hover:text-inkoust">Poslat e-mailem znovu</button>}
                </div>
                <p className="mt-1 text-drobne text-tlum2">
                  {k.email ? `E-mail: ${STAV_EMAILU[k.email.stav] ?? k.email.stav}${k.email.stav === "FAILED" ? " — kód je tady, opište si ho" : ""}. ` : ""}
                  {k.stav === "ACTIVE" && !eshopBezi ? "Kredit bude možné využít po spuštění CzechPatrol e-shopu. " : ""}
                  {k.stav === "REDEEMED" && k.uplatneno ? `Uplatněno ${datumCas(k.uplatneno)}. ` : ""}
                  {k.nahradaZa ? "Náhradní kód za dřívější. " : ""}
                  {k.expirace ? `Platí do ${datumCas(k.expirace)}.` : "Bez expirace."}
                </p>
              </li>
            ))}
          </ul>
        )}
        {hlaska && <div className="mt-3"><Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska></div>}
      </div>
    </Karta>
  );
}

/* ---------- návrat z brány ---------- */

interface Platba { id: string; produkt: string; castka_haleru: number; mena: string; stav: string; vytvoreno: string; zaplaceno: string | null }

/**
 * Stránka po návratu z brány. Nic neodemyká sama — jen se ptá API,
 * v jakém stavu platba je, a chvíli to zkouší znovu, protože webhook
 * brány může přijít o pár vteřin později než člověk.
 */
export function PlatbaVysledek() {
  const { ucet, nacita } = usePremium();
  const [platba, setPlatba] = useState<Platba | null>(null);
  const [premium, setPremium] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [pokusu, setPokusu] = useState(0);

  useEffect(() => {
    if (nacita || !ucet) return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setChyba("V adrese chybí číslo platby."); return; }
    let zivy = true;
    const nacti = async () => {
      try {
        const v = await api<{ platba: Platba; premium: boolean }>(`/ja/platby/${id}`);
        if (!zivy) return;
        setPlatba(v.platba);
        setPremium(v.premium);
        if (v.platba.stav === "PAID") zaznamejUdalost("payment_success");
        if ((v.platba.stav === "PENDING" || v.platba.stav === "CREATED") && pokusu < 12) setTimeout(() => zivy && setPokusu((p) => p + 1), 5000);
      } catch (e) {
        if (zivy) setChyba(e instanceof Error ? e.message : "Nepovedlo se načíst stav.");
      }
    };
    nacti();
    return () => { zivy = false; };
  }, [nacita, ucet, pokusu]);

  if (nacita) return <p className="text-zaklad text-tlum">Ověřuji přihlášení…</p>;
  if (!ucet) return <Hlaska typ="info">Stav platby uvidíte po přihlášení. <Link href="/ucet/" className="underline underline-offset-4">Přihlásit</Link></Hlaska>;
  if (chyba) return <Hlaska typ="chyba">{chyba}</Hlaska>;
  if (!platba) return <p className="text-zaklad text-tlum">Zjišťuji stav platby…</p>;

  const ceka = platba.stav === "PENDING" || platba.stav === "CREATED";
  return (
    <Karta className="max-w-[620px] p-6">
      <div className="stitek mb-2">Platba</div>
      <p className="flex items-center gap-2 text-vetsi font-bold text-inkoust">
        <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${platba.stav === "PAID" ? "bg-klid" : ceka ? "bg-jantar" : "bg-akcent"}`} />
        {STAV_PLATBY[platba.stav] ?? platba.stav}
      </p>
      <p className="mt-2 text-male text-tlum">
        {platba.stav === "PAID" && (premium ? "Premium je odemčené a kredit je ve vašem účtu." : "Zaplaceno; odemknutí se právě zapisuje.")}
        {ceka && (pokusu < 12 ? "Čekáme na potvrzení od brány. Stránka se sama ptá každých pár vteřin; nic dalšího dělat nemusíte." : "Brána potvrzení zatím neposlala. Stav se doplní automaticky, jakmile dorazí — zkontrolujte účet za chvíli. Nic se neúčtuje dvakrát.")}
        {platba.stav === "CANCELLED" && "Platba byla zrušena. Nic vám nebylo účtováno; odemknout můžete kdykoli znovu."}
        {platba.stav === "FAILED" && "Platba se nepodařila. Nic vám nebylo účtováno."}
        {(platba.stav === "REFUNDED" || platba.stav === "PARTIALLY_REFUNDED") && "Platba byla vrácena."}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-male">
        <div><dt className="stitek mb-1">Částka</dt><dd className="cislice text-inkoust">{kc(platba.castka_haleru)}</dd></div>
        <div><dt className="stitek mb-1">Založeno</dt><dd className="text-inkoust">{datumCas(platba.vytvoreno)}</dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        {platba.stav === "PAID" && <Link href="/odolnost/" className={TLACITKO_AKCENT}>Otevřít můj plán</Link>}
        <Link href="/ucet/#kredity" className={TLACITKO_TICHE}>Účet a kredity</Link>
        {!ceka && platba.stav !== "PAID" && <Link href="/odolnost/" className={TLACITKO_TICHE}>Zpět na audit</Link>}
      </div>
    </Karta>
  );
}
