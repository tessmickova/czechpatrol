import type { Metadata } from "next";
import { Presmerovani } from "@/components/presmerovani";

export const metadata: Metadata = { title: "Hybridní tlak je součástí Vývoje", robots: { index: false, follow: true } };

export default function Stranka() {
  return <Presmerovani kam="/vyvoj/" co="Hybridní tlak je součástí Vývoje" />;
}
