import type { Metadata } from "next";
import { Presmerovani } from "@/components/presmerovani";

export const metadata: Metadata = { title: "Dnes je teď součástí Přehledu", robots: { index: false, follow: true } };

export default function Stranka() {
  return <Presmerovani kam="/" co="Dnes je teď součástí Přehledu" />;
}
