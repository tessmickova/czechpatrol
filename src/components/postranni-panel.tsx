"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BUY_ME_A_COFFEE_URL, KOMUNITA, POMOCNIK, TISNOVA, UCTY_ZAPNUTE } from "@/config/web";
import { dnyBezZmeny, posledniOvereni, pravniStav } from "@/lib/data";
import { datumCas } from "@/lib/format";
import { odhlasit, ROLE, useUcet } from "@/lib/ucet";
import { Ikona, type NazevIkony } from "./ikony";
import { TlacitkoInstalace } from "./pwa";

/** Kdokoli může panel otevřít — hlavička, spodní lišta, odkaz v textu. */
export function otevriPanel() {
  window.dispatchEvent(new CustomEvent("czechpatrol:panel"));
}

/** Stránky mimo hlavní navigaci. Na mobilu jediné místo, kde jsou. */
export const DALSI_STRANKY = [
  { href: "/metodika/", label: "Metodika" },
  { href: "/zdroje/", label: "Zdroje" },
  { href: "/opravy/", label: "Opravy a historie" },
  { href: "/o-projektu/", label: "O projektu" },
  { href: "/podporit/", label: "Podpořit" },
  { href: "/odber/", label: "Odběr a RSS" },
  { href: "/soukromi/", label: "Soukromí" },
  { href: "/podminky/", label: "Podmínky" },
];

function Oddil({
  ikona, nadpis, children, akcent = false,
}: { ikona: NazevIkony; nadpis: string; children: React.ReactNode; akcent?: boolean }) {
  return (
    <section className={`sklo rounded-[16px] p-4 ${akcent ? "sklo-akcent" : ""}`}>
      <h3 className="mb-3 flex items-center gap-2">
        <span className="text-akcent"><Ikona nazev={ikona} velikost={15} /></span>
        <span className="stitek !text-tlum">{nadpis}</span>
      </h3>
      {children}
    </section>
  );
}

const TLACITKO =
  "inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[14px] font-bold uppercase tracking-[0.05em] transition-all";
const TLACITKO_AKCENT = `${TLACITKO} border-akcent/60 bg-akcent/15 text-akcent-svetla  hover:bg-akcent/25`;
const TLACITKO_TICHE = `${TLACITKO} border-linka text-inkoust hover:border-akcent/60`;

/**
 * Postranní panel.
 *
 * Všechno osobní a praktické na jednom místě: účet, upozornění, aplikace
 * do mobilu, úřední odkazy, tísňová čísla, podpora. Obsah dashboardu se
 * sem nestěhuje — panel je pro čtenáře, dashboard pro situaci.
 */
export function PostranniPanel() {
  const [otevreno, setOtevreno] = useState(false);
  const zavrit = useRef<HTMLButtonElement>(null);
  const { ucet, nacita } = useUcet();

  useEffect(() => {
    const otevri = () => setOtevreno(true);
    window.addEventListener("czechpatrol:panel", otevri);
    return () => window.removeEventListener("czechpatrol:panel", otevri);
  }, []);

  useEffect(() => {
    if (!otevreno) return;
    document.body.style.overflow = "hidden";
    zavrit.current?.focus();
    const klavesa = (e: KeyboardEvent) => e.key === "Escape" && setOtevreno(false);
    window.addEventListener("keydown", klavesa);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", klavesa);
    };
  }, [otevreno]);

  const klid = dnyBezZmeny();
  const overeno = posledniOvereni();
  const pravni = pravniStav();
  const platiNeco = pravni.polozky.some((p) => p.plati === true);

  return (
    <>
      <div
        aria-hidden
        onClick={() => setOtevreno(false)}
        className={`fixed inset-0 z-[70] bg-noc/70 backdrop-blur-[2px] transition-opacity ${
          otevreno ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Váš CzechPatrol"
        className={`fixed inset-y-0 right-0 z-[80] flex w-full max-w-[420px] flex-col border-l border-linka bg-papir shadow-[-30px_0_80px_-30px_rgb(0_0_0/0.9)] transition-transform duration-300 ${
          otevreno ? "translate-x-0" : "invisible translate-x-full"
        }`}
        aria-hidden={!otevreno}
      >
        <div className="flex items-center justify-between border-b border-linka px-5 py-4">
          <div>
            <div className="stitek">Váš CzechPatrol</div>
            <div className="mt-1 text-[18px] font-bold uppercase tracking-[0.02em]">Účet a nástroje</div>
          </div>
          <button
            ref={zavrit}
            type="button"
            onClick={() => setOtevreno(false)}
            className="grid h-10 w-10 place-items-center rounded-full border border-linka text-tlum transition-colors hover:border-akcent hover:text-inkoust"
          >
            <span className="sr-only">Zavřít</span>
            <Ikona nazev="krizek" velikost={16} tah={2} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Oddil ikona="uzivatel" nadpis="Účet" akcent>
            {!UCTY_ZAPNUTE ? (
              <p className="text-[14px] leading-relaxed text-tlum">
                Účty a upozornění na Telegram a WhatsApp <b className="font-semibold text-inkoust">připravujeme</b>.
                Zatím funguje RSS — bez účtu a bez adresy.
              </p>
            ) : nacita ? (
              <p className="text-[14px] text-tlum">Ověřuji přihlášení…</p>
            ) : ucet ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-bold uppercase tracking-[0.03em] text-akcent-svetla">
                    {ROLE[ucet.role].nazev}
                  </span>
                  <span className="cislice text-[12px] text-tlum2">#{ucet.id.slice(0, 8)}</span>
                </div>
                <p className="text-[13.5px] leading-relaxed text-tlum">
                  Anonymní účet. Žádné jméno, e-mail ani telefon — jen passkey v tomhle zařízení.
                </p>
                <Link href="/ucet/" onClick={() => setOtevreno(false)} className={TLACITKO_AKCENT}>
                  <Ikona nazev="zvonek" velikost={16} tah={1.9} /> Upozornění a nastavení
                </Link>
                {(ucet.role === "izs" || ucet.role === "admin") && (
                  <Link href="/izs/" onClick={() => setOtevreno(false)} className={TLACITKO_TICHE}>
                    <Ikona nazev="sirena" velikost={16} tah={1.9} /> Zprávy partnera IZS
                  </Link>
                )}
                {ucet.role === "admin" && (
                  <Link href="/sprava/" onClick={() => setOtevreno(false)} className={TLACITKO_TICHE}>
                    <Ikona nazev="zamek" velikost={16} tah={1.9} /> Správa účtů
                  </Link>
                )}
                <button type="button" onClick={() => odhlasit()} className="text-[13px] text-tlum underline underline-offset-4 hover:text-inkoust">
                  Odhlásit z tohoto zařízení
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[14px] leading-relaxed text-tlum">
                  Účet bez jména, e-mailu i telefonu. Přihlášení passkey — otiskem, obličejem
                  nebo PINem zařízení. Nastavíte si, co a kdy vám má přijít.
                </p>
                <Link href="/ucet/" onClick={() => setOtevreno(false)} className={TLACITKO_AKCENT}>
                  <Ikona nazev="zamek" velikost={16} tah={1.9} /> Přihlásit nebo založit
                </Link>
              </div>
            )}
          </Oddil>

          <Oddil ikona="hodiny" nadpis="Klid v číslech">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] border border-linka2 p-3">
                <div className="velke-cislo text-[30px] text-akcent-svetla">
                  {klid ? klid.dnu : "—"}
                </div>
                <div className="stitek mt-2 !text-tlum2">
                  {klid?.odZacatkuArchivu ? "dní bez změny · celý archiv" : "dní bez změny práva"}
                </div>
              </div>
              <div className="rounded-[12px] border border-linka2 p-3">
                <div className={`text-[15px] font-bold uppercase tracking-[0.03em] ${platiNeco ? "text-[#e68a8a]" : "text-[#8fd6ae]"}`}>
                  {platiNeco ? "Mimořádný stav" : "Bez omezení"}
                </div>
                <div className="stitek mt-2 !text-tlum2">
                  {overeno ? `ověřeno ${datumCas(overeno)}` : "zatím neověřeno"}
                </div>
              </div>
            </div>
          </Oddil>

          <Oddil ikona="telefon" nadpis="Aplikace do mobilu">
            <p className="mb-3 text-[14px] leading-relaxed text-tlum">
              Stejný přehled jako ikona na ploše. Otevře se rychle, poslední stav zůstane i bez signálu.
            </p>
            <TlacitkoInstalace cele />
          </Oddil>

          <Oddil ikona="sirena" nadpis="Partner IZS">
            <p className="text-[14px] leading-relaxed text-tlum">
              Ověřené záchranné složky mohou přes CzechPatrol poslat čtenářům zprávu. Každá projde
              schválením a je označená jako <b className="font-semibold text-inkoust">zpráva partnera</b>.
              Nikdy se nevydává za úřední varování.
            </p>
            <Link href="/izs/" onClick={() => setOtevreno(false)} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-akcent hover:text-akcent-svetla">
              Jak to funguje <Ikona nazev="nahoru" velikost={13} tah={2} trida="rotate-90" />
            </Link>
          </Oddil>

          <Oddil ikona="stit-ok" nadpis="Praktický pomocník">
            <ul className="space-y-2.5">
              {POMOCNIK.map((p) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="group block">
                    <span className="block text-[14px] font-semibold text-inkoust group-hover:text-akcent">{p.nazev}</span>
                    <span className="block text-[13px] leading-snug text-tlum">{p.popis}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {TISNOVA.map((t) => (
                <a
                  key={t.cislo}
                  href={`tel:${t.cislo}`}
                  title={t.popis}
                  className="rounded-[10px] border border-linka py-2 text-center transition-colors hover:border-akcent"
                >
                  <span className="velke-cislo block text-[20px] text-inkoust">{t.cislo}</span>
                  <span className="stitek mt-1 block !text-[9px] !text-tlum2">{t.popis.split(" ")[0]}</span>
                </a>
              ))}
            </div>
          </Oddil>

          <Oddil ikona="kava" nadpis="Podpořit projekt">
            <p className="mb-3 text-[14px] leading-relaxed text-tlum">
              Provoz platí sběr dat a doručování zpráv. Káva pomůže; hvězdička na GitHubu taky.
            </p>
            <div className="grid gap-2">
              {BUY_ME_A_COFFEE_URL && (
                <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer" className={`${TLACITKO} border-jantar/60 bg-jantar/15 text-jantar hover:bg-jantar/25`}>
                  <Ikona nazev="kava" velikost={16} tah={1.9} /> Buy me a coffee
                </a>
              )}
              {KOMUNITA.github && (
                <a href={KOMUNITA.github} target="_blank" rel="noopener noreferrer" className={TLACITKO_TICHE}>
                  <Ikona nazev="srdce" velikost={16} tah={1.9} /> Hvězdička na GitHubu
                </a>
              )}
            </div>
          </Oddil>

          <nav aria-label="Další stránky" className="px-1 pt-2">
            <div className="stitek mb-2">Další stránky</div>
            <ul className="grid grid-cols-2 gap-x-3">
              {DALSI_STRANKY.map((o) => (
                <li key={o.href}>
                  <Link href={o.href} onClick={() => setOtevreno(false)} className="block border-b border-linka2 py-2.5 text-[14px] text-tlum hover:text-inkoust">
                    {o.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
