import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4317";
const outputRoot = process.argv[3] ?? path.join(process.cwd(), ".automation", "decision-canary");
const slug = "governed-ai-client-work-preparation";
const routes = ["/", `/decision-hub/${slug}`, `/solution-hub/${slug}`, `/scenarios/${slug}`];
const expectedSections = { [`/decision-hub/${slug}`]: 12, [`/solution-hub/${slug}`]: 7, [`/scenarios/${slug}`]: 12 };
const profiles = [
  { name: "desktop", viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference", javaScriptEnabled: true },
  { name: "mobile-reduced", viewport: { width: 390, height: 844 }, reducedMotion: "reduce", javaScriptEnabled: true },
  { name: "mobile-no-js", viewport: { width: 390, height: 844 }, reducedMotion: "reduce", javaScriptEnabled: false },
];

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failed = false;
try {
  for (const profile of profiles) {
    const context = await browser.newContext(profile);
    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => consoleErrors.push(error.message));
      const response = await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "networkidle" });
      const routeName = route === "/" ? "home" : route.split("/")[1];
      const screenshotBase = `${profile.name}-${routeName}`;
      await page.screenshot({ path: path.join(outputRoot, `${screenshotBase}-first-screen.png`) });
      await page.screenshot({ path: path.join(outputRoot, `${screenshotBase}-full-page.png`), fullPage: true });
      const sectionCount = await page.locator(".decision-journey__block").count();
      const evidenceCount = await page.locator("[data-evidence-state]").count();
      const compositionLocator = page.locator("[data-composition-family]");
      const composition = await compositionLocator.count() > 0 ? await compositionLocator.first().getAttribute("data-composition-family") : null;
      const h1Count = await page.locator("h1").count();
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      const expected = expectedSections[route];
      const pass = response?.ok() === true && consoleErrors.length === 0 && h1Count === 1 && !horizontalOverflow && (expected === undefined || (sectionCount === expected && evidenceCount >= expected && Boolean(composition)));
      failed ||= !pass;
      results.push({ route, profile: profile.name, status: response?.status() ?? null, sectionCount, expectedSections: expected ?? null, evidenceCount, composition, h1Count, horizontalOverflow, consoleErrors, pass });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const receipt = { version: "ProductionQualityReceiptV2", state: failed ? "failed" : "completed", completedAt: new Date().toISOString(), baseUrl, screenshots: routes.length * profiles.length * 2, results };
await writeFile(path.join(outputRoot, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
if (failed) { console.error(JSON.stringify(receipt, null, 2)); process.exit(1); }
console.log(JSON.stringify(receipt, null, 2));
