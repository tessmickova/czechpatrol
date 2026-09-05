"use client";

import { useEffect, useState } from "react";
import { Ikona } from "./ikony";

/**
 * Registrace service workeru. Jen na https a jen v ostrém provozu —
 * v náhledu a při vývoji by mezipaměť jen mátla.
 */
export function RegistraceSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:") return;
    if (document.documentElement.dataset.nahled === "1") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* bez service workeru web funguje stejně, jen ne offline */
    });
  }, []);
  return null;
}

interface UdalostInstalace extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Tlačítko „Přidat na plochu“.
 *
 * Chrome a Edge dají událost, kterou jde vyvolat instalaci. Safari na iOS
 * ji nedá — tam se ukáže návod. Když už aplikace běží nainstalovaná,
 * neukáže se nic.
 */
export function TlacitkoInstalace({ cele = false }: { cele?: boolean }) {
  const [udalost, setUdalost] = useState<UdalostInstalace | null>(null);
  const [ios, setIos] = useState(false);
  const [nainstalovano, setNainstalovano] = useState(false);

  useEffect(() => {
    const bezi =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setNainstalovano(bezi);
    const jeIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
    setIos(jeIos);
    const zachyt = (e: Event) => {
      e.preventDefault();
      setUdalost(e as UdalostInstalace);
    };
    window.addEventListener("beforeinstallprompt", zachyt);
    window.addEventListener("appinstalled", () => setNainstalovano(true));
    return () => window.removeEventListener("beforeinstallprompt", zachyt);
  }, []);

  if (nainstalovano) {
    return (
      <p className="flex items-center gap-2 text-[14px] text-tlum">
        <span className="text-[#8ff0c0]"><Ikona nazev="fajfka" velikost={14} tah={2} /></span>
        Běží jako aplikace.
      </p>
    );
  }

  if (udalost) {
    return (
      <button
        type="button"
        onClick={async () => {
          await udalost.prompt();
          const { outcome } = await udalost.userChoice;
          if (outcome === "accepted") setUdalost(null);
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-akcent/60 bg-akcent/15 px-4 py-2.5 text-[14px] font-bold uppercase tracking-[0.05em] text-akcent-svetla shadow-[0_0_18px_-4px_rgb(56_232_255/0.6)] transition-all hover:bg-akcent/25 ${cele ? "w-full" : ""}`}
      >
        <Ikona nazev="instalace" velikost={16} tah={1.9} />
        Přidat na plochu
      </button>
    );
  }

  if (ios) {
    return (
      <p className="text-[14px] leading-relaxed text-tlum">
        Na iPhonu: <b className="font-semibold text-inkoust">Sdílet</b> →{" "}
        <b className="font-semibold text-inkoust">Přidat na plochu</b>. Aplikace se pak otevírá
        bez prohlížeče.
      </p>
    );
  }

  return (
    <p className="text-[14px] leading-relaxed text-tlum">
      V nabídce prohlížeče zvolte <b className="font-semibold text-inkoust">Nainstalovat aplikaci</b>{" "}
      nebo <b className="font-semibold text-inkoust">Přidat na plochu</b>.
    </p>
  );
}
