import type { Metadata } from "next";
import { Presmerovani } from "@/components/presmerovani";

export const metadata: Metadata = { title: "Stav NATO je v Přehledu pod Oficiálními opatřeními", robots: { index: false, follow: true } };

export default function Stranka() {
  return <Presmerovani kam="/#opatreni" co="Stav NATO je v Přehledu pod Oficiálními opatřeními" />;
}
