import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { advanceImport, approveImportContent, loadImport, recordImportPresentation, verifyImportRelease, writeJsonAtomically, type ImportStageExecutor } from "./engine";
import { importFormatSchema, type ExternalArticleImportV1 } from "./contracts";
import { assertIgnoredImportStatePath } from "./automation-state";
import { importArtifactTarget } from "./format-validation";
import { createLocalReleaseOperations } from "./local-release-adapter";
import { assessImportRelease, assertArtifactCommercialSafety, recordImportCodeReview, requiredImportReleaseFiles, type ReleaseOperations } from "./release";
import { evidenceReference, validateResearchEvidenceForRegistry, withTransformingArtifact, workflowEvidenceSchema } from "./workflow-evidence";
import { instructionsForStage, releaseSteps, WORKFLOW_REVISION, workflowRequirements } from "./workflow-requirements";
import { applyPublicationProposals, publicationProposals } from "./worker-publication";
import { captureRenderingInputs, requiredDetectorInputs, validateRenderingInputs } from "./rendering-inputs";
import { researchRegistryDecisionSchema, researchRegistryPlanSchema, researchRegistryWritebackSchema, validateRegistryDecisionAgainstEvidence, validateRegistryDecisionPlan, type ArticleResearchRegistry, type ResearchRegistryDecision, type ResearchRegistryPlan } from "./research-registry";
import { NeonArticleResearchRegistry } from "./research-registry-neon";
import { articleHeroBindingSchema, articleHeroGenerationEvidenceSchema, articleHeroHandoff, articleHeroProviderOutputSchema, bindGeneratedArticleHero, validateArticleHeroBinding } from "./hero-image";
import { articleHeroFormatSchema } from "../article-heroes";
import { registerBrowserReviewEvidence, registerEditorialReviewEvidence, registeredReviewStatus, reuseBrowserReviewEvidence, reuseEditorialReviewEvidence, type ArticleReviewEvidenceRegistry } from "./review-evidence-registry";
import { activityAttempt, activityResultSchema, nextArticleActivity, recordArticleActivity, type ActivityBinding } from "./activity-checkpoints";

const file = z.string().min(1);
const resultBase = { idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/), sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/), summary: z.string().min(1) };
const researchPlanResultSchema = z.object({
  ...resultBase,
  work: z.object({ stage: z.literal("RESEARCHING"), researchAction: z.enum(["reuse", "acquire"]), registryDecisionPath: file, evidencePath: file.optional() }).strict(),
}).strict();
const heroGenerationResultSchema = z.object({
  ...resultBase,
  schemaVersion: z.literal("ArticleHeroImagegenResultV1"),
  handoffFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  work: z.object({ stage: z.literal("VALIDATING"), heroGenerationEvidencePath: file }).strict(),
}).strict();
const resultSchema = z.object({
  ...resultBase,
  work: z.discriminatedUnion("stage", [
    z.object({ stage: z.literal("RESEARCHING"), evidencePath: file, registryDecisionPath: file, registryWritebackPath: file.optional() }).strict(),
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
export function createSupervisedImportExecutor(root: string, releaseOperations?: ReleaseOperations, options?: { researchRegistry?: ArticleResearchRegistry; reviewEvidenceRegistry?: ArticleReviewEvidenceRegistry }): ImportStageExecutor {
  return async (context) => {
    let { record } = context;
    await context.assertLease();
    if (record.stage === "INGESTING") return advanceImport(root, record, "Captured source is ready for evidence research.");
    if (record.stage === "VERIFYING") return verifyImportRelease(root, record);
    if (!(workStages as readonly string[]).includes(record.stage)) throw new Error(`No productive work for ${record.stage}.`);
    const stage = record.stage as typeof workStages[number];
    if (options?.reviewEvidenceRegistry && stage === "REFINING") {
      const reuse = await reuseEditorialReviewEvidence(root, options.reviewEvidenceRegistry, record);
      record = { ...(reuse.record ?? record), reviewEvidence: { ...record.reviewEvidence, editorial: reuse.status } };
      if (reuse.record) return advanceImport(root, record, "Reused registered editorial judgment for the unchanged examined revision.");
    }
    if (options?.reviewEvidenceRegistry && stage === "VALIDATING") {
      const reuse = await reuseBrowserReviewEvidence(root, options.reviewEvidenceRegistry, record);
      record = { ...(reuse.record ?? record), reviewEvidence: { ...record.reviewEvidence, browser: reuse.status } };
      if (reuse.record) return advanceImport(root, record, "Reused registered browser observations for the unchanged examined revision.");
    }
    const directory = `.automation/article-imports/work/${record.importId}`;
    const validationGeneration = stage === "VALIDATING" && record.heroImage ? `.${record.heroImage.assetRef.sha256}` : "";
    let workPath = `${directory}/${context.idempotencyKey}${validationGeneration}.work.json`;
    let resultPath = `${directory}/${context.idempotencyKey}${validationGeneration}.result.json`;
    await assertIgnoredImportStatePath(root, workPath);
    await assertIgnoredImportStatePath(root, resultPath);
    if (stage === "RESEARCHING") {
      const registry = options?.researchRegistry ?? new NeonArticleResearchRegistry();
      const planWorkPath = `${directory}/${context.idempotencyKey}.research-plan.work.json`;
      const planResultPath = `${directory}/${context.idempotencyKey}.research-plan.result.json`;
      const acquisitionWorkPath = `${directory}/${context.idempotencyKey}.research-acquisition.work.json`;
      const acquisitionResultPath = `${directory}/${context.idempotencyKey}.research-acquisition.result.json`;
      for (const registryPath of [planWorkPath, planResultPath, acquisitionWorkPath, acquisitionResultPath]) await assertIgnoredImportStatePath(root, registryPath);
      let plan: ResearchRegistryPlan;
      try {
        const saved = await readRepositoryJson(root, planWorkPath) as { researchRegistry?: unknown };
        plan = researchRegistryPlanSchema.parse(saved.researchRegistry);
        if (plan.importId !== record.importId || plan.sourceFingerprint !== record.sourceFingerprint) throw new Error("RESEARCH_REGISTRY_BINDING_MISMATCH");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        const sourceText = await readFile(path.join(root, `.automation/article-imports/${record.importId}.source.md`), "utf8");
        plan = await registry.prepare({ importId: record.importId, sourceFingerprint: record.sourceFingerprint, sourceText, now: new Date().toISOString() });
      }
      const phase = record.continuation?.kind === "work" && record.continuation.workPath === acquisitionWorkPath ? "acquisition" : "plan";
      const basePacket = {
        schemaVersion: "ImportSupervisedWorkV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint,
        stage, strategy: context.strategy, attempt: context.attempt, idempotencyKey: context.idempotencyKey,
        sourcePath: `.automation/article-imports/${record.importId}.source.md`, record,
        requirementRevision: WORKFLOW_REVISION, requirements: workflowRequirements, researchRegistry: plan,
        resumeCommand: `npm run import:article -- --resume ${record.importId}`,
      };
      const ensureAcquisitionPacket = async (decision: ResearchRegistryDecision, decisionPath: string) => {
        try {
          const existing = await readRepositoryJson(root, acquisitionWorkPath) as { registryDecisionPath?: string; registryDecisionSha256?: string; researchRegistry?: { planFingerprint?: string } };
          if (existing.registryDecisionPath !== decisionPath || existing.researchRegistry?.planFingerprint !== plan.planFingerprint || !/^[a-f0-9]{64}$/.test(existing.registryDecisionSha256 ?? "")) throw new Error("RESEARCH_REGISTRY_ACQUISITION_PACKET_MISMATCH");
          return existing.registryDecisionSha256!;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        const decisionRef = await evidenceReference(root, decisionPath);
        await writeJsonAtomically(path.join(root, acquisitionWorkPath), {
          ...basePacket, researchPhase: "acquisition", registryDecision: decision, registryDecisionPath: decisionPath, registryDecisionSha256: decisionRef.sha256,
          registryWritebackSchema: z.toJSONSchema(researchRegistryWritebackSchema), approvedGaps: decision.claims.filter((claim) => claim.action === "researched_gap"), resultSchema: z.toJSONSchema(resultSchema),
          instructions: `${instructionsForStage(stage)} Web acquisition is approved only for approvedGaps. Reuse current claims and retained bytes without fetching them again. Research each approved gap, then produce one ResearchEvidenceV2 covering all planned claims. Preserve the original registry decision unchanged.`,
          resultPath: acquisitionResultPath,
          resultContract: { idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Complete only approved research gaps.", work: { stage, evidencePath: "build-pack/article-import/.../research.json", registryDecisionPath: decisionPath, registryWritebackPath: "build-pack/article-import/.../registry-writeback.json" } },
        });
        return decisionRef.sha256;
      };
      if (phase === "plan") {
        await writeJsonAtomically(path.join(root, planWorkPath), {
          ...basePacket, researchPhase: "plan", registryDecisionSchema: z.toJSONSchema(researchRegistryDecisionSchema), resultSchema: z.toJSONSchema(researchPlanResultSchema),
          instructions: `${instructionsForStage(stage)} First list every material claim and classify it against the exact registry claim, product context and retained snapshot. Write the bound ResearchRegistryDecisionV1 before any acquisition. This packet has no web access. If every claim has current supporting evidence, build ResearchEvidenceV2 only from retained registry bytes and return researchAction reuse. If any claim is stale, conflicting or missing, return researchAction acquire without doing research.`,
          resultPath: planResultPath,
          resultContract: { idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Record the pre-acquisition registry decision.", work: { stage, researchAction: "reuse-or-acquire", registryDecisionPath: "build-pack/article-import/.../registry-decision.json" } },
        });
        let raw: unknown;
        try { raw = await readRepositoryJson(root, planResultPath); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          return { ...record, continuation: { kind: "work", stage, workPath: planWorkPath, resultPath: planResultPath, idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint }, nextAction: `Supervising agent: execute ${planWorkPath}, write its result to ${planResultPath}, then explicitly resume this import.` };
        }
        const result = researchPlanResultSchema.parse(raw);
        if (result.idempotencyKey !== context.idempotencyKey || result.sourceFingerprint !== record.sourceFingerprint) throw new Error("STAGE_RESULT_BINDING_MISMATCH");
        const decision = researchRegistryDecisionSchema.parse(await readRepositoryJson(root, result.work.registryDecisionPath));
        validateRegistryDecisionPlan(plan, decision, plan.generatedAt);
        const acquisitionRequired = decision.claims.some((claim) => claim.action === "researched_gap");
        if ((result.work.researchAction === "acquire") !== acquisitionRequired) throw new Error("RESEARCH_REGISTRY_ACTION_MISMATCH");
        if (acquisitionRequired) {
          await ensureAcquisitionPacket(decision, result.work.registryDecisionPath);
          return { ...record, continuation: { kind: "work", stage, workPath: acquisitionWorkPath, resultPath: acquisitionResultPath, idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint }, nextAction: `Research only the approved gaps in ${acquisitionWorkPath}; write the bound result to ${acquisitionResultPath}.` };
        }
        if (!result.work.evidencePath) throw new Error("RESEARCH_REGISTRY_REUSE_EVIDENCE_REQUIRED");
        return finishRegistryResearch(root, record, context.idempotencyKey, result.summary, result.work.evidencePath, result.work.registryDecisionPath, undefined, plan, decision, registry);
      }
      const planResult = researchPlanResultSchema.parse(await readRepositoryJson(root, planResultPath));
      const decision = researchRegistryDecisionSchema.parse(await readRepositoryJson(root, planResult.work.registryDecisionPath));
      validateRegistryDecisionPlan(plan, decision, plan.generatedAt);
      if (!decision.claims.some((claim) => claim.action === "researched_gap")) throw new Error("RESEARCH_REGISTRY_ACQUISITION_NOT_REQUIRED");
      const frozenDecisionSha256 = await ensureAcquisitionPacket(decision, planResult.work.registryDecisionPath);
      if ((await evidenceReference(root, planResult.work.registryDecisionPath)).sha256 !== frozenDecisionSha256) throw new Error("RESEARCH_REGISTRY_DECISION_CHANGED_AFTER_ACQUISITION");
      let raw: unknown;
      try { raw = await readRepositoryJson(root, acquisitionResultPath); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        return { ...record, continuation: { kind: "work", stage, workPath: acquisitionWorkPath, resultPath: acquisitionResultPath, idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint }, nextAction: `Supervising agent: execute ${acquisitionWorkPath}, write its result to ${acquisitionResultPath}, then explicitly resume this import.` };
      }
      const result = resultSchema.parse(raw);
      if (result.idempotencyKey !== context.idempotencyKey || result.sourceFingerprint !== record.sourceFingerprint || result.work.stage !== stage) throw new Error("STAGE_RESULT_BINDING_MISMATCH");
      if (result.work.registryDecisionPath !== planResult.work.registryDecisionPath) throw new Error("RESEARCH_REGISTRY_DECISION_CHANGED_AFTER_ACQUISITION");
      if ((await evidenceReference(root, result.work.registryDecisionPath)).sha256 !== frozenDecisionSha256) throw new Error("RESEARCH_REGISTRY_DECISION_CHANGED_AFTER_ACQUISITION");
      if (!result.work.registryWritebackPath) throw new Error("RESEARCH_REGISTRY_WRITEBACK_REQUIRED");
      return finishRegistryResearch(root, record, context.idempotencyKey, result.summary, result.work.evidencePath, result.work.registryDecisionPath, result.work.registryWritebackPath, plan, decision, registry);
    }
    let renderingInputs;
    let requiredReleaseFiles: string[] | undefined;
    if (stage === "VALIDATING" && record.contentApproval && record.format !== "agent_review_required") {
      const artifact = await readRepositoryJson(root, record.contentApproval.artifactPath);
      const target = importArtifactTarget(record.format, artifact);
      if (!record.heroImage) {
        const heroGeneration = record.strategyAttempts["hero-generation"] ?? 0;
        const heroWorkPath = `${directory}/${context.idempotencyKey}.hero-image-${heroGeneration}.work.json`;
        const heroResultPath = `${directory}/${context.idempotencyKey}.hero-image-${heroGeneration}.result.json`;
        for (const heroPath of [heroWorkPath, heroResultPath]) await assertIgnoredImportStatePath(root, heroPath);
        const handoff = articleHeroHandoff(root, { importId: record.importId, sourceFingerprint: record.sourceFingerprint, format: articleHeroFormatSchema.parse(record.format),
          contentApproval: record.contentApproval }, target, artifact, heroGeneration);
        await writeJsonAtomically(path.join(root, heroWorkPath), {
          ...handoff, stage, idempotencyKey: context.idempotencyKey, supervisedHandoff: "chatgpt-imagegen",
          instructions: "Use built-in ChatGPT ImageGen with the exact prompt. Do not call a paid API or alternate image provider. Save the original returned PNG bytes at originalFile. Retain the tool's generated-image path/output hint in byte-bound ArticleHeroProviderOutputV1, reference it from genuine ArticleHeroGenerationEvidenceV1, and bind both records to the original PNG digest. The controller creates the deterministic WebP derivative. The provider record is retained tool-output provenance, not a signed OpenAI receipt. Missing ImageGen access is a shared capability blocker, not permission to substitute another provider.",
          resultPath: heroResultPath, resultSchema: z.toJSONSchema(heroGenerationResultSchema),
          generationEvidenceSchema: z.toJSONSchema(articleHeroGenerationEvidenceSchema),
          providerOutputSchema: z.toJSONSchema(articleHeroProviderOutputSchema),
          resultContract: { schemaVersion: "ArticleHeroImagegenResultV1", handoffFingerprint: handoff.handoffFingerprint, idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Generated the bound VettedSaaSBlueprint hero with built-in ChatGPT ImageGen.", work: { stage, heroGenerationEvidencePath: "build-pack/article-import/.../hero-generation.json" } },
          resumeCommand: `npm run import:article -- --resume ${record.importId}`,
        });
        let raw: unknown;
        try { raw = await readRepositoryJson(root, heroResultPath); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          return { ...record, continuation: { kind: "work", stage, workPath: heroWorkPath, resultPath: heroResultPath, idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint }, nextAction: `Supervising agent: generate the required hero through built-in ChatGPT ImageGen from ${heroWorkPath}, write ${heroResultPath}, then explicitly resume this import.` };
        }
        const result = heroGenerationResultSchema.parse(raw);
        if (result.idempotencyKey !== context.idempotencyKey || result.sourceFingerprint !== record.sourceFingerprint || result.handoffFingerprint !== handoff.handoffFingerprint) throw new Error("STAGE_RESULT_BINDING_MISMATCH");
        const bound = await bindGeneratedArticleHero(root, handoff, result.work.heroGenerationEvidencePath);
        record = { ...record, heroImage: articleHeroBindingSchema.parse(bound.binding), evidenceRefs: { ...record.evidenceRefs, hero: bound.evidenceRef }, continuation: undefined,
          nextAction: "Inspect the exact generated hero bytes and complete presentation validation." };
        // Persist the immutable generation before visual review. A rejected inspection can
        // then retain this generation in history and advance to a fresh ImageGen handoff.
        return record;
      } else {
        await validateArticleHeroBinding(root, record.heroImage, { format: record.format, slug: target.slug, artifactFingerprint: record.contentApproval.artifactFingerprint });
      }
      const reference = await captureRenderingInputs(root, record.importId);
      const manifest = await validateRenderingInputs(root, reference);
      renderingInputs = { reference, detectorTargets: requiredDetectorInputs(manifest, target) };
    }
    if (stage === "RELEASING" && record.contentApproval && record.format !== "agent_review_required") {
      const artifact = await readRepositoryJson(root, record.contentApproval.artifactPath);
      const target = importArtifactTarget(record.format, artifact);
      requiredReleaseFiles = requiredImportReleaseFiles({
        format: record.format,
        approvedArtifactPath: record.contentApproval.artifactPath,
        slug: target.slug,
        includeHero: Boolean(record.heroImage),
      }).all;
    }
    let activity: ActivityBinding | undefined;
    if (stage === "REFINING" || stage === "VALIDATING") {
      let historicalStageResult = false;
      if (record.activityProtocolVersion !== 1) {
        try { await readRepositoryJson(root, resultPath); historicalStageResult = true; }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
      if (!historicalStageResult) {
        activity = await nextArticleActivity(root, record, renderingInputs?.reference);
        if (activity) {
          const attempt = activityAttempt(record, activity);
          workPath = `${directory}/${context.idempotencyKey}.${activity.id}.${attempt}.work.json`;
          resultPath = `${directory}/${context.idempotencyKey}.${activity.id}.${attempt}.result.json`;
          await assertIgnoredImportStatePath(root, workPath);
          await assertIgnoredImportStatePath(root, resultPath);
        }
      }
    }
    await writeJsonAtomically(path.join(root, workPath), {
      schemaVersion: "ImportSupervisedWorkV1", importId: record.importId,
      sourceFingerprint: record.sourceFingerprint, stage, strategy: context.strategy, attempt: context.attempt,
      idempotencyKey: context.idempotencyKey, sourcePath: `.automation/article-imports/${record.importId}.source.md`,
      record, resultSchema: z.toJSONSchema(activity ? activityResultSchema : resultSchema), requirementRevision: WORKFLOW_REVISION, requirements: workflowRequirements, renderingInputs,
      ...(activity && { activity }),
      ...(stage === "RELEASING" && { releaseSteps }),
      ...(requiredReleaseFiles && { requiredReleaseFiles }),
      ...(stage === "REFINING" && { publicationProposals: publicationProposals(record.importId, context.idempotencyKey, record.format) }),
      instructions: activity ? `${instructionsForStage(stage)} Complete only activity ${activity.id}. Record an attributable accepted, rejected, unverified, or justified not-applicable review against the bound inputs and criterion.` : instructionsForStage(stage), resultPath,
      resultContract: activity ? { idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Describe the completed activity review.", activity: { ...activity, reviewer: "reviewer identity", executionId: "execution identity", outcome: "accepted|rejected|unverified|not-applicable", observation: "required for accepted or rejected", applicabilityReason: "required for not-applicable" } } : { idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Describe completed work and evidence.", work: { stage } },
      resumeCommand: `npm run import:article -- --resume ${record.importId}`,
    });
    let raw: unknown;
    try { raw = await readRepositoryJson(root, resultPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return { ...record, ...(activity && { activityProtocolVersion: 1 as const }), continuation: { kind: "work", stage, workPath, resultPath, ...(activity && { activityId: activity.id, inputFingerprint: activity.inputFingerprint }), idempotencyKey: context.idempotencyKey, sourceFingerprint: record.sourceFingerprint }, nextAction: `Supervising agent: execute ${workPath}, write its result to ${resultPath}, then explicitly resume this import.` };
    }
    if (activity) {
      const activityResult = activityResultSchema.parse(raw);
      if (activityResult.idempotencyKey !== context.idempotencyKey) throw new Error("ACTIVITY_RESULT_BINDING_MISMATCH");
      return recordArticleActivity(root, record, resultPath, activity, activityResult);
    }
    const result = resultSchema.parse(raw);
    if (result.idempotencyKey !== context.idempotencyKey || result.sourceFingerprint !== record.sourceFingerprint || result.work.stage !== stage) throw new Error("STAGE_RESULT_BINDING_MISMATCH");
    await context.assertLease();
    const work = result.work;
    switch (work.stage) {
      case "TRANSFORMING": {
        if (record.format === "direct-review" && record.transformation?.commercialMode === "approved" && record.transformation.resolvedAffiliateUrl && work.format !== record.format) {
          throw new Error("LONG_FORM_AFFILIATE_FORMAT_MISMATCH");
        }
        const transformingRecord = { ...record, format: work.format, artifactPath: work.artifactPath };
        return withTransformingArtifact(root, transformingRecord, (artifact) => assertArtifactCommercialSafety(record, work.format, artifact), async () => {
          const assessment = await evidenceReference(root, work.assessmentPath);
          record = { ...transformingRecord, evidenceRefs: { ...record.evidenceRefs, transformAssessment: assessment, assessment } };
          return advanceImport(root, record, `${result.summary} Artifact: ${work.artifactPath}`);
        });
      }
      case "REFINING":
        record = { ...record, artifactPath: work.artifactPath, evidenceRefs: { ...record.evidenceRefs, assessment: await evidenceReference(root, work.assessmentPath), editorial: await evidenceReference(root, work.editorialExecutionPath) } };
        record = await approveImportContent(root, record, work);
        await applyPublicationProposals(root, record, context.idempotencyKey, context.assertLease);
        if (options?.reviewEvidenceRegistry) {
          const registration = await registerEditorialReviewEvidence(root, options.reviewEvidenceRegistry, record);
          record = { ...record, reviewEvidence: { ...record.reviewEvidence, editorial: registeredReviewStatus(registration) } };
        }
        return advanceImport(root, record, result.summary);
      case "VALIDATING":
        if (workflowEvidenceSchema.parse(await readRepositoryJson(root, work.presentationEvidencePath)).schemaVersion !== "WorkflowEvidenceV3") throw new Error("PRESENTATION_CURRENT_POLICY_REQUIRED");
        record = { ...record, evidenceRefs: { ...record.evidenceRefs, presentation: await evidenceReference(root, work.presentationEvidencePath) } };
        record = await recordImportPresentation(root, record, { validationGate: work.validationGate, validationReceipt: await readRepositoryJson(root, work.validationReceiptPath) });
        if (options?.reviewEvidenceRegistry && record.presentation) {
          const registration = await registerBrowserReviewEvidence(root, options.reviewEvidenceRegistry, record);
          record = { ...record, reviewEvidence: { ...record.reviewEvidence, browser: registeredReviewStatus(registration) } };
        }
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

async function finishRegistryResearch(
  root: string,
  record: ExternalArticleImportV1,
  idempotencyKey: string,
  summary: string,
  evidencePath: string,
  decisionPath: string,
  writebackPath: string | undefined,
  plan: ResearchRegistryPlan,
  decision: ResearchRegistryDecision,
  registry: ArticleResearchRegistry,
) {
  const research = await evidenceReference(root, evidencePath);
  const decisionRef = await evidenceReference(root, decisionPath);
  const writebackRef = writebackPath ? await evidenceReference(root, writebackPath) : undefined;
  const writeback = writebackPath ? researchRegistryWritebackSchema.parse(await readRepositoryJson(root, writebackPath)) : undefined;
  if (writeback && (writeback.importId !== record.importId || writeback.sourceFingerprint !== record.sourceFingerprint || writeback.decisionSha256 !== decisionRef.sha256)) throw new Error("RESEARCH_REGISTRY_WRITEBACK_BINDING_MISMATCH");
  const validated = await validateResearchEvidenceForRegistry(root, research, record);
  const registryResearch = { evidenceRef: research, evidencePath, evidenceSha256: research.sha256, evidence: validated.evidence, snapshotBytes: validated.snapshotBytes };
  validateRegistryDecisionAgainstEvidence(plan, decision, registryResearch, decision.createdAt, writeback);
  await registry.commit({ importId: record.importId, sourceFingerprint: record.sourceFingerprint, idempotencyKey, plan, decision, writeback, writebackPath, writebackSha256: writebackRef?.sha256, decisionPath, decisionSha256: decisionRef.sha256, research: registryResearch });
  const updated = { ...record, evidenceRefs: { ...record.evidenceRefs, research } };
  return advanceImport(root, updated, `${summary} Evidence: ${evidencePath}`);
}
