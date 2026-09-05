import type { Metadata, Viewport } from "next";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import { ListaMobil } from "@/components/lista-mobil";
import { Navigace } from "@/components/navigace";
import { PostranniPanel } from "@/components/postranni-panel";
import { RegistraceSW } from "@/components/pwa";
import { Paticka } from "@/components/paticka";
import { UkazkaPruh } from "@/components/pruhy";
import { StavovaListaData } from "@/components/stavova-lista-data";
import { WEB } from "@/config/web";
import "./globals.css";

// Jediné písmo pro všechno psané. Tučné řezy nesou nadpisy, střední text.
const chakra = Chakra_Petch({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
});

// Neproporcionální písmo nesou popisky a čísla — dashboard se má číst
// jako přístroj, ne jako článek.
const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono-web",
  weight: ["400", "500"],
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
  themeColor: "#060a13",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${chakra.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#obsah"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-inkoust focus:px-3 focus:py-2 focus:text-[13px] focus:text-white"
        >
          Přeskočit na obsah
        </a>
        <Navigace />
        <StavovaListaData />
        <UkazkaPruh />
        <main id="obsah" className="pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
        <Paticka />
        <PostranniPanel />
        <ListaMobil />
        <RegistraceSW />
        {/*
          Parallax bez Reactu: obyčejný skript posouvá prvky s data-vrstva.
          Nepotřebuje hydrataci, takže funguje i ve statickém náhledu, a při
          zapnutém omezení pohybu se vůbec nespustí.
        */}
        <script
          data-parallax=""
          dangerouslySetInnerHTML={{
            __html: `(function(){
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var prvky = [].slice.call(document.querySelectorAll("[data-vrstva]"));
  if (!prvky.length) return;
  var ceka = 0;
  function uprav(){
    ceka = 0;
    var stred = window.innerHeight / 2;
    for (var i = 0; i < prvky.length; i++) {
      var el = prvky[i];
      var r = el.getBoundingClientRect();
      var odchylka = r.top + r.height / 2 - stred;
      var rychlost = parseFloat(el.getAttribute("data-vrstva")) || 0;
      el.style.setProperty("--posun", (-odchylka * rychlost).toFixed(1) + "px");
    }
  }
  function naplanuj(){ if (!ceka) ceka = requestAnimationFrame(uprav); }
  uprav();
  addEventListener("scroll", naplanuj, { passive: true });
  addEventListener("resize", naplanuj);
})();`,
          }}
        />
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
