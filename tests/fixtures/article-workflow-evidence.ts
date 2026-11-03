/** Synthetic adapter fixtures only. Never use these producers from the production CLI. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifactProseProjection, evidenceReference, storeEvidence, type EvidenceRef } from "../../src/lib/article-import/workflow-evidence";
import { extractOpenCodeExecution, proseProjectionDigest, sha256 } from "../../src/lib/article-import/execution-evidence";
import { WORKFLOW_REVISION, workflowRequirements } from "../../src/lib/article-import/workflow-requirements";
import { editorialProsePaths, fingerprintEditorialArtifact } from "../../src/lib/editorial/refinement";
import { importArtifactTarget } from "../../src/lib/article-import/format-validation";

const families = { "fixture/writer": "fixture-writer-family", "fixture/cleanser": "fixture-cleanser-family" };
const now = "2026-11-03T00:00:00.000Z";
type RecordIdentity = { importId: string; sourceFingerprint: string };
export async function buildWorkflowFixture(root: string, record: RecordIdentity, input: { format: "direct-review" | "blog" | "visibility" | "decision-set"; artifactPath: string; before: unknown; after: unknown; editorialEvidencePath: string }) {
  await mkdir(path.join(root, "config"), { recursive: true });
  await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "1.19.4", modelFamilies: families, files: [] }));
  const common = { id: "synthetic-adapter-fixture", createdAt: now, importId: record.importId, sourceFingerprint: record.sourceFingerprint, requirementRevision: WORKFLOW_REVISION };
  const save = (value: unknown) => storeEvidence(root, record.importId, value);
  const packet = (stage: string) => sha256(`${record.importId}:${record.sourceFingerprint}:${stage}:${stage === "TRANSFORMING" ? "field-repair" : "targeted-repair"}`);
  const beforeRef = await save(input.before), afterRef = await evidenceReference(root, input.artifactPath);
  const instructionRef = await save({ instruction: "Synthetic fixture instruction; tests exercise adapter binding, not semantic quality." });
  async function model(pass: string, before: unknown, after: unknown, inputRef: EvidenceRef, outputRef: EvidenceRef, modelId = "writer", reviewOutput?: Record<string, string>) {
    const projection = artifactProseProjection(input.format, before), result = reviewOutput ?? artifactProseProjection(input.format, after);
    const packetId = packet("REFINING");
    return save(extractOpenCodeExecution({ info: { id: "fixture-session" }, messages: [
      { info: { id: "fixture-user", role: "user", sessionID: "fixture-session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass, prose: projection, digest: proseProjectionDigest(projection) }) }] },
      { info: { id: "fixture-assistant", role: "assistant", sessionID: "fixture-session", parentID: "fixture-user", providerID: "fixture", modelID: modelId, time: { created: 1793664000000, completed: 1793664001000 }, finish: "stop" }, parts: [{ type: "reasoning", text: "Must never be retained." }, { type: "text", text: JSON.stringify(result) }] },
    ] }, { version: "1.19.4", sessionId: "fixture-session", userMessageId: "fixture-user", assistantMessageId: "fixture-assistant", packetId, pass, input: projection, output: result, families, inputRefs: [inputRef], outputRefs: [outputRef] }));
  }
  const researchSnapshot = await save({ source: "Synthetic source supports this scoped fixture claim." });
  const research = await save({ ...common, schemaVersion: "ResearchEvidenceV2", sources: [{ id: "source", url: "https://example.test/source", retrievedAt: now, snapshotRef: researchSnapshot }], claims: [{ id: "claim", text: "Synthetic source supports this scoped fixture claim.", sourceIds: ["source"], excerptLocations: [{ sourceId: "source", quote: "Synthetic source supports this scoped fixture claim." }], limitations: ["Synthetic fixture; no real research."] }], freshness: "Fixed synthetic input for deterministic tests." });
  const format = { "direct-review": "landing", blog: "blog", visibility: "visibility", "decision-set": "decision" } as const;
  const schemaRevision = { "direct-review": "PageBlueprintV1", blog: "BlogPostV1", visibility: "VisibilityPageV1", "decision-set": "DecisionSetV2" }[input.format];
  const paths = editorialProsePaths(format[input.format], input.after);
  const passNames = ["purposeAndStructure", "meaningAndEvidence", "wordingAndRhythm", "rivalFamilyCleanse", "finalFidelityReview"];
  const passes = [];
  for (const [index, name] of passNames.entries()) {
    const initial = index === 0 ? input.before : input.after, initialRef = index === 0 ? beforeRef : afterRef;
    const judgment = { pass: name, coveredPaths: paths, verdict: "pass", findings: [], semanticNotes: "Synthetic scoped judgment for adapter regression tests.", meaningPreserved: true, protectedFieldsPreserved: true };
    const judgmentExecution = await model(`${name}-judgment`, input.after, input.after, afterRef, afterRef, "writer", { judgment: JSON.stringify(judgment) });
    passes.push({ name, inputRef: initialRef, outputRef: afterRef, instructionRefs: [instructionRef], executionRef: await model(name, initial, input.after, initialRef, afterRef, index === 3 ? "cleanser" : "writer"), judgmentRef: await save({ ...judgment, executionRef: judgmentExecution }) });
  }
  const checkerExecutionRef = await save({ schemaVersion: "ExecutionEvidenceV1", kind: "command", toolVersion: "fixture-1", startedAt: now, completedAt: now, inputRefs: [afterRef], outputRefs: [], executable: "fixture-deslop", argv: [], cwd: root, stdout: "score 5/5 CLEAN", stderr: "", exitCode: 0 });
  const editorial = await save({ ...common, schemaVersion: "EditorialExecutionV1", format: input.format, editorialEvidenceRef: await evidenceReference(root, input.editorialEvidencePath), schemaRevision, eligibleProsePaths: paths, passes, checkerExecutionRef });
  const assessed = { intent: { audience: "Fixture reader", decision: "Fixture decision", query: "Fixture query", pageType: input.format }, claimCoverage: [{ claimId: "claim", artifactPaths: [paths[0]] }], ruleResults: workflowRequirements.map((rule) => ({ ruleId: rule.id, revision: WORKFLOW_REVISION, status: "pass", rationale: "Synthetic assessment for pipeline tests.", evidenceRefs: [research] })), findings: [] };
  const assessment = await save({ ...common, schemaVersion: "ContentAssessmentV1", format: input.format, artifactFingerprint: fingerprintEditorialArtifact(input.after), schemaRevision, ...assessed, researchRef: research, reviewerExecutionRef: await model("content-assessment", input.after, input.after, afterRef, afterRef, "writer", { assessment: JSON.stringify(assessed) }) });
  const rules = ["design-read", "context", "shape", "critique", "audit", "detect", "polish", "desktop", "mobile", "reduced-motion"];
  const target = importArtifactTarget(input.format, input.after);
  const ruleResults = [];
  for (const rule of rules) {
    const execution = ["desktop", "mobile", "reduced-motion"].includes(rule)
      ? { schemaVersion: "ExecutionEvidenceV1", kind: "browser", toolVersion: "fixture-1", startedAt: now, completedAt: now, inputRefs: [afterRef], outputRefs: [], target: "http://127.0.0.1:3000", routes: target.renderedRoutes, viewport: { width: rule === "mobile" ? 390 : 1440, height: 900, reducedMotion: rule === "reduced-motion" }, checks: { rendered: true }, screenshots: [await save({ screenshot: "synthetic browser fixture" })] }
      : { schemaVersion: "ExecutionEvidenceV1", kind: "command", toolVersion: "fixture-1", startedAt: now, completedAt: now, inputRefs: [afterRef], outputRefs: [], executable: "fixture-impeccable", argv: [rule], cwd: root, stdout: `Synthetic ${rule} inspection`, stderr: "", exitCode: 0 };
    ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: `Synthetic ${rule} evidence.`, evidenceRefs: [await save(execution)] });
  }
  const presentation = await save({ ...common, schemaVersion: "WorkflowEvidenceV1", stage: "VALIDATING", packetId: packet("VALIDATING"), artifactRef: afterRef, predecessorRefs: [assessment, editorial], ruleResults });
  return { research, assessment, editorial, presentation };
}
