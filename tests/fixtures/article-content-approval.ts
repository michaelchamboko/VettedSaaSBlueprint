import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { approveImportContent, recordImportPresentation } from "../../src/lib/article-import/engine";
import type { ExternalArticleImportV1 } from "../../src/lib/article-import/contracts";
import { createEditorialEvidence, fingerprintEditorialArtifact } from "../../src/lib/editorial/refinement";
import { samplePageBlueprint as baseBlueprint } from "./sample-page-blueprint";
import { importArtifactTarget } from "../../src/lib/article-import/format-validation";
const samplePageBlueprint = { ...baseBlueprint, metadata: { ...baseBlueprint.metadata, url_slug: "example", canonical_url: "https://vettedsaasblueprint.online/imported-guide" } };

export async function approveFixture(root: string, record: ExternalArticleImportV1) {
  const artifactPath = "src/generated/landing-pages/example.json";
  const editorialEvidencePath = "build-pack/editorial/example.json";
  const formatQualityPath = "build-pack/article-import/quality.json";
  const evidence = createEditorialEvidence("landing", samplePageBlueprint, samplePageBlueprint,
    { semanticNotes: "Reviewed the prose and preserved meaning and protected fields.", exceptions: [], meaningPreserved: true, arrayOrderPreserved: true },
    { before: "No findings.", after: "No findings." });
  for (const [file, value] of [[artifactPath, samplePageBlueprint], [editorialEvidencePath, evidence], [formatQualityPath, { format: "direct-review", artifactFingerprint: fingerprintEditorialArtifact(samplePageBlueprint), passed: true, gate: "landing:quality:candidate" }]] as const) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), JSON.stringify(value));
  }
  return approveImportContent(root, record, { artifactPath, editorialEvidencePath, formatQualityPath });
}

export async function presentFixture(root: string, record: ExternalArticleImportV1) {
  if (!record.contentApproval) throw new Error("Fixture content approval is required.");
  const evidencePath = "build-pack/article-import/verifier.json";
  const snapshot = { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [] };
  await mkdir(path.dirname(path.join(root, evidencePath)), { recursive: true });
  await writeFile(path.join(root, evidencePath), JSON.stringify({ schemaVersion: "ImportVerifierEvidenceV1", target: importArtifactTarget("direct-review", samplePageBlueprint), result: { status: "pass", robots_ok: true, sitemap_ok: true, pages: [{ path: "/imported-guide", desktop: snapshot, mobile: snapshot }] } }));
  return recordImportPresentation(root, record, {
    validationGate: "fixture:rendered-layout",
    validationReceipt: {
      schemaVersion: "ImportPresentationValidationV1",
      format: record.format,
      artifactFingerprint: record.contentApproval.artifactFingerprint,
      renderedRoutes: ["/imported-guide"],
      checks: { desktop: true, mobile: true, accessibility: true, technicalSeo: true, overflow: true, runtimeErrors: true },
      evidencePaths: [evidencePath],
      notes: "Mocked browser evidence for importer state tests.",
    },
  });
}
