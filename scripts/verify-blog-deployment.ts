import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { listPublishedBlogPosts } from "../src/lib/blog/catalogue";

function argument(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function requireText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function loadLazyImages(page: import("playwright").Page) {
  const images = page.locator("img");
  for (let index = 0; index < await images.count(); index += 1) {
    await images.nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(40);
  }
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), undefined, { timeout: 10_000 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
}

async function main() {
  const origin = new URL(argument(process.argv.slice(2), "--origin") ?? "http://127.0.0.1:3417").origin;
  const canonicalOrigin = new URL(argument(process.argv.slice(2), "--canonical-origin") ?? origin).origin;
  const output = path.resolve(argument(process.argv.slice(2), "--screenshot-dir") ?? path.join(".stage2", "blog-verification"));
  const posts = listPublishedBlogPosts();
  const [homeHtml, blogHtml, rss, llms, sitemap, robots] = await Promise.all([
    requireText(`${origin}/`),
    requireText(`${origin}/blog`),
    requireText(`${origin}/blog/feed.xml`),
    requireText(`${origin}/llms.txt`),
    requireText(`${origin}/sitemap.xml`),
    requireText(`${origin}/robots.txt`),
  ]);

  if (!homeHtml.includes('href="/blog"')) throw new Error("The home page navigation is missing the Blog link.");
  if (!blogHtml.includes("Buy software with")) throw new Error("Blog index is missing its decision-led introduction.");
  if (!rss.includes("application/rss+xml") && !rss.includes("<rss")) throw new Error("RSS output is invalid.");
  if (!llms.includes("## Buyer guides")) throw new Error("llms.txt is missing the buyer guide index.");
  if (/^Disallow:\s*\/\s*$/im.test(robots)) throw new Error("robots.txt blocks the public site.");
  for (const post of posts) {
    if (!sitemap.includes(`${canonicalOrigin}${post.canonicalPath}`)) throw new Error(`Sitemap is missing ${post.canonicalPath}.`);
    if (!llms.includes(`${canonicalOrigin}${post.canonicalPath}`)) throw new Error(`llms.txt is missing ${post.canonicalPath}.`);
  }

  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }] as const) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "no-preference" });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("pageerror", (error) => errors.push(error.message));

      const indexResponse = await page.goto(`${origin}/blog`, { waitUntil: "networkidle", timeout: 30_000 });
      if (!indexResponse?.ok()) throw new Error(`Blog index failed at ${viewport.name}.`);
      await loadLazyImages(page);
      const indexCheck = await page.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        links: document.querySelectorAll('a[href^="/blog/"]').length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
        blogNav: Boolean(document.querySelector('nav a[href="/blog"]')),
      }));
      if (indexCheck.h1 !== 1 || indexCheck.links < 10 || indexCheck.overflow > 1 || indexCheck.brokenImages.length || !indexCheck.blogNav) {
        throw new Error(`Blog index failed ${viewport.name} checks: ${JSON.stringify(indexCheck)}`);
      }
      await page.screenshot({ path: path.join(output, `blog-index-${viewport.name}.png`), fullPage: true });

      for (const post of posts) {
        const response = await page.goto(`${origin}${post.canonicalPath}`, { waitUntil: "networkidle", timeout: 30_000 });
        if (!response?.ok()) throw new Error(`${post.canonicalPath} failed at ${viewport.name}.`);
        await loadLazyImages(page);
        const check = await page.evaluate(() => {
          const schemas = [...document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')]
            .map((script) => JSON.parse(script.textContent ?? "{}") as { "@type"?: string })
            .map((schema) => schema["@type"]);
          return {
            h1: document.querySelectorAll("h1").length,
            article: Boolean(document.querySelector("main article")),
            sources: document.querySelectorAll(".blog-sources li").length,
            faqs: document.querySelectorAll(".blog-faq details").length,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
            schemas,
          };
        });
        if (check.h1 !== 1 || !check.article || check.sources < 3 || check.faqs < 3 || check.overflow > 1 || check.brokenImages.length || !["Article", "FAQPage", "BreadcrumbList"].every((type) => check.schemas.includes(type))) {
          throw new Error(`${post.slug} failed ${viewport.name} checks: ${JSON.stringify(check)}`);
        }
        results.push({ slug: post.slug, viewport: viewport.name, ...check });
        if (post.cyclePosition === 1) await page.screenshot({ path: path.join(output, `${post.slug}-${viewport.name}.png`), fullPage: true });
      }
      if (errors.length) throw new Error(`${viewport.name} browser errors: ${errors.join("; ")}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({ ok: true, origin, routes: posts.length + 6, viewportChecks: results.length, screenshots: output }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
