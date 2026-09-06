import type { Metadata } from "next";
import { Presmerovani } from "@/components/presmerovani";

export const metadata: Metadata = { title: "Nepotvrzené a vyvrácené záznamy jsou v Událostech", robots: { index: false, follow: true } };

export default function Stranka() {
  return <Presmerovani kam="/udalosti/?overeni=neprosle" co="Nepotvrzené a vyvrácené záznamy jsou v Událostech" />;
}
