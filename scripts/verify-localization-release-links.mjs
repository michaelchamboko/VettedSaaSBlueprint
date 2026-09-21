import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const origin = "https://vettedsaasblueprint.online";
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  const page = await browser.newPage();
  for (const route of ["/", "/decision-hub/marketing-automation", "/solution-hub/marketing-automation", "/scenarios/marketing-automation", "/solution-hub/video-localization", "/scenarios/video-localization"]) {
    const response = await page.goto(origin + route, { waitUntil: "domcontentloaded" });
    const affiliateCount = route.includes("video-localization") ? await page.locator('a[href="https://try.elevenlabs.io/izj2b165mcsj"][rel="sponsored nofollow"]').count() : null;
    const discoveryCount = route === "/" ? await page.locator('a[href="/decision-hub/video-localization"]').count() : null;
    checks.push({ route, status: response.status(), affiliateCount, discoveryCount, passed: response.status() === 200 && (affiliateCount === null || affiliateCount > 0) && (discoveryCount === null || discoveryCount > 0) });
  }
  const sitemap = await page.request.get(origin + "/sitemap.xml");
  const xml = await sitemap.text();
  checks.push({ route: "/sitemap.xml", status: sitemap.status(), passed: sitemap.ok() && ["decision-hub", "solution-hub", "scenarios"].every((type) => xml.includes(`${origin}/${type}/video-localization`)) });
} finally { await browser.close(); }
console.log(JSON.stringify(checks, null, 2));
await writeFile(".automation/video-localization-2026-09-11-production/links.json", JSON.stringify({ checkedAt: new Date().toISOString(), checks }, null, 2));
if (checks.some((check) => !check.passed)) process.exitCode = 1;
