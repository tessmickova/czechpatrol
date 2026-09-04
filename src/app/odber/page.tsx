import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { OdberPanel } from "@/components/odber";

export const metadata: Metadata = {
  title: "Odběr",
  description: "Jak si nechat posílat upozornění na změny bezpečnostní situace — RSS a další kanály.",
};

export default function Odber() {
  return (
    <>
      <HlavickaStranky
        ikona="komunikace"
        stitek="Odběr"
        nadpis="Nechte si dát vědět, když se něco změní"
        popis="Ne u každé události. Jen tehdy, když se změní něco, kvůli čemu by člověk mohl jednat jinak."
      />
      <Obsah>
        <OdberPanel />
      </Obsah>
    </>
  );
}
