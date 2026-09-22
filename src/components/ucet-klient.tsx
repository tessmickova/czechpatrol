"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KRAJE, UCTY_ZAPNUTE, WEB } from "@/config/web";
import { KATEGORIE, PORADI_KATEGORII } from "@/lib/kategorie";
import { obnovit, podporujePasskey, pridatPasskey, prihlasit, registrovat } from "@/lib/passkey";
import { api, odhlasit, ROLE, ulozToken, useUcet, VYCHOZI_UPOZORNENI, type Frekvence, type MinZavaznost, type NastaveniUpozorneni } from "@/lib/ucet";
import { datum } from "@/lib/format";
import { useDialog } from "./dialog";
import { Hlaska, POLE, Popisek, Prepinac, TLACITKO_AKCENT, TLACITKO_TICHE, TLACITKO_VAROVNE, Volby } from "./formulare";
import { Ikona } from "./ikony";
import { Karta } from "./zaklad";
import { DalsiKroky } from "./zapojit-klient";

const FREKVENCE: { hodnota: Frekvence; nazev: string; popis: string }[] = [
  { hodnota: "ihned", nazev: "Hned, cokoli důležitého", popis: "Bez čekání a bez omezení počtu. Když se něco změní, víte to první." },
  { hodnota: "denne", nazev: "Denní souhrn", popis: "Jedna zpráva večer. Vážné změny přijdou i tak hned." },
  { hodnota: "tydne", nazev: "Týdenní souhrn", popis: "Jedna zpráva v neděli. Vážné změny přijdou i tak hned." },
  { hodnota: "jen-kriticke", nazev: "Jen vážné", popis: "Změna právního stavu ČR, článek 4 nebo 5 NATO, vážná úroveň." },
];

const ZAVAZNOSTI: { hodnota: MinZavaznost; nazev: string; popis: string }[] = [
  { hodnota: "stredni", nazev: "Od střední", popis: "Víc zpráv, včetně signálů, které se teprve skládají." },
  { hodnota: "vysoka", nazev: "Od vysoké", popis: "Doporučené. Věci, kvůli kterým by člověk mohl jednat jinak." },
  { hodnota: "kriticka", nazev: "Jen vážné", popis: "Minimum zpráv. Jen to, co mění pravidla běžného života." },
];

/** Stránka účtu — jediné místo, kde čtenář něco nastavuje. */
export function UcetKlient() {
  const { ucet, dostupne, nacita, obnov } = useUcet();
  /*
    Kód drží rodič, ne přihlašovací karta.

    Založení účtu vyvolá událost, na kterou useUcet znovu načte účet —
    a v tu chvíli rodič vyměnil přihlašovací kartu za nastavení. Karta
    s obnovovacím kódem zmizela dřív, než si ho kdo stihl opsat; na
    iPhonu to vypadalo, že se stránka sama obnovila. Kód proto žije
    tady a ukazuje se, dokud ho člověk nepotvrdí, ať je účet načtený,
    nebo ne.
  */
  const [novyKod, setNovyKod] = useState<string | null>(null);

  if (!UCTY_ZAPNUTE) {
    return (
      <Karta odstin="modra" className="p-6">
        <h2 className="podnadpis text-velke">Účty připravujeme</h2>
        <p className="mt-3 max-w-[60ch] text-zaklad leading-relaxed text-tlum">
          Až budou, půjde založit účet bez jména, e-mailu i telefonu a nechat si posílat důležité
          změny na Telegram nebo WhatsApp. Do té doby funguje RSS — bez účtu a bez adresy.
        </p>
        <a href={`${WEB.url}/feed.xml`} className={`${TLACITKO_TICHE} mt-5`}>
          <Ikona nazev="radar" velikost={15} /> RSS kanál
        </a>
      </Karta>
    );
  }

  if (novyKod) return <UlozKod kod={novyKod} po={() => { setNovyKod(null); obnov(); }} />;
  if (nacita) return <p className="text-zaklad text-tlum">Ověřuji přihlášení…</p>;
  if (!ucet) return <Prihlaseni po={obnov} naNovyKod={setNovyKod} />;
  return <Nastaveni ucet={ucet} dostupne={dostupne} obnov={obnov} />;
}

/* ---------- přihlášení a založení ---------- */

/** Karta s obnovovacím kódem. Jediné místo, kde se kód kdy ukáže. */
function UlozKod({ kod, po }: { kod: string; po: () => void }) {
  const [potvrzeno, setPotvrzeno] = useState(false);
  return (
    <Karta odstin="pisek" className="p-6">
      <div className="stitek mb-2">Jednou a naposledy</div>
      <h2 className="podnadpis text-velke">Uložte si obnovovací kód</h2>
      <p className="mt-3 max-w-[60ch] text-zaklad leading-relaxed text-tlum">
        Účet nemá e-mail ani telefon, takže není kam poslat „zapomenuté heslo“. Tenhle kód je
        jediná cesta k účtu z nového zařízení. Neuvidíte ho podruhé.
      </p>
      <div className="velke-cislo mt-5 select-all break-all rounded-[22px] border border-jantar/40 bg-noc/60 px-5 py-4 text-cislo tracking-[0.08em] text-jantar">
        {kod}
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(kod)}
        className={`${TLACITKO_TICHE} mt-4`}
      >
        Zkopírovat
      </button>
      <label className="mt-6 flex items-start gap-3 text-zaklad text-inkoust">
        <input type="checkbox" checked={potvrzeno} onChange={(e) => setPotvrzeno(e.target.checked)} className="mt-1 h-4 w-4 accent-akcent" />
        Kód mám uložený mimo tento prohlížeč.
      </label>
      <button type="button" disabled={!potvrzeno} onClick={po} className={`${TLACITKO_AKCENT} mt-5`}>
        Pokračovat do účtu
      </button>
    </Karta>
  );
}

function Prihlaseni({ po, naNovyKod }: { po: () => void; naNovyKod: (kod: string) => void }) {
  const [chyba, setChyba] = useState<string | null>(null);
  const [bezi, setBezi] = useState<"prihlaseni" | "registrace" | "obnova" | null>(null);
  const [kod, setKod] = useState("");
  const umi = podporujePasskey();

  const spust = async (co: "prihlaseni" | "registrace" | "obnova") => {
    setChyba(null);
    setBezi(co);
    try {
      if (co === "prihlaseni") await prihlasit();
      if (co === "registrace") {
        const v = await registrovat();
        naNovyKod(v.obnovovaciKod);
        return; // účet se ukáže až po potvrzení kódu
      }
      if (co === "obnova") await obnovit(kod);
      po();
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Nepovedlo se.");
    } finally {
      setBezi(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Karta odstin="modra" className="p-6">
        <div className="stitek mb-2 !text-akcent">Passkey</div>
        <h2 className="podnadpis text-velke">Bez jména, bez hesla</h2>
        <p className="mt-3 text-zaklad leading-relaxed text-tlum">
          Účet je jen klíč v tomhle zařízení — otisk, obličej nebo PIN. Nesbíráme jméno,
          e-mail ani telefon. Ani my nevíme, kdo jste.
        </p>
        {!umi && <div className="mt-4"><Hlaska typ="info">Tenhle prohlížeč passkey neumí. Zkuste aktuální Chrome, Safari nebo Firefox.</Hlaska></div>}
        <div className="mt-5 grid gap-2">
          <button type="button" disabled={!umi || bezi !== null} onClick={() => spust("prihlaseni")} className={TLACITKO_AKCENT}>
            <Ikona nazev="zamek" velikost={15} tah={1.9} /> {bezi === "prihlaseni" ? "Čekám na zařízení…" : "Přihlásit passkey"}
          </button>
          <button type="button" disabled={!umi || bezi !== null} onClick={() => spust("registrace")} className={TLACITKO_TICHE}>
            <Ikona nazev="uzivatel" velikost={15} tah={1.9} /> {bezi === "registrace" ? "Zakládám…" : "Založit nový anonymní účet"}
          </button>
        </div>
        {chyba && <div className="mt-4"><Hlaska typ="chyba">{chyba}</Hlaska></div>}
      </Karta>

      <Karta className="p-6">
        <div className="stitek mb-2">Nové zařízení</div>
        <h2 className="podnadpis text-velke">Obnovovací kód</h2>
        <p className="mt-3 text-zaklad leading-relaxed text-tlum">
          Kód jste dostali při založení účtu. Přihlásí vás na novém zařízení; pak si k němu
          přidáte další passkey.
        </p>
        <form
          className="mt-5"
          onSubmit={(e) => { e.preventDefault(); spust("obnova"); }}
        >
          <Popisek pro="kod">Obnovovací kód</Popisek>
          <input id="kod" value={kod} onChange={(e) => setKod(e.target.value)} className={`${POLE} cislice`} placeholder="xxxx-xxxx-xxxx-xxxx" autoComplete="off" />
          <button type="submit" disabled={!kod.trim() || bezi !== null} className={`${TLACITKO_TICHE} mt-3`}>
            {bezi === "obnova" ? "Ověřuji…" : "Přihlásit kódem"}
          </button>
        </form>
      </Karta>

      <div className="lg:col-span-2">
        <Hlaska typ="info">
          Nováčci mají jeden bonus navíc: ověřené záchranné složky mohou přes CzechPatrol
          poslat zprávu přímo vám — třeba o uzavírce nebo evakuaci ve vašem kraji.
          Vždy je označená jako zpráva partnera, nikdy se nevydává za úřední varování.{" "}
          <Link href="/izs/" className="odkaz font-semibold text-inkoust">Jak to funguje</Link>
        </Hlaska>
      </div>
    </div>
  );
}

/* ---------- nastavení přihlášeného ---------- */

function Nastaveni({
  ucet, dostupne, obnov,
}: { ucet: NonNullable<ReturnType<typeof useUcet>["ucet"]>; dostupne: ReturnType<typeof useUcet>["dostupne"]; obnov: () => void }) {
  const [n, setN] = useState<NastaveniUpozorneni>(ucet.upozorneni ?? VYCHOZI_UPOZORNENI);
  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const [telegram, setTelegram] = useState<{ odkaz: string; kod: string } | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [mazu, setMazu] = useState(false);
  const [novyKod, setNovyKod] = useState<string | null>(null);
  const { potvrd } = useDialog();

  useEffect(() => setN(ucet.upozorneni ?? VYCHOZI_UPOZORNENI), [ucet]);

  const uloz = async () => {
    setUklada(true);
    setHlaska(null);
    try {
      await api("/ja/upozorneni", { method: "PUT", telo: n });
      setHlaska({ typ: "ok", text: "Uloženo. Platí od teď." });
      obnov();
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se uložit." });
    } finally {
      setUklada(false);
    }
  };

  const propojTelegram = async () => {
    try {
      const v = await api<{ odkaz: string; kod: string }>("/ja/telegram/kod", { method: "POST" });
      setTelegram(v);
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." });
    }
  };

  const odpojTelegram = async () => {
    await api("/ja/telegram", { method: "DELETE" });
    setTelegram(null);
    obnov();
  };

  const ulozWhatsapp = async () => {
    try {
      await api("/ja/whatsapp", { method: "PUT", telo: { cislo: whatsapp } });
      setWhatsapp("");
      obnov();
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." });
    }
  };

  const smaz = async () => {
    const ano = await potvrd({
      nadpis: "Smazat účet?",
      text: "Účet, passkey i všechna nastavení upozornění se nenávratně smažou. Vrátit to nejde a obnovovací kód po tom nepomůže.",
      potvrdit: "Smazat účet",
      zrusit: "Nechat být",
    });
    if (!ano) return;
    setMazu(true);
    try {
      await api("/ja", { method: "DELETE" });
      ulozToken(null);
    } finally {
      setMazu(false);
    }
  };

  const zadnyKanal = !ucet.telegram && !ucet.whatsapp;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      {/* účet */}
      <div className="space-y-4">
        {/* Hned po založení: co dalšího existuje. Nabídka, ne povinnost. */}
        <DalsiKroky />
        <Karta odstin="modra" className="p-6">
          <div className="stitek mb-2 !text-akcent">Účet</div>
          <div className="podnadpis text-cislo text-akcent-svetla">{ROLE[ucet.role].nazev}</div>
          <p className="mt-2 text-zaklad text-tlum">{ROLE[ucet.role].popis}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-zaklad">
            <div>
              <dt className="stitek mb-1">Identifikátor</dt>
              <dd className="cislice text-inkoust">#{ucet.id.slice(0, 8)}</dd>
            </div>
            <div>
              <dt className="stitek mb-1">Založen</dt>
              <dd className="text-inkoust">{datum(ucet.vytvoreno)}</dd>
            </div>
            <div>
              <dt className="stitek mb-1">Passkey</dt>
              <dd className="text-inkoust">{ucet.passkeys}× zařízení</dd>
            </div>
            <div>
              <dt className="stitek mb-1">Známe o vás</dt>
              <dd className="text-inkoust">nic osobního</dd>
            </div>
          </dl>
          <div className="mt-5 grid gap-2">
            <button type="button" onClick={() => pridatPasskey().then(obnov).catch((e) => setHlaska({ typ: "chyba", text: e.message }))} className={TLACITKO_TICHE}>
              <Ikona nazev="zamek" velikost={15} tah={1.9} /> Přidat passkey (další zařízení)
            </button>
            <button
              type="button"
              onClick={async () => {
                const ano = await potvrd({
                  nadpis: "Vystavit nový obnovovací kód?",
                  text: "Starý kód okamžitě přestane platit. Nový se ukáže jednou — opište si ho dřív, než stránku zavřete.",
                  potvrdit: "Vystavit nový",
                });
                if (!ano) return;
                try {
                  const v = await api<{ obnovovaciKod: string }>("/ja/obnova", { method: "POST" });
                  setNovyKod(v.obnovovaciKod);
                } catch (e) {
                  setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." });
                }
              }}
              className={TLACITKO_TICHE}
            >
              Nový obnovovací kód
            </button>
            <button type="button" onClick={() => odhlasit()} className={TLACITKO_TICHE}>
              Odhlásit z tohoto zařízení
            </button>
          </div>
          {novyKod && (
            <div className="mt-4 rounded-[22px] border border-jantar/40 bg-jantar/10 p-4">
              <div className="stitek mb-2">Nový kód — uvidíte ho jen teď</div>
              <div className="velke-cislo select-all break-all text-velke tracking-[0.08em] text-jantar">{novyKod}</div>
              <button type="button" onClick={() => setNovyKod(null)} className="mt-3 text-male text-tlum underline underline-offset-4 hover:text-inkoust">Mám uloženo, skrýt</button>
            </div>
          )}
        </Karta>

        <Karta className="p-6">
          <div className="stitek mb-3">Kanály</div>
          <div className="space-y-4">
            <div className="rounded-[22px] border border-linka p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zaklad font-bold">Telegram</span>
                {ucet.telegram ? (
                  <span className="stitek-tmavy rounded-full border border-klid/40 bg-klid/10 px-2 py-1 text-klid-text">propojeno</span>
                ) : !dostupne.telegram ? (
                  <span className="stitek-tmavy rounded-full border border-linka px-2 py-1 text-tlum2">připravujeme</span>
                ) : null}
              </div>
              {ucet.telegram ? (
                <button type="button" onClick={odpojTelegram} className="mt-3 text-male text-tlum underline underline-offset-4 hover:text-inkoust">
                  Odpojit
                </button>
              ) : dostupne.telegram ? (
                telegram ? (
                  <div className="mt-3 space-y-2 text-zaklad text-tlum">
                    <p>Otevřete bota a stiskněte <b className="font-semibold text-inkoust">Start</b>. Kód platí 15 minut.</p>
                    <a href={telegram.odkaz} target="_blank" rel="nofollow noopener noreferrer" className={TLACITKO_AKCENT}>
                      Otevřít Telegram
                    </a>
                    <p className="cislice text-male text-tlum2">nebo botovi pošlete: /start {telegram.kod}</p>
                    <button type="button" onClick={obnov} className="text-male underline underline-offset-4 hover:text-inkoust">Hotovo, zkontrolovat</button>
                  </div>
                ) : (
                  <button type="button" onClick={propojTelegram} className={`${TLACITKO_TICHE} mt-3`}>Propojit Telegram</button>
                )
              ) : (
                <p className="mt-2 text-male text-tlum">Bot ještě neběží. Až poběží, propojení je jedno kliknutí.</p>
              )}
            </div>

            <div className="rounded-[22px] border border-linka p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zaklad font-bold">WhatsApp</span>
                {ucet.whatsapp ? (
                  <span className="stitek-tmavy rounded-full border border-klid/40 bg-klid/10 px-2 py-1 text-klid-text">propojeno</span>
                ) : !dostupne.whatsapp ? (
                  <span className="stitek-tmavy rounded-full border border-linka px-2 py-1 text-tlum2">připravujeme</span>
                ) : null}
              </div>
              {ucet.whatsapp ? (
                <button type="button" onClick={() => api("/ja/whatsapp", { method: "DELETE" }).then(obnov)} className="mt-3 text-male text-tlum underline underline-offset-4 hover:text-inkoust">
                  Odpojit a smazat číslo
                </button>
              ) : dostupne.whatsapp ? (
                <div className="mt-3">
                  <Popisek pro="wa">Telefonní číslo (uložíme jen pro doručení)</Popisek>
                  <div className="flex gap-2">
                    <input id="wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={`${POLE} cislice`} placeholder="+420" inputMode="tel" />
                    <button type="button" onClick={ulozWhatsapp} disabled={!whatsapp.trim()} className={TLACITKO_TICHE}>Uložit</button>
                  </div>
                  <p className="mt-2 text-male text-tlum2">Číslo jde kdykoli smazat. Jediný údaj, který u WhatsAppu bez čísla nejde obejít.</p>
                </div>
              ) : (
                <p className="mt-2 text-male text-tlum">Vyžaduje schválení Meta Business. Až bude, přibude tady pole na číslo.</p>
              )}
            </div>
          </div>
        </Karta>

        <Karta className="border-akcent/30 p-6">
          <div className="stitek mb-2 !text-akcent-svetla">Smazání</div>
          <p className="text-zaklad leading-relaxed text-tlum">
            Smaže účet, passkeye, propojené kanály i nastavení. Hned a bez zálohy.
          </p>
          <button type="button" disabled={mazu} onClick={smaz} className={`${TLACITKO_VAROVNE} mt-4`}>
            {mazu ? "Mažu…" : "Smazat účet"}
          </button>
        </Karta>
      </div>

      {/* upozornění */}
      <Karta odstin="modra" className="p-6" id="upozorneni">
        <div className="stitek mb-2 !text-akcent">Upozornění</div>
        <h2 className="podnadpis text-velke">Co a kdy vám má přijít</h2>
        {zadnyKanal && (
          <div className="mt-4">
            <Hlaska typ="info">Zatím nemáte propojený žádný kanál. Nastavení se uloží, doručovat začneme, jakmile nějaký propojíte.</Hlaska>
          </div>
        )}

        <div className="mt-6 space-y-7">
          <div>
            <Popisek>Jak často</Popisek>
            <Volby nazev="Jak často" hodnota={n.frekvence} moznosti={FREKVENCE} onChange={(frekvence) => setN({ ...n, frekvence })} />
          </div>
          <div>
            <Popisek>Od jaké závažnosti</Popisek>
            <Volby nazev="Od jaké závažnosti" hodnota={n.minZavaznost} moznosti={ZAVAZNOSTI} onChange={(minZavaznost) => setN({ ...n, minZavaznost })} />
          </div>
          <div className="space-y-2">
            <Prepinac
              zapnuto={n.ticho === null}
              onChange={(z) => setN({ ...n, ticho: z ? null : { od: "22:00", do: "07:00" } })}
              nazev="Bez tichých hodin"
              popis="Všechno důležité přijde kdykoli, i v noci. Vypnutím nastavíte klid."
            />
            {n.ticho && (
              <div className="grid grid-cols-2 gap-3 rounded-[22px] border border-linka p-4">
                <div>
                  <Popisek pro="od">Ticho od</Popisek>
                  <input id="od" type="time" value={n.ticho.od} onChange={(e) => setN({ ...n, ticho: { ...n.ticho!, od: e.target.value } })} className={`${POLE} cislice`} />
                </div>
                <div>
                  <Popisek pro="do">do</Popisek>
                  <input id="do" type="time" value={n.ticho.do} onChange={(e) => setN({ ...n, ticho: { ...n.ticho!, do: e.target.value } })} className={`${POLE} cislice`} />
                </div>
                <p className="col-span-2 text-male text-tlum2">Vážné změny tiché hodiny nerespektují. Ostatní počkají do rána.</p>
              </div>
            )}
            <Prepinac
              zapnuto={n.zpravyIzs}
              onChange={(zpravyIzs) => setN({ ...n, zpravyIzs })}
              nazev="Zprávy partnerů IZS"
              popis="Schválené zprávy ověřených záchranných složek. Označené vždy jako zpráva partnera."
            />
            {n.zpravyIzs && (
              <div className="rounded-[22px] border border-linka p-4">
                <Popisek pro="kraj">Můj kraj (pro krajské zprávy partnerů)</Popisek>
                <select id="kraj" value={n.kraj ?? ""} onChange={(e) => setN({ ...n, kraj: e.target.value || null })} className={POLE}>
                  <option value="">Jen celostátní zprávy</option>
                  {KRAJE.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <p className="mt-2 text-male text-tlum2">Kraj se ukládá jen k nastavení. Není z něj vidět, kde bydlíte.</p>
              </div>
            )}
          </div>
          <div>
            <Popisek>Oblasti (prázdné = všechny)</Popisek>
            <div className="flex flex-wrap gap-2">
              {PORADI_KATEGORII.map((k) => {
                const aktivni = n.oblasti.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={aktivni}
                    onClick={() => setN({ ...n, oblasti: aktivni ? n.oblasti.filter((x) => x !== k) : [...n.oblasti, k] })}
                    className={`rounded-full border px-3 py-1.5 text-male font-medium transition-colors ${
                      aktivni ? "border-akcent/60 bg-akcent/15 text-akcent-svetla" : "border-linka text-tlum hover:border-akcent/40"
                    }`}
                  >
                    {KATEGORIE[k].nazev}
                  </button>
                );
              })}
            </div>
          </div>

          {hlaska && <Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska>}
          <button type="button" disabled={uklada} onClick={uloz} className={TLACITKO_AKCENT}>
            {uklada ? "Ukládám…" : "Uložit nastavení"}
          </button>
        </div>
      </Karta>
    </div>
  );
}
