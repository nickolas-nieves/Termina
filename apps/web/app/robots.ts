import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.PUBLIC_SITE_URL ?? "https://termina-icons.netlify.app";
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
