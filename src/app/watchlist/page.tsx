import type { Metadata } from "next";
import { Presmerovani } from "@/components/presmerovani";

export const metadata: Metadata = { title: "Spouštěče eskalace jsou na Přehledu a ve Vývoji", robots: { index: false, follow: true } };

export default function Stranka() {
  return <Presmerovani kam="/vyvoj/" co="Spouštěče eskalace jsou na Přehledu a ve Vývoji" />;
}
