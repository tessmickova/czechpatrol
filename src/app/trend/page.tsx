import type { Metadata } from "next";
import { Presmerovani } from "@/components/presmerovani";

export const metadata: Metadata = { title: "Trend najdete na stránce Vývoj", robots: { index: false, follow: true } };

export default function Stranka() {
  return <Presmerovani kam="/vyvoj/" co="Trend najdete na stránce Vývoj" />;
}
