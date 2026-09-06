import type { Metadata } from "next";
import { Presmerovani } from "@/components/presmerovani";

export const metadata: Metadata = { title: "Časová osa je teď v Událostech", robots: { index: false, follow: true } };

export default function Stranka() {
  return <Presmerovani kam="/udalosti/" co="Časová osa je teď v Událostech" />;
}
