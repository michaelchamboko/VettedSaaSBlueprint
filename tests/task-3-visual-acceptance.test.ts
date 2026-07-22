import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import { visualScreenshotSetSha256 } from "@/lib/codex-batches/contracts";
import { createPresentationRecipe, ctaVariants, heroVariants, mobileStrategies, motionVariants, sectionFamilies, sectionKeys, typographyPairs, type PresentationRecipeV1, type ReferenceSelectionHistoryV1 } from "@/lib/design-references/contracts";
import { validateSelectionHistory } from "@/lib/design-references/selector";
import { runLandingVisualReview, visualCapturePlan, type VisualBrowserAdapter, type VisualCapture, type VisualPage } from "@/lib/landing-visual/runner";
import { createSharpContactSheetAdapter } from "@/lib/landing-visual/contact-sheet";
import { convertPlaywrightPngToWebp, selectVisualCandidateBatches } from "../scripts/run-landing-visual";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const passingChecks = {
  horizontalOverflow: false,
  visiblePrimaryCtaCount: 1,
  ctaLabelNowrap: true,
  ctaFullLabelFits: true,
  ctaRectContained: true,
  ctaLabelIconNonOverlapping: true,
  ctaIconPresent: true,
  visibleFixedOrStickyCta: false,
  footerDisclosurePresent: true,
  h1Visible: true,
  bodyContentVisible: true,
  reducedMotionStable: true,
};

function recipeFor(index: number, referenceIds: string[]) {
  const orderedSections = sectionKeys.map((_, offset) => sectionKeys[(offset + index) % sectionKeys.length]);
  return createPresentationRecipe({
    hero: heroVariants[index % heroVariants.length],
    typography: typographyPairs[index % typographyPairs.length],
    section_order: orderedSections,
    section_variants: Object.fromEntries(sectionKeys.map((key, offset) => [key, sectionFamilies[(offset + index) % sectionFamilies.length]])) as Record<typeof sectionKeys[number], typeof sectionFamilies[number]>,
    cta: ctaVariants[index % ctaVariants.length],
    motion: motionVariants[index % motionVariants.length],
    mobile: mobileStrategies[index % mobileStrategies.length],
    design_dials: { design_variance: 7, motion_intensity: 6, visual_density: 4 },
    reference_ids: referenceIds,
  });
}

function syntheticPage(wave: number, candidate: number, recipe: PresentationRecipeV1): VisualPage {
  return {
    productId: "11111111-1111-4111-8111-111111111111",
    pageBlueprintId: `${wave.toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-${candidate.toString(16).padStart(12, "0")}`,
    slug: `candidate-${wave}-${candidate}`,
    intentKeyword: `synthetic decision ${wave}-${candidate}`,
    buyerDecision: `Synthetic buyer decision ${wave}-${candidate}`,
    draftSha256: sha(`draft-${wave}-${candidate}`),
    catalogueSha256: sha("catalogue"),
    recipeId: recipe.recipe_id,
    recipeFingerprint: recipe.fingerprint,
    selectedReferences: recipe.reference_ids.map((referenceId, index) => ({
      referenceId,
      entryDigest: sha(referenceId),
      role: index === 0 ? "hero_typography" : index === 1 ? "sections_cta" : "motion_mobile",
      adoptedPrinciples: [`Principle ${index + 1}`],
      influencedAxes: index === 0 ? ["hero", "typography"] : index === 1 ? ["section_order", "cta"] : ["motion", "mobile"],
      desktopCaptureSha256: sha(`${referenceId}-desktop`),
      mobileCaptureSha256: sha(`${referenceId}-mobile`),
      desktopCapturePath: `captures/${referenceId}/desktop.webp`,
      mobileCapturePath: `captures/${referenceId}/mobile.webp`,
    })),
  };
}

test("runs five ten-page waves through every real capture state without network access", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "visual-scale-"));
  const pages: VisualPage[] = [];
  const history: ReferenceSelectionHistoryV1 = { active_wave: [], previous_drafts: [] };
  const rejectedAttempts = { reuse: 0, fingerprint: 0, diversity: 0 };
  for (let wave = 0; wave < 5; wave++) {
    history.active_wave = [];
    for (let candidate = 0; candidate < 10; candidate++) {
      const globalIndex = wave * 10 + candidate;
      const referenceIds = Array.from({ length: 3 }, (_, offset) => `lp-ref-${String(globalIndex * 3 + offset + 1).padStart(4, "0")}`);
      const recipe = recipeFor(globalIndex, referenceIds);
      assert.deepEqual(validateSelectionHistory({ history, reference_ids: referenceIds, primary_reference_id: referenceIds[0], recipe }), [], `selection history rejected wave ${wave + 1} candidate ${candidate + 1}`);
      pages.push(syntheticPage(wave + 1, candidate + 1, recipe));
      history.active_wave.push({ draft_id: `wave-${wave + 1}-${candidate + 1}`, primary_reference_id: referenceIds[0], reference_ids: referenceIds, recipe });

      const reuseErrors = validateSelectionHistory({ history, reference_ids: referenceIds, primary_reference_id: referenceIds[0], recipe });
      assert.ok(reuseErrors.some((error) => /one primary use per active ten-page wave/i.test(error)));
      rejectedAttempts.reuse++;

      const fingerprintErrors = validateSelectionHistory({
        history: { active_wave: history.active_wave, previous_drafts: [...history.previous_drafts, history.active_wave.at(-1)!] },
        reference_ids: referenceIds,
        primary_reference_id: referenceIds[0],
        recipe,
      });
      assert.ok(fingerprintErrors.some((error) => /fingerprint exactly matches/i.test(error)));
      rejectedAttempts.fingerprint++;

      const nearDuplicateRecipe = createPresentationRecipe({
        hero: recipe.hero,
        typography: recipe.typography,
        section_order: recipe.section_order,
        section_variants: recipe.section_variants,
        cta: ctaVariants[(ctaVariants.indexOf(recipe.cta) + 1) % ctaVariants.length],
        motion: recipe.motion,
        mobile: recipe.mobile,
        design_dials: recipe.design_dials,
        reference_ids: recipe.reference_ids,
      });
      const diversityErrors = validateSelectionHistory({ history, reference_ids: referenceIds, primary_reference_id: referenceIds[0], recipe: nearDuplicateRecipe });
      assert.ok(diversityErrors.some((error) => /differ by at least three presentation axes/i.test(error)));
      rejectedAttempts.diversity++;
    }
    history.previous_drafts.push(...history.active_wave);
  }
  assert.deepEqual(rejectedAttempts, { reuse: 50, fingerprint: 50, diversity: 50 });
  const calls = { newPage: 0, goto: 0, prepare: [] as string[], evaluate: [] as string[], screenshots: 0, compose: 0 };
  const browser: VisualBrowserAdapter = {
    newPage: async () => ({
      setViewportSize: async () => undefined,
      emulateMedia: async () => undefined,
      goto: async (url) => { calls.goto++; assert.match(url, /^http:\/\/preview\.invalid\/landing-page-previews\/candidate-/); },
      prepareCapture: async (capture: VisualCapture) => { calls.prepare.push(capture.name); },
      evaluateChecks: async (capture: VisualCapture) => { calls.evaluate.push(capture.name); return passingChecks; },
      screenshot: async () => { calls.screenshots++; return Buffer.from("synthetic-webp"); },
      close: async () => undefined,
    }),
  };
  const countedBrowser: VisualBrowserAdapter = { newPage: async (options: { javaScriptEnabled: boolean }) => { calls.newPage++; return browser.newPage(options); } };

  const summary = await runLandingVisualReview({
    batchId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    pages,
    baseUrl: "http://preview.invalid",
    outputRoot,
    browser: countedBrowser,
    contactSheet: { compose: async () => { calls.compose++; return Buffer.from("contact-sheet"); } },
  });

  const expectedCaptures = pages.length * visualCapturePlan("candidate").length;
  assert.equal(summary.results.length, 50);
  assert.equal(new Set(summary.results.map((result: { recipe_fingerprint?: string }) => result.recipe_fingerprint)).size, 50);
  assert.equal(calls.newPage, expectedCaptures);
  assert.equal(calls.goto, expectedCaptures);
  assert.equal(calls.prepare.length, expectedCaptures);
  assert.equal(calls.evaluate.length, expectedCaptures);
  assert.equal(calls.screenshots, expectedCaptures);
  assert.equal(calls.compose, 100);
  for (const required of ["cta-320", "cta-360", "javascript-disabled", "reduced-motion", "motion-initial", "motion-hero-complete", "motion-mid-page"]) {
    assert.equal(calls.prepare.filter((name) => name === required).length, 50, required);
    assert.equal(calls.evaluate.filter((name) => name === required).length, 50, required);
  }
  assert.equal(summary.status, "pass");
  assert.doesNotMatch(await readFile(path.join(outputRoot, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "summary.json"), "utf8"), /https:\/\/(?!preview\.invalid)/);
});

test("a failing capture cannot be hidden by later passing captures", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "visual-fail-"));
  const browser: VisualBrowserAdapter = {
    newPage: async () => ({
      setViewportSize: async () => undefined,
      emulateMedia: async () => undefined,
      goto: async () => undefined,
      prepareCapture: async () => undefined,
      evaluateChecks: async (capture: VisualCapture) => capture.name === "cta-320" ? { ...passingChecks, horizontalOverflow: true } : passingChecks,
      screenshot: async () => Buffer.from("webp"),
      close: async () => undefined,
    }),
  };
  const summary = await runLandingVisualReview({ batchId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pages: [syntheticPage(1, 1, recipeFor(0, ["lp-ref-0001", "lp-ref-0002", "lp-ref-0003"]))], baseUrl: "http://preview.invalid", outputRoot, browser, contactSheet: { compose: async () => Buffer.from("sheet") } });
  assert.equal(summary.status, "revise");
  assert.equal(summary.results[0].status, "revise");
  assert.equal((summary.results[0] as { capture_results?: unknown[] }).capture_results?.length, visualCapturePlan("candidate").length);
});

test("mid-page and initial motion frames do not require a currently visible CTA", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "visual-motion-cta-"));
  const browser: VisualBrowserAdapter = {
    newPage: async () => ({
      setViewportSize: async () => undefined,
      emulateMedia: async () => undefined,
      goto: async () => undefined,
      prepareCapture: async () => undefined,
      evaluateChecks: async (capture: VisualCapture) => ["motion-mid-page", "motion-initial"].includes(capture.name)
        ? { ...passingChecks, visiblePrimaryCtaCount: 0, ctaLabelNowrap: false, ctaFullLabelFits: false, ctaRectContained: false, ctaLabelIconNonOverlapping: false, ctaIconPresent: false }
        : passingChecks,
      screenshot: async () => Buffer.from("webp"),
      close: async () => undefined,
    }),
  };
  const summary = await runLandingVisualReview({ batchId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pages: [syntheticPage(1, 1, recipeFor(0, ["lp-ref-0001", "lp-ref-0002", "lp-ref-0003"]))], baseUrl: "http://preview.invalid", outputRoot, browser, contactSheet: { compose: async () => Buffer.from("sheet") } });
  assert.equal(summary.status, "pass");
});

test("DOM measurement is self-contained and recognizes the renderer CTA arrow", async () => {
  const source = await readFile(path.join(process.cwd(), "scripts", "run-landing-visual.ts"), "utf8");
  const measurementSource = source.slice(source.indexOf("async function measureDom"), source.indexOf("async function createPlaywrightAdapter"));
  assert.match(measurementSource, /const isVisibleInViewport|function isVisibleInViewport/);
  assert.match(measurementSource, /landing-reference-composed__cta-arrow/);
  assert.match(measurementSource, /ctaIconPresent/);
  assert.match(measurementSource, /document\.documentElement\.clientWidth/);
  assert.match(measurementSource, /data-link-id|landing-reference-composed__cta|sponsored/);
  assert.match(measurementSource, /querySelectorAll[\s\S]*getComputedStyle[\s\S]*position/);
  assert.match(source, /document\.fonts\.ready/);
});

test("mid-page capture uses deterministic browser-supported scrolling", async () => {
  const source = await readFile(path.join(process.cwd(), "scripts", "run-landing-visual.ts"), "utf8");
  const adapterSource = source.slice(source.indexOf("async function createPlaywrightAdapter"), source.indexOf("export async function runLandingVisualCli"));
  assert.match(adapterSource, /capture\.state === "mid-page"[\s\S]*scrollTo\(\{ top: Math\.max\(0, document\.documentElement\.scrollHeight \/ 2\), behavior: "auto" \}\)/);
});

test("Playwright PNG captures are converted to WebP before the runner writes artifacts", async () => {
  const png = await sharp({ create: { width: 8, height: 6, channels: 3, background: "#8a4f2c" } }).png().toBuffer();
  const webp = await convertPlaywrightPngToWebp(png);
  const metadata = await sharp(webp).metadata();
  assert.deepEqual({ format: metadata.format, width: metadata.width, height: metadata.height }, { format: "webp", width: 8, height: 6 });

  const source = await readFile(path.join(process.cwd(), "scripts", "run-landing-visual.ts"), "utf8");
  const adapterSource = source.slice(source.indexOf("async function createPlaywrightAdapter"), source.indexOf("export async function runLandingVisualCli"));
  assert.match(adapterSource, /page\.screenshot\(\{ fullPage: options\.fullPage, type: "png" \}\)/);
  assert.match(adapterSource, /convertPlaywrightPngToWebp/);
  assert.doesNotMatch(adapterSource, /type: "webp"/);
});

test("initial motion capture waits for fonts before skipping settling", async () => {
  const source = await readFile(path.join(process.cwd(), "scripts", "run-landing-visual.ts"), "utf8");
  const adapterSource = source.slice(source.indexOf("async function createPlaywrightAdapter"), source.indexOf("export async function runLandingVisualCli"));
  const fontsReadyIndex = adapterSource.indexOf("document.fonts.ready");
  const initialReturnIndex = adapterSource.indexOf('capture.state === "initial"');
  assert.ok(fontsReadyIndex >= 0 && initialReturnIndex > fontsReadyIndex, "initial motion must await document.fonts.ready before returning");
});

test("contact sheets reject blank 1x1 source captures", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "visual-contact-sheet-"));
  const blankCapture = path.join(directory, "blank.webp");
  await writeFile(blankCapture, await sharp({ create: { width: 1, height: 1, channels: 3, background: "#ffffff" } }).webp().toBuffer());

  await assert.rejects(
    createSharpContactSheetAdapter().compose({
      output: path.join(directory, "sheet.webp"),
      draft: blankCapture,
      references: [blankCapture],
      viewport: "desktop",
    }),
    /1x1|blank/i,
  );
});

test("provisional reference-composed V1 pages are captured and scaffolded while editorial V1 pages are ignored", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "visual-provisional-v1-"));
  const provisionalBatchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const legacyBatchId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const referenceIds = ["lp-ref-0001", "lp-ref-0002", "lp-ref-0003"];
  const recipe = recipeFor(0, referenceIds);
  const direction = {
    references: referenceIds.map((referenceId, index) => ({
      reference_id: referenceId,
      entry_digest: sha(referenceId),
      role: index === 0 ? "hero_typography" : index === 1 ? "sections_cta" : "motion_mobile",
      adopted_principles: [`Principle ${index + 1}`],
      influenced_axes: index === 0 ? ["hero", "typography"] : index === 1 ? ["section_order", "cta"] : ["motion", "mobile"],
    })),
  };
  const catalogue = {
    references: referenceIds.map((id) => ({
      id,
      entry_digest: sha(id),
      captures: {
        desktop: { path: `captures/${id}/desktop.webp`, sha256: sha(`${id}-desktop`), byte_size: 100 },
        mobile: { path: `captures/${id}/mobile.webp`, sha256: sha(`${id}-mobile`), byte_size: 100 },
      },
    })),
  };
  const provisionalPage = syntheticPage(1, 1, recipe);
  const candidates = selectVisualCandidateBatches({
    loadedBatches: [
      {
        manifest: { schema_version: "CodexLandingBatchV1", batch_id: provisionalBatchId, product_id: provisionalPage.productId },
        pages: [{ manifestPage: { slug: provisionalPage.slug, page_blueprint_id: provisionalPage.pageBlueprintId, artifact: { canonical_json_sha256: provisionalPage.draftSha256 } }, intent: { target_keyword: provisionalPage.intentKeyword, buyer_decision: provisionalPage.buyerDecision, design_direction: direction }, blueprint: { metadata: { design_profile: "reference_composed_v1" }, presentation: recipe } }],
      },
      {
        manifest: { schema_version: "CodexLandingBatchV1", batch_id: legacyBatchId, product_id: provisionalPage.productId },
        pages: [{ manifestPage: { slug: "legacy-editorial", page_blueprint_id: provisionalPage.pageBlueprintId, artifact: { canonical_json_sha256: provisionalPage.draftSha256 } }, intent: { target_keyword: "legacy", buyer_decision: "legacy" }, blueprint: { metadata: { design_profile: "editorial_v2" } } }],
      },
    ] as never,
    registryBatchIds: [provisionalBatchId, legacyBatchId],
    catalogue: catalogue as never,
    catalogueDirectory: path.join(outputRoot, "catalogue"),
    catalogueSha256: sha("catalogue"),
  });

  assert.deepEqual(candidates.map((candidate) => ({ batchId: candidate.batchId, mode: candidate.mode, slugs: candidate.pages.map((page) => page.slug) })), [{ batchId: provisionalBatchId, mode: "provisional", slugs: [provisionalPage.slug] }]);

  await runLandingVisualReview({
    batchId: candidates[0].batchId,
    pages: candidates[0].pages,
    baseUrl: "http://preview.invalid",
    outputRoot,
    browser: {
      newPage: async () => ({
        setViewportSize: async () => undefined,
        emulateMedia: async () => undefined,
        goto: async () => undefined,
        prepareCapture: async () => undefined,
        evaluateChecks: async () => passingChecks,
        screenshot: async () => Buffer.from("webp"),
        close: async () => undefined,
      }),
    },
    contactSheet: { compose: async () => Buffer.from("sheet") },
  });
  const scaffold = JSON.parse(await readFile(path.join(outputRoot, provisionalBatchId, provisionalPage.slug, "visual-review-scaffold.json"), "utf8"));
  const currentRun = JSON.parse(await readFile(path.join(outputRoot, provisionalBatchId, provisionalPage.slug, "current-run.json"), "utf8"));
  const artifacts = [...currentRun.capture_results.map((result: { artifact: unknown }) => result.artifact), ...currentRun.contact_sheet_artifacts];
  const screenshotSetSha256 = visualScreenshotSetSha256(artifacts);
  assert.equal(artifacts.length, 13);
  assert.equal(currentRun.screenshot_set_sha256, screenshotSetSha256);
  assert.equal(scaffold.screenshot_set_sha256, screenshotSetSha256);
  assert.equal(scaffold.artifacts.length, 13);
  assert.deepEqual(scaffold.artifacts.map((artifact: { name: string }) => artifact.name), [
    ...visualCapturePlan(provisionalPage.slug).map((capture) => capture.name),
    "desktop-contact-sheet",
    "mobile-contact-sheet",
  ]);
  assert.equal(visualScreenshotSetSha256(scaffold.artifacts), screenshotSetSha256);
  assert.deepEqual({
    status: scaffold.machine_check_summary.status,
    failures: scaffold.machine_check_summary.failures,
    capture_count: scaffold.machine_check_summary.capture_count,
    contact_sheet_count: scaffold.machine_check_summary.contact_sheet_count,
  }, {
    status: "pass",
    failures: [],
    capture_count: visualCapturePlan(provisionalPage.slug).length,
    contact_sheet_count: 2,
  });
  assert.deepEqual(scaffold.machine_check_summary.capture_checks.map((check: { name: string }) => check.name), visualCapturePlan(provisionalPage.slug).map((capture) => capture.name));
  assert.deepEqual(scaffold.machine_check_summary.capture_checks[0].measurements, passingChecks);
  assert.deepEqual({ slug: scaffold.slug, machine_status: scaffold.machine_status, human_review_required: scaffold.human_review_required }, { slug: provisionalPage.slug, machine_status: "pass", human_review_required: true });
  assert.deepEqual(scaffold.selected_references[0], {
    reference_id: "lp-ref-0001",
    entry_digest: sha("lp-ref-0001"),
    role: "hero_typography",
    adopted_principles: ["Principle 1"],
    influenced_axes: ["hero", "typography"],
    desktop_capture_sha256: sha("lp-ref-0001-desktop"),
    mobile_capture_sha256: sha("lp-ref-0001-mobile"),
  });
});
