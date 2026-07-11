#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const targetDir = "src/generated/landing-pages";
const futureDraftTargetDir = "src/generated/landing-page-drafts/next-50";
const routePath = "src/app/landing-page-builders/[slug]/page.tsx";
const componentPath = "src/components/landing/DirectReviewPage.tsx";
const editorialComponentPath = "src/components/landing/EditorialReviewPage.tsx";
const stylesPath = "src/app/globals.css";
const generatedLibPath = "src/lib/generated/landing-pages.ts";

export const landingStaticScanModes = [
  "route",
  "structure",
  "hero",
  "cta",
  "seo",
  "a11y",
  "links",
  "forms",
  "conversion",
  "responsive",
  "assets",
  "publish-readiness",
  "editorial-v2",
];

function readText(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function landingFiles() {
  if (!existsSync(targetDir)) return [];
  const manifest = existsSync(join(targetDir, "index.json")) ? readJson(join(targetDir, "index.json")) : { pages: [] };
  const approvedFiles = new Set((manifest.pages ?? [])
    .filter((entry) => entry.status === "published" && entry.publication_source === "oracle_dynamic_pages" && entry.published_at && entry.current_version_id && entry.owner_publish_audit_id)
    .map((entry) => entry.artifact));
  return readdirSync(targetDir)
    .filter((name) => approvedFiles.has(name))
    .sort()
    .map((file) => ({ file, path: join(targetDir, file), data: readJson(join(targetDir, file)) }));
}

function editorialDraftFiles() {
  if (!existsSync(futureDraftTargetDir)) return [];
  return readdirSync(futureDraftTargetDir)
    .filter((name) => name.endsWith(".json") && name !== "index.json")
    .sort()
    .map((file) => ({ file: join(futureDraftTargetDir, file), path: join(futureDraftTargetDir, file), data: readJson(join(futureDraftTargetDir, file)) }));
}

export function loadLandingStaticContext() {
  return {
    rows: landingFiles(),
    editorialRows: editorialDraftFiles(),
    manifest: existsSync(join(targetDir, "index.json")) ? readJson(join(targetDir, "index.json")) : { pages: [] },
    routeSource: readText(routePath),
    componentSource: readText(componentPath),
    editorialComponentSource: existsSync(editorialComponentPath) ? readText(editorialComponentPath) : "",
    stylesSource: existsSync(stylesPath) ? readText(stylesPath) : "",
    generatedSource: readText(generatedLibPath),
  };
}

function issue(issues, code, message, file = null, severity = "blocker") {
  issues.push({ code, message, file, severity });
}

function warning(warnings, code, message, file = null) {
  warnings.push({ code, message, file, severity: "warning" });
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isApprovedVisual(asset) {
  return asset?.approval_status === "approved" && asset?.approved_by_owner === true;
}

function visualAssets(page) {
  return [page.hero?.visual_asset, ...(page.benefits ?? []).map((item) => item.visual_asset)].filter(Boolean);
}

function checkRoute(rows, manifest, source, generatedSource, issues, warnings) {
  for (const token of ["generateStaticParams", "generateMetadata", "getPublishedLandingPage", "DirectReviewPage"]) {
    if (!source.includes(token)) issue(issues, "route_contract_missing", `Landing route is missing ${token}.`);
  }
  for (const token of ["catalogue", "pageSlugSchema", "listPublishedLandingPageParams"]) {
    if (!generatedSource.includes(token)) issue(issues, "generated_source_contract_missing", `Generated landing helper is missing ${token}.`);
  }
  const files = new Set(rows.map((row) => row.file));
  for (const entry of (manifest.pages ?? []).filter((item) => item.publication_source === "oracle_dynamic_pages")) {
    if (!files.has(entry.artifact)) issue(issues, "manifest_artifact_missing", `Manifest artifact does not exist: ${entry.artifact}.`, entry.artifact);
    if (entry.path !== `/landing-page-builders/${entry.slug}`) issue(issues, "manifest_path_mismatch", `Manifest path does not match slug ${entry.slug}.`, entry.artifact);
    if (entry.artifact !== `${entry.slug}.json`) warning(warnings, "artifact_slug_name_mismatch", `Artifact name does not match slug ${entry.slug}.`, entry.artifact);
  }
}

function checkStructure(rows, issues) {
  for (const row of rows) {
    const page = row.data;
    const requiredObjects = ["metadata", "affiliate_disclosure", "hero", "quality_scores"];
    for (const key of requiredObjects) if (!page[key] || typeof page[key] !== "object") issue(issues, "missing_required_object", `${key} is missing.`, row.file);
    const requiredArrays = ["benefits", "limitations", "faq", "cta_blocks"];
    for (const key of requiredArrays) if (!Array.isArray(page[key]) || page[key].length === 0) issue(issues, "missing_required_array", `${key} must be a non-empty array.`, row.file);
  }
}

function checkHero(rows, issues) {
  for (const row of rows) {
    const hero = row.data.hero ?? {};
    if (!hasText(hero.headline)) issue(issues, "hero_headline_missing", "Hero headline is missing.", row.file);
    if (!hasText(hero.subheadline)) issue(issues, "hero_subheadline_missing", "Hero subheadline is missing.", row.file);
    if (!hasText(hero.primary_cta_label)) issue(issues, "hero_cta_label_missing", "Hero CTA label is missing.", row.file);
    if (!hasText(hero.primary_cta_link_id)) issue(issues, "hero_cta_link_missing", "Hero CTA link id is missing.", row.file);
    if (row.data.affiliate_disclosure?.placement !== "above_first_cta") issue(issues, "disclosure_not_before_cta", "Disclosure must be above the first CTA.", row.file);
    if (isApprovedVisual(hero.visual_asset) && !hasText(hero.visual_asset.alt_text)) issue(issues, "hero_visual_alt_missing", "Approved hero visual lacks alt text.", row.file);
  }
}

function checkCta(rows, issues) {
  for (const row of rows) {
    const heroId = row.data.hero?.primary_cta_link_id;
    for (const [index, cta] of (row.data.cta_blocks ?? []).entries()) {
      if (!hasText(cta.label)) issue(issues, "cta_label_missing", `CTA block ${index} label is missing.`, row.file);
      if (!hasText(cta.affiliate_link_id)) issue(issues, "cta_link_missing", `CTA block ${index} affiliate link id is missing.`, row.file);
      if (heroId && cta.affiliate_link_id && cta.affiliate_link_id !== heroId) issue(issues, "cta_id_mismatch", `CTA block ${index} id differs from hero CTA id.`, row.file);
    }
  }
}

function checkSeo(rows, routeSource, issues, warnings) {
  if (!routeSource.includes("title: blueprint.metadata.title_tag")) issue(issues, "route_title_metadata_missing", "Route metadata must use artifact title_tag.");
  if (!routeSource.includes("description: blueprint.metadata.meta_description")) issue(issues, "route_description_metadata_missing", "Route metadata must use artifact meta_description.");
  for (const row of rows) {
    const metadata = row.data.metadata ?? {};
    if (!hasText(metadata.title_tag)) issue(issues, "title_tag_missing", "title_tag is missing.", row.file);
    if (!hasText(metadata.meta_description)) issue(issues, "meta_description_missing", "meta_description is missing.", row.file);
    if (!hasText(metadata.url_slug)) issue(issues, "url_slug_missing", "url_slug is missing.", row.file);
    if (hasText(metadata.title_tag) && metadata.title_tag.length > 70) warning(warnings, "title_tag_long", "title_tag is longer than 70 characters.", row.file);
    if (hasText(metadata.meta_description) && metadata.meta_description.length > 180) warning(warnings, "meta_description_long", "meta_description is longer than 180 characters.", row.file);
  }
  if (!routeSource.includes("canonical")) warning(warnings, "canonical_not_explicit", "Canonical metadata is not explicit in the route source.");
}

function checkLinks(componentSource, editorialComponentSource, rows, issues) {
  for (const [renderer, source] of [["DirectReviewPage", componentSource], ["EditorialReviewPage", editorialComponentSource]]) {
    for (const token of ["/r/affiliate?", "data-link-id"]) {
      if (!source.includes(token)) issue(issues, "affiliate_link_wiring_missing", `${renderer} is missing ${token}.`);
    }
    if (!/rel=["'](?:nofollow\s+sponsored|sponsored\s+nofollow|sponsored)["']/.test(source)) {
      issue(issues, "affiliate_link_rel_missing", `${renderer} must mark affiliate CTA links with rel=\"sponsored\".`);
    }
  }
  for (const row of rows) if (!hasText(row.data.hero?.primary_cta_link_id)) issue(issues, "affiliate_link_id_missing", "Hero affiliate link id is missing.", row.file);
}

function checkForms(componentSource, issues) {
  if (/<form[\s>]/i.test(componentSource)) issue(issues, "unexpected_form_present", "Landing renderer contains a form; form scanner needs field validation.");
}

function checkConversion(componentSource, issues) {
  for (const token of ['data-track="primary-cta"', "OracleTracking", "ctaLinkId", "pageSlug"]) {
    if (!componentSource.includes(token)) issue(issues, "conversion_tracking_missing", `DirectReviewPage is missing ${token}.`);
  }
  if (/googletagmanager|facebook\.net|doubleclick|analytics\.js|gtag\(/i.test(componentSource)) issue(issues, "third_party_pixel_detected", "Third-party tracking indicator found in landing renderer.");
}

function checkResponsive(componentSource, issues) {
  if (!/(^|\s)(md:|sm:|lg:)/.test(componentSource)) issue(issues, "responsive_classes_missing", "Renderer lacks responsive breakpoint classes.");
  if (!/(grid|flex)/.test(componentSource)) issue(issues, "responsive_layout_primitives_missing", "Renderer lacks grid/flex layout primitives.");
}

function checkA11y(componentSource, rows, issues) {
  for (const token of ["<h1", "alt={", "Disclosure", "<section"]) {
    if (!componentSource.includes(token)) issue(issues, "a11y_static_hook_missing", `Renderer is missing ${token}.`);
  }
  for (const row of rows) {
    if (!hasText(row.data.affiliate_disclosure?.short_disclosure)) issue(issues, "disclosure_text_missing", "Disclosure text is missing.", row.file);
    for (const asset of visualAssets(row.data)) if (isApprovedVisual(asset) && !hasText(asset.alt_text)) issue(issues, "approved_visual_alt_missing", "Approved visual is missing alt text.", row.file);
  }
}

function checkAssets(rows, issues) {
  for (const row of rows) {
    for (const asset of visualAssets(row.data)) {
      if (!isApprovedVisual(asset)) continue;
      const assetPath = asset.local_public_path ?? asset.asset_url;
      if (!hasText(assetPath)) issue(issues, "approved_asset_path_missing", "Approved visual lacks a local public asset path.", row.file);
      if (hasText(assetPath)) {
        const relative = assetPath.replace(/^\//, "");
        if (!relative.startsWith("generated/") && !relative.startsWith("public/")) issue(issues, "approved_asset_not_local_public", "Approved visual path is not local public asset path.", row.file);
        const publicPath = relative.startsWith("public/") ? relative : join("public", relative);
        if (!existsSync(publicPath)) issue(issues, "approved_asset_file_missing", `Approved visual file not found at ${publicPath}.`, row.file);
      }
      if (!hasText(asset.prompt_summary)) issue(issues, "approved_asset_prompt_missing", "Approved visual lacks prompt summary.", row.file);
      if (!hasText(asset.alt_text)) issue(issues, "approved_asset_alt_missing", "Approved visual lacks alt text.", row.file);
    }
  }
}

function checkPublishReadiness(rows, issues) {
  if (rows.length === 0) return;
  const reviewGate = readText("build-pack/13-review-gate.md");
  const performanceDoc = readText("build-pack/23-landing-page-workflow-performance-optimization.md");
  if (!reviewGate.includes("Stage 2 pre-review")) issue(issues, "review_gate_stage2_missing", "Review gate must require Stage 2 pre-review evidence.");
  if (!performanceDoc.includes("LP-T09-PUBLISH-01")) issue(issues, "publish_microtask_missing", "Publish-readiness micro-task is missing.");
  if (!performanceDoc.includes("npm run gate:stage2:pre-review")) issue(issues, "stage2_gate_command_missing", "Stage 2 gate command is missing.");
}

function countWords(value) {
  return typeof value === "string" && value.trim() ? value.trim().split(/\s+/).length : 0;
}

function futureScopedStyles(stylesSource) {
  const start = stylesSource.indexOf(".landing-editorial-v2");
  return start >= 0 ? stylesSource.slice(start) : "";
}

function checkEditorialV2(rows, editorialComponentSource, stylesSource, issues) {
  const futureRows = rows.filter((row) => row.data?.metadata?.design_profile === "editorial_v2");
  if (futureRows.length === 0) return;

  for (const row of futureRows) {
    const answerSnippet = row.data.hero?.answer_snippet;
    if (countWords(answerSnippet) < 40 || countWords(answerSnippet) > 60) {
      issue(issues, "editorial_answer_snippet_invalid", "Editorial v2 answer_snippet must contain 40–60 words.", row.file);
    }

    const ctaLabels = [row.data.hero?.primary_cta_label, ...(row.data.cta_blocks ?? []).map((cta) => cta.label)];
    if (ctaLabels.some((ctaLabel) => typeof ctaLabel !== "string" || ctaLabel.length > 32 || /(?:->|--?>|[↗→⇒])/u.test(ctaLabel))) {
      issue(issues, "editorial_cta_label_too_long", "Editorial v2 CTA labels must be at most 32 characters and must not embed arrow glyphs.", row.file);
    }
  }

  const scopedStyles = futureScopedStyles(stylesSource);
  const futureSource = `${editorialComponentSource}\n${scopedStyles}`;
  if (!editorialComponentSource.includes("flex items-center justify-between whitespace-nowrap")) {
    issue(issues, "editorial_cta_primitive_missing", "Editorial v2 renderer must use the no-wrap flex CTA primitive.");
  }
  const compactDisclosureIndex = editorialComponentSource.indexOf("compact-disclosure");
  const primaryCtaIndex = editorialComponentSource.indexOf('data-track="primary-cta"');
  const footerIndex = editorialComponentSource.indexOf("<footer");
  const fullDisclosureIndex = editorialComponentSource.indexOf("full-disclosure");
  if (compactDisclosureIndex < 0 || primaryCtaIndex < 0 || compactDisclosureIndex > primaryCtaIndex || footerIndex < 0 || fullDisclosureIndex < 0 || fullDisclosureIndex < footerIndex) {
    issue(issues, "editorial_disclosure_footer_wiring_missing", "Editorial v2 renderer must show compact disclosure near the CTA and full disclosure in the footer.");
  }
  if (!scopedStyles.startsWith(".landing-editorial-v2") || /\bbody\s*\{/i.test(scopedStyles)) {
    issue(issues, "editorial_styles_unscoped", "Editorial v2 styles must be scoped under .landing-editorial-v2.");
  }
  const interactiveSource = `${editorialComponentSource}\n${scopedStyles.match(/[^}]*?(?:cta|button|interactive)[^}]*\}/gi)?.join("\n") ?? ""}`;
  if (/gradient/i.test(interactiveSource)) {
    issue(issues, "editorial_gradient_interactive", "Editorial v2 interactive primitives must not use gradients.");
  }
  if (/(?:cta|button|floating|sticky|fixed)[^}]{0,300}(?:position\s*:\s*(?:fixed|sticky)|(?:fixed|sticky)\s+bottom)/i.test(futureSource)) {
    issue(issues, "editorial_sticky_cta", "Editorial v2 must not use fixed or sticky bottom CTA primitives.");
  }
}

export function buildLandingStaticReport(mode, context = loadLandingStaticContext()) {
  const issues = [];
  const warnings = [];
  const {
    rows,
    manifest,
    routeSource,
    componentSource,
    editorialRows,
    editorialComponentSource,
    stylesSource,
    generatedSource,
  } = context;

  switch (mode) {
    case "route":
      checkRoute(rows, manifest, routeSource, generatedSource, issues, warnings);
      break;
    case "structure":
      checkStructure(rows, issues);
      break;
    case "hero":
      checkHero(rows, issues);
      break;
    case "cta":
      checkCta(rows, issues);
      break;
    case "seo":
      checkSeo(rows, routeSource, issues, warnings);
      break;
    case "links":
      checkLinks(componentSource, editorialComponentSource, rows, issues);
      break;
    case "forms":
      checkForms(componentSource, issues);
      break;
    case "conversion":
      checkConversion(componentSource, issues);
      break;
    case "responsive":
      checkResponsive(componentSource, issues);
      break;
    case "a11y":
      checkA11y(componentSource, rows, issues);
      break;
    case "assets":
      checkAssets(rows, issues);
      break;
    case "publish-readiness":
      checkPublishReadiness(rows, issues);
      break;
    case "editorial-v2":
      checkEditorialV2([...(editorialRows ?? []), ...rows.filter((row) => row.data?.metadata?.design_profile === "editorial_v2")], editorialComponentSource ?? "", stylesSource ?? "", issues);
      break;
    default:
      issue(issues, "unknown_static_scan_mode", `Unknown scan mode: ${mode ?? "(missing)"}.`);
  }

  const blockers = issues.filter((item) => item.severity !== "warning");
  const scannedCount = mode === "editorial-v2"
    ? rows.length + (editorialRows ?? []).length
    : rows.length;
  return {
    schema_version: 1,
    tool: "scan-landing-static",
    check: mode,
    status: blockers.length === 0 ? "pass" : "fail",
    scanned_count: scannedCount,
    issues,
    warnings,
    summary: {
      blocker_count: blockers.length,
      warning_count: warnings.length,
      finding_count: blockers.length + warnings.length,
    },
  };
}

function run() {
  const mode = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const reportOnly = process.argv.includes("--report-only");
  const json = process.argv.includes("--json");

  const report = buildLandingStaticReport(mode);

  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`${mode}: ${report.status} (${report.summary.blocker_count} blocker(s), ${report.summary.warning_count} warning(s))`);
    for (const item of [...issues, ...warnings]) console.log(`- [${item.code}] ${item.file ? `${item.file}: ` : ""}${item.message}`);
  }
  if (report.status === "fail" && !reportOnly) process.exit(1);
}

function isCliEntry() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isCliEntry()) {
  const mode = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const json = process.argv.includes("--json");
  try {
    run();
  } catch (error) {
    const report = {
      schema_version: 1,
      tool: "scan-landing-static",
      check: mode,
      status: "error",
      error: error.message,
    };
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.error(`Error: ${error.message}`);
    process.exit(2);
  }
}
