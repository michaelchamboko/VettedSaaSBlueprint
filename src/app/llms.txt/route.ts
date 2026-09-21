import { listPublishedBlogPosts } from "@/lib/blog/catalogue";
import { loadPublicSiteConfig } from "@/lib/site/public-site";

export const dynamic = "force-static";

export function GET() {
  const config = loadPublicSiteConfig();
  const articles = listPublishedBlogPosts().map((post) => `- [${post.title}](${new URL(post.canonicalPath, config.canonicalOrigin)}): ${post.description}`).join("\n");
  const body = `# VettedSaaSBlueprint

> Independent, evidence-led software reviews and practical buyer field guides.

## Buyer guides

${articles}

## Trust and methodology

- [Editorial policy](${new URL("/editorial-policy", config.canonicalOrigin)})
- [Affiliate disclosure](${new URL("/affiliate-disclosure", config.canonicalOrigin)})
- [Privacy](${new URL("/privacy", config.canonicalOrigin)})
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
