import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { approveImportContent } from "../../src/lib/article-import/engine";
import type { ExternalArticleImportV1 } from "../../src/lib/article-import/contracts";
import { createEditorialEvidence, fingerprintEditorialArtifact } from "../../src/lib/editorial/refinement";
import { samplePageBlueprint } from "./sample-page-blueprint";

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
