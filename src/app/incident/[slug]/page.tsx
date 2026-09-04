import type { Metadata } from "next";
import { DetailIncidentu } from "@/components/detail-incidentu";
import { incident, incidenty } from "@/lib/data";

export const dynamicParams = false;

/** Zástupný slug pro případ, kdy zatím není zveřejněná žádná událost. */
const ZADNA = "nenalezeno";

export async function generateStaticParams() {
  // Statický export vyžaduje aspoň jednu cestu. Dokud nejsou zveřejněné žádné
  // události, vygeneruje se jediná stránka, která to slušně vysvětlí.
  const vse = incidenty();
  return vse.length ? vse.map((i) => ({ slug: i.slug })) : [{ slug: ZADNA }];
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const i = incident(slug);
  if (!i) return { title: "Událost nenalezena", robots: { index: false, follow: false } };
  return {
    title: i.titulek,
    description: i.vyznam.slice(0, 180),
    openGraph: { title: i.titulek, description: i.vyznam.slice(0, 180), type: "article" },
  };
}

export default async function Stranka({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DetailIncidentu slug={slug} />;
}
