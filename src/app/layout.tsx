import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Navigace } from "@/components/navigace";
import { Paticka } from "@/components/paticka";
import { BetaPruh, UkazkaPruh } from "@/components/pruhy";
import { WEB } from "@/config/web";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
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
  themeColor: "#fbfbfa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={inter.variable}>
      <body className="min-h-dvh">
        <a
          href="#obsah"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-inkoust focus:px-3 focus:py-2 focus:text-[13px] focus:text-white"
        >
          Přeskočit na obsah
        </a>
        <Navigace />
        <BetaPruh />
        <UkazkaPruh />
        <main id="obsah">{children}</main>
        <Paticka />
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
