import { listPublishedBlogPosts } from "@/lib/blog/catalogue";
import { loadPublicSiteConfig } from "@/lib/site/public-site";

export const dynamic = "force-static";

function xml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function GET() {
  const config = loadPublicSiteConfig();
  const posts = listPublishedBlogPosts().toReversed();
  const items = posts.map((post) => `
    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(new URL(post.canonicalPath, config.canonicalOrigin).toString())}</link>
      <guid isPermaLink="true">${xml(new URL(post.canonicalPath, config.canonicalOrigin).toString())}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <description>${xml(post.description)}</description>
    </item>`).join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>VettedSaaSBlueprint field notes</title>
  <link>${xml(new URL("/blog", config.canonicalOrigin).toString())}</link>
  <description>Evidence-led software buying guides.</description>${items}
</channel></rss>`;

  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
