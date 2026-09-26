import type { Metadata, Viewport } from "next";
import { ListaMobil } from "@/components/lista-mobil";
import { Navigace } from "@/components/navigace";
import { DialogProvider } from "@/components/dialog";
import { PostranniPanel } from "@/components/postranni-panel";
import { NavadeniZapojeni } from "@/components/zapojit-klient";
import { RegistraceSW } from "@/components/pwa";
import { Mereni } from "@/components/mereni";
import { SouhlasAnalytika } from "@/components/souhlas-analytika";
import { Paticka } from "@/components/paticka";
import { PartnerskyProstor } from "@/components/partnersky-prostor";
import { PruhPuvodu, UkazkaPruh } from "@/components/pruhy";
import { PulzKratky } from "@/components/pulz-kratky";
import { pulz } from "@/lib/pulz";
import { PruhVystrahy } from "@/components/vystraha";
import { Znacka } from "@/components/znacka";
import { SKRIPT_POHYBU } from "@/components/pohyb";
import { SKRIPT_SOUHLASU } from "@/lib/souhlas-skript";
import { WEB } from "@/config/web";
import "./globals.css";

/*
  Písma jsou v balíčcích (@fontsource), ne z Google Fonts při sestavení.
  26. 9. 2026 spadlo nasazení, protože next/font/google na běžci nestáhl
  Archivo — web tak visel na dostupnosti cizího serveru v minutě sestavení.
  Soubory teď jdou z node_modules a servírují se z naší domény; návštěvník
  na server třetí strany nechodí. Rodiny „Archivo“ a „IBM Plex Mono“ bere
  globals.css (--font-sans, --font-mono). Každý soubor nese unicode-range,
  takže prohlížeč stáhne jen latin a latin-ext, které čeština potřebuje.
*/
// Písmo značky. Archivo nese nadpisy, tlačítka i běžný text.
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
// Neproporcionální písmo nesou popisky, čísla a časy — přehled se má číst
// jako přístroj, ne jako článek.
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-mono/700.css";

export const metadata: Metadata = {
  metadataBase: new URL(WEB.url),
  title: {
    default: `${WEB.nazev} — ${WEB.podtitul}`,
    template: `%s — ${WEB.nazev}`,
  },
  description: WEB.popis,
  applicationName: WEB.nazev,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/ikona-192.png", sizes: "192x192", type: "image/png" }, { url: "/ikona.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: WEB.nazev },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: WEB.nazev,
    title: `${WEB.nazev} — ${WEB.podtitul}`,
    description: WEB.popis,
  },
  twitter: { card: "summary_large_image", title: WEB.nazev, description: WEB.popis },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        {/* Volba pohybu se nastaví před vykreslením, ať nic neproblikne. */}
        <script dangerouslySetInnerHTML={{ __html: SKRIPT_POHYBU }} />
        <script dangerouslySetInnerHTML={{ __html: SKRIPT_SOUHLASU }} />
      </head>
      <body className="min-h-dvh">
        {/*
          Lišta souhlasu hned na začátku těla (26. 9. 2026): je připnutá dole,
          takže na pořadí v HTML vizuálně nezáleží — ale na konci dlouhé
          stránky se vykreslila až po celém HTML a jako největší text na
          obrazovce z ní byl pozdní LCP.
        */}
        <SouhlasAnalytika />
        {/*
          Pozadí, které se hýbe pomaleji než obsah. Je to jen ozdoba: leží pod
          vším, nedá se na ně kliknout a čtečka ho nevidí. Bez podpory
          scroll-driven animací zůstane stát, což ničemu nevadí.
        */}
        <div aria-hidden className="paralax-vrstva">
          <div className="paralax-znacka">
            <Znacka velikost={620} tmave />
          </div>
        </div>
        <a
          href="#obsah"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-inkoust focus:px-3 focus:py-2 focus:text-male focus:text-white"
        >
          Přeskočit na obsah
        </a>
        {/* Lišta původu je první věc na stránce, nad menu: kdo to píše a kdy naposled kontroloval. */}
        <PruhPuvodu vpravo={<PulzKratky pulz={pulz()} ted={Date.now()} />} />
        <Navigace />
        {/*
          Výstraha stojí nad obsahem, hned pod menu. Když platí, je to
          první věc pod navigací; když neplatí (a to je skoro vždycky),
          nevykreslí se vůbec nic.
        */}
        <PruhVystrahy />
        <UkazkaPruh />
        {/*
          Dialogy místo alert/confirm/prompt. Obaluje obsah, aby se na ně dalo
          sáhnout odkudkoli ze stránky.
        */}
        <DialogProvider>
          <main id="obsah" className="pt-3 pb-[calc(60px+env(safe-area-inset-bottom))] sm:pt-5 md:pb-0">{children}</main>
        </DialogProvider>
        {/* Partneři až za obsahem stránky, před patičkou (26. 9. 2026). */}
        <div className="mb-6 mt-2"><PartnerskyProstor umisteni="paticka" /></div>
        <Paticka />
        <PostranniPanel />
        <NavadeniZapojeni />
        <ListaMobil />
        <RegistraceSW />
        <Mereni />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: WEB.nazev,
              alternateName: WEB.podtitul,
              description: WEB.popis,
              inLanguage: "cs",
              url: WEB.url,
            }),
          }}
        />
      </body>
    </html>
  );
}
