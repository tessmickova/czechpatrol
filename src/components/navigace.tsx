"use client";

import { Odkaz } from "./odkaz";
import { usePathname } from "next/navigation";
import { WEB } from "@/config/web";
import { Ikona } from "./ikony";
import { otevriPanel } from "./postranni-panel";
import { Logo } from "./znacka";
import { useT } from "@/lib/i18n";
import { useUcet } from "@/lib/ucet";

/*
  Pět cílů. Vývoj, Aktéři, Manipulace a Země stojí pod jedním rozcestníkem
  Analýzy — jsou to odpovědi na tutéž otázku „co z toho plyne“ a
  v liště by se rozpadly do nesrozumitelného výčtu.

  Můj přehled v liště není: je to funkce po přihlášení a bydlí
  v postranním menu vedle nastavení upozornění.
*/
export const HLAVNI = [
  { href: "/", label: "Přehled" },
  { href: "/udalosti/", label: "Události" },
  { href: "/manipulace/", label: "Manipulace" },
  { href: "/zeme/", label: "Země" },
  { href: "/analyzy/", label: "Analýzy" },
  { href: "/pripravenost/", label: "Připravenost" },
  { href: "/zkusenosti/", label: "Zkušenosti" },
];

export function Navigace() {
  const t = useT();
  const cesta = usePathname();
  const aktivni = (href: string) => (href === "/" ? cesta === "/" : cesta.startsWith(href));
  /* Přihlášený má v hlavičce vlastní vstup: Účet, u správce Správa. Bez toho se k tomu šlo jen přes postranní menu. */
  const { ucet } = useUcet();

  return (
    // Hlavička je skleněná pilulka, ne pruh přes celou šířku — tak ji má značka.
    // Vnější obal je záměrně shodný s obsahem stránky (max-w-[1280px] + px-4/6),
    // aby pilulka lícovala s panely pod sebou. Dřív měla vlastní 1200 px a byla
    // o 16 px zasunutá z každé strany; kopírováním obsahu to zůstane srovnané,
    // i kdyby se šířka webu někdy změnila.
    // Bezpečná zóna nahoře (26. 9. 2026): v nainstalované aplikaci je stavový
    // řádek průhledný (black-translucent + viewport-fit=cover) a pilulka
    // při posunu zajížděla pod hodiny a baterii.
    <header className="neni-tisk sticky top-0 z-50 pt-[calc(0.75rem+env(safe-area-inset-top))] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[env(safe-area-inset-top)] before:bg-papir before:content-['']">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      {/*
        Jeden řádek, i na úzkém displeji.

        Hlavička se dřív zalamovala: značka je s nápisem a štítkem BETA široká,
        takže se přepínač jazyka a menu odsunuly na druhý řádek a z pilulky
        byla vysoká deska s dírou uprostřed. Nezalamuje se (`flex-nowrap`)
        a značka je na mobilu menší — víc než logo a dvě tlačítka se na
        390 px stejně nevejde.
      */}
      <div className="sklo-hlavicka flex min-h-[56px] flex-nowrap items-center gap-x-2 rounded-full px-3 py-2 sm:gap-x-4 sm:px-4">
        <Odkaz href="/" className="mr-auto flex min-w-0 shrink items-center" aria-label={`${WEB.nazev} — přehled`}>
          <span className="sm:hidden"><Logo velikost={26} pismo={15} tmave /></span>
          <span className="hidden sm:block"><Logo velikost={34} pismo={19} tmave /></span>
        </Odkaz>

        {/*
          Vodorovná nabídka až od 1024 px, ne od 768.

          Šest položek, tlačítko Podpořit, přepínač jazyka a menu se do
          tabletové šířky nevešly: řádek se nezalomil (flex-nowrap), jen
          přetekl doleva přes logo, takže „PŘEHLED" leželo na slově
          „CzechPatrol". Pod 1024 px vede nabídka přes tlačítko menu, které
          je na liště pořád.
        */}
        {/*
          Dvě velikosti podle šířky. Sedm položek s větším písmem se na
          1024–1279 px nevejde vedle značky a přepínače jazyka: nabídka
          přetekla doleva přes štítek BETA. Do 1280 px je proto písmo menší
          a bez mezer, tlačítko Podpořit vede jen přes menu; od 1280 px je
          všechno ve velikosti, kterou má zbytek webu.
        */}
        <nav aria-label={t("Hlavní")} className="hidden items-center lg:flex xl:gap-1">
          {HLAVNI.map((o) => (
            <Odkaz
              key={o.href}
              href={o.href}
              aria-current={aktivni(o.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-1.5 py-2 text-mikro font-semibold uppercase tracking-[0.05em] transition-colors xl:px-2.5 xl:text-drobne ${
                aktivni(o.href) ? "bg-[rgb(255_255_255/0.12)] text-inkoust" : "text-tlum hover:bg-[rgb(255_255_255/0.07)] hover:text-inkoust"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t(o.label)}
            </Odkaz>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {ucet && (
            <Odkaz
              href={ucet.role === "admin" ? "/sprava/" : "/ucet/"}
              aria-current={aktivni(ucet.role === "admin" ? "/sprava/" : "/ucet/") ? "page" : undefined}
              /* Jen ikona: sedm položek nabídky + Podpořit se vedle značky nevejdou ani na širokém displeji. Slovo nese title a postranní menu. */
              className={`hidden h-10 items-center gap-1.5 rounded-full border px-2.5 text-drobne font-semibold uppercase tracking-[0.05em] transition-colors lg:inline-flex ${ucet.role === "admin" ? "border-akcent/60 text-inkoust hover:bg-akcent/10" : "border-linka text-tlum hover:text-inkoust"}`}
              style={{ fontFamily: "var(--font-mono)" }}
              aria-label={ucet.role === "admin" ? "Správa" : "Účet"}
              title={ucet.role === "admin" ? "Správa — co čeká na rozhodnutí" : "Účet"}
            >
              {ucet.role === "admin" && <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-akcent" />}
              <Ikona nazev={ucet.role === "admin" ? "vaha" : "uzivatel"} velikost={14} tah={2} />
            </Odkaz>
          )}
          <Odkaz
            href="/podporit/"
            // Jediná plná plocha v hlavičce: na tmavém podkladu papír, po najetí červená.
            className="hidden rounded-full bg-inkoust px-5 py-2.5 text-drobne font-semibold uppercase tracking-[0.06em] text-papir transition-colors hover:bg-akcent hover:text-papir xl:inline-block"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Podpořit
          </Odkaz>
          <button
            type="button"
            onClick={otevriPanel}
            className="grid h-11 w-11 place-items-center rounded-full text-tlum transition-colors hover:bg-[rgb(255_255_255/0.08)] hover:text-inkoust"
          >
            <span className="sr-only">{t("Menu")}</span>
            <Ikona nazev="menu" velikost={20} tah={1.8} />
          </button>
        </div>
      </div>
      </div>
    </header>
  );
}
