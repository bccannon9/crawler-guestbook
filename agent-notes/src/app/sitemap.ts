import type { MetadataRoute } from "next";
import { BOTS } from "@/lib/bots";
import { LETTERS } from "@/lib/letters";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "always", priority: 1 },
    { url: `${siteUrl}/board`, changeFrequency: "always", priority: 0.9 },
    { url: `${siteUrl}/llms.txt`, priority: 0.9 },
    { url: `${siteUrl}/privacy`, priority: 0.2 },
    { url: `${siteUrl}/letters`, priority: 0.8 },
    ...LETTERS.map((l) => ({ url: `${siteUrl}/letters/${l.slug}`, priority: 0.8 })),
    { url: `${siteUrl}/bots`, changeFrequency: "daily" as const, priority: 0.6 },
    ...BOTS.map((b) => ({ url: `${siteUrl}/bots/${b.id}`, priority: 0.4 })),
  ];
}
