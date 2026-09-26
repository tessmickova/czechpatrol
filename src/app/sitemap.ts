import type { MetadataRoute } from "next";
import { WEB } from "@/config/web";
import { incidenty } from "@/lib/data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const stranky = ["", "/udalosti", "/vyvoj", "/svet", "/muj-prehled", "/metodika", "/zdroje", "/o-projektu", "/podporit", "/odber", "/izs", "/soukromi", "/podminky"];
  return [
    ...stranky.map((s) => ({
      url: `${WEB.url}${s}/`,
      lastModified: new Date(),
      changeFrequency: (s === "" ? "hourly" : "daily") as "hourly" | "daily",
      priority: s === "" ? 1 : 0.7,
    })),
    ...incidenty().filter((i) => i.slug !== "nenalezeno").map((i) => ({
      url: `${WEB.url}/incident/${i.slug}/`,
      lastModified: new Date(i.aktualizovano),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
