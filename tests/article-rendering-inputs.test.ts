import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { captureRenderingInputs, publicationServingInputPaths, publicationServingInputs, renderingInputPaths, requiredDetectorInputs, validateRenderingInputs } from "../src/lib/article-import/rendering-inputs";
import { freezeEvidenceGraph, withEvidenceSnapshot } from "../src/lib/article-import/execution-evidence";
import { contentApprovalMatches, createContentApproval } from "../src/lib/article-import/content-approval";
import { createEditorialEvidence, fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";
import { fullRewriteNotes, rewriteAllProse } from "./fixtures/article-content-approval";

const importId = "article-00000000-0000-0000-0000-000000000001";
async function put(root: string, file: string, value: string) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), value);
}
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "rendering-inputs-"));
  await put(root, "src/app/globals.css", "body { color: black; }");
  await put(root, "src/components/Card.tsx", "export const Card = () => null;");
  await put(root, "package-lock.json", "{\"lockfileVersion\":3}");
  await put(root, "config/article-workflow-capabilities.json", "{}");
  return root;
}

test("CSS changes invalidate presentation inputs while unchanged content approval remains valid", async () => {
  const root = await fixture();
  try {
    const before = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, url_slug: "example", canonical_url: "https://vettedsaasblueprint.online/imported-guide" } };
    const after = rewriteAllProse("landing", before);
    const files = { artifactPath: "src/generated/landing-pages/example.json", editorialEvidencePath: "build-pack/editorial/fixture.json", formatQualityPath: "build-pack/article-import/quality.json" };
    await put(root, files.artifactPath, JSON.stringify(after));
    await put(root, files.editorialEvidencePath, JSON.stringify(createEditorialEvidence("landing", before, after, fullRewriteNotes, { before: "score 4/5", after: "score 5/5 CLEAN" })));
    await put(root, files.formatQualityPath, JSON.stringify({ format: "direct-review", artifactFingerprint: fingerprintEditorialArtifact(after), passed: true, gate: "landing:quality:candidate" }));
    const approval = await createContentApproval(root, { ...files, format: "direct-review", sourceFingerprint: "a".repeat(64) });
    const ref = await captureRenderingInputs(root, importId);
    assert.deepEqual(await captureRenderingInputs(root, importId), ref);
    await validateRenderingInputs(root, ref);
    await put(root, "src/app/globals.css", "body { color: white; }");
    assert.equal(await contentApprovalMatches(root, approval, "direct-review", "a".repeat(64)), true);
    await assert.rejects(() => validateRenderingInputs(root, ref), /RENDER_INPUT_CHANGED:src\/app\/globals.css/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("fresh inventory rejects additions and removals, not only changed file hashes", async () => {
  const root = await fixture();
  try {
    const ref = await captureRenderingInputs(root, importId);
    await put(root, "public/new-image.svg", "<svg />");
    await assert.rejects(() => validateRenderingInputs(root, ref), /RENDER_INPUT_INVENTORY_CHANGED/);
    await unlink(path.join(root, "public/new-image.svg"));
    await validateRenderingInputs(root, ref);
    await unlink(path.join(root, "src/components/Card.tsx"));
    await assert.rejects(() => validateRenderingInputs(root, ref), /RENDER_INPUT_INVENTORY_CHANGED/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("historical presentation verifies frozen rendering bytes without current inventory", async () => {
  const root = await fixture();
  try {
    const ref = await captureRenderingInputs(root, importId);
    const snapshot = await freezeEvidenceGraph(root, importId, [ref]);
    await put(root, "src/app/globals.css", "body { display: none; }");
    await unlink(path.join(root, "src/components/Card.tsx"));
    await put(root, "public/new-image.svg", "<svg />");
    await assert.rejects(() => validateRenderingInputs(root, ref), /RENDER_INPUT_INVENTORY_CHANGED/);
    await assert.rejects(() => validateRenderingInputs(root, ref, { historical: true }), /RENDER_INPUT_FROZEN_SNAPSHOT_REQUIRED/);
    const retained = await withEvidenceSnapshot(snapshot, () => validateRenderingInputs(root, ref, { historical: true }));
    assert.equal(retained.files.length, 3);
    const targeted = await withEvidenceSnapshot(snapshot, () => validateRenderingInputs(root, ref, {
      historical: true,
      target: { format: "blog", renderedRoutes: ["/blog/synthetic"] },
    }));
    assert.equal(targeted.files.length, 3);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("renderer data and dependencies are included; importer state and non-rendering evidence are excluded", async () => {
  const root = await fixture();
  try {
    await put(root, "src/generated/landing-pages/index.json", "{}");
    await put(root, "src/content/example.json", "{}");
    await put(root, "next.config.ts", "export default {};");
    await put(root, "src/lib/article-import/state.ts", "internal state");
    const files = await renderingInputPaths(root);
    assert.ok(files.includes("src/generated/landing-pages/index.json"));
    assert.ok(files.includes("src/content/example.json"));
    assert.ok(files.includes("next.config.ts"));
    assert.equal(files.some((file) => file.startsWith("src/lib/article-import/")), false);
    const ref = await captureRenderingInputs(root, importId);
    await put(root, "src/lib/article-import/state.ts", "changed importer state");
    await put(root, "build-pack/editorial/new.json", "{}");
    await validateRenderingInputs(root, ref);
    await put(root, "package-lock.json", "{\"lockfileVersion\":4}");
    await assert.rejects(() => validateRenderingInputs(root, ref), /RENDER_INPUT_CHANGED:package-lock.json/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("publication serving inputs include transitive format helpers without widening to unrelated helpers", async () => {
  const direct = publicationServingInputPaths("direct-review");
  const blog = publicationServingInputPaths("blog");
  const visibility = publicationServingInputPaths("visibility");
  const decision = publicationServingInputPaths("decision-set");
  for (const path of ["src/lib/blog/structured-data.ts", "src/components/public/PublicPageShell.tsx", "src/lib/design-references/fingerprint.ts"]) assert.ok(blog.includes(path));
  for (const path of ["src/lib/decision-journey/presentation.ts", "src/components/public/DecisionJourneyMotion.tsx", "src/app/scenarios/[setSlug]/page.tsx"]) assert.ok(decision.includes(path));
  for (const path of ["src/lib/visibility-pages/calculator.ts", "src/components/visibility/EmailCostCalculator.tsx", "src/app/guides/how-to-evaluate-ai-voice-quality/page.tsx"]) assert.ok(visibility.includes(path));
  for (const path of ["src/lib/affiliate/approved-urls.ts", "src/lib/landing/reference-composed.ts", "src/components/landing/LandingPageMotion.tsx"]) assert.ok(direct.includes(path));
  assert.equal(blog.includes("src/lib/decision-journey/presentation.ts"), false);
  assert.equal(decision.includes("src/lib/blog/structured-data.ts"), false);
  assert.equal(visibility.includes("src/lib/blog/structured-data.ts"), false);
});

test("route-scoped serving dependencies include reachable helpers without widening the historical detector contract", () => {
  const paths = [...new Set(["direct-review", "blog", "visibility", "decision-set"].flatMap(publicationServingInputPaths))];
  const manifest = { schemaVersion: "RenderingInputsV1", inventoryVersion: 1, files: paths.map((path) => ({ path, sha256: "a".repeat(64) })), digest: "b".repeat(64) } as const;
  const visibility = { format: "visibility", renderedRoutes: ["/guides/how-to-evaluate-ai-voice-quality"] };
  const selected = publicationServingInputs(manifest, visibility).map((ref) => ref.path);
  assert.ok(selected.includes("src/app/guides/how-to-evaluate-ai-voice-quality/page.tsx"));
  assert.equal(selected.includes("src/app/comparisons/moosend-vs-mailchimp/page.tsx"), false);
  const blogDetector = requiredDetectorInputs(manifest, { format: "blog", renderedRoutes: ["/blog/example"] }).map((ref) => ref.path);
  const decisionDetector = requiredDetectorInputs(manifest, { format: "decision-set", renderedRoutes: ["/decision-hub/example"] }).map((ref) => ref.path);
  assert.equal(blogDetector.includes("src/lib/blog/structured-data.ts"), false);
  assert.equal(decisionDetector.includes("src/lib/decision-journey/presentation.ts"), false);
});
