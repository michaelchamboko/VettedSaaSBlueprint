import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJsonStringify, loadCodexLandingBatch, sha256Hex, type LoadedCodexLandingBatch } from "../src/lib/codex-batches/loader";
import { DesignReferenceCatalogueV1, type DesignReferenceCatalogueV1 as DesignReferenceCatalogue } from "../src/lib/design-references/contracts";
import { listCodexBatchPreviewRegistryBatchIds } from "../src/lib/generated/codex-batch-previews";
import { runLandingVisualReview, type VisualBrowserAdapter, type VisualCapture, type VisualMeasurements, type VisualPage } from "../src/lib/landing-visual/runner";

const UUID_V4_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export async function withBuiltPreviewServer<T>(run: (baseUrl: string) => Promise<T>, options: { port?: number; start?: (port: number) => ReturnType<typeof spawn>; timeoutMs?: number } = {}) {
  const port = options.port ?? 3100;
  const child = (options.start ?? ((requestedPort) => spawn("npm", ["run", "start", "--", "-p", String(requestedPort)], { stdio: "inherit", shell: process.platform === "win32" })))(port);
  let settled = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (callback: () => void) => { if (!settled) { settled = true; callback(); } };
      const timeout = setTimeout(() => finish(() => reject(new Error("Timed out waiting for the built preview server."))), options.timeoutMs ?? 30_000);
      child.once("exit", (code) => finish(() => { clearTimeout(timeout); reject(new Error(`Built preview server exited before readiness with code ${code}.`)); }));
      const probe = async () => {
        if (settled) return;
        try {
          const response = await fetch(`http://127.0.0.1:${port}/landing-page-previews/__missing__`);
          if (response.status < 500) { clearTimeout(timeout); finish(resolve); return; }
        } catch { /* readiness polling is bounded by timeout */ }
        setTimeout(() => void probe(), 200);
      };
      void probe();
    });
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    child.kill();
    await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 1_000))]);
  }
}

export type VisualCandidateBatch = { batchId: string; pages: VisualPage[]; mode: "provisional" | "committed-v2" };

export function isV2VisualManifest(manifest: { schema_version: string }) {
  return manifest.schema_version === "CodexLandingBatchV2";
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function listManifestBatchIds(batchRoot: string): Promise<string[]> {
  const entries = await readdir(batchRoot, { withFileTypes: true });
  const batchIds: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const manifestPath = path.join(batchRoot, entry.name, "manifest.json");
    let manifestText: string;
    try {
      manifestText = await readFile(manifestPath, "utf8");
    } catch (error) {
      if (isMissingFileError(error)) continue;
      throw error;
    }
    if (!UUID_V4_PATTERN.test(entry.name)) {
      throw new Error(`Batch directory '${entry.name}' contains manifest.json but is not a UUID v4 directory.`);
    }
    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestText);
    } catch (error) {
      throw new Error(`${manifestPath} contains malformed JSON.`, { cause: error });
    }
    if (manifest && typeof manifest === "object" && !Array.isArray(manifest)) {
      const identity = manifest as { schema_version?: unknown; batch_id?: unknown };
      if (["CodexLandingBatchV1", "CodexLandingBatchV2"].includes(String(identity.schema_version)) && identity.batch_id !== entry.name) {
        throw new Error(`${manifestPath} declares batch ID '${String(identity.batch_id)}', which does not match directory '${entry.name}'.`);
      }
    }
    batchIds.push(entry.name);
  }
  return batchIds.sort();
}

export function selectVisualCandidateBatches(input: {
  loadedBatches: Array<Pick<LoadedCodexLandingBatch, "manifest" | "pages">>;
  registryBatchIds: Iterable<string>;
  catalogue: DesignReferenceCatalogue;
  catalogueDirectory: string;
  catalogueSha256: string;
}): VisualCandidateBatch[] {
  const registryIds = new Set(input.registryBatchIds);
  const references = new Map(input.catalogue.references.map((reference) => [reference.id, reference]));
  const candidates: VisualCandidateBatch[] = [];

  for (const batch of input.loadedBatches) {
    if (!registryIds.has(batch.manifest.batch_id)) continue;
    const mode = isV2VisualManifest(batch.manifest) ? "committed-v2" : "provisional";
    const pages: VisualPage[] = [];
    for (const page of batch.pages) {
      const direction = page.intent.design_direction;
      const presentation = page.blueprint.presentation;
      const eligible = page.blueprint.metadata.design_profile === "reference_composed_v1" && direction && presentation;
      if (!eligible) {
        if (batch.manifest.schema_version === "CodexLandingBatchV2") throw new Error(`${page.manifestPage.slug} V2 page is missing its required design direction or presentation.`);
        continue;
      }
      const selectedReferences = direction.references.map((selected) => {
        const reference = references.get(selected.reference_id);
        if (!reference) throw new Error(`${page.manifestPage.slug} references missing catalogue entry ${selected.reference_id}.`);
        if (reference.entry_digest !== selected.entry_digest) throw new Error(`${page.manifestPage.slug} reference ${selected.reference_id} has a stale catalogue digest.`);
        if (!reference.captures.desktop || !reference.captures.mobile) throw new Error(`${page.manifestPage.slug} reference ${selected.reference_id} lacks both captures.`);
        return {
          referenceId: reference.id,
          entryDigest: reference.entry_digest,
          role: selected.role,
          adoptedPrinciples: selected.adopted_principles,
          influencedAxes: selected.influenced_axes,
          desktopCaptureSha256: reference.captures.desktop.sha256,
          mobileCaptureSha256: reference.captures.mobile.sha256,
          desktopCapturePath: path.join(input.catalogueDirectory, reference.captures.desktop.path),
          mobileCapturePath: path.join(input.catalogueDirectory, reference.captures.mobile.path),
        };
      });
      pages.push({
        productId: batch.manifest.product_id,
        pageBlueprintId: page.manifestPage.page_blueprint_id,
        slug: page.manifestPage.slug,
        intentKeyword: page.intent.target_keyword,
        buyerDecision: page.intent.buyer_decision,
        draftSha256: page.manifestPage.artifact.canonical_json_sha256,
        catalogueSha256: input.catalogueSha256,
        recipeId: presentation.recipe_id,
        recipeFingerprint: presentation.fingerprint,
        selectedReferences,
      });
    }
    if (pages.length > 0) candidates.push({ batchId: batch.manifest.batch_id, pages, mode });
  }
  return candidates;
}

export async function discoverVisualCandidateBatches(options: { batchRoot?: string; catalogueDirectory?: string } = {}): Promise<VisualCandidateBatch[]> {
  const batchRoot = path.resolve(options.batchRoot ?? path.join(process.cwd(), "src", "generated", "landing-page-batches"));
  const catalogueDirectory = path.resolve(options.catalogueDirectory ?? path.join(process.cwd(), "docs", "design-references", "landing-pages"));
  const batchIds = await listManifestBatchIds(batchRoot);
  const loadedBatches = await Promise.all(batchIds.map((batchId) => loadCodexLandingBatch({ batchRoot, batchId, environment: process.env, catalogueDirectory })));
  const catalogue = DesignReferenceCatalogueV1.parse(JSON.parse(await readFile(path.join(catalogueDirectory, "catalogue.json"), "utf8")));
  return selectVisualCandidateBatches({
    loadedBatches,
    registryBatchIds: listCodexBatchPreviewRegistryBatchIds(),
    catalogue,
    catalogueDirectory,
    catalogueSha256: sha256Hex(canonicalJsonStringify(catalogue)),
  });
}

async function measureDom(capture: Pick<VisualCapture, "reducedMotion">): Promise<VisualMeasurements> {
  const isVisibleInViewport = (element: Element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  };
  const visibleCtas = [...document.querySelectorAll('[data-track="primary-cta"]')].filter(isVisibleInViewport) as HTMLElement[];
  const visibleCtaLikeElements = [...document.querySelectorAll([
    '[data-track="primary-cta"]',
    '[data-track*="cta"]',
    "[data-link-id]",
    ".landing-reference-composed__cta",
    'a[rel~="sponsored"]',
  ].join(", "))].filter(isVisibleInViewport) as HTMLElement[];
  const ctaChecks = visibleCtas.map((cta) => {
    const label = (cta.querySelector("[data-cta-label]") ?? cta.querySelector("span") ?? cta) as HTMLElement;
    const icon = cta.querySelector("[data-cta-icon], .landing-reference-composed__cta-arrow, svg") as HTMLElement | null;
    const ctaRect = cta.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const iconRect = icon?.getBoundingClientRect();
    const whiteSpace = getComputedStyle(label).whiteSpace;
    const documentWidth = document.documentElement.clientWidth;
    const ctaInsideViewport = ctaRect.left >= -1 && ctaRect.right <= documentWidth + 1 && ctaRect.top >= -1 && ctaRect.bottom <= innerHeight + 1;
    const labelInsideCta = labelRect.left >= ctaRect.left - 1 && labelRect.right <= ctaRect.right + 1 && labelRect.top >= ctaRect.top - 1 && labelRect.bottom <= ctaRect.bottom + 1;
    const iconInsideCta = Boolean(iconRect && iconRect.left >= ctaRect.left - 1 && iconRect.right <= ctaRect.right + 1 && iconRect.top >= ctaRect.top - 1 && iconRect.bottom <= ctaRect.bottom + 1);
    return {
      nowrap: !["normal", "pre-wrap", "pre-line", "break-spaces"].includes(whiteSpace),
      fullLabelFits: label.scrollWidth <= label.clientWidth + 1 && label.scrollHeight <= label.clientHeight + 1,
      contained: ctaInsideViewport && labelInsideCta && iconInsideCta,
      nonOverlapping: !iconRect || labelRect.right <= iconRect.left || iconRect.right <= labelRect.left || labelRect.bottom <= iconRect.top || iconRect.bottom <= labelRect.top,
      iconPresent: Boolean(icon && iconRect),
    };
  });
  const footer = document.querySelector("footer");
  const footerText = footer?.textContent ?? "";
  const disclosure = footer?.querySelector("[data-affiliate-disclosure], .affiliate-disclosure") ?? null;
  const h1 = document.querySelector("h1");
  const bodyText = document.body.innerText.trim();
  const trackedMotion = [...document.querySelectorAll("[data-motion], [data-landing-motion], [data-motion-profile] *")].slice(0, 100);
  const snapshot = () => trackedMotion.map((element) => { const style = getComputedStyle(element); return `${style.transform}|${style.opacity}`; });
  const before = snapshot();
  if (capture.reducedMotion) await new Promise((resolve) => setTimeout(resolve, 220));
  const after = snapshot();
  return {
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    visiblePrimaryCtaCount: visibleCtas.length,
    ctaLabelNowrap: ctaChecks.length > 0 && ctaChecks.every((check) => check.nowrap),
    ctaFullLabelFits: ctaChecks.length > 0 && ctaChecks.every((check) => check.fullLabelFits),
    ctaRectContained: ctaChecks.length > 0 && ctaChecks.every((check) => check.contained),
    ctaLabelIconNonOverlapping: ctaChecks.length > 0 && ctaChecks.every((check) => check.nonOverlapping),
    ctaIconPresent: ctaChecks.length > 0 && ctaChecks.every((check) => check.iconPresent),
    visibleFixedOrStickyCta: visibleCtaLikeElements.some((cta) => ["fixed", "sticky"].includes(getComputedStyle(cta).position)),
    footerDisclosurePresent: Boolean(footer && (disclosure || /affiliate|commission|referral/i.test(footerText))),
    h1Visible: Boolean(h1 && isVisibleInViewport(h1)),
    bodyContentVisible: bodyText.length > 0,
    reducedMotionStable: !capture.reducedMotion || before.every((value, index) => value === after[index]),
  };
}

export function convertPlaywrightPngToWebp(png: Buffer): Promise<Buffer> {
  return import("sharp").then(({ default: sharp }) => sharp(png).webp({ quality: 82 }).toBuffer());
}

async function createPlaywrightAdapter(): Promise<{ browser: { close(): Promise<void> }; adapter: VisualBrowserAdapter }> {
  if (process.env.LANDING_VISUAL_FORBID_PLAYWRIGHT_IMPORT === "1") throw new Error("Playwright import was forbidden for this run.");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const adapter: VisualBrowserAdapter = {
    newPage: async ({ javaScriptEnabled }) => {
      const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      return {
        setViewportSize: (viewport) => page.setViewportSize(viewport),
        emulateMedia: (options) => page.emulateMedia(options),
        goto: async (url) => { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 }); },
        prepareCapture: async (capture) => {
          await Promise.race([
            page.evaluate(() => document.fonts.ready.then(() => undefined)),
            page.waitForTimeout(15_000).then(() => { throw new Error("Timed out waiting for document fonts."); }),
          ]);
          if (capture.state === "initial") return;
          if (capture.state === "javascript-disabled") return;
          if (capture.state === "hero-complete") { await page.waitForTimeout(800); return; }
          if (capture.state === "mid-page") { await page.evaluate(() => scrollTo({ top: Math.max(0, document.documentElement.scrollHeight / 2), behavior: "auto" })); await page.waitForTimeout(250); return; }
          await page.waitForTimeout(capture.state === "reduced-motion" ? 250 : 400);
        },
        evaluateChecks: (capture) => page.evaluate(measureDom, { reducedMotion: capture.reducedMotion }),
        screenshot: async (options) => convertPlaywrightPngToWebp(await page.screenshot({ fullPage: options.fullPage, type: "png" })),
        close: () => context.close(),
      };
    },
  };
  return { browser, adapter };
}

export async function runLandingVisualCli(options: { batchRoot?: string; catalogueDirectory?: string; outputRoot?: string } = {}) {
  const outputRoot = path.resolve(options.outputRoot ?? path.join(process.cwd(), ".stage2", "landing-visual"));
  const candidates = await discoverVisualCandidateBatches(options);
  if (candidates.length === 0) {
    return runLandingVisualReview({ batchId: "no-v2-pages", pages: [], baseUrl: "", outputRoot, browser: { newPage: async () => { throw new Error("Browser must not launch for zero visual pages."); } }, contactSheet: { compose: async () => { throw new Error("Contact sheets must not run for zero visual pages."); } } });
  }
  if (process.env.LANDING_VISUAL_FORBID_SERVER === "1") throw new Error("Preview server startup was forbidden for this run.");
  const { browser, adapter } = await createPlaywrightAdapter();
  const { createSharpContactSheetAdapter } = await import("../src/lib/landing-visual/contact-sheet");
  try {
    return await withBuiltPreviewServer(async (baseUrl) => Promise.all(candidates.map((candidate) => runLandingVisualReview({ batchId: candidate.batchId, pages: candidate.pages, baseUrl, outputRoot, browser: adapter, contactSheet: createSharpContactSheetAdapter() }))));
  } finally {
    await browser.close();
  }
}

async function main() {
  await runLandingVisualCli();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
}
