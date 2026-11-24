import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { advanceImport, approveImportContent, loadImport, recordImportPresentation, verifyImportRelease, writeJsonAtomically, type ImportStageExecutor } from "./engine";
import { importFormatSchema } from "./contracts";
import { assertIgnoredImportStatePath } from "./automation-state";
import { validateImportArtifact, importArtifactTarget } from "./format-validation";
import { createLocalReleaseOperations } from "./local-release-adapter";
import { assessImportRelease, assertArtifactCommercialSafety, recordImportCodeReview, type ReleaseOperations } from "./release";
import { evidenceReference, validateResearchEvidence } from "./workflow-evidence";
import { instructionsForStage, WORKFLOW_REVISION, workflowRequirements } from "./workflow-requirements";
import { applyPublicationProposals, publicationProposals } from "./worker-publication";
import { captureRenderingInputs, requiredDetectorInputs, validateRenderingInputs } from "./rendering-inputs";

const file = z.string().min(1);
const resultSchema = z.object({
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  summary: z.string().min(1),
  work: z.discriminatedUnion("stage", [
    z.object({ stage: z.literal("RESEARCHING"), evidencePath: file }).strict(),
    z.object({ stage: z.literal("TRANSFORMING"), artifactPath: file, assessmentPath: file, format: importFormatSchema.exclude(["agent_review_required"]) }).strict(),
    z.object({ stage: z.literal("REFINING"), artifactPath: file, assessmentPath: file, editorialExecutionPath: file, editorialEvidencePath: file, formatQualityPath: file }).strict(),
    z.object({ stage: z.literal("VALIDATING"), validationGate: file, validationReceiptPath: file, presentationEvidencePath: file }).strict(),
    z.object({ stage: z.literal("RELEASING"), artifactPath: file, changedFiles: z.array(file).min(1), slug: file.optional(), codeReviewPath: file.optional() }).strict(),
  ]),
}).strict();

async function readRepositoryJson(root: string, file: string): Promise<unknown> {
  const canonicalRoot = await realpath(root);
  const target = await realpath(path.resolve(root, file));
  const relative = path.relative(canonicalRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Stage result files must be inside the repository.");
  return JSON.parse(await readFile(target, "utf8"));
}

const workStages = ["RESEARCHING","TRANSFORMING","REFINING","VALIDATING","RELEASING"] as const;

/** Codex owns authoring; the runtime validates its durable stage output and executes local operations. */
export function createSupervisedImportExecutor(root: string, releaseOperations?: ReleaseOperations): ImportStageExecutor {
  return async (context) => {
    let { record } = context;
    await context.assertLease();
    if (record.stage === "INGESTING") return advanceImport(root, record, "Captured source is ready for evidence research.");
    if (record.stage === "VERIFYING") return verifyImportRelease(root, record);
    if (!(workStages as readonly string[]).includes(record.stage)) throw new Error(`No productive work for ${record.stage}.`);
    const stage = record.stage as typeof workStages[number];
    const directory = `.automation/article-imports/work/${record.importId}`;
    const workPath = `${directory}/${context.idempotencyKey}.work.json`;
    const resultPath = `${directory}/${context.idempotencyKey}.result.json`;
    await assertIgnoredImportStatePath(root, workPath);
    await assertIgnoredImportStatePath(root, resultPath);
    let renderingInputs;
    if (stage === "VALIDATING" && record.contentApproval && record.format !== "agent_review_required") {
      const reference = await captureRenderingInputs(root, record.importId);
      const manifest = await validateRenderingInputs(root, reference);
      const target = importArtifactTarget(record.format, await readRepositoryJson(root, record.contentApproval.artifactPath));
      renderingInputs = { reference, detectorTargets: requiredDetectorInputs(manifest, target) };
    }
    await writeJsonAtomically(path.join(root, workPath), {
      schemaVersion: "ImportSupervisedWorkV1", importId: record.importId,
      sourceFingerprint: record.sourceFingerprint, stage, strategy: context.strategy, attempt: context.attempt,
      idempotencyKey: context.idempotencyKey, sourcePath: `.automation/article-imports/${record.importId}.source.md`,
      record, resultSchema: z.toJSONSchema(resultSchema), requirementRevision: WORKFLOW_REVISION, requirements: workflowRequirements, renderingInputs,
      ...(stage === "REFINING" && { publicationProposals: publicationProposals(record.importId, context.idempotencyKey, record.format) }),
      instructions: instructionsForStage(stage), resultPath,
      resultContract: { idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Describe completed work and evidence.", work: { stage } },
      resumeCommand: `npm run import:article -- --resume ${record.importId}`,
    });
    let raw: unknown;
    try { raw = await readRepositoryJson(root, resultPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return { ...record, continuation: { kind: "work", stage, workPath, resultPath, idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint }, nextAction: `Supervising agent: execute ${workPath}, write its result to ${resultPath}, then explicitly resume this import.` };
    }
    const result = resultSchema.parse(raw);
    if (result.idempotencyKey !== context.idempotencyKey || result.sourceFingerprint !== record.sourceFingerprint || result.work.stage !== stage) throw new Error("STAGE_RESULT_BINDING_MISMATCH");
    await context.assertLease();
    const work = result.work;
    switch (work.stage) {
      case "RESEARCHING": {
        const research = await evidenceReference(root, work.evidencePath);
        await validateResearchEvidence(root, research, record);
        record = { ...record, evidenceRefs: { ...record.evidenceRefs, research } };
        return advanceImport(root, record, `${result.summary} Evidence: ${work.evidencePath}`);
      }
      case "TRANSFORMING": {
        const artifact = await readRepositoryJson(root, work.artifactPath);
        validateImportArtifact(work.format, artifact);
        assertArtifactCommercialSafety(record, work.format, artifact);
        record = { ...record, format: work.format, artifactPath: work.artifactPath, evidenceRefs: { ...record.evidenceRefs, assessment: await evidenceReference(root, work.assessmentPath) } };
        return advanceImport(root, record, `${result.summary} Artifact: ${work.artifactPath}`);
      }
      case "REFINING":
        record = { ...record, artifactPath: work.artifactPath, evidenceRefs: { ...record.evidenceRefs, assessment: await evidenceReference(root, work.assessmentPath), editorial: await evidenceReference(root, work.editorialExecutionPath) } };
        record = await approveImportContent(root, record, work);
        await applyPublicationProposals(root, record, context.idempotencyKey, context.assertLease);
        return advanceImport(root, record, result.summary);
      case "VALIDATING":
        record = { ...record, evidenceRefs: { ...record.evidenceRefs, presentation: await evidenceReference(root, work.presentationEvidencePath) } };
        record = await recordImportPresentation(root, record, { validationGate: work.validationGate, validationReceipt: await readRepositoryJson(root, work.validationReceiptPath) });
        return record.stage === "VALIDATING" && record.presentation ? advanceImport(root, record, result.summary) : record;
      case "RELEASING": {
        const operations = releaseOperations ?? createLocalReleaseOperations(root, { format: record.format, artifactPath: work.artifactPath, slug: work.slug, importId: record.importId, sourceFingerprint: record.sourceFingerprint });
        if (work.codeReviewPath) {
          await assertIgnoredImportStatePath(root, work.codeReviewPath);
          record = await recordImportCodeReview(root, record, await readRepositoryJson(root, work.codeReviewPath), operations);
        }
        await assessImportRelease({ repositoryRoot: root, record, artifactPath: work.artifactPath, slug: work.slug, changedFiles: work.changedFiles, execute: true, operations });
        return loadImport(root, record.importId);
      }
    }
  };
}
