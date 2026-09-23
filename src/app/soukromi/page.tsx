import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Karta } from "@/components/zaklad";
import { PROVOZOVATEL, WEB } from "@/config/web";

export const metadata: Metadata = {
  title: "Soukromí",
  description: "Co o vás CzechPatrol ví, proč, jak dlouho a jak to smažete. Krátce a bez právničiny.",
};

const REVIZE = "2026-09-22";

function Oddil({ cislo, nadpis, children }: { cislo: string; nadpis: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-linka py-7 md:grid-cols-[120px_minmax(0,1fr)]">
      <div className="cislice stitek pt-1">{cislo}</div>
      <div>
        <h2 className="podnadpis text-velke">{nadpis}</h2>
        <div className="mt-3 space-y-3 text-zaklad leading-relaxed text-tlum [&_b]:font-semibold [&_b]:text-inkoust [&_li]:pl-1">{children}</div>
      </div>
    </section>
  );
}

/**
 * Zásady ochrany osobních údajů — informace podle čl. 13 GDPR.
 * Psáno pro čtenáře, ne pro právníka; každý bod ale odpovídá tomu, co
 * systém opravdu dělá. Změna v kódu = změna tady.
 */
export default function SoukromiStranka() {
  return (
    <>
      <HlavickaStranky
        stitek="Soukromí"
        ikona="zamek"
        nadpis="Co o vás víme. Skoro nic."
        popis="Web se dá číst bez účtu a bez sledování. Účet je anonymní. Tady je přesně, co se ukládá, proč, na jak dlouho a jak to smažete."
        doplnek={<span className="stitek !text-noc-tlum">Platí od {REVIZE}</span>}
      />
      <Obsah>
        <div className="grid gap-4 md:grid-cols-3">
          <Karta odstin="zelena" className="p-5">
            <div className="stitek mb-2">Čtení webu</div>
            <p className="text-zaklad leading-relaxed text-tlum">Žádné sledovací cookies, žádná analytika třetích stran, žádný účet. Nic se neukládá k vám.</p>
          </Karta>
          <Karta odstin="modra" className="p-5">
            <div className="stitek mb-2 !text-akcent">Účet</div>
            <p className="text-zaklad leading-relaxed text-tlum">Náhodný identifikátor, veřejná část passkey, vaše nastavení. Bez jména, e-mailu a telefonu.</p>
          </Karta>
          <Karta odstin="pisek" className="p-5">
            <div className="stitek mb-2">Kanály</div>
            <p className="text-zaklad leading-relaxed text-tlum">Telegram: číslo chatu. WhatsApp: telefonní číslo. Jen pro doručení, kdykoli smažete.</p>
          </Karta>
        </div>

        <div className="mt-10">
          <Oddil cislo="01" nadpis="Kdo údaje spravuje">
            {PROVOZOVATEL.nazev ? (
              <p>Správcem osobních údajů je <b>{PROVOZOVATEL.nazev}</b>{PROVOZOVATEL.kontakt ? <>, kontakt: <b>{PROVOZOVATEL.kontakt}</b></> : null}.</p>
            ) : (
              <p>Správce osobních údajů a kontakt na něj zveřejníme nejpozději se spuštěním účtů. Do té doby web žádné údaje k uživatelům neukládá.</p>
            )}
            <p>Web běží na adrese {WEB.url}.</p>
          </Oddil>

          <Oddil cislo="02" nadpis="Čtení bez účtu">
            <p>Při pouhém čtení neukládáme nic, co by vás identifikovalo. Nepoužíváme cookies pro sledování ani měření návštěvnosti.</p>
            <p>Poskytovatel hostingu (Cloudflare) zpracovává při doručení stránky vaši IP adresu — je to technicky nutné a děje se to v roli zpracovatele. Do naší databáze se IP adresy nezapisují.</p>
            <p>Když si web přidáte na plochu, prohlížeč si u sebe uloží kopii stránek pro čtení bez signálu. To je jen ve vašem zařízení.</p>
          </Oddil>

          <Oddil cislo="03" nadpis="Účet">
            <p>Účet je navržený tak, aby o vás říkal co nejméně. Ukládáme:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><b>náhodný identifikátor účtu</b> — nemá vazbu na jméno, e-mail ani telefon,</li>
              <li><b>veřejnou část passkey</b> a počítadlo použití — soukromý klíč zůstává ve vašem zařízení,</li>
              <li><b>otisk (hash) obnovovacího kódu</b> — samotný kód známe jen vy,</li>
              <li><b>nastavení upozornění</b> — frekvenci, závažnost, tiché hodiny, oblasti,</li>
              <li><b>čas založení a posledního přihlášení</b>,</li>
              <li><b>roli</b> (čtenář, podporovatel, partner IZS, správce) a u partnerů poznámku správce o ověření.</li>
            </ul>
            <p>Právní základ: plnění smlouvy — služby, kterou jste si zřídili (čl. 6 odst. 1 písm. b GDPR). Přihlašovací token se ukládá jen ve vašem prohlížeči; na serveru máme jeho otisk s platností 30 dní.</p>
          </Oddil>

          <Oddil cislo="04" nadpis="Doručování zpráv">
            <p>Abychom vám mohli něco poslat, potřebujeme adresu na daném kanálu:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><b>Telegram</b>: číslo chatu, které nám Telegram předá po vašem kliknutí na „Start“. Není z něj vidět jméno ani telefon.</li>
              <li><b>WhatsApp</b>: telefonní číslo, které zadáte. Jediný údaj, bez kterého to nejde.</li>
            </ul>
            <p>Obsah zpráv doručují Telegram Messenger Inc. a Meta Platforms Ireland Ltd. jako provozovatelé těchto služeb podle vlastních podmínek. Propojení kanálu jde v účtu kdykoli zrušit; údaj se tím smaže.</p>
            <p>Právní základ: plnění smlouvy (čl. 6 odst. 1 písm. b GDPR).</p>
          </Oddil>

          <Oddil cislo="05" nadpis="E-mail pro souhrn a komunitu">
            <p>Na stránce <b>Zapojit se</b> můžete nechat e-mail, když chcete občasný souhrn, pozvánku do komunity, nebo chcete pomáhat. Uložíme <b>jen adresu</b>, co jste zaškrtli, čas a znění souhlasu a slovo, ze které stránky jste přišli. Nic jiného.</p>
            <p>Právní základ: souhlas (čl. 6 odst. 1 písm. a GDPR). Odvoláte ho odkazem v každém e-mailu nebo zprávou správci; adresu do 30 dnů smažeme. Adresu, které do roka nic nepřišlo, smažeme také.</p>
            <p><b>Žebříček připravenosti</b> (stránka Odolnost domácnosti) je pro přihlášené anonymní účty: k účtu se uloží skóre, datum, kraj a počet osob (bez jmen) a vygenerovaná přezdívka. Veřejně je vidět jen přezdívka, skóre, datum a kraj. Kontakt (e-mail a telefon) je <b>nepovinný</b>: pokud ho necháte, uloží se šifrovaně, vidí ho pouze správce a slouží k pozvání do komunity. Právní základ: souhlas. Ze žebříčku odejdete jedním tlačítkem, záznam i kontakt zmizí hned; sami mažeme záznamy bez pohybu po roce.</p>
            <p>Adresu nikomu nepředáváme, nepoužíváme ji k reklamě a neposíláme z ní nic, co jste si nevybrali. Souhrn zatím nevychází; dokud nevyjde, nic nepřijde.</p>
          </Oddil>

          <Oddil cislo="06" nadpis="Bezpečnost a audit">
            <p>U pokusů o přihlášení a založení účtu si na 24 hodin držíme <b>solený otisk IP adresy</b>, abychom zabrzdili automatizované útoky. Z otisku nejde IP adresu zpětně získat a po 24 hodinách zaniká. Právní základ: oprávněný zájem na bezpečnosti služby (čl. 6 odst. 1 písm. f GDPR).</p>
            <p>Zásahy správců (změna role, schválení zprávy) se zapisují do auditu s identifikátorem účtu správce. Uchováváme 12 měsíců.</p>
          </Oddil>

          <Oddil cislo="07" nadpis="Jak dlouho">
            <ul className="list-disc space-y-1 pl-5">
              <li>účet a nastavení: do smazání účtu; účet bez přihlášení 24 měsíců smažeme,</li>
              <li>propojovací kód Telegramu: 15 minut,</li>
              <li>přihlašovací token: 30 dní od posledního použití,</li>
              <li>otisk IP: 24 hodin,</li>
              <li>audit správců: 12 měsíců,</li>
              <li>e-mail pro souhrn: do odvolání souhlasu, po odhlášení 30 dnů; bez jediného e-mailu nejvýš 12 měsíců,</li>
              <li>zprávy partnerů IZS: text zprávy 12 měsíců, doručení jen jako počet.</li>
            </ul>
          </Oddil>

          <Oddil cislo="08" nadpis="Komu údaje předáváme">
            <ul className="list-disc space-y-1 pl-5">
              <li><b>Cloudflare, Inc.</b> — hosting webu, běh API a databáze. Zpracovatel; data mohou být zpracována i mimo EU na základě standardních smluvních doložek a rámce EU–US Data Privacy Framework.</li>
              <li><b>Telegram Messenger Inc.</b> a <b>Meta Platforms Ireland Ltd.</b> — jen pokud si kanál propojíte; doručují zprávy jako samostatní správci.</li>
                          </ul>
            <p>Nikomu údaje neprodáváme a nepoužíváme je k reklamě.</p>
          </Oddil>

          <Oddil cislo="09" nadpis="Vaše práva">
            <p>Máte právo na přístup, opravu, výmaz, omezení, přenositelnost a námitku. Většinu vyřídíte sami v účtu. Účet smažete jedním tlačítkem, hned a bez zálohy.</p>
            <p>Účet o vás nic neví. Žádosti proto vyřizujeme jen z přihlášeného účtu — jinak nepoznáme, že jste to vy.</p>
            <p>Stížnost můžete podat u Úřadu pro ochranu osobních údajů (uoou.gov.cz).</p>
          </Oddil>

          <Oddil cislo="10" nadpis="Cookies a úložiště prohlížeče">
            <p>Web nepoužívá cookies. V prohlížeči ukládá jen přihlášení a vaše předvolby. To je nutné pro službu, kterou chcete, a souhlas se nevyžaduje.</p>
          </Oddil>

          <Oddil cislo="11" nadpis="Automatizace a AI">
            <p>Sběr dat běží automaticky, část textů vzniká s pomocí AI a celkové hodnocení se počítá automaticky podle zveřejněné Metodiky. O vás nic automaticky nerozhodujeme a neprofilujeme vás. Upozornění jen filtrují zprávy podle vašeho výběru.</p>
          </Oddil>

          <Oddil cislo="12" nadpis="Děti">
            <p>Účet je určený osobám od 15 let. Mladší uživatele o zřízení účtu nežádáme a údaje o věku nesbíráme.</p>
          </Oddil>

          <Oddil cislo="13" nadpis="Změny">
            <p>Když se změní, co děláme, změní se i tahle stránka. Datum revize je nahoře. Velkou změnu oznámíme na přehledu a v účtu.</p>
            <p>Související: <Link href="/podminky/" className="odkaz text-inkoust">Podmínky použití</Link> · <Link href="/metodika/" className="odkaz text-inkoust">Metodika</Link></p>
          </Oddil>
        </div>
      </Obsah>
    </>
  );
}
