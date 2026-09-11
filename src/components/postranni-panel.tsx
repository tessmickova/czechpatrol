"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BUY_ME_A_COFFEE_URL, DISKUZE, KANALY, POMOCNIK, TISNOVA, UCTY_ZAPNUTE, WEB } from "@/config/web";
import { odhlasit, ROLE, useUcet } from "@/lib/ucet";
import { Ikona, type NazevIkony } from "./ikony";
import { TlacitkoInstalace } from "./pwa";
import { KruhyKomunity } from "./komunita";
import { ZnackaKanalu, type Znacka } from "./znacky";
import { Tlacitko } from "./ui";

/** Kdokoli může panel otevřít — hlavička, spodní lišta, odkaz v textu. */
export function otevriPanel() {
  window.dispatchEvent(new CustomEvent("czechpatrol:panel"));
}

/*
  Postranní menu. Rozvržení, na které jsou lidé zvyklí:
  nahoře název a křížek, pod tím hlavní stránky jako velké řádky,
  pak další oddíly jako menší seznamy, účet jako jeden řádek se stavem,
  úplně dole tísňová čísla a drobné odkazy.
*/

export const HLAVNI_STRANKY: { href: string; label: string; ikona: NazevIkony; popis: string }[] = [
  { href: "/", label: "Přehled", ikona: "radar", popis: "stavy, opatření, poslední události" },
  { href: "/udalosti/", label: "Události", ikona: "osa", popis: "všechny záznamy se zdroji a filtry" },
  { href: "/manipulace/", label: "Manipulace", ikona: "bublina", popis: "operace cílené na občany a co je u nich doložené" },
  { href: "/zeme/", label: "Země", ikona: "vlajka", popis: "přehled a počty pro každou sledovanou zemi" },
  { href: "/analyzy/", label: "Analýzy", ikona: "graf", popis: "vývoj v čase, cíle aktérů, metodika" },
  { href: "/muj-prehled/", label: "Můj přehled", ikona: "terc", popis: "země a témata, která sledujete" },
];

export const DALSI_STRANKY = [
  { href: "/vyvoj/", label: "Vývoj" },
  { href: "/svet/", label: "Aktéři a cíle" },
  { href: "/metodika/", label: "Metodika" },
  { href: "/zdroje/", label: "Zdroje" },
  { href: "/opravy/", label: "Opravy a historie" },
  { href: "/o-projektu/", label: "O projektu" },
  { href: "/izs/", label: "Pro záchranné složky" },
  { href: "/soukromi/", label: "Soukromí" },
  { href: "/podminky/", label: "Podmínky" },
];

/*
  Kanály v panelu. Telegram je první a největší — je to jediný kanál, kterým
  se dá zastihnout člověk, který web zrovna nesleduje. Kanál bez adresy se
  ukáže jako připravovaný, nikdy jako funkční.
*/
const KANALY_PANEL: { klic: Znacka; nazev: string; popis: string }[] = [
  { klic: "telegram", nazev: "Telegram", popis: "upozornění hned" },
  { klic: "email", nazev: "E-mail", popis: "souhrn" },
  { klic: "signal", nazev: "Signal", popis: "šifrovaně" },
  { klic: "whatsapp", nazev: "WhatsApp", popis: "kanál" },
];

const RADEK = "flex min-h-[48px] items-center gap-3 px-4 text-[15px] text-inkoust transition-colors hover:bg-plocha";

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

  const zavri = () => setOtevreno(false);

  return (
    <>
      <div
        aria-hidden
        onClick={zavri}
        className={`fixed inset-0 z-[70] bg-noc/70 transition-opacity ${otevreno ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed inset-y-0 right-0 z-[80] flex w-full max-w-[380px] flex-col border-l border-linka bg-papir shadow-[-30px_0_80px_-30px_rgb(0_0_0/0.9)] transition-transform duration-300 ${
          otevreno ? "translate-x-0" : "invisible translate-x-full"
        }`}
        aria-hidden={!otevreno}
      >
        {/* hlavička */}
        <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-linka pl-4 pr-2">
          <span className="flex items-center gap-2.5">
            <span className="grid h-[28px] w-[28px] place-items-center rounded-[12px] bg-akcent/15 text-akcent"><Ikona nazev="radar" velikost={16} tah={1.8} /></span>
            <span className="text-[16px] font-bold">{WEB.nazev}</span>
            <span className="text-[13px] text-tlum2">menu</span>
          </span>
          <button ref={zavrit} type="button" onClick={zavri} className="grid h-11 w-11 place-items-center rounded-[12px] text-tlum transition-colors hover:bg-plocha hover:text-inkoust">
            <span className="sr-only">Zavřít menu</span>
            <Ikona nazev="krizek" velikost={18} tah={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* hlavní stránky */}
          <nav aria-label="Hlavní" className="py-2">
            <ul>
              {HLAVNI_STRANKY.map((o) => (
                <li key={o.href}>
                  <Link href={o.href} onClick={zavri} className={RADEK}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-plocha2 text-akcent"><Ikona nazev={o.ikona} velikost={17} tah={1.8} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{o.label}</span>
                      <span className="block text-[12.5px] text-tlum">{o.popis}</span>
                    </span>
                    <Ikona nazev="nahoru" velikost={13} tah={2} trida="shrink-0 rotate-90 text-tlum2" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* účet */}
          <section aria-label="Účet" className="border-t border-linka py-2">
            <div className="stitek px-4 pb-1 pt-2">Účet</div>
            {!UCTY_ZAPNUTE ? (
              <p className="px-4 pb-2 text-[13.5px] leading-relaxed text-tlum">Účty a upozornění zatím neběží. RSS funguje bez účtu.</p>
            ) : nacita ? (
              <p className="px-4 pb-2 text-[13.5px] text-tlum">Ověřuji přihlášení…</p>
            ) : ucet ? (
              <ul>
                <li>
                  <Link href="/ucet/" onClick={zavri} className={RADEK}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-plocha2 text-akcent"><Ikona nazev="uzivatel" velikost={17} tah={1.8} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{ROLE[ucet.role].nazev}</span>
                      <span className="block text-[12.5px] text-tlum">upozornění a nastavení · #{ucet.id.slice(0, 8)}</span>
                    </span>
                    <Ikona nazev="nahoru" velikost={13} tah={2} trida="shrink-0 rotate-90 text-tlum2" />
                  </Link>
                </li>
                {(ucet.role === "izs" || ucet.role === "admin") && (
                  <li><Link href="/izs/" onClick={zavri} className={RADEK}><span className="w-9" /> Zprávy partnera IZS</Link></li>
                )}
                {ucet.role === "admin" && (
                  <li><Link href="/sprava/" onClick={zavri} className={RADEK}><span className="w-9" /> Správa účtů</Link></li>
                )}
                <li>
                  <button type="button" onClick={() => odhlasit()} className={`${RADEK} w-full text-left text-tlum`}><span className="w-9" /> Odhlásit z tohoto zařízení</button>
                </li>
              </ul>
            ) : (
              <Link href="/ucet/" onClick={zavri} className={RADEK}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-plocha2 text-akcent"><Ikona nazev="zamek" velikost={17} tah={1.8} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Přihlásit nebo založit účet</span>
                  <span className="block text-[12.5px] text-tlum">bez jména a e-mailu, passkey v zařízení</span>
                </span>
                <Ikona nazev="nahoru" velikost={13} tah={2} trida="shrink-0 rotate-90 text-tlum2" />
              </Link>
            )}
          </section>

          {/* další stránky */}
          <nav aria-label="Další stránky" className="border-t border-linka py-2">
            <div className="stitek px-4 pb-1 pt-2">Další</div>
            <ul className="grid grid-cols-2">
              {DALSI_STRANKY.map((o) => (
                <li key={o.href}>
                  <Link href={o.href} onClick={zavri} className="flex min-h-[40px] items-center px-4 text-[14px] text-tlum hover:bg-plocha hover:text-inkoust">{o.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* odběr — Telegram nahoře, ostatní kanály pod ním */}
          <section aria-label="Odběr" className="border-t border-linka px-4 py-3">
            <div className="stitek mb-2">Odběr upozornění</div>
            {KANALY.telegram ? (
              <a
                href={KANALY.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[60px] items-center gap-3 rounded-[18px] border border-akcent/55 bg-akcent/12 px-3.5 transition-colors hover:bg-akcent/20"
              >
                <ZnackaKanalu znacka="telegram" velikost={30} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold text-inkoust">Telegram — urgentní upozornění</span>
                  <span className="block text-[12px] leading-snug text-tlum">jen změny, kvůli kterým byste jednali jinak</span>
                </span>
                <Ikona nazev="nahoru" velikost={13} tah={2} trida="shrink-0 rotate-45 text-akcent" />
              </a>
            ) : (
              <span className="flex min-h-[60px] items-center gap-3 rounded-[18px] border border-dashed border-linka px-3.5">
                <ZnackaKanalu znacka="telegram" velikost={30} tlumena />
                <span className="text-[13.5px] text-tlum">Telegram — připravujeme</span>
              </span>
            )}
            <ul className="mt-2 grid grid-cols-3 gap-1.5">
              {KANALY_PANEL.filter((k) => k.klic !== "telegram").map((k) => {
                const url = KANALY[k.klic];
                return (
                  <li key={k.klic}>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[18px] border border-linka px-1 text-center transition-colors hover:border-akcent">
                        <ZnackaKanalu znacka={k.klic} velikost={22} />
                        <span className="text-[11.5px] font-semibold text-inkoust">{k.nazev}</span>
                      </a>
                    ) : (
                      <span className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[18px] border border-dashed border-linka px-1 text-center opacity-80">
                        <ZnackaKanalu znacka={k.klic} velikost={22} tlumena />
                        <span className="text-[11.5px] font-semibold text-tlum">{k.nazev}</span>
                        <span className="text-[10px] leading-none text-tlum2">připravujeme</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px]">
              <Tlacitko kam="/feed.xml" varianta="tichy" velikost="s" ikona="rss" trida="!text-akcent hover:!text-akcent-svetla">RSS — funguje vždy</Tlacitko>
              <Link href="/odber/" onClick={zavri} className="text-tlum hover:text-inkoust">jak to funguje →</Link>
            </div>
          </section>

          {/* komunita */}
          <section aria-label="Komunita" className="border-t border-linka px-4 py-3">
            <div className="stitek mb-2">Komunita</div>
            <KruhyKomunity onKlik={zavri} />
          </section>

          {/* podpora a aplikace */}
          <section aria-label="Podpora a aplikace" className="border-t border-linka px-4 py-3">
            <div className="stitek mb-2">Podpora provozu</div>
            {BUY_ME_A_COFFEE_URL ? (
              <a
                href={BUY_ME_A_COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] items-center gap-3 rounded-[18px] border border-jantar/50 bg-jantar/10 px-3.5 transition-colors hover:bg-jantar/18"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-jantar/20 text-jantar"><Ikona nazev="kava" velikost={17} tah={1.9} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-inkoust">Buy me a coffee</span>
                  <span className="block text-[12px] text-tlum">jednorázově, bez účtu</span>
                </span>
              </a>
            ) : (
              <Link href="/podporit/" onClick={zavri} className="flex min-h-[52px] items-center gap-3 rounded-[18px] border border-linka px-3.5 transition-colors hover:border-akcent">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-plocha2 text-jantar"><Ikona nazev="kava" velikost={17} tah={1.9} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-inkoust">Podpořit provoz</span>
                  <span className="block text-[12px] text-tlum">přímý příspěvek zatím připravujeme</span>
                </span>
              </Link>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
              <span className="flex items-center gap-2 text-tlum"><Ikona nazev="instalace" velikost={14} tah={2} /> Aplikace</span>
              <span className="min-w-0 flex-1"><TlacitkoInstalace /></span>
            </div>
          </section>

          {/* úřední odkazy */}
          <details className="group border-t border-linka">
            <summary className="flex min-h-[44px] cursor-pointer items-center justify-between px-4 text-[14px] font-semibold text-inkoust hover:bg-plocha">
              Úřední odkazy
              <Ikona nazev="dolu" velikost={13} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="pb-2">
              {POMOCNIK.map((p) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-plocha">
                    <span className="block text-[14px] font-semibold text-inkoust">{p.nazev}</span>
                    <span className="block text-[12.5px] leading-snug text-tlum">{p.popis}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>

        {/* tísňová čísla — vždy dole */}
        <div className="shrink-0 border-t border-linka px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="stitek mb-1.5">V nouzi volejte</div>
          <div className="grid grid-cols-4 gap-2">
            {TISNOVA.map((t) => (
              <a key={t.cislo} href={`tel:${t.cislo}`} title={t.popis} className="rounded-[12px] border border-linka py-1.5 text-center hover:border-akcent">
                <span className="cislice block text-[18px] font-bold text-inkoust">{t.cislo}</span>
                <span className="block text-[10.5px] text-tlum2">{t.popis.split(" ")[0]}</span>
              </a>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
