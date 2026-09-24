import type { MetadataRoute } from "next";
import { WEB } from "@/config/web";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/sprava/", "/muj-prehled/", "/api/", "/opravy/"] },
    sitemap: `${WEB.url}/sitemap.xml`,
  };
}
