import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { chromium } from "@playwright/test";

import { productionQualityReceiptV2Schema } from "../src/lib/automation/contracts";
import { decisionJourneyCatalog } from "../src/lib/decision-journey/catalogue";

const defaultOrigin = "https://vettedsaasblueprint.online";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

type Check = {
  name: string;
  passed: boolean;
  detail: string;
  category: "production" | "content" | "evidence" | "visual" | "motion" | "accessibility";
};

type Screenshot = { route: string; viewport: string; mode: string; path: string };

async function checkHtml(origin: string, route: keyof typeof decisionJourneyCatalog): Promise<Check[]> {
  const record = decisionJourneyCatalog[route];
  const url = `${origin}${route}`;
  try {
    const response = await fetch(url, { redirect: "error" });
    const html = await response.text();
    return [
      { name: `${route}: availability`, passed: response.ok, detail: `HTTP ${response.status}.`, category: "production" },
      { name: `${route}: canonical and principal answer`, passed: html.includes(record.headline) && html.includes(`<link rel="canonical" href="${url}"`), detail: "The static HTML exposes the route-specific principal answer and canonical URL.", category: "content" },
      { name: `${route}: required decision structure`, passed: record.blocks.every((block) => html.includes(`id="${block.id}"`)), detail: "Every required decision section is present in the server-rendered document.", category: "content" },
      { name: `${route}: evidence traceability`, passed: record.blocks.every((block) => block.claims.every((claim) => claim.sources.every((source) => html.includes(source.sectionUid)))), detail: "Every material claim exposes its stable source identifier.", category: "evidence" },
      { name: `${route}: catalogue composition`, passed: html.includes("data-catalogue-reference=") && html.includes(`data-journey-kind="${record.pageType}"`), detail: "The rendered page declares its approved catalogue-backed composition.", category: "visual" },
      { name: `${route}: motion contract`, passed: html.includes("data-journey-motion=\"hero\"") && html.includes("data-journey-motion=\"hero-card\"") && html.includes("data-journey-motion=\"progress\""), detail: "The static document contains the progressive-enhancement motion anchors.", category: "motion" },
    ];
  } catch (error) {
    return [{ name: `${route}: availability`, passed: false, detail: error instanceof Error ? error.message : String(error), category: "production" }];
  }
}

async function captureRoute(input: { origin: string; route: keyof typeof decisionJourneyCatalog; output: string }): Promise<{ checks: Check[]; screenshots: Screenshot[] }> {
  const browser = await chromium.launch({ headless: true });
  const url = `${input.origin}${input.route}`;
  const checks: Check[] = [];
  const screenshots: Screenshot[] = [];
  try {
    for (const profile of [
      { viewport: { width: 1440, height: 900 }, name: "desktop", reducedMotion: "no-preference" as const, javaScriptEnabled: true },
      { viewport: { width: 390, height: 844 }, name: "mobile-reduced-motion", reducedMotion: "reduce" as const, javaScriptEnabled: true },
      { viewport: { width: 390, height: 844 }, name: "mobile-no-javascript", reducedMotion: "reduce" as const, javaScriptEnabled: false },
    ]) {
      const context = await browser.newContext({ viewport: profile.viewport, reducedMotion: profile.reducedMotion, javaScriptEnabled: profile.javaScriptEnabled });
      const page = await context.newPage();
      const browserErrors: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
      await page.goto(url, { waitUntil: "networkidle" });
      const primary = await page.locator("h1").textContent();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const sectionCount = await page.locator(".decision-journey__block").count();
      const filePrefix = path.join(input.output, `${input.route.slice(1)}-${profile.name}`);
      const firstScreen = `${filePrefix}-first-screen.png`;
      const fullPage = `${filePrefix}-full-page.png`;
      await page.screenshot({ path: firstScreen });
      await page.screenshot({ path: fullPage, fullPage: true });
      screenshots.push(
        { route: input.route, viewport: `${profile.viewport.width}x${profile.viewport.height}`, mode: `${profile.name}: first-screen`, path: firstScreen },
        { route: input.route, viewport: `${profile.viewport.width}x${profile.viewport.height}`, mode: `${profile.name}: full-page`, path: fullPage },
      );
      checks.push(
        { name: `${input.route}: ${profile.name} principal content`, passed: primary === decisionJourneyCatalog[input.route].headline, detail: "The route-specific headline remains available in the rendered page.", category: "accessibility" },
        { name: `${input.route}: ${profile.name} complete structure`, passed: sectionCount === decisionJourneyCatalog[input.route].blocks.length, detail: "Rendered section count matches the structured catalogue.", category: "content" },
        { name: `${input.route}: ${profile.name} layout`, passed: !overflow, detail: overflow ? "Horizontal overflow detected." : "No horizontal overflow detected.", category: "visual" },
        { name: `${input.route}: ${profile.name} console`, passed: browserErrors.length === 0, detail: browserErrors.length ? browserErrors.join(" | ") : "No browser console errors.", category: "motion" },
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return { checks, screenshots };
}

async function main() {
  const origin = argument("--origin") ?? defaultOrigin;
  const output = path.resolve(argument("--screenshot-dir") ?? path.join(".automation", "receipts", "production-quality"));
  await mkdir(output, { recursive: true });
  const htmlChecks = await Promise.all(Object.keys(decisionJourneyCatalog).map((route) => checkHtml(origin, route as keyof typeof decisionJourneyCatalog)));
  const browserChecks = await Promise.all(Object.keys(decisionJourneyCatalog).map((route) => captureRoute({ origin, route: route as keyof typeof decisionJourneyCatalog, output })));
  const checks = [...htmlChecks.flat(), ...browserChecks.flatMap((result) => result.checks)];
  const receipt = productionQualityReceiptV2Schema.parse({
    version: 2,
    runId: argument("--run-id") ?? randomUUID(),
    passed: checks.every((check) => check.passed),
    checks,
    screenshots: browserChecks.flatMap((result) => result.screenshots),
    createdAt: new Date().toISOString(),
  });
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.passed) process.exitCode = 1;
}

void main();
