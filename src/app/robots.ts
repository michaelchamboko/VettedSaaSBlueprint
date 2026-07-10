import type { MetadataRoute } from "next";

import { loadPublicSiteConfig } from "@/lib/site/public-site";

export default function robots(): MetadataRoute.Robots {
  const { canonicalOrigin } = loadPublicSiteConfig();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: `${canonicalOrigin}/sitemap.xml`,
    host: canonicalOrigin,
  };
}
