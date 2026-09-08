import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/urls";

export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The console and the write endpoints are not content.
        disallow: ["/admin", "/admin/", "/api/auth/", "/api/admin/"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
