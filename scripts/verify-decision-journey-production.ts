import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";

import { chromium } from "@playwright/test";

import { productionQualityReceiptV2Schema } from "../src/lib/automation/contracts";
import { decisionJourneyCatalog } from "../src/lib/decision-journey/catalogue";
import { listDecisionSets } from "../src/lib/decision-journey/sets";

const defaultOrigin = "https://vettedsaasblueprint.online";
const stepWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

export function headlineStepCountMatches(headline: string, stepCount: number): boolean {
  const match = headline.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)-step\b/i);
  if (!match) return true;
  const declared = /^\d+$/.test(match[1]) ? Number(match[1]) : stepWords[match[1].toLowerCase()];
  return declared === stepCount;
}

export type DeploymentIdentity = { commitSha: string | null; environment: string | null };

export function deploymentIdentityMatches(identity: DeploymentIdentity, revision: string): { passed: boolean; detail: string } {
  if (!identity.commitSha || !identity.environment) {
    return { passed: false, detail: "Deployment metadata endpoint returned no commit SHA or environment; refusing unverified identity." };
  }
  if (identity.commitSha.toLowerCase() !== revision.toLowerCase()) {
    return { passed: false, detail: `Deployed commit ${identity.commitSha} does not match the verified revision ${revision}; refusing stale or mismatched deployment.` };
  }
  if (identity.environment !== "production") {
    return { passed: false, detail: `Deployment environment is ${identity.environment}, not production; refusing non-production identity.` };
  }
  return { passed: true, detail: `Deployment identity verified: commit ${identity.commitSha} on ${identity.environment}.` };
}

export function expectedProductionRoutes(): string[] {
  const pilotRoutes = Object.keys(decisionJourneyCatalog);
  const setRoutes = listDecisionSets().flatMap((set) => [
    `/decision-hub/${set.slug}`,
    `/solution-hub/${set.slug}`,
    `/scenarios/${set.slug}`,
  ]);
  return ["/", ...pilotRoutes, ...setRoutes];
}

async function fetchDeploymentIdentity(origin: string): Promise<DeploymentIdentity> {
  const response = await fetch(`${origin}/api/deployment`, { cache: "no-store" });
  if (!response.ok) return { commitSha: null, environment: null };
  const body = (await response.json()) as { commitSha?: string | null; environment?: string | null };
  return { commitSha: body.commitSha ?? null, environment: body.environment ?? null };
}

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

async function checkSetRoute(origin: string, route: string, record: { headline: string; canonicalPath: string; blocks: Array<{ id: string; claims: Array<{ sources: Array<{ sectionUid: string }> }> }> }): Promise<Check[]> {
  const url = `${origin}${route}`;
  try {
    const response = await fetch(url, { redirect: "error" });
    const html = await response.text();
    return [
      { name: `${route}: availability`, passed: response.ok, detail: `HTTP ${response.status}.`, category: "production" },
      { name: `${route}: canonical and principal answer`, passed: html.includes(record.headline) && html.includes(`<link rel="canonical" href="${url}"`), detail: "The set page exposes its structured headline and canonical URL.", category: "content" },
      { name: `${route}: required decision structure`, passed: record.blocks.every((block) => html.includes(`id="${block.id}"`)), detail: "Every required set section is present in the server-rendered document.", category: "content" },
      { name: `${route}: evidence traceability`, passed: record.blocks.every((block) => block.claims.every((claim) => claim.sources.every((source) => html.includes(source.sectionUid)))), detail: "Every material set claim exposes its stable source identifier.", category: "evidence" },
      { name: `${route}: headline step count`, passed: headlineStepCountMatches(record.headline, record.blocks.length), detail: `Any declared step count matches the ${record.blocks.length} structured sections.`, category: "content" },
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
  const revision = argument("--revision") ?? process.env.VERCEL_GIT_COMMIT_SHA;
  if (!revision || !/^[a-f0-9]{40}$/i.test(revision)) {
    throw new Error("Pass --revision <40-character git commit SHA> (or set VERCEL_GIT_COMMIT_SHA) to bind this receipt to the verified code revision.");
  }
  const output = path.resolve(argument("--screenshot-dir") ?? path.join(".automation", "receipts", "production-quality"));
  await mkdir(output, { recursive: true });

  // Verify deployment identity BEFORE browser checks: the metadata endpoint must
  // report the exact release commit on the production environment.
  const identityBefore = await fetchDeploymentIdentity(origin);
  const identityCheckBefore: Check = {
    name: "deployment identity (pre-browser)",
    passed: deploymentIdentityMatches(identityBefore, revision).passed,
    detail: deploymentIdentityMatches(identityBefore, revision).detail,
    category: "production",
  };

  const routes = expectedProductionRoutes();
  const htmlChecks = await Promise.all(Object.keys(decisionJourneyCatalog).map((route) => checkHtml(origin, route as keyof typeof decisionJourneyCatalog)));
  const setChecks = await Promise.all(listDecisionSets().flatMap((set) => [
    { route: `/decision-hub/${set.slug}`, record: set.pages.decisionHub },
    { route: `/solution-hub/${set.slug}`, record: set.pages.solutionHub },
    { route: `/scenarios/${set.slug}`, record: set.pages.scenario },
  ]).map(({ route, record }) => checkSetRoute(origin, route, record)));
  const browserChecks = await Promise.all(Object.keys(decisionJourneyCatalog).map((route) => captureRoute({ origin, route: route as keyof typeof decisionJourneyCatalog, output })));
  const routeAvailabilityChecks: Check[] = await Promise.all(routes.map(async (route) => {
    try {
      const response = await fetch(`${origin}${route}`, { redirect: "error" });
      return { name: `${route}: route availability`, passed: response.ok, detail: `HTTP ${response.status}.`, category: "production" };
    } catch (error) {
      return { name: `${route}: route availability`, passed: false, detail: error instanceof Error ? error.message : String(error), category: "production" };
    }
  }));
  const semanticChecks: Check[] = Object.entries(decisionJourneyCatalog).map(([route, record]) => {
    const matches = headlineStepCountMatches(record.headline, record.blocks.length);
    return {
      name: `${route}: headline step count`,
      passed: matches,
      detail: matches ? `Any declared step count matches the ${record.blocks.length} catalogue sections.` : `Headline declares a different number of steps than the ${record.blocks.length} catalogue sections.`,
      category: "content",
    };
  });

  // Verify deployment identity AGAIN after browser checks: the alias must not have
  // been repointed to a different deployment while pages were being verified.
  const identityAfter = await fetchDeploymentIdentity(origin);
  const identityCheckAfter: Check = {
    name: "deployment identity (post-browser)",
    passed: deploymentIdentityMatches(identityAfter, revision).passed,
    detail: deploymentIdentityMatches(identityAfter, revision).detail,
    category: "production",
  };

  const checks = [identityCheckBefore, ...htmlChecks.flat(), ...setChecks.flat(), ...browserChecks.flatMap((result) => result.checks), ...routeAvailabilityChecks, ...semanticChecks, identityCheckAfter];
  const receipt = productionQualityReceiptV2Schema.parse({
    version: 2,
    runId: argument("--run-id") ?? randomUUID(),
    revision: revision.toLowerCase(),
    catalogueFingerprint: createHash("sha256").update(JSON.stringify(decisionJourneyCatalog), "utf8").digest("hex"),
    passed: checks.every((check) => check.passed),
    checks,
    screenshots: browserChecks.flatMap((result) => result.screenshots),
    createdAt: new Date().toISOString(),
  });
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.passed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
