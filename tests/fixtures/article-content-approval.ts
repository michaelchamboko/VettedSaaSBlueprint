import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { approveImportContent, recordImportPresentation } from "../../src/lib/article-import/engine";
import type { ExternalArticleImportV1 } from "../../src/lib/article-import/contracts";
import { createEditorialEvidence, editorialProsePaths, fingerprintEditorialArtifact, type EditorialFormat } from "../../src/lib/editorial/refinement";
import { samplePageBlueprint as baseBlueprint } from "./sample-page-blueprint";
import { importArtifactTarget } from "../../src/lib/article-import/format-validation";
import { candidatePreviewPath } from "../../src/lib/article-import/candidate-route";
import { buildWorkflowFixture } from "./article-workflow-evidence";
import { editorialExecutionSchema, readEvidence } from "../../src/lib/article-import/workflow-evidence";
import { countVisibleArticleWords } from "../../src/lib/editorial/article-visible-word-count";
const samplePageBlueprint = { ...baseBlueprint, metadata: { ...baseBlueprint.metadata, url_slug: "example", canonical_url: "https://vettedsaasblueprint.online/imported-guide" } };

export const fullRewriteNotes = {
  semanticNotes: "Reviewed the complete rewritten prose; meaning, qualification and protected fields are preserved.",
  exceptions: [], meaningPreserved: true, arrayOrderPreserved: true, rewriteMode: "full_article",
  writerModelFamily: "reflection-beam", cleanseModelFamily: "reflection-beam",
  passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, beamReview: true, finalFidelityReview: true },
} as const;

export const validPageDesignReceipt = {
  scope: "new_or_materially_changed_public_page",
  authority: { mode: "reused" },
  impeccable: { context: true, shape: true, critique: true, audit: true, detect: true, polish: true },
  specialists: {
    emilDesignEngineering: "not_applicable",
    mobileNative: "not_applicable",
    appleDesign: "not_applicable",
    pickUiLibrary: "not_applicable",
    askSonner: "not_applicable",
  },
  notes: "The fixture models a changed page using the established reference design authority; desktop and mobile inspections were recorded.",
} as const;

export function rewriteAllProse<T>(format: EditorialFormat, value: T): T {
  const revised = structuredClone(value);
  for (const prosePath of editorialProsePaths(format, revised)) {
    const parts = prosePath.split(".");
    const key = parts.pop()!;
    let parent = revised as Record<string, unknown>;
    for (const part of parts) parent = parent[part] as Record<string, unknown>;
    parent[key] = `${parent[key] as string} Revised.`;
  }
  return revised;
}

export async function prepareApprovalFixture(root: string, record: ExternalArticleImportV1, options: { structuredEditorial?: boolean } = {}) {
  const artifactPath = "src/generated/landing-pages/example.json";
  const editorialEvidencePath = "build-pack/editorial/example.json";
  const formatQualityPath = "build-pack/article-import/quality.json";
  const rewritten = rewriteAllProse("landing", samplePageBlueprint);
  const initialWordCount = countVisibleArticleWords("direct-review", rewritten).wordCount;
  if (initialWordCount < 2050) rewritten.benefits[0].benefit_description += ` ${Array(2050 - initialWordCount).fill("decision").join(" ")}`;
  const independentReview = options.structuredEditorial || record.transformation?.commercialMode === "approved";
  const notes = independentReview ? { ...fullRewriteNotes, writerModelFamily: undefined, cleanseModelFamily: undefined, passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, independentReview: true, finalFidelityReview: true } } : fullRewriteNotes;
  const evidence = createEditorialEvidence("landing", samplePageBlueprint, rewritten, notes,
    { before: "score 4/5 needs a cleanse", after: "score 5/5 CLEAN" });
  for (const [file, value] of [[artifactPath, rewritten], [editorialEvidencePath, evidence], [formatQualityPath, { format: "direct-review", artifactFingerprint: fingerprintEditorialArtifact(rewritten), passed: true, gate: "landing:quality:candidate" }]] as const) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), JSON.stringify(value));
  }
  const evidenceRefs = await buildWorkflowFixture(root, record, { format: "direct-review", artifactPath, before: samplePageBlueprint, after: rewritten, editorialEvidencePath, structuredEditorial: options.structuredEditorial });
  return { artifactPath, editorialEvidencePath, formatQualityPath, evidenceRefs };
}

export async function approveFixture(root: string, record: ExternalArticleImportV1) {
  const { evidenceRefs, ...files } = await prepareApprovalFixture(root, record);
  return approveImportContent(root, { ...record, evidenceRefs }, files);
}

export async function presentFixture(root: string, record: ExternalArticleImportV1) {
  const prepared = await preparePresentationFixture(root, record);
  return recordImportPresentation(root, prepared.record, prepared.input);
}

export async function preparePresentationFixture(root: string, record: ExternalArticleImportV1) {
  record = await refreshPresentationFixture(root, record);
  if (!record.contentApproval) throw new Error("Fixture content approval is required.");
  const evidencePath = "build-pack/article-import/verifier.json";
  const approvedArtifact = JSON.parse(await readFile(path.join(root, record.contentApproval.artifactPath), "utf8"));
  const target = importArtifactTarget("direct-review", approvedArtifact);
  const shot = { httpOk: true, disclosureOk: true, exactCtaCount: 1, allCtasExact: true, ctasFitViewport: true, allRevealSectionsVisible: true, horizontalPageScrollPossible: false, errorOverlay: false, browserErrors: [], robots: "noindex,nofollow", artifactFingerprint: target.artifactFingerprint };
  await mkdir(path.dirname(path.join(root, evidencePath)), { recursive: true });
  await writeFile(path.join(root, evidencePath), JSON.stringify({ schemaVersion: "ImportVerifierEvidenceV1", target, result: { verificationMode: "candidate", origin: "http://127.0.0.1:3000", canonicalOrigin: "https://vettedsaasblueprint.online", status: "pass", pages: [{ path: candidatePreviewPath(target.slug), desktop: shot, mobile: shot, reduced_motion: shot }] } }));
  const input: Parameters<typeof recordImportPresentation>[2] = {
    validationGate: "fixture:rendered-layout",
    validationReceipt: {
      schemaVersion: "ImportPresentationValidationV1",
      format: record.format,
      artifactFingerprint: record.contentApproval.artifactFingerprint,
      renderedRoutes: ["/imported-guide"],
      checks: { desktop: true, mobile: true, accessibility: true, technicalSeo: true, overflow: true, runtimeErrors: true },
      pageDesign: validPageDesignReceipt,
      evidencePaths: [evidencePath],
      notes: "Mocked browser evidence for importer state tests.",
    },
  };
  return { record, input };
}

/** Explicit synthetic re-render after fixture publication inputs have been prepared. */
export async function refreshPresentationFixture(root: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  if (!record.contentApproval || !record.evidenceRefs?.editorial || record.format === "agent_review_required") throw new Error("Fixture approved editorial inputs are required.");
  const approval = record.contentApproval;
  const after = JSON.parse(await readFile(path.join(root, approval.artifactPath), "utf8"));
  if (fingerprintEditorialArtifact(after) !== approval.artifactFingerprint) throw new Error("Fixture content changed; editorial approval must be renewed before presentation.");
  const editorial = editorialExecutionSchema.parse(await readEvidence(root, record.evidenceRefs.editorial));
  const before = await readEvidence(root, editorial.passes[0].inputRef);
  const fresh = await buildWorkflowFixture(root, record, { format: record.format, artifactPath: approval.artifactPath, before, after, editorialEvidencePath: approval.editorialEvidencePath });
  for (const key of ["research", "assessment", "editorial"] as const) {
    if (fresh[key].sha256 !== record.evidenceRefs[key]?.sha256) throw new Error(`Fixture presentation refresh changed ${key} evidence.`);
  }
  return { ...record, evidenceRefs: { ...record.evidenceRefs, presentation: fresh.presentation } };
}
