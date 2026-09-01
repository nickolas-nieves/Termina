import type { MetadataRoute } from "next";
import { publishedAt, publishedIcons } from "@/lib/published";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.PUBLIC_SITE_URL ?? "https://termina-icons.netlify.app";
  const lastModified = publishedAt ? new Date(publishedAt) : new Date();

  return [
    { url: site, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/editor`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    ...publishedIcons.map((icon) => ({
      url: `${site}/icons/${icon.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
