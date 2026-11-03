/** Synthetic adapter fixtures only. Never use these producers from the production CLI. */
import { mkdir, writeFile } from "node:fs/promises";
import { importPacketId } from "../../src/lib/article-import/packet-binding";
import path from "node:path";
import { artifactProseProjection, contentAssessmentReviewInput, designReviewInput, editorialJudgmentReviewInput, editorialPassReviewInput, evidenceReference, readEvidence, storeEvidence, type EvidenceRef } from "../../src/lib/article-import/workflow-evidence";
import { extractOpenCodeExecution, proseProjectionDigest, sha256 } from "../../src/lib/article-import/execution-evidence";
import { WORKFLOW_REVISION, workflowRequirements } from "../../src/lib/article-import/workflow-requirements";
import { editorialProse, editorialProsePaths, fingerprintEditorialArtifact, EDITORIAL_REVISION } from "../../src/lib/editorial/refinement";
import { importArtifactTarget } from "../../src/lib/article-import/format-validation";
import { captureRenderingInputs, detectorCoreFiles, renderingInputsSchema, requiredDetectorInputs } from "../../src/lib/article-import/rendering-inputs";

const families = { "fixture/writer": "fixture-writer-family", "fixture/cleanser": "fixture-cleanser-family" };
const now = "2026-11-03T00:00:00.000Z";
type RecordIdentity = { importId: string; sourceFingerprint: string; researchGeneration?: number };
export async function buildWorkflowFixture(root: string, record: RecordIdentity, input: { format: "direct-review" | "blog" | "visibility" | "decision-set"; artifactPath: string; before: unknown; after: unknown; editorialEvidencePath: string }) {
  await mkdir(path.join(root, "config"), { recursive: true });
  const editorialFiles = ["SKILL.md", "references/principles.md", "references/signs-of-ai-writing.md", "references/dr-eleanor-hayes.md", "prompts/cleanse.txt"].map((file) => `.agents/skills/eleanor-editorial/${file}`);
  const designFiles = ["SKILL.md", "reference/craft-floor.md", "reference/shape.md", "reference/critique.md", "reference/audit.md", "reference/polish.md"].map((file) => `.agents/skills/impeccable/${file}`).concat(".agents/skills/design-taste-frontend/SKILL.md");
  const checkerFile = ".agents/skills/eleanor-editorial/tools/deslop.py", detectorFile = ".agents/skills/impeccable/scripts/bin/windows-x64/impeccable.exe", detectorVersion = ".agents/skills/impeccable/scripts/VERSION";
  const pinFiles = [...editorialFiles, ...designFiles, checkerFile, detectorFile, detectorVersion];
  const pinned = new Map<string, { path: string; sha256: string; text: string }>();
  for (const file of pinFiles) {
    const text = file === detectorVersion ? "0.1.5\n" : `Synthetic pinned fixture: ${file}\n`;
    await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), text);
    pinned.set(file, { path: file, sha256: sha256(text), text });
  }
  const pinRef = (file: string) => { const pin = pinned.get(file)!; return { path: pin.path, sha256: pin.sha256 }; };
  await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "1.19.4", modelFamilies: families, files: pinFiles.map(pinRef) }));
  const common = { id: "synthetic-adapter-fixture", createdAt: now, importId: record.importId, sourceFingerprint: record.sourceFingerprint, requirementRevision: WORKFLOW_REVISION };
  const save = (value: unknown) => storeEvidence(root, record.importId, value);
  const packet = (stage: string) => importPacketId(record, stage, stage === "TRANSFORMING" ? "field-repair" : "targeted-repair");
  const beforeRef = await save(input.before), afterRef = await evidenceReference(root, input.artifactPath);
  async function model(pass: string, before: unknown, after: unknown, inputRef: EvidenceRef, outputRef: EvidenceRef, modelId = "writer", reviewOutput?: Record<string, string>, assessmentInput?: Record<string, string>) {
    const projection = assessmentInput ?? editorialPassReviewInput(before), result = reviewOutput ?? artifactProseProjection(input.format, after);
    const packetId = packet(pass.startsWith("design:") ? "VALIDATING" : "REFINING");
    const instructions = (pass.startsWith("design:") ? designFiles : editorialFiles).map((file) => pinned.get(file)!);
    return save(extractOpenCodeExecution({ info: { id: "fixture-session" }, messages: [
      { info: { id: "fixture-user", role: "user", sessionID: "fixture-session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass, prose: projection, digest: proseProjectionDigest(projection), instructions }) }] },
      { info: { id: "fixture-assistant", role: "assistant", sessionID: "fixture-session", parentID: "fixture-user", providerID: "fixture", modelID: modelId, time: { created: 1793664000000, completed: 1793664001000 }, finish: "stop" }, parts: [{ type: "reasoning", text: "Must never be retained." }, { type: "text", text: JSON.stringify(result) }] },
    ] }, { version: "1.19.4", sessionId: "fixture-session", userMessageId: "fixture-user", assistantMessageId: "fixture-assistant", packetId, pass, input: projection, output: result, families, instructions, inputRefs: [inputRef, ...(pass === "content-assessment" ? [research] : []), ...(pass.startsWith("design:") && renderInputsRef ? [renderInputsRef] : [])], outputRefs: [outputRef] }));
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
    const judgment = { pass: name, beforeFingerprint: fingerprintEditorialArtifact(initial), afterFingerprint: fingerprintEditorialArtifact(input.after), coveredPaths: paths, verdict: "pass", findings: [], semanticNotes: "Synthetic scoped judgment for adapter regression tests.", meaningPreserved: true, protectedFieldsPreserved: true };
    const judgmentExecution = await model(`${name}-judgment`, initial, input.after, initialRef, afterRef, "writer", { judgment: JSON.stringify(judgment) }, editorialJudgmentReviewInput(initial, input.after));
    passes.push({ name, inputRef: initialRef, outputRef: afterRef, instructionRefs: editorialFiles.map(pinRef), executionRef: await model(name, initial, input.after, initialRef, afterRef, index === 3 ? "cleanser" : "writer"), judgmentRef: await save({ ...judgment, executionRef: judgmentExecution }) });
  }
  const checkerExecutionRef = await save({ schemaVersion: "ExecutionEvidenceV1", kind: "command", toolVersion: EDITORIAL_REVISION, startedAt: now, completedAt: now, inputRefs: [afterRef, pinRef(checkerFile)], outputRefs: [], executable: "python", argv: [checkerFile, "--text", editorialProse(format[input.format], input.after)], cwd: root, stdout: "score 5/5 CLEAN", stderr: "", exitCode: 0 });
  const editorial = await save({ ...common, schemaVersion: "EditorialExecutionV1", format: input.format, editorialEvidenceRef: await evidenceReference(root, input.editorialEvidencePath), schemaRevision, eligibleProsePaths: paths, passes, checkerExecutionRef });
  const assessed = { format: input.format, schemaRevision, artifactFingerprint: fingerprintEditorialArtifact(input.after), sourceFingerprint: record.sourceFingerprint, requirementRevision: WORKFLOW_REVISION, researchRef: research, intent: { audience: "Fixture reader", decision: "Fixture decision", query: "Fixture query", pageType: input.format }, claimCoverage: [{ claimId: "claim", artifactPaths: [paths[0]] }], ruleResults: workflowRequirements.map((rule) => ({ ruleId: rule.id, revision: WORKFLOW_REVISION, status: "pass", rationale: "Synthetic assessment for pipeline tests.", evidenceRefs: [research] })), findings: [] };
  const reviewInput = await contentAssessmentReviewInput(root, input.after, await readEvidence(root, research), research);
  const assessment = await save({ ...common, schemaVersion: "ContentAssessmentV1", ...assessed, reviewerExecutionRef: await model("content-assessment", input.after, input.after, afterRef, afterRef, "writer", { assessment: JSON.stringify(assessed) }, reviewInput) });
  const rules = ["design-read", "context", "shape", "critique", "audit", "detect", "polish", "desktop", "mobile", "reduced-motion"];
  const target = importArtifactTarget(input.format, input.after);
  for (const file of [detectorCoreFiles[input.format], "src/app/layout.tsx", "src/app/globals.css", "src/styles/fixture-renderer.css", "package-lock.json"]) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    const bytes = file.endsWith(".css") ? "body { color: black; background: white; }\n" : file.endsWith(".tsx") ? "export default function Fixture() { return <main>Fixture</main>; }\n" : "{}";
    await writeFile(path.join(root, file), bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  }
  const renderInputsRef = await captureRenderingInputs(root, record.importId);
  const rendering = renderingInputsSchema.parse(await readEvidence(root, renderInputsRef));
  const detectorInputs = requiredDetectorInputs(rendering, target);
  const designInput = await designReviewInput(root, input.format, input.after, renderInputsRef);
  const ruleResults = [];
  for (const rule of rules) {
    if (["design-read", "context", "shape", "critique", "audit", "polish"].includes(rule)) {
      const review = { rule, artifactFingerprint: fingerprintEditorialArtifact(input.after), routes: target.renderedRoutes, renderInputsRef, renderingDigest: rendering.digest, verdict: "pass", findings: [], notes: `Synthetic scoped ${rule} review.` };
      ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: `Synthetic ${rule} evidence.`, evidenceRefs: [await model(`design:${rule}`, input.after, input.after, afterRef, afterRef, "writer", { designReview: JSON.stringify(review) }, designInput)] });
      continue;
    }
    if (rule === "detect") {
      const evidenceRefs = [];
      for (const scannedRef of detectorInputs) evidenceRefs.push(await save({ schemaVersion: "ExecutionEvidenceV1", kind: "command", toolVersion: "0.1.5", startedAt: now, completedAt: now, inputRefs: [afterRef, renderInputsRef, scannedRef, pinRef(detectorFile), pinRef(detectorVersion)], outputRefs: [], executable: detectorFile, argv: ["detect", "--json", "--no-config", scannedRef.path], cwd: root, stdout: "[]", stderr: "", exitCode: 0 }));
      ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: "Synthetic captured detector output for the complete required surface.", evidenceRefs });
      continue;
    }
    const execution = { schemaVersion: "ExecutionEvidenceV1", kind: "browser", toolVersion: "fixture-1", startedAt: now, completedAt: now, inputRefs: [afterRef, renderInputsRef], outputRefs: [], target: "http://127.0.0.1:3000", routes: target.renderedRoutes, viewport: { width: rule === "mobile" ? 390 : 1440, height: 900, reducedMotion: rule === "reduced-motion" }, checks: { rendered: true }, screenshots: [await save({ screenshot: "synthetic browser fixture" })] };
    ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: `Synthetic ${rule} evidence.`, evidenceRefs: [await save(execution)] });
  }
  const presentation = await save({ ...common, schemaVersion: "WorkflowEvidenceV1", stage: "VALIDATING", packetId: packet("VALIDATING"), artifactRef: afterRef, renderInputsRef, predecessorRefs: [assessment, editorial], ruleResults });
  return { research, assessment, editorial, presentation };
}
