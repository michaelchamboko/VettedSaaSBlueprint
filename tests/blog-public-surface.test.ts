import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(file, "utf8");

test("the public shell exposes Blog in primary and footer navigation", () => {
  const header = read("src/components/public/PublicHeader.tsx");
  const footer = read("src/components/public/PublicFooter.tsx");

  assert.match(header, /href="\/blog"[^>]*>Blog</);
  assert.match(footer, /\["Blog", "\/blog"\]/);
});

test("blog routes provide metadata, article schema, FAQs, and static params", () => {
  const index = read("src/app/blog/page.tsx");
  const article = read("src/app/blog/[slug]/page.tsx");
  const structuredData = read("src/lib/blog/structured-data.ts");

  assert.match(index, /alternates:\s*\{\s*canonical:\s*"\/blog"/);
  assert.match(article, /generateStaticParams/);
  assert.match(article, /generateMetadata/);
  assert.match(article, /Article/);
  assert.match(structuredData, /FAQPage/);
  assert.match(structuredData, /BreadcrumbList/);
  assert.doesNotMatch(index, /title:.*VettedSaaSBlueprint/);
  assert.doesNotMatch(article, /title:.*VettedSaaSBlueprint/);
});

test("blog discovery is included in sitemap, RSS, robots, and llms.txt", () => {
  const sitemap = read("src/app/sitemap.ts");
  const rss = read("src/app/blog/feed.xml/route.ts");
  const llms = read("src/app/llms.txt/route.ts");

  assert.match(sitemap, /listPublishedBlogPosts/);
  assert.match(rss, /application\/rss\+xml/);
  assert.match(llms, /listPublishedBlogPosts/);
});
