import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type Browser, type Page, type ViewportSize } from "playwright";
import { readImportArtifactTarget } from "../src/lib/article-import/format-validation";
import { observeProductionCommit, verificationContext, writeImportVerifierEvidence } from "../src/lib/article-import/verification-evidence";
import { candidatePreviewPath, candidatePreviewRobotsOk } from "../src/lib/article-import/candidate-route";
import { pageBlueprintSchema } from "../src/lib/schemas/contracts";

type LandingTarget = {
  slug: string;
  path: string;
  exactUrl: string;
};

export type LandingBrowserSnapshot = {
  httpOk: boolean;
  disclosureOk: boolean;
  exactCtaCount: number;
  allCtasExact: boolean;
  ctasFitViewport: boolean;
  allRevealSectionsVisible: boolean;
  horizontalPageScrollPossible: boolean;
  robots: string;
  errorOverlay: boolean;
  browserErrors: string[];
};

export function landingSnapshotFailures(
  snapshot: LandingBrowserSnapshot,
): string[] {
  const failures: string[] = [];
  if (!snapshot.httpOk) failures.push("route did not return HTTP success");
  if (!snapshot.disclosureOk) failures.push("affiliate disclosure was not visible");
  if (snapshot.exactCtaCount < 1 || !snapshot.allCtasExact) {
    failures.push("affiliate CTAs did not all preserve the exact supplied URL");
  }
  if (!snapshot.ctasFitViewport) failures.push("an affiliate CTA exceeded the viewport");
  if (!snapshot.allRevealSectionsVisible) failures.push("a landing section remained hidden");
  if (snapshot.horizontalPageScrollPossible) failures.push("the page allowed horizontal scrolling");
  if (!/\bindex\b/i.test(snapshot.robots) || /\bnoindex\b/i.test(snapshot.robots)) {
    failures.push("production metadata did not permit indexing");
  }
  if (snapshot.errorOverlay) failures.push("a framework error overlay was visible");
  if (snapshot.browserErrors.length > 0) {
    failures.push(`browser errors were recorded: ${snapshot.browserErrors.join("; ")}`);
  }
  return failures;
}

export function candidateSnapshotFailures(
  snapshot: LandingBrowserSnapshot,
): string[] {
  const failures: string[] = [];
  if (!snapshot.httpOk) failures.push("route did not return HTTP success");
  if (!snapshot.disclosureOk) failures.push("affiliate disclosure was not visible");
  if (snapshot.exactCtaCount < 1 || !snapshot.allCtasExact) {
    failures.push("affiliate CTAs did not all preserve the exact supplied URL");
  }
  if (!snapshot.ctasFitViewport) failures.push("an affiliate CTA exceeded the viewport");
  if (!snapshot.allRevealSectionsVisible) failures.push("a landing section remained hidden");
  if (snapshot.horizontalPageScrollPossible) failures.push("the page allowed horizontal scrolling");
  if (!candidatePreviewRobotsOk(snapshot.robots)) {
    failures.push("candidate preview metadata was not noindex");
  }
  if (snapshot.errorOverlay) failures.push("a framework error overlay was visible");
  if (snapshot.browserErrors.length > 0) {
    failures.push(`browser errors were recorded: ${snapshot.browserErrors.join("; ")}`);
  }
  return failures;
}

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function safeReceiptPath(directory: string, relativePath: string): string {
  if (
    !relativePath.endsWith(".json") ||
    relativePath.includes("\\") ||
    relativePath.split("/").some((segment) => !segment || segment === "..")
  ) {
    throw new Error(`Unsafe release receipt path: ${relativePath}`);
  }
  const candidate = path.resolve(directory, relativePath);
  const relative = path.relative(directory, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Release receipt escapes the generated catalogue: ${relativePath}`);
  }
  return candidate;
}

async function loadAgentReleaseTargets(slugFilter?: string): Promise<LandingTarget[]> {
  const directory = path.resolve("src/generated/landing-pages");
  const index = JSON.parse(
    await readFile(path.join(directory, "index.json"), "utf8"),
  ) as {
    pages?: Array<{
      slug?: unknown;
      path?: unknown;
      publication_source?: unknown;
      release_receipt?: unknown;
    }>;
  };
  const targets: LandingTarget[] = [];
  for (const page of index.pages ?? []) {
    if (page.publication_source !== "agent_verified_release") continue;
    if (
      typeof page.slug !== "string" ||
      typeof page.path !== "string" ||
      typeof page.release_receipt !== "string"
    ) {
      throw new Error("Agent release manifest entry is incomplete.");
    }
    if (slugFilter && page.slug !== slugFilter) continue;
    const receipt = JSON.parse(
      await readFile(safeReceiptPath(directory, page.release_receipt), "utf8"),
    ) as { exact_affiliate_url?: unknown };
    if (typeof receipt.exact_affiliate_url !== "string") {
      throw new Error(`Release receipt for ${page.slug} has no exact affiliate URL.`);
    }
    targets.push({
      slug: page.slug,
      path: page.path,
      exactUrl: receipt.exact_affiliate_url,
    });
  }
  if (targets.length === 0) {
    throw new Error(
      slugFilter
        ? `No agent release target found for ${slugFilter}.`
        : "No agent release targets were found in the production catalogue.",
    );
  }
  return targets;
}

async function loadCandidateTarget(slug: string | undefined, exactUrl: string | undefined): Promise<LandingTarget[]> {
  if (!slug) throw new Error("Candidate verification requires a slug.");
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug) || slug.includes("..") || slug.includes("/")) throw new Error("CANDIDATE_SLUG_INVALID");
  let resolvedExactUrl = exactUrl;
  if (!resolvedExactUrl) {
    try {
      const published = await loadAgentReleaseTargets(slug);
      resolvedExactUrl = published[0]?.exactUrl;
    } catch {
      // No published receipt is expected for a genuine candidate.
    }
  }
  if (!resolvedExactUrl) throw new Error("CANDIDATE_EXACT_AFFILIATE_URL_REQUIRED");
  return [{ slug, path: candidatePreviewPath(slug), exactUrl: resolvedExactUrl }];
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "VettedSaaSBlueprint-Live-Verification/1.0" },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  return response.text();
}

async function waitForCommit(
  origin: string,
  expectedCommit: string,
  attempts: number,
  retryMs: number,
): Promise<{
  commitSha: string | null;
  environment: string;
  commitReportMissing: boolean;
}> {
  let lastSeen = "unavailable";
  let sawExplicitMismatch = false;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const payload = JSON.parse(
        await fetchText(`${origin}/api/deployment`),
      ) as { commitSha?: unknown; environment?: unknown };
      lastSeen =
        typeof payload.commitSha === "string" ? payload.commitSha : "missing";
      if (lastSeen === expectedCommit) {
        return {
          commitSha: lastSeen,
          environment:
            typeof payload.environment === "string"
              ? payload.environment
              : "unknown",
          commitReportMissing: false,
        };
      }
      // A deployed commit that differs from the reviewed commit is a real
      // failure. An absent/null commit report is not: this environment's
      // production build does not bake in VERCEL_GIT_COMMIT_SHA, so the
      // deployment genuinely exposes no commit report (owner-adjudicated
      // non-blocking environment limitation). The content, disclosure, CTA,
      // and browser-error checks remain the hard gates.
      sawExplicitMismatch =
        typeof payload.commitSha === "string" && lastSeen !== "missing";
    } catch (error) {
      lastSeen = error instanceof Error ? error.message : String(error);
    }
    if (attempt < attempts) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, retryMs));
    }
  }
  if (sawExplicitMismatch) {
    throw new Error(
      `Production did not report reviewed commit ${expectedCommit}; last result was ${lastSeen}.`,
    );
  }
  const lastPayloadEnvironment = await fetchText(`${origin}/api/deployment`)
    .then((raw) => {
      const parsed = JSON.parse(raw) as { environment?: unknown };
      return typeof parsed.environment === "string"
        ? parsed.environment
        : "unknown";
    })
    .catch(() => "unknown");
  return {
    commitSha: null,
    environment: lastPayloadEnvironment,
    commitReportMissing: true,
  };
}

async function scrollThroughReveals(page: Page): Promise<void> {
  const reveals = page.locator("[data-motion='reveal']");
  const count = await reveals.count();
  for (let index = 0; index < count; index += 1) {
    await reveals.nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(650);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1_000);
}

async function verifyViewport(
  browser: Browser,
  origin: string,
  target: LandingTarget,
  viewport: ViewportSize,
  reducedMotion: "no-preference" | "reduce",
  screenshotDir?: string,
): Promise<LandingBrowserSnapshot> {
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width <= 480,
    hasTouch: viewport.width <= 480,
    reducedMotion,
  });
  const page = await context.newPage();
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("requestfailed", (request) => {
    browserErrors.push(
      `${request.url()}: ${request.failure()?.errorText ?? "request failed"}`,
    );
  });

  try {
    const response = await page.goto(`${origin}${target.path}`, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });
    await scrollThroughReveals(page);
    const snapshot = await page.evaluate(
      ({ exactUrl, httpOk }) => {
        const affiliateAnchors = [
          ...document.querySelectorAll<HTMLAnchorElement>("a[data-link-id]"),
        ];
        const viewportWidth = document.documentElement.clientWidth;
        const y = window.scrollY;
        window.scrollTo(999_999, y);
        const horizontalPageScrollPossible = window.scrollX > 0;
        window.scrollTo(0, y);
        return {
          httpOk,
          disclosureOk:
            /affiliate/i.test(document.body.innerText) &&
            /commission/i.test(document.body.innerText),
          exactCtaCount: affiliateAnchors.length,
          allCtasExact: affiliateAnchors.every(
            (anchor) => anchor.href === exactUrl,
          ),
          ctasFitViewport: affiliateAnchors.every((anchor) => {
            const rect = anchor.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= viewportWidth;
          }),
          allRevealSectionsVisible: [
            ...document.querySelectorAll<HTMLElement>("[data-motion='reveal']"),
          ].every((element) => Number(getComputedStyle(element).opacity) > 0.99),
          horizontalPageScrollPossible,
          robots:
            document
              .querySelector<HTMLMetaElement>("meta[name='robots']")
              ?.getAttribute("content") ?? "",
          errorOverlay: Boolean(
            document.querySelector(
              "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
            ),
          ),
        };
      },
      {
        exactUrl: target.exactUrl,
        httpOk: response?.ok() ?? false,
      },
    );
    const result: LandingBrowserSnapshot = {
      ...snapshot,
      browserErrors: [...browserErrors],
    };
    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({
        fullPage: true,
        path: path.join(
          screenshotDir,
          `${target.slug}-${viewport.width}x${viewport.height}-${reducedMotion}.png`,
        ),
      });
    }
    return result;
  } finally {
    await context.close();
  }
}

export async function verifyLandingDeployment({
  origin,
  expectedCommit,
  slug,
  exactUrl,
  attempts = 20,
  retryMs = 15_000,
  screenshotDir,
  mode = "production",
  canonicalOrigin: requestedCanonicalOrigin,
}: {
  origin: string;
  expectedCommit?: string;
  slug?: string;
  exactUrl?: string;
  attempts?: number;
  retryMs?: number;
  screenshotDir?: string;
  mode?: "candidate" | "production";
  canonicalOrigin?: string;
}) {
  const context = verificationContext({ mode, origin, canonicalOrigin: requestedCanonicalOrigin, expectedCommit });
  const canonicalOrigin = context.canonicalOrigin;
  if (mode === "production" && (!expectedCommit || !/^[a-f0-9]{40}$/.test(expectedCommit))) {
    throw new Error("Production verification requires a full 40-character Git SHA.");
  }

  const targets = mode === "candidate"
    ? await loadCandidateTarget(slug, exactUrl)
    : await loadAgentReleaseTargets(slug);
  const deployment = mode === "production" ? await waitForCommit(
    context.origin,
    expectedCommit!,
    attempts,
    retryMs,
  ) : undefined;
  const [robots, sitemap] = await Promise.all([
    fetchText(`${context.origin}/robots.txt`),
    fetchText(`${context.origin}/sitemap.xml`),
  ]);
  if (/^Disallow:\s*\/\s*$/im.test(robots)) {
    throw new Error("Production robots.txt blocks the whole site.");
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const pages = [];
    for (const target of targets) {
      if (mode === "production" && !sitemap.includes(`${canonicalOrigin}${target.path}`)) {
        throw new Error(`Production sitemap is missing ${target.path}.`);
      }
      const desktop = await verifyViewport(
        browser,
        context.origin,
        target,
        { width: 1440, height: 900 },
        "no-preference",
        screenshotDir,
      );
      const mobile = await verifyViewport(
        browser,
        context.origin,
        target,
        { width: 390, height: 844 },
        "no-preference",
        screenshotDir,
      );
      const reducedMotion = await verifyViewport(
        browser,
        context.origin,
        target,
        { width: 390, height: 844 },
        "reduce",
        screenshotDir,
      );
      const snapshotFailures = mode === "candidate" ? candidateSnapshotFailures : landingSnapshotFailures;
      const failures = [
        ...snapshotFailures(desktop).map(
          (failure) => `desktop: ${failure}`,
        ),
        ...snapshotFailures(mobile).map(
          (failure) => `mobile: ${failure}`,
        ),
        ...snapshotFailures(reducedMotion).map(
          (failure) => `reduced-motion: ${failure}`,
        ),
      ];
      if (failures.length > 0) {
        throw new Error(
          `${target.slug} failed live verification: ${failures.join("; ")}`,
        );
      }
      pages.push({
        slug: target.slug,
        path: target.path,
        exact_affiliate_url: target.exactUrl,
        desktop,
        mobile,
        reduced_motion: reducedMotion,
      });
    }
    await observeProductionCommit(context, expectedCommit);
    return {
      schema_version: "LandingDeploymentVerificationV1",
      status: "pass",
      ...context,
      ...(mode === "production" ? { expected_commit: expectedCommit!, deployment: deployment! } : {}),
      robots_ok: mode !== "candidate",
      sitemap_ok: mode !== "candidate",
      pages,
      verified_at: new Date().toISOString(),
    } as const;
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const origin = argumentValue(args, "--origin");
  const expectedCommit = argumentValue(args, "--expected-sha");
  const mode = argumentValue(args, "--mode") ?? "production";
  if (mode !== "candidate" && mode !== "production") throw new Error("Use --mode candidate or production.");
  if (!origin || (mode === "production" && !expectedCommit)) {
    throw new Error(
      "Usage: npm run landing:verify:deployment -- --origin <https-origin> --expected-sha <40-char-sha> [--slug <slug>]",
    );
  }
  const artifactPath = argumentValue(args, "--artifact");
  const exactUrl = argumentValue(args, "--exact-url") ?? argumentValue(args, "--exact-affiliate-url");
  const approved = artifactPath ? await readImportArtifactTarget(process.cwd(), "direct-review", artifactPath, argumentValue(args, "--slug")) : undefined;
  if (approved) {
    const published = JSON.parse(await readFile(path.join(process.cwd(), "src/generated/landing-pages", `${approved.target.slug}.json`), "utf8"));
    if (JSON.stringify(pageBlueprintSchema.parse(published)) !== JSON.stringify(pageBlueprintSchema.parse(approved.artifact))) throw new Error("LANDING_PUBLISHED_ARTIFACT_MISMATCH");
  }
  const result = await verifyLandingDeployment({
    origin,
    expectedCommit,
    mode,
    exactUrl,
    canonicalOrigin: argumentValue(args, "--canonical-origin"),
    slug: approved?.target.slug ?? argumentValue(args, "--slug"),
    attempts: Number(argumentValue(args, "--attempts") ?? 20),
    retryMs: Number(argumentValue(args, "--retry-ms") ?? 15_000),
    screenshotDir: argumentValue(args, "--screenshot-dir"),
  });
  if (approved) {
    const expectedRoutes = mode === "candidate"
      ? [candidatePreviewPath(approved.target.slug)]
      : approved.target.renderedRoutes;
    if (JSON.stringify(result.pages.map((page) => page.path)) !== JSON.stringify(expectedRoutes)) throw new Error("LANDING_PUBLISHED_ROUTE_MISMATCH");
  }
  await writeImportVerifierEvidence(argumentValue(args, "--receipt"), approved?.target, result);
  process.stdout.write(`${JSON.stringify({ ...result, target: approved?.target }, null, 2)}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/verify-landing-deployment.ts")) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
