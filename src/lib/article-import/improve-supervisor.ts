import { execFile as execFileCallback } from "node:child_process";
import { access, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import type { ExternalArticleImportV1, ImportImproveV1 } from "./contracts";
import { fingerprint, writeJsonAtomically } from "./engine";
import { assertIgnoredImportStatePath } from "./automation-state";
import { evidenceRefSchema, readEvidence, readVerifiedEvidenceBytes, verifyEvidenceRef } from "./execution-evidence";
import { improveChecklistPath, improveFindingSchema, improveResolutionSchema, recordImproveFindings, resolveImproveFindings } from "./improve-checklist";
import { loadImproveSkills } from "./improve-skills";
import { createLocalReleaseOperations } from "./local-release-adapter";

const execFile = promisify(execFileCallback);
const issueKey = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const handoffRef = evidenceRefSchema;
const assessmentResultSchema = z.object({
  schemaVersion: z.literal("ImproveResultV1"), publicationKey: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
  phase: z.literal("ASSESSING"), findings: z.array(improveFindingSchema), limitations: z.array(z.string().min(1)),
  handoffs: z.object({ assessment: handoffRef }).strict(),
}).strict();
const stepComplexitySchema = z.object({
  step: z.string().min(1),
  operatorActions: z.object({ before: z.number().int().nonnegative(), after: z.number().int().nonnegative() }).strict(),
  requiredInputs: z.object({ before: z.number().int().nonnegative(), after: z.number().int().nonnegative() }).strict(),
  decisionBranches: z.object({ before: z.number().int().nonnegative(), after: z.number().int().nonnegative() }).strict(),
  dependencies: z.object({ before: z.number().int().nonnegative(), after: z.number().int().nonnegative() }).strict(),
}).strict();
export const repairDecisionSchema = z.object({
  key: issueKey, candidate: z.string().min(1), decision: z.enum(["accepted", "rejected"]),
  steps: z.array(stepComplexitySchema).min(1), researchRef: evidenceRefSchema.optional(),
}).strict().superRefine((value, context) => {
  const increases = value.steps.some(step => [step.operatorActions, step.requiredInputs, step.decisionBranches, step.dependencies].some(metric => metric.after > metric.before));
  if (value.decision === "accepted" && increases) context.addIssue({ code: "custom", message: "IMPROVE_COMPLEXITY_INCREASE" });
  if (value.decision === "rejected" && !value.researchRef) context.addIssue({ code: "custom", message: "IMPROVE_REJECTED_REPAIR_RESEARCH_REQUIRED" });
});
const unresolvedSchema = z.object({ key: issueKey, reason: z.string().min(1), evidence: z.array(evidenceRefSchema).min(1), nextAction: z.string().min(1) }).strict();
const resolutionReadySchema = z.object({
  schemaVersion: z.literal("ImproveResultV1"), publicationKey: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
  phase: z.literal("RESOLVING"), status: z.literal("READY"), repairs: z.array(repairDecisionSchema).min(1),
  resolutions: z.array(improveResolutionSchema), unresolved: z.array(unresolvedSchema),
  handoffs: z.object({ retrospective: handoffRef, diagnosis: handoffRef, repair: handoffRef, architecture: handoffRef, review: handoffRef }).strict(),
}).strict();
const resolutionPendingSchema = z.object({
  schemaVersion: z.literal("ImproveResultV1"), publicationKey: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/), phase: z.literal("RESOLVING"), status: z.enum(["PENDING_REVIEW", "PENDING_MERGE", "CHANGES_REQUESTED", "CLOSED_UNMERGED"]),
  repairs: z.array(repairDecisionSchema).min(1), pendingReview: z.object({ commitSha: z.string().regex(/^[a-f0-9]{40}$/), pullRequestUrl: z.string().url(), evidenceUrl: z.string().url().optional(), reviewText: z.string().min(1).optional(),
    findings: z.array(z.object({ path: z.string().min(1), line: z.number().int().positive().nullable(), body: z.string().min(1) }).strict()).optional() }).strict(),
  handoffs: z.object({ retrospective: handoffRef, diagnosis: handoffRef, repair: handoffRef, architecture: handoffRef }).strict(),
}).strict();
const resolutionResultSchema = z.union([resolutionReadySchema, resolutionPendingSchema]);
const improveResearchSchema = z.object({
  schemaVersion: z.literal("ImproveResearchV1"), key: issueKey, candidate: z.string().min(1), skill: z.literal("research"),
  primarySourceRefs: z.array(evidenceRefSchema).min(1), simplerAlternatives: z.array(z.string().min(1)).min(1),
}).strict();

export async function verifyImproveResearch(root: string, input: z.infer<typeof repairDecisionSchema>): Promise<void> {
  const repair = repairDecisionSchema.parse(input);
  if (!repair.researchRef) return;
  const research = improveResearchSchema.parse(await readEvidence(root, repair.researchRef));
  if (research.key !== repair.key || research.candidate !== repair.candidate) throw new Error("IMPROVE_RESEARCH_BINDING_MISMATCH");
  for (const ref of research.primarySourceRefs) await verifyEvidenceRef(root, ref);
}

export type ImproveExecutionContext = {
  record: ExternalArticleImportV1; assignment: ImportImproveV1; leaseToken: string; assertLease(): Promise<void>;
};
export type ImproveExecutor = (context: ImproveExecutionContext) => Promise<ExternalArticleImportV1>;

function assertResultSize(value: unknown): void {
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 150_000) throw new Error("IMPROVE_HANDOFF_TOO_LARGE");
}

async function readRepositoryJson(root: string, file: string): Promise<unknown> {
  const canonicalRoot = await realpath(root);
  const target = await realpath(path.resolve(root, file));
  const relative = path.relative(canonicalRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("IMPROVE_RESULT_PATH_ESCAPE");
  return JSON.parse(await readFile(target, "utf8"));
}

async function verifyHandoffs(root: string, refs: Record<string, z.infer<typeof evidenceRefSchema>>): Promise<void> {
  for (const ref of Object.values(refs)) {
    await verifyEvidenceRef(root, ref);
    if ((await readVerifiedEvidenceBytes(root, ref)).byteLength > 150_000) throw new Error("IMPROVE_HANDOFF_TOO_LARGE");
  }
}

async function ensureRepairWorktree(root: string, assignment: ImportImproveV1): Promise<NonNullable<ImportImproveV1["repairWorktree"]>> {
  const branch = `codex/improve-${assignment.publicationKey.slice(0, 16)}` as const;
  const relative = `.worktrees/improve-${assignment.publicationKey.slice(0, 16)}`;
  const absolute = path.resolve(root, relative);
  try {
    await access(absolute);
    const { stdout } = await execFile("git", ["-C", absolute, "branch", "--show-current"], { windowsHide: true, timeout: 10_000 });
    if (stdout.trim() !== branch) throw new Error("IMPROVE_WORKTREE_BRANCH_MISMATCH");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await execFile("git", ["worktree", "add", absolute, "-b", branch, assignment.boundCommitSha], { cwd: root, windowsHide: true, timeout: 60_000 });
  }
  return { branch, path: relative };
}

function packetPaths(assignment: ImportImproveV1) {
  const key = fingerprint(`${assignment.publicationKey}:${assignment.phase}:${assignment.attempt}`);
  const directory = `.automation/article-imports/improve/${assignment.publicationKey}`;
  return { workPath: `${directory}/${key}.work.json`, resultPath: `${directory}/${key}.result.json`, key };
}

/** Creates and consumes resumable post-publication packets without mutating article lifecycle state. */
export function createSupervisedImproveExecutor(root: string): ImproveExecutor {
  return async ({ record, assignment, assertLease }) => {
    if (record.stage !== "LIVE" || !record.terminalRef || record.release?.commitSha !== assignment.boundCommitSha) throw new Error("IMPROVE_PUBLICATION_BINDING_MISMATCH");
    if (assignment.phase === "COMPLETE" || assignment.phase === "BLOCKED") return record;
    if (assignment.pendingReview) {
      const pullRequest = await createLocalReleaseOperations(root, { format: record.format }).inspectPullRequest(assignment.pendingReview.pullRequestUrl);
      if (pullRequest.headRefOid !== assignment.pendingReview.commitSha) {
        if (assignment.pendingReview.status !== "CHANGES_REQUESTED" || !assignment.repairWorktree) throw new Error("IMPROVE_PR_HEAD_CHANGED");
        const cwd = path.resolve(root, assignment.repairWorktree.path);
        const { stdout } = await execFile("git", ["rev-parse", "HEAD"], { cwd, windowsHide: true });
        if (stdout.trim() !== pullRequest.headRefOid) throw new Error("IMPROVE_PR_HEAD_CHANGED");
        await execFile("git", ["merge-base", "--is-ancestor", assignment.pendingReview.commitSha, pullRequest.headRefOid], { cwd, windowsHide: true });
      }
      if (pullRequest.state === "CLOSED") {
        return { ...record, improve: { ...assignment, phase: "BLOCKED", openKeys: assignment.issueKeys, pendingReview: undefined, workPath: undefined, resultPath: undefined,
          failure: { code: "IMPROVE_REPAIR_PR_CLOSED_UNMERGED", message: "The authenticated repair PR closed without merge; confirmed issues remain open.", at: new Date().toISOString() } } };
      }
      if (assignment.pendingReview.status === "PENDING_MERGE" && !pullRequest.merged) return record;
    }
    const { workPath, resultPath, key } = packetPaths(assignment);
    await assertIgnoredImportStatePath(root, workPath);
    await assertIgnoredImportStatePath(root, resultPath);
    const phase = assignment.phase === "ASSESSING" ? "assessment" : "resolution";
    const repairWorktree = phase === "resolution" ? assignment.repairWorktree ?? await ensureRepairWorktree(root, assignment) : undefined;
    const improveSkill = await readFile(path.join(root, ".agents/skills/improve/SKILL.md"), "utf8");
    const skillInstructions = await loadImproveSkills(phase, root);
    const resultSchema = phase === "assessment" ? assessmentResultSchema : resolutionResultSchema;
    const packet = {
      schemaVersion: "ImproveWorkV1", publicationKey: assignment.publicationKey, importId: record.importId,
      boundCommitSha: assignment.boundCommitSha, stage: "IMPROVE", improvePhase: assignment.phase, idempotencyKey: key, tokenBudgetBytes: 150_000,
      runRef: assignment.runRef, terminalRef: record.terminalRef, record, repairWorktree,
      checklistPath: improveChecklistPath, issueKeys: assignment.issueKeys,
      improveSkill, skillInstructions, resultPath, resultSchema: z.toJSONSchema(resultSchema),
      instructions: phase === "assessment"
        ? "Apply the embedded IMPROVE assessment instructions to the immutable run and terminal evidence. Return evidence-only findings and the required assessment handoff."
        : assignment.pendingReview?.status === "CHANGES_REQUESTED"
          ? "Apply the authenticated review findings in the same isolated branch without increasing step complexity. Use improve_submit for the new commit and review request. Do not claim closure for the rejected head."
          : assignment.pendingReview
          ? "The repair PR is waiting on trusted review or merge state. Call improve_review without resubmitting or requesting another review comment. Return the exact pending status until the trusted current head is reviewed and merged; only then return READY with closure evidence."
          : "Resolve the recorded findings in the isolated repair worktree. Reject every repair that increases any affected-step complexity dimension, and attach a research receipt for every rejected repair. Use improve_submit for the bounded commit and PR; return PENDING_REVIEW until improve_review provides trusted exact-head evidence.",
    };
    try {
      const existing = await readRepositoryJson(root, workPath) as { publicationKey?: unknown; idempotencyKey?: unknown; resultPath?: unknown };
      if (existing.publicationKey !== assignment.publicationKey || existing.idempotencyKey !== key || existing.resultPath !== resultPath) throw new Error("IMPROVE_PACKET_CHANGED");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await writeJsonAtomically(path.join(root, workPath), packet);
    }
    let raw: unknown;
    try { raw = await readRepositoryJson(root, resultPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return { ...record, improve: { ...assignment, repairWorktree, workPath, resultPath, failure: undefined } };
    }
    assertResultSize(raw);
    await assertLease();
    if (phase === "assessment") {
      const result = assessmentResultSchema.parse(raw);
      if (result.publicationKey !== assignment.publicationKey || result.idempotencyKey !== key) throw new Error("IMPROVE_RESULT_BINDING_MISMATCH");
      await verifyHandoffs(root, result.handoffs);
      await recordImproveFindings(root, assignment.publicationKey, result.findings, record.importId, { runRef: assignment.runRef, terminalRef: record.terminalRef });
      const issueKeys = result.findings.map(finding => finding.key);
      return { ...record, improve: { ...assignment, phase: issueKeys.length ? "RESOLVING" : "COMPLETE", attempt: 0, workPath: undefined, resultPath: undefined,
        issueKeys, resolvedKeys: [], openKeys: [], handoffRefs: [...assignment.handoffRefs, ...Object.values(result.handoffs)], failure: undefined,
        ...(issueKeys.length ? {} : { completedAt: new Date().toISOString() }) } };
    }
    const result = resolutionResultSchema.parse(raw);
    if (result.publicationKey !== assignment.publicationKey || result.idempotencyKey !== key) throw new Error("IMPROVE_RESULT_BINDING_MISMATCH");
    await verifyHandoffs(root, result.handoffs);
    for (const repair of result.repairs) {
      if (!assignment.issueKeys.includes(repair.key)) throw new Error("IMPROVE_UNKNOWN_ISSUE");
      await verifyImproveResearch(root, repair);
    }
    if (result.status !== "READY") {
      const { status, ...reviewDetails } = z.object({ status: z.string() }).passthrough()
        .parse(await readRepositoryJson(root, workPath + ".review.json"));
      if ((status === "PENDING" ? "PENDING_REVIEW" : status) !== result.status) throw new Error("IMPROVE_REVIEW_STATUS_MISMATCH");
      const verifiedReview = resolutionPendingSchema.shape.pendingReview.parse(reviewDetails);
      if (verifiedReview.commitSha !== result.pendingReview.commitSha || verifiedReview.pullRequestUrl !== result.pendingReview.pullRequestUrl) throw new Error("IMPROVE_REVIEW_BINDING");
      result.pendingReview = verifiedReview;
      if (!repairWorktree) throw new Error("IMPROVE_WORKTREE_REQUIRED");
      const repairRoot = path.resolve(root, repairWorktree.path);
      const { stdout } = await execFile("git", ["-C", repairRoot, "rev-parse", "HEAD"], { windowsHide: true, timeout: 10_000 });
      const head = stdout.trim();
      if (head === assignment.boundCommitSha || result.pendingReview.commitSha !== head) throw new Error("IMPROVE_PENDING_REVIEW_HEAD_MISMATCH");
      await execFile("git", ["-C", repairRoot, "merge-base", "--is-ancestor", assignment.boundCommitSha, head], { windowsHide: true, timeout: 10_000 });
      if (result.status === "CLOSED_UNMERGED") {
        const pullRequest = await createLocalReleaseOperations(root, { format: record.format }).inspectPullRequest(result.pendingReview.pullRequestUrl);
        if (pullRequest.state !== "CLOSED" || pullRequest.headRefOid !== head) throw new Error("IMPROVE_CLOSED_PR_STATE_MISMATCH");
        return { ...record, improve: { ...assignment, phase: "BLOCKED", repairWorktree, openKeys: assignment.issueKeys,
          pendingReview: undefined, workPath: undefined, resultPath: undefined,
          handoffRefs: [...assignment.handoffRefs, ...Object.values(result.handoffs)],
          failure: { code: "IMPROVE_REPAIR_PR_CLOSED_UNMERGED", message: "The authenticated repair PR closed without merge; confirmed issues remain open.", at: new Date().toISOString() } } };
      }
      return { ...record, improve: { ...assignment, phase: "RESOLVING", attempt: assignment.attempt + 1, repairWorktree,
        pendingReview: { status: result.status, ...result.pendingReview, repairs: result.repairs, handoffs: result.handoffs }, workPath: undefined, resultPath: undefined,
        handoffRefs: [...assignment.handoffRefs, ...Object.values(result.handoffs)], failure: undefined } };
    }
    const accounted = [...result.resolutions.map(item => item.key), ...result.unresolved.map(item => item.key)];
    if (new Set(accounted).size !== accounted.length || accounted.length !== assignment.issueKeys.length || assignment.issueKeys.some(key => !accounted.includes(key))) throw new Error("IMPROVE_ISSUES_UNACCOUNTED");
    for (const resolution of result.resolutions) {
      if (!result.repairs.some(repair => repair.key === resolution.key && repair.decision === "accepted")) throw new Error("IMPROVE_RESOLUTION_WITHOUT_ACCEPTED_REPAIR");
    }
    for (const open of result.unresolved) for (const ref of open.evidence) await verifyEvidenceRef(root, ref);
    if (result.resolutions.length) {
      if (!repairWorktree) throw new Error("IMPROVE_WORKTREE_REQUIRED");
      const repairRoot = path.resolve(root, repairWorktree.path);
      const { stdout } = await execFile("git", ["-C", repairRoot, "rev-parse", "HEAD"], { windowsHide: true, timeout: 10_000 });
      const head = stdout.trim();
      if (head === assignment.boundCommitSha || !result.resolutions.every(resolution => resolution.commitSha === head)) throw new Error("IMPROVE_RESOLUTION_HEAD_MISMATCH");
      await execFile("git", ["-C", repairRoot, "merge-base", "--is-ancestor", assignment.boundCommitSha, head], { windowsHide: true, timeout: 10_000 });
    }
    await resolveImproveFindings(root, assignment.publicationKey, result.resolutions, createLocalReleaseOperations(root, { format: record.format }), assignment.boundCommitSha);
    return { ...record, improve: { ...assignment, phase: "COMPLETE", repairWorktree, pendingReview: undefined, workPath: undefined, resultPath: undefined,
      resolvedKeys: result.resolutions.map(item => item.key), openKeys: result.unresolved.map(item => item.key),
      handoffRefs: [...assignment.handoffRefs, ...Object.values(result.handoffs)], failure: undefined, completedAt: new Date().toISOString() } };
  };
}
