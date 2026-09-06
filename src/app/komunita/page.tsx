import type { Metadata } from "next";
import { Presmerovani } from "@/components/presmerovani";

export const metadata: Metadata = { title: "Komunita je součástí stránky O projektu", robots: { index: false, follow: true } };

export default function Stranka() {
  return <Presmerovani kam="/o-projektu/" co="Komunita je součástí stránky O projektu" />;
}
