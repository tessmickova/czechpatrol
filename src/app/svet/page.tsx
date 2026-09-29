import type { Metadata } from "next";
import { Presmerovani } from "@/components/presmerovani";

/*
  Stránka „Aktéři a cíle“ zrušena 30. 9. 2026 na přání provozovatelky:
  vlastní hodnocení cílů mocností a jejich postupu bylo zbytečně
  konfliktní a pro čtenáře v Česku nic neřešilo. Stará adresa vede na Analýzy.
*/
export const metadata: Metadata = { title: "Analýzy", robots: { index: false, follow: true } };

export default function Stranka() {
  return <Presmerovani kam="/analyzy/" co="Analýzy" />;
}
