import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { visualScreenshotSetSha256 } from "../codex-batches/contracts";
import type { PresentationAxis } from "../design-references/fingerprint";

export type VisualCaptureKind = "first-viewport" | "full-page" | "cta-check" | "motion-frame" | "reduced-motion" | "javascript-disabled";
export type VisualCaptureState = "settled" | "initial" | "hero-complete" | "mid-page" | "reduced-motion" | "javascript-disabled";
export type VisualCaptureName = "desktop-first-viewport" | "desktop-full-page" | "mobile-first-viewport" | "mobile-full-page" | "cta-320" | "cta-360" | "motion-initial" | "motion-hero-complete" | "motion-mid-page" | "reduced-motion" | "javascript-disabled";
export type VisualArtifactName = VisualCaptureName | "desktop-contact-sheet" | "mobile-contact-sheet";
export type VisualCapture = {
  name: VisualCaptureName;
  kind: VisualCaptureKind;
  width: number;
  height: number;
  fullPage: boolean;
  javascriptEnabled: boolean;
  reducedMotion: boolean;
  state: VisualCaptureState;
  path: string;
};

export const visualCapturePlan = (slug: string): VisualCapture[] => [
  { name: "desktop-first-viewport", kind: "first-viewport", width: 1440, height: 900, fullPage: false, javascriptEnabled: true, reducedMotion: false, state: "settled", path: `${slug}/desktop-first-viewport.webp` },
  { name: "desktop-full-page", kind: "full-page", width: 1440, height: 900, fullPage: true, javascriptEnabled: true, reducedMotion: false, state: "settled", path: `${slug}/desktop-full-page.webp` },
  { name: "mobile-first-viewport", kind: "first-viewport", width: 390, height: 844, fullPage: false, javascriptEnabled: true, reducedMotion: false, state: "settled", path: `${slug}/mobile-first-viewport.webp` },
  { name: "mobile-full-page", kind: "full-page", width: 390, height: 844, fullPage: true, javascriptEnabled: true, reducedMotion: false, state: "settled", path: `${slug}/mobile-full-page.webp` },
  { name: "cta-320", kind: "cta-check", width: 320, height: 844, fullPage: false, javascriptEnabled: true, reducedMotion: false, state: "settled", path: `${slug}/cta-320.webp` },
  { name: "cta-360", kind: "cta-check", width: 360, height: 844, fullPage: false, javascriptEnabled: true, reducedMotion: false, state: "settled", path: `${slug}/cta-360.webp` },
  { name: "motion-initial", kind: "motion-frame", width: 1440, height: 900, fullPage: false, javascriptEnabled: true, reducedMotion: false, state: "initial", path: `${slug}/motion-initial.webp` },
  { name: "motion-hero-complete", kind: "motion-frame", width: 1440, height: 900, fullPage: false, javascriptEnabled: true, reducedMotion: false, state: "hero-complete", path: `${slug}/motion-hero-complete.webp` },
  { name: "motion-mid-page", kind: "motion-frame", width: 1440, height: 900, fullPage: false, javascriptEnabled: true, reducedMotion: false, state: "mid-page", path: `${slug}/motion-mid-page.webp` },
  { name: "reduced-motion", kind: "reduced-motion", width: 1440, height: 900, fullPage: false, javascriptEnabled: true, reducedMotion: true, state: "reduced-motion", path: `${slug}/reduced-motion.webp` },
  { name: "javascript-disabled", kind: "javascript-disabled", width: 390, height: 844, fullPage: false, javascriptEnabled: false, reducedMotion: false, state: "javascript-disabled", path: `${slug}/javascript-disabled.webp` },
];

export type VisualMeasurements = {
  horizontalOverflow: boolean;
  visiblePrimaryCtaCount: number;
  ctaLabelNowrap: boolean;
  ctaFullLabelFits: boolean;
  ctaRectContained: boolean;
  ctaLabelIconNonOverlapping: boolean;
  ctaIconPresent: boolean;
  visibleFixedOrStickyCta: boolean;
  footerDisclosurePresent: boolean;
  h1Visible: boolean;
  bodyContentVisible: boolean;
  reducedMotionStable: boolean;
};

export type VisualPageAdapter = {
  setViewportSize(viewport: { width: number; height: number }): Promise<void>;
  emulateMedia(options: { reducedMotion: "reduce" | "no-preference" }): Promise<void>;
  goto(url: string): Promise<void>;
  prepareCapture(capture: VisualCapture): Promise<void>;
  evaluateChecks(capture: VisualCapture): Promise<VisualMeasurements>;
  screenshot(options: { fullPage: boolean }): Promise<Buffer | void>;
  close(): Promise<void>;
};

export type VisualBrowserAdapter = { newPage(options: { javaScriptEnabled: boolean }): Promise<VisualPageAdapter> };
export type ContactSheetAdapter = { compose(input: { output: string; draft: string; references: string[]; viewport: "desktop" | "mobile" }): Promise<Buffer | void> };
export type VisualSelectedReference = {
  referenceId: string;
  entryDigest: string;
  role: "hero_typography" | "sections_cta" | "motion_mobile";
  adoptedPrinciples: string[];
  influencedAxes: PresentationAxis[];
  desktopCaptureSha256: string;
  mobileCaptureSha256: string;
  desktopCapturePath: string;
  mobileCapturePath: string;
};
export type VisualPage = {
  productId: string;
  pageBlueprintId: string;
  slug: string;
  intentKeyword: string;
  buyerDecision: string;
  draftSha256: string;
  catalogueSha256: string;
  recipeId: string;
  recipeFingerprint: string;
  selectedReferences: VisualSelectedReference[];
};

export type VisualArtifactMetadata = {
  name: VisualArtifactName;
  kind: VisualCaptureKind | "contact-sheet";
  viewport_width: number;
  viewport_height: number;
  full_page: boolean;
  motion_state: VisualCaptureState | null;
  reduced_motion: boolean;
  javascript_enabled: boolean;
  path: string;
  sha256: string;
  byte_size: number;
};

const sha256 = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");

function measurementFailures(capture: VisualCapture, measurements: VisualMeasurements) {
  const failures: string[] = [];
  if (measurements.horizontalOverflow) failures.push("horizontal_overflow");
  if (!measurements.bodyContentVisible) failures.push("body_content_missing");
  const requiresCta = ["first-viewport", "full-page", "cta-check", "javascript-disabled"].includes(capture.kind);
  if (requiresCta && measurements.visiblePrimaryCtaCount !== 1) failures.push("primary_cta_count");
  if (requiresCta && !measurements.ctaLabelNowrap) failures.push("cta_label_wrap");
  if (requiresCta && !measurements.ctaFullLabelFits) failures.push("cta_label_clipped");
  if (requiresCta && !measurements.ctaRectContained) failures.push("cta_rect_escape");
  if (requiresCta && !measurements.ctaLabelIconNonOverlapping) failures.push("cta_label_icon_overlap");
  if (requiresCta && !measurements.ctaIconPresent) failures.push("cta_icon_missing");
  if (capture.width <= 390 && measurements.visibleFixedOrStickyCta) failures.push("mobile_fixed_or_sticky_cta");
  if (!measurements.footerDisclosurePresent) failures.push("footer_disclosure_missing");
  if (capture.javascriptEnabled === false && (!measurements.h1Visible || !measurements.bodyContentVisible)) failures.push("javascript_disabled_content_missing");
  if (capture.reducedMotion && !measurements.reducedMotionStable) failures.push("reduced_motion_unstable");
  return failures;
}

async function bytesForArtifact(result: Buffer | void, target: string) {
  if (result) {
    await writeFile(target, result);
    return result;
  }
  return readFile(target);
}

export async function runLandingVisualReview(input: { batchId: string; pages: VisualPage[]; baseUrl: string; outputRoot: string; browser: VisualBrowserAdapter; contactSheet: ContactSheetAdapter }) {
  const root = path.join(input.outputRoot, input.batchId);
  await mkdir(root, { recursive: true });
  if (input.pages.length === 0) {
    const summary = { schema_version: "LandingVisualRunSummaryV1", batch_id: input.batchId, page_count: 0, status: "pass" as const, skipped_server: true, results: [] };
    await writeFile(path.join(root, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
    return summary;
  }

  const results = [];
  for (const page of input.pages) {
    const captureResults: Array<{ capture: VisualCapture; measurements: VisualMeasurements; failures: string[]; artifact: VisualArtifactMetadata }> = [];
    for (const capture of visualCapturePlan(page.slug)) {
      const target = path.join(root, capture.path);
      await mkdir(path.dirname(target), { recursive: true });
      const browserPage = await input.browser.newPage({ javaScriptEnabled: capture.javascriptEnabled });
      try {
        await browserPage.setViewportSize({ width: capture.width, height: capture.height });
        await browserPage.emulateMedia({ reducedMotion: capture.reducedMotion ? "reduce" : "no-preference" });
        await browserPage.goto(`${input.baseUrl}/landing-page-previews/${page.slug}`);
        await browserPage.prepareCapture(capture);
        const measurements = await browserPage.evaluateChecks(capture);
        const bytes = await bytesForArtifact(await browserPage.screenshot({ fullPage: capture.fullPage }), target);
        captureResults.push({
          capture,
          measurements,
          failures: measurementFailures(capture, measurements),
          artifact: {
            name: capture.name,
            kind: capture.kind,
            viewport_width: capture.width,
            viewport_height: capture.height,
            full_page: capture.fullPage,
            motion_state: capture.state,
            reduced_motion: capture.reducedMotion,
            javascript_enabled: capture.javascriptEnabled,
            path: capture.path,
            sha256: sha256(bytes),
            byte_size: bytes.byteLength,
          },
        });
      } finally {
        await browserPage.close();
      }
    }

    const contactArtifacts: VisualArtifactMetadata[] = [];
    for (const viewport of ["desktop", "mobile"] as const) {
      const relativePath = `${page.slug}/${viewport}-contact-sheet.webp`;
      const target = path.join(root, relativePath);
      const references = page.selectedReferences.map((reference) => viewport === "desktop" ? reference.desktopCapturePath : reference.mobileCapturePath);
      const draft = path.join(root, page.slug, `${viewport}-full-page.webp`);
      const bytes = await bytesForArtifact(await input.contactSheet.compose({ output: target, draft, references, viewport }), target);
      contactArtifacts.push({ name: `${viewport}-contact-sheet`, kind: "contact-sheet", viewport_width: viewport === "desktop" ? 1440 : 390, viewport_height: viewport === "desktop" ? 900 : 844, full_page: true, motion_state: null, reduced_motion: false, javascript_enabled: true, path: relativePath, sha256: sha256(bytes), byte_size: bytes.byteLength });
    }

    const failures = captureResults.flatMap((result) => result.failures.map((failure) => `${result.capture.name}:${failure}`));
    const status = failures.length > 0 ? "revise" as const : "pass" as const;
    const artifacts = [
      ...captureResults.map((result) => result.artifact),
      ...contactArtifacts,
    ];
    const screenshotSetSha256 = visualScreenshotSetSha256(artifacts);
    const currentRun = {
      schema_version: "LandingVisualCurrentRunV1",
      batch_id: input.batchId,
      product_id: page.productId,
      page_blueprint_id: page.pageBlueprintId,
      slug: page.slug,
      draft_sha256: page.draftSha256,
      recipe_id: page.recipeId,
      recipe_fingerprint: page.recipeFingerprint,
      screenshot_set_sha256: screenshotSetSha256,
      status,
      failures,
      capture_results: captureResults,
      contact_sheet_artifacts: contactArtifacts,
    };
    await writeFile(path.join(root, page.slug, "current-run.json"), `${JSON.stringify(currentRun, null, 2)}\n`);
    const scaffold = {
      schema_version: "VisualDesignReviewScaffoldV1",
      source_run: "current-run.json",
      batch_id: input.batchId,
      product_id: page.productId,
      page_blueprint_id: page.pageBlueprintId,
      slug: page.slug,
      intent_keyword: page.intentKeyword,
      buyer_decision: page.buyerDecision,
      draft_sha256: page.draftSha256,
      catalogue_sha256: page.catalogueSha256,
      recipe_id: page.recipeId,
      recipe_fingerprint: page.recipeFingerprint,
      screenshot_set_sha256: screenshotSetSha256,
      artifacts,
      selected_references: page.selectedReferences.map((reference) => ({
        reference_id: reference.referenceId,
        entry_digest: reference.entryDigest,
        role: reference.role,
        desktop_capture_sha256: reference.desktopCaptureSha256,
        mobile_capture_sha256: reference.mobileCaptureSha256,
        adopted_principles: reference.adoptedPrinciples,
        influenced_axes: reference.influencedAxes,
      })),
      machine_status: status,
      machine_check_summary: {
        status,
        failures,
        capture_count: captureResults.length,
        contact_sheet_count: contactArtifacts.length,
        capture_checks: captureResults.map((result) => ({
          name: result.capture.name,
          kind: result.capture.kind,
          measurements: result.measurements,
          failures: result.failures,
        })),
      },
      human_review_required: true,
      required_human_checks: ["brand_content_assets_not_copied", "presentation_diversity", "adopted_principles"],
    };
    await writeFile(path.join(root, page.slug, "visual-review-scaffold.json"), `${JSON.stringify(scaffold, null, 2)}\n`);
    results.push({ slug: page.slug, page_blueprint_id: page.pageBlueprintId, recipe_fingerprint: page.recipeFingerprint, status, failures, capture_results: captureResults, contact_sheet_artifacts: contactArtifacts });
  }

  const summaryBase = { schema_version: "LandingVisualRunSummaryV1", batch_id: input.batchId, page_count: input.pages.length, status: results.some((result) => result.status !== "pass") ? "revise" as const : "pass" as const, skipped_server: false, results };
  const summary = { ...summaryBase, sha256: sha256(JSON.stringify(summaryBase)) };
  await writeFile(path.join(root, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}
