import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const origin = process.argv[2] || "http://localhost:3111";
const output = process.argv[3] || ".automation/video-localization-2026-09-11";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const routes = ["/decision-hub/video-localization", "/solution-hub/video-localization", "/scenarios/video-localization"];
const results = [];
try {
  for (const profile of [
    { name: "desktop", viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference", javaScriptEnabled: true },
    { name: "mobile", viewport: { width: 390, height: 844 }, reducedMotion: "no-preference", javaScriptEnabled: true },
    { name: "reduced", viewport: { width: 390, height: 844 }, reducedMotion: "reduce", javaScriptEnabled: true },
    { name: "no-js", viewport: { width: 390, height: 844 }, reducedMotion: "reduce", javaScriptEnabled: false },
  ]) {
    const context = await browser.newContext(profile);
    for (const [index, route] of routes.entries()) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(origin + route, { waitUntil: "networkidle", timeout: 60000 });
      await page.screenshot({ path: path.join(output, `${profile.name}-${index}-hero.png`) });
      const progress = [];
      for (const position of [0, 0.5, 1]) {
        await page.evaluate((fraction) => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * fraction, behavior: "instant" }), position);
        await page.waitForTimeout(900);
        progress.push(await page.locator("[data-localization-progress]").evaluate((element) => getComputedStyle(element).transform));
        if (position === 0.5) await page.screenshot({ path: path.join(output, `${profile.name}-${index}-middle.png`) });
      }
      const details = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        headings: document.querySelectorAll("h1").length,
        sections: document.querySelectorAll("[data-localization-section]").length,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
        brokenAnchors: [...document.querySelectorAll('[data-localization-root] a[href^="#"]')].map((link) => link.getAttribute("href").slice(1)).filter((id) => !document.getElementById(id)),
        invisibleSections: [...document.querySelectorAll("[data-localization-section]")].filter((element) => Number(getComputedStyle(element).opacity) < 0.99).length,
        words: document.querySelector("[data-localization-root]").textContent.trim().split(/\s+/).length,
      }));
      const motionExpected = profile.javaScriptEnabled && profile.reducedMotion === "no-preference";
      const motionPassed = motionExpected ? new Set(progress).size >= 2 : new Set(progress).size === 1;
      const passed = response.status() === 200 && !details.overflow && details.headings === 1 && details.sections === [12, 7, 12][index] && details.brokenAnchors.length === 0 && details.invisibleSections === 0 && errors.length === 0 && motionPassed && details.canonical?.endsWith(route);
      results.push({ route, profile: profile.name, status: response.status(), ...details, progress, motionPassed, errors, passed });
      await page.screenshot({ path: path.join(output, `${profile.name}-${index}-full.png`), fullPage: true });
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(path.join(output, "verification.json"), JSON.stringify({ origin, verifiedAt: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify(results, null, 2));
if (results.some((result) => !result.passed)) process.exitCode = 1;
