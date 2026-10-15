import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// The whole point is to be crawled, so every bot is welcome everywhere.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
