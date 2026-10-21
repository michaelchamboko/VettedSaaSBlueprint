import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { chromium } from "@playwright/test";

import { productionQualityReceiptV2Schema } from "../src/lib/automation/contracts";
import { decisionJourneyCatalog } from "../src/lib/decision-journey/catalogue";
import { decisionSetV2Schema, getDecisionSet, type DecisionJourneyRecordV2 } from "../src/lib/decision-journey/sets";
import { readImportArtifactTarget } from "../src/lib/article-import/format-validation";
import { verificationContext, writeImportVerifierEvidence } from "../src/lib/article-import/verification-evidence";

const defaultOrigin = "https://vettedsaasblueprint.online";
let targets: Record<string, (typeof decisionJourneyCatalog)[string] | DecisionJourneyRecordV2> = decisionJourneyCatalog;

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

/** Console errors and uncaught page exceptions stay separate so a silent page exception can never pass as clean. */
export function browserErrorChecksFor(input: { route: string; profile: string; consoleErrors: readonly string[]; pageErrors: readonly string[] }): Check[] {
  return [
    { name: `${input.route}: ${input.profile} console errors`, passed: input.consoleErrors.length === 0, detail: input.consoleErrors.length ? input.consoleErrors.join(" | ") : "No browser console errors.", category: "motion" },
    { name: `${input.route}: ${input.profile} uncaught page errors`, passed: input.pageErrors.length === 0, detail: input.pageErrors.length ? input.pageErrors.join(" | ") : "No uncaught page exceptions.", category: "motion" },
  ];
}

export function browserErrorsOkFrom(checks: readonly { name: string; passed: boolean }[]): boolean {
  const relevant = checks.filter((check) => check.name.endsWith(" console errors") || check.name.endsWith(" uncaught page errors"));
  return relevant.length > 0 && relevant.every((check) => check.passed === true);
}

async function checkHtml(origin: string, route: keyof typeof decisionJourneyCatalog, canonicalOrigin: string): Promise<Check[]> {
  const record = targets[route];
  const url = `${origin}${route}`;
  try {
    const response = await fetch(url, { redirect: "error" });
    const html = await response.text();
    return [
      { name: `${route}: availability`, passed: response.ok, detail: `HTTP ${response.status}.`, category: "production" },
      { name: `${route}: canonical and principal answer`, passed: html.includes(record.headline) && html.includes(`<link rel="canonical" href="${canonicalOrigin}${route}"`), detail: "The static HTML exposes the route-specific principal answer and canonical URL.", category: "content" },
      { name: `${route}: required decision structure`, passed: record.blocks.every((block) => html.includes(`id="${block.id}"`)), detail: "Every required decision section is present in the server-rendered document.", category: "content" },
      { name: `${route}: evidence traceability`, passed: record.blocks.every((block) => block.claims.every((claim) => claim.sources.every((source) => html.includes(source.sectionUid)))), detail: "Every material claim exposes its stable source identifier.", category: "evidence" },
      { name: `${route}: catalogue composition`, passed: html.includes("data-catalogue-reference=") && html.includes(`data-journey-kind="${record.pageType}"`), detail: "The rendered page declares its approved catalogue-backed composition.", category: "visual" },
      { name: `${route}: motion contract`, passed: html.includes("data-journey-motion=\"hero\"") && html.includes("data-journey-motion=\"hero-card\"") && html.includes("data-journey-motion=\"progress\""), detail: "The static document contains the progressive-enhancement motion anchors.", category: "motion" },
    ];
  } catch (error) {
    return [{ name: `${route}: availability`, passed: false, detail: error instanceof Error ? error.message : String(error), category: "production" }];
  }
}

export async function captureRoute(input: { origin: string; route: keyof typeof decisionJourneyCatalog; output: string }): Promise<{ checks: Check[]; screenshots: Screenshot[] }> {
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
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => pageErrors.push(error.message));
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
        { name: `${input.route}: ${profile.name} principal content`, passed: primary === targets[input.route].headline, detail: "The route-specific headline remains available in the rendered page.", category: "accessibility" },
        { name: `${input.route}: ${profile.name} complete structure`, passed: sectionCount === targets[input.route].blocks.length, detail: "Rendered section count matches the structured catalogue.", category: "content" },
        { name: `${input.route}: ${profile.name} layout`, passed: !overflow, detail: overflow ? "Horizontal overflow detected." : "No horizontal overflow detected.", category: "visual" },
        ...browserErrorChecksFor({ route: input.route, profile: profile.name, consoleErrors, pageErrors }),
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return { checks, screenshots };
}

async function main() {
  const context = verificationContext({ mode: argument("--mode"), origin: argument("--origin") ?? defaultOrigin, canonicalOrigin: argument("--canonical-origin"), expectedCommit: argument("--expected-sha") });
  const { origin, canonicalOrigin } = context;
  const artifactPath = argument("--artifact");
  const approved = artifactPath ? await readImportArtifactTarget(process.cwd(), "decision-set", artifactPath, argument("--slug")) : undefined;
  const slug = approved?.target.slug ?? argument("--slug");
  if (slug) {
    const set = getDecisionSet(slug);
    if (!set) throw new Error(`Unknown decision set: ${slug}`);
    if (approved && JSON.stringify(set) !== JSON.stringify(decisionSetV2Schema.parse(approved.artifact))) throw new Error("DECISION_PUBLISHED_ARTIFACT_MISMATCH");
    targets = Object.fromEntries(Object.values(set.pages).map((page) => [page.canonicalPath, page]));
  }
  const [robots, sitemap] = await Promise.all(["robots.txt", "sitemap.xml"].map(async (file) => {
    const response = await fetch(`${origin}/${file}`);
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return response.text();
  }));
  const robotsOk = !/^Disallow:\s*\/\s*$/im.test(robots);
  const sitemapOk = Object.keys(targets).every((route) => sitemap.includes(`${canonicalOrigin}${route}`));
  const output = path.resolve(argument("--screenshot-dir") ?? path.join(".automation", "receipts", "production-quality"));
  await mkdir(output, { recursive: true });
  const htmlChecks = await Promise.all(Object.keys(targets).map((route) => checkHtml(origin, route, canonicalOrigin)));
  const browserChecks = await Promise.all(Object.keys(targets).map((route) => captureRoute({ origin, route, output })));
  const checks = [...htmlChecks.flat(), ...browserChecks.flatMap((result) => result.checks)];
  const receipt = productionQualityReceiptV2Schema.parse({
    version: 2,
    runId: argument("--run-id") ?? randomUUID(),
    passed: robotsOk && sitemapOk && checks.every((check) => check.passed),
    checks,
    screenshots: browserChecks.flatMap((result) => result.screenshots),
    createdAt: new Date().toISOString(),
  });
  const result = { ...receipt, ...context, robots_ok: robotsOk, sitemap_ok: sitemapOk, browser_errors_ok: browserErrorsOkFrom(checks) };
  await writeImportVerifierEvidence(argument("--receipt"), approved?.target, result);
  console.log(JSON.stringify({ ...result, target: approved?.target }, null, 2));
  if (!receipt.passed) process.exitCode = 1;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/verify-decision-journey-production.ts")) void main();
