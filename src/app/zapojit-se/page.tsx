import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Ikona, type NazevIkony } from "@/components/ikony";
import { Nahlaseni } from "@/components/nahlaseni";
import { Tlacitko } from "@/components/ui";
import { ZajemFormular } from "@/components/zapojit-klient";
import { ZnackaKanalu } from "@/components/znacky";
import { DORUCOVANI, EMAIL_ODBER_BEZI, KANALY, UCTY_ZAPNUTE } from "@/config/web";

export const metadata: Metadata = {
  title: "Zapojit se",
  description: "Jak si nechat dát vědět dřív a jak pomoct, aby CzechPatrol fungoval i pro ostatní. Telegram, e-mail, účet, tipy. Nic není povinné.",
};

/*
  Průvodce zapojením. Jedna stránka, čtyři kroky, každý stojí sám:
  kdo chce jen upozornění, skončí u prvního. Pořadí je podle toho, co
  člověku pomůže nejdřív, ne podle toho, co je pro projekt nejcennější.
  Tón: říct, co existuje a k čemu to je. Nepřemlouvat.
*/

function Krok({ cislo, ikona, nadpis, popis, children }: { cislo: string; ikona?: NazevIkony; nadpis: string; popis: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-linka py-8 md:grid-cols-[140px_minmax(0,1fr)]">
      <div className="flex items-center gap-3 md:block">
        <span className="cislice stitek">{cislo}</span>
        {ikona && <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-plocha2 text-akcent md:mt-3"><Ikona nazev={ikona} velikost={17} tah={1.8} /></span>}
      </div>
      <div className="min-w-0">
        <h2 className="podnadpis text-velke">{nadpis}</h2>
        <p className="mt-2 max-w-[60ch] text-zaklad leading-relaxed text-tlum">{popis}</p>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

export default function ZapojitSe() {
  return (
    <>
      <HlavickaStranky
        ikona="zvonek"
        stitek="Zapojit se"
        nadpis="Dozvědět se dřív. A pomoct, aby to fungovalo i pro ostatní."
        popis="Čtyři možnosti, každá stojí sama. Většině lidí stačí první. Nic z toho není povinné a všechno jde kdykoli zrušit."
      />
      <Obsah>
        <div className="max-w-[900px]">
          <Krok cislo="01" ikona="zvonek" nadpis="Upozornění hned — Telegram" popis={DORUCOVANI.telegram.rozsah}>
            {KANALY.telegram ? (
              <p className="flex flex-wrap items-center gap-3">
                <Tlacitko kam={KANALY.telegram} nove varianta="plny" velikost="l">
                  <ZnackaKanalu znacka="telegram" velikost={20} /> Odebírat na Telegramu
                </Tlacitko>
                <Tlacitko kam="/odber/" varianta="tichy" velikost="m">kdy přesně zprávy chodí</Tlacitko>
              </p>
            ) : (
              <p className="text-zaklad text-tlum">Telegram připravujeme. Zatím funguje RSS.</p>
            )}
            <p className="mt-3 text-male text-tlum">Kanál je jen pro čtení. Nevidíme, kdo ho odebírá, a nic po vás nechce.</p>
          </Krok>

          <Krok
            cislo="02"
            ikona="komunikace"
            nadpis="Souhrn e-mailem a pozvánka do komunity"
            popis="Občas napíšeme, co se změnilo a co chystáme. Až otevřeme chat a skupinu na WhatsAppu, pošleme pozvánku první těm, kdo o ni stojí. Jediné, co uložíme, je vaše adresa."
          >
            <ZajemFormular zdroj="zapojit-se" />
            {!EMAIL_ODBER_BEZI && (
              <p className="mt-3 text-male text-tlum">Souhrn zatím nevychází. Až bude, napíšeme to sem první.</p>
            )}
          </Krok>

          <Krok
            cislo="03"
            ikona="uzivatel"
            nadpis="Účet pro víc"
            popis="Účet je bez jména, e-mailu i telefonu — klíč v telefonu nebo počítači. Otevře Můj přehled (jen země a témata, která sledujete), upozornění na míru a Odolnost domácnosti: co u vás vypadne s čím, které zálohy selžou naráz a jak dlouho vydrží zásoby."
          >
            {UCTY_ZAPNUTE ? (
              <p className="flex flex-wrap items-center gap-3">
                <Tlacitko kam="/ucet/" varianta="obrys" velikost="l" ikona="zamek">Založit nebo přihlásit účet</Tlacitko>
                <Link href="/soukromi/" className="text-male text-tlum underline underline-offset-4 hover:text-inkoust">co o vás účet ví</Link>
              </p>
            ) : (
              <p className="text-zaklad text-tlum">Účty připravujeme. Do té doby funguje Telegram a RSS bez účtu.</p>
            )}
          </Krok>

          <Krok
            cislo="04"
            ikona="lupa"
            nadpis="Pomoct s tím, co víte"
            popis="Nejcennější jsou zprávy z regionu a odkazy na úřední zdroje: policie, obec, hasiči, provozovatel. Bez zdroje nic nezveřejníme, ale dohledáme ho. Kontakt je dobrovolný."
          >
            <Nahlaseni />
          </Krok>

          <section className="border-t border-linka py-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="stitek mb-2">Co slibujeme</div>
                <ul className="space-y-2 text-zaklad text-tlum">
                  <li className="flex gap-2"><Ikona nazev="fajfka" velikost={14} tah={2.2} trida="mt-1 shrink-0 text-klid-text" /> Píšeme, jen když je co říct. Ne každý den.</li>
                  <li className="flex gap-2"><Ikona nazev="fajfka" velikost={14} tah={2.2} trida="mt-1 shrink-0 text-klid-text" /> Adresu nikomu nedáme a nepoužijeme ji k reklamě.</li>
                  <li className="flex gap-2"><Ikona nazev="fajfka" velikost={14} tah={2.2} trida="mt-1 shrink-0 text-klid-text" /> Odhlášení je jedním kliknutím a adresu do 30 dnů smažeme.</li>
                  <li className="flex gap-2"><Ikona nazev="fajfka" velikost={14} tah={2.2} trida="mt-1 shrink-0 text-klid-text" /> Každá zpráva má zdroj, na který se dá kliknout.</li>
                </ul>
              </div>
              <div>
                <div className="stitek mb-2">Co chystáme</div>
                <ul className="space-y-2 text-zaklad text-tlum">
                  <li className="flex gap-2"><Ikona nazev="hodiny" velikost={14} tah={2} trida="mt-1 shrink-0 text-tlum2" /> Chat ke konkrétním tématům — otevřeme ho, až bude komu psát.</li>
                  <li className="flex gap-2"><Ikona nazev="hodiny" velikost={14} tah={2} trida="mt-1 shrink-0 text-tlum2" /> Skupinu na WhatsAppu pro ty, kdo Telegram nepoužívají.</li>
                  <li className="flex gap-2"><Ikona nazev="hodiny" velikost={14} tah={2} trida="mt-1 shrink-0 text-tlum2" /> Zprávy pro obce, školy a záchranné složky.</li>
                </ul>
                <p className="mt-3 text-male text-tlum">Nic z toho ještě neběží. Kdo si nechá poslat pozvánku, dozví se to první.</p>
              </div>
            </div>
          </section>
        </div>
      </Obsah>
    </>
  );
}
