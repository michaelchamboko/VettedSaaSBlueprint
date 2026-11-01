import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { advanceImport, approveImportContent, loadImport, recordImportPresentation, verifyImportRelease, writeJsonAtomically, type ImportStageExecutor } from "./engine";
import { importFormatSchema } from "./contracts";
import { assertIgnoredImportStatePath } from "./automation-state";
import { validateImportArtifact } from "./format-validation";
import { createLocalReleaseOperations } from "./local-release-adapter";
import { assessImportRelease, assertArtifactCommercialSafety, recordImportCodeReview, type ReleaseOperations } from "./release";

const file = z.string().min(1);
const resultSchema = z.object({
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  summary: z.string().min(1),
  work: z.discriminatedUnion("stage", [
    z.object({ stage: z.literal("RESEARCHING"), evidencePath: file }).strict(),
    z.object({ stage: z.literal("TRANSFORMING"), artifactPath: file, format: importFormatSchema.exclude(["agent_review_required"]) }).strict(),
    z.object({ stage: z.literal("REFINING"), artifactPath: file, editorialEvidencePath: file, formatQualityPath: file }).strict(),
    z.object({ stage: z.literal("VALIDATING"), validationGate: file, validationReceiptPath: file }).strict(),
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

const instructions = {
  RESEARCHING: "Research material claims using attributable sources. Write evidence JSON with a nonempty sources array of {url, claims}. Record removals and uncertainty. Do not draft or approve content in this stage.",
  TRANSFORMING: "Use the research evidence to create the existing format schema. Remove unsupported claims and use only the resolved affiliate URL. Record artifactPath and supported format; this is not editorial approval.",
  REFINING: "Perform the mandatory full-article SlopMonster rewrite in .agents/skills/eleanor-editorial/SKILL.md. Rewrite every editable prose field through the purpose/structure, meaning/evidence, and wording/rhythm passes; complete the cleanse with a different model family; run the final fidelity review and require a 5/5 CLEAN score. Preserve protected facts, evidence, URLs, quotations, disclosures, IDs and schema structure. Record artifactPath, EditorialEvidenceV2 at editorialEvidencePath, and formatQualityPath. If any pass, rival-family cleanse, full prose coverage, protected-field comparison or final check is missing, remain in REFINING.",
  VALIDATING: "Render the approved artifact without rewriting words. For every new or materially changed public page, record the mandatory Impeccable context, shape, critique, audit, detect and polish evidence; the identity pilot also records init, document and extract, and feature-triggered specialists record passed or not applicable. Inspect desktop/mobile, accessibility, technical SEO, overflow and runtime errors. Write ImportPresentationValidationV1 and record validationReceiptPath and validationGate. A wording issue must return to editorial review.",
  RELEASING: "Record artifactPath, changedFiles, and slug for a direct review; publication authority files must be included in changedFiles. The release adapter always verifies against the canonical production origin; no origin is accepted from stage results. The local Git/Vercel adapter runs the release gates and creates a PR. After independent current-head Codex review, add codeReviewPath under ignored .automation/article-imports/reviews/; keep results at resultPath. A clean exact head is merged and deployed automatically. Never fabricate review, merge or deployment evidence.",
} as const;

/** Codex owns authoring; the runtime validates its durable stage output and executes local operations. */
export function createSupervisedImportExecutor(root: string, releaseOperations?: ReleaseOperations): ImportStageExecutor {
  return async (context) => {
    let { record } = context;
    await context.assertLease();
    if (record.stage === "INGESTING") return advanceImport(root, record, "Captured source is ready for evidence research.");
    if (record.stage === "VERIFYING") return verifyImportRelease(root, record);
    if (!(record.stage in instructions)) throw new Error(`No productive work for ${record.stage}.`);
    const stage = record.stage as keyof typeof instructions;
    const directory = `.automation/article-imports/work/${record.importId}`;
    const workPath = `${directory}/${context.idempotencyKey}.work.json`;
    const resultPath = `${directory}/${context.idempotencyKey}.result.json`;
    await assertIgnoredImportStatePath(root, workPath);
    await assertIgnoredImportStatePath(root, resultPath);
    await writeJsonAtomically(path.join(root, workPath), {
      schemaVersion: "ImportSupervisedWorkV1", importId: record.importId,
      sourceFingerprint: record.sourceFingerprint, stage, strategy: context.strategy, attempt: context.attempt,
      idempotencyKey: context.idempotencyKey, sourcePath: `.automation/article-imports/${record.importId}.source.md`,
      record, instructions: instructions[stage], resultPath,
      resultContract: { idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Describe completed work and evidence.", work: { stage } },
      resumeCommand: `npm run import:article -- --resume ${record.importId}`,
    });
    let raw: unknown;
    try { raw = await readRepositoryJson(root, resultPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return { ...record, continuation: { kind: "work", stage, workPath, resultPath, idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint }, nextAction: `Supervising heartbeat agent: execute ${workPath}, write its result to ${resultPath}, then resume this import.` };
    }
    const result = resultSchema.parse(raw);
    if (result.idempotencyKey !== context.idempotencyKey || result.sourceFingerprint !== record.sourceFingerprint || result.work.stage !== stage) throw new Error("STAGE_RESULT_BINDING_MISMATCH");
    await context.assertLease();
    const work = result.work;
    switch (work.stage) {
      case "RESEARCHING":
        z.object({ sources: z.array(z.object({ url: z.string().url(), claims: z.array(z.string().min(1)).min(1) }).passthrough()).min(1) }).passthrough().parse(await readRepositoryJson(root, work.evidencePath));
        return advanceImport(root, record, `${result.summary} Evidence: ${work.evidencePath}`);
      case "TRANSFORMING": {
        const artifact = await readRepositoryJson(root, work.artifactPath);
        validateImportArtifact(work.format, artifact);
        assertArtifactCommercialSafety(record, work.format, artifact);
        record = { ...record, format: work.format };
        return advanceImport(root, record, `${result.summary} Artifact: ${work.artifactPath}`);
      }
      case "REFINING":
        record = await approveImportContent(root, record, work);
        return advanceImport(root, record, result.summary);
      case "VALIDATING":
        record = await recordImportPresentation(root, record, { validationGate: work.validationGate, validationReceipt: await readRepositoryJson(root, work.validationReceiptPath) });
        return record.stage === "VALIDATING" && record.presentation ? advanceImport(root, record, result.summary) : record;
      case "RELEASING": {
        const operations = releaseOperations ?? createLocalReleaseOperations(root, { format: record.format, artifactPath: work.artifactPath, slug: work.slug, importId: record.importId });
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
