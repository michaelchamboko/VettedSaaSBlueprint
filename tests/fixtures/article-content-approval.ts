import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { approveImportContent, recordImportPresentation } from "../../src/lib/article-import/engine";
import type { ExternalArticleImportV1 } from "../../src/lib/article-import/contracts";
import { createEditorialEvidence, editorialProsePaths, fingerprintEditorialArtifact, type EditorialFormat } from "../../src/lib/editorial/refinement";
import { samplePageBlueprint as baseBlueprint } from "./sample-page-blueprint";
import { importArtifactTarget } from "../../src/lib/article-import/format-validation";
import { buildWorkflowFixture } from "./article-workflow-evidence";
const samplePageBlueprint = { ...baseBlueprint, metadata: { ...baseBlueprint.metadata, url_slug: "example", canonical_url: "https://vettedsaasblueprint.online/imported-guide" } };

export const fullRewriteNotes = {
  semanticNotes: "Reviewed the complete rewritten prose; meaning, qualification and protected fields are preserved.",
  exceptions: [], meaningPreserved: true, arrayOrderPreserved: true, rewriteMode: "full_article",
  writerModelFamily: "writer-family", cleanseModelFamily: "reviewer-family",
  passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, rivalFamilyCleanse: true, finalFidelityReview: true },
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

export async function prepareApprovalFixture(root: string, record: ExternalArticleImportV1) {
  const artifactPath = "src/generated/landing-pages/example.json";
  const editorialEvidencePath = "build-pack/editorial/example.json";
  const formatQualityPath = "build-pack/article-import/quality.json";
  const rewritten = rewriteAllProse("landing", samplePageBlueprint);
  const evidence = createEditorialEvidence("landing", samplePageBlueprint, rewritten, fullRewriteNotes,
    { before: "score 4/5 needs a cleanse", after: "score 5/5 CLEAN" });
  for (const [file, value] of [[artifactPath, rewritten], [editorialEvidencePath, evidence], [formatQualityPath, { format: "direct-review", artifactFingerprint: fingerprintEditorialArtifact(rewritten), passed: true, gate: "landing:quality:candidate" }]] as const) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), JSON.stringify(value));
  }
  const evidenceRefs = await buildWorkflowFixture(root, record, { format: "direct-review", artifactPath, before: samplePageBlueprint, after: rewritten, editorialEvidencePath });
  return { artifactPath, editorialEvidencePath, formatQualityPath, evidenceRefs };
}

export async function approveFixture(root: string, record: ExternalArticleImportV1) {
  const { evidenceRefs, ...files } = await prepareApprovalFixture(root, record);
  return approveImportContent(root, { ...record, evidenceRefs }, files);
}

export async function presentFixture(root: string, record: ExternalArticleImportV1) {
  if (!record.contentApproval) throw new Error("Fixture content approval is required.");
  const evidencePath = "build-pack/article-import/verifier.json";
  const approvedArtifact = JSON.parse(await readFile(path.join(root, record.contentApproval.artifactPath), "utf8"));
  const snapshot = { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [] };
  await mkdir(path.dirname(path.join(root, evidencePath)), { recursive: true });
  await writeFile(path.join(root, evidencePath), JSON.stringify({ schemaVersion: "ImportVerifierEvidenceV1", target: importArtifactTarget("direct-review", approvedArtifact), result: { verificationMode: "candidate", origin: "http://127.0.0.1:3000", canonicalOrigin: "https://vettedsaasblueprint.online", status: "pass", robots_ok: true, sitemap_ok: true, pages: [{ path: "/imported-guide", desktop: snapshot, mobile: snapshot }] } }));
  return recordImportPresentation(root, record, {
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
  });
}
