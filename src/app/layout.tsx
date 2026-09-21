import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { ListaMobil } from "@/components/lista-mobil";
import { Navigace } from "@/components/navigace";
import { DialogProvider } from "@/components/dialog";
import { PostranniPanel } from "@/components/postranni-panel";
import { RegistraceSW } from "@/components/pwa";
import { Paticka } from "@/components/paticka";
import { PruhPuvodu, UkazkaPruh } from "@/components/pruhy";
import { StavKontrolyVedle } from "@/components/banner-stari-klient";
import { posledniKontrola } from "@/lib/data";
import { PruhVystrahy } from "@/components/vystraha";
import { Znacka } from "@/components/znacka";
import { SKRIPT_POHYBU } from "@/components/pohyb";
import { WEB } from "@/config/web";
import "./globals.css";

// Písmo značky. Archivo nese nadpisy, tlačítka i běžný text.
// next/font stahuje písmo při sestavení a servíruje z naší domény —
// návštěvník tím nechodí na server třetí strany.
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

// Neproporcionální písmo nesou popisky, čísla a časy — přehled se má číst
// jako přístroj, ne jako článek.
const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono-web",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
    <html lang="cs" className={`${archivo.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Volba pohybu se nastaví před vykreslením, ať nic neproblikne. */}
        <script dangerouslySetInnerHTML={{ __html: SKRIPT_POHYBU }} />
      </head>
      <body className="min-h-dvh">
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
        <PruhPuvodu vpravo={<StavKontrolyVedle zkontrolovano={posledniKontrola()} ted={Date.now()} />} />
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
          <main id="obsah" className="pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
        </DialogProvider>
        <Paticka />
        <PostranniPanel />
        <ListaMobil />
        <RegistraceSW />
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
