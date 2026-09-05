import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { UcetKlient } from "@/components/ucet-klient";

export const metadata: Metadata = {
  title: "Účet a upozornění",
  description: "Anonymní účet s passkey. Nastavení, co a kdy vám má přijít na Telegram nebo WhatsApp.",
  robots: { index: false },
};

export default function UcetStranka() {
  return (
    <>
      <HlavickaStranky
        stitek="Účet"
        ikona="uzivatel"
        nadpis="Váš účet a upozornění"
        popis="Bez jména, e-mailu i telefonu. Přihlášení passkey. Nastavíte si, co a kdy vám má přijít — a všechno jde kdykoli smazat."
      />
      <Obsah>
        <UcetKlient />
      </Obsah>
    </>
  );
}
