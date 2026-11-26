import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { importCodeReviewSchema } from "./contracts";
import { writeJsonAtomically } from "./engine";
import { evidenceReference, evidenceRefSchema, frozenFileSchema, readEvidence, readVerifiedEvidenceBytes, verifyEvidenceRef, type EvidenceRef } from "./execution-evidence";
import { claimWorkflowLease } from "./workflow-lease";
import type { ReleaseOperations } from "./release";

const label = z.string().trim().min(1);
const issueKey = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
export const improveFindingSchema = z.object({
  key: issueKey, step: label, expected: label, observed: label, consequence: label,
  excerpt: label, evidence: z.array(evidenceRefSchema).min(1),
}).strict();
export const improveResolutionSchema = z.object({
  key: issueKey, commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  before: evidenceRefSchema, after: evidenceRefSchema, review: evidenceRefSchema,
  regressionChecks: z.array(z.object({ key: issueKey, evidence: evidenceRefSchema }).strict()),
}).strict();
const findingEvent = improveFindingSchema.extend({ publication: label });
const resolutionEvent = improveResolutionSchema.extend({ publication: label });
const historySchema = z.array(z.object({
  key: issueKey, status: z.enum(["open", "reopened", "resolved"]),
  occurrences: z.array(findingEvent).min(1), resolutions: z.array(resolutionEvent),
}).strict());
type Checklist = z.infer<typeof historySchema>;
export const improveChecklistPath = ".automation/article-imports/improve/checklist.json";

async function updateChecklist(root: string, edit: (issues: Checklist) => Promise<void>) {
  const lease = await claimWorkflowLease(root, "publication", "improve-checklist");
  if (!lease) throw new Error("IMPROVE_CHECKLIST_BUSY");
  try {
    const file = path.join(root, improveChecklistPath);
    let issues: Checklist;
    try {
      issues = historySchema.parse(JSON.parse(await readFile(file, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      issues = [];
    }
    await edit(issues);
    await lease.assertOwned();
    await writeJsonAtomically(file, issues);
  } finally {
    await lease.release();
  }
}

type PublicationEvidence = { runRef: EvidenceRef; terminalRef: EvidenceRef };
export async function recordImproveFindings(root: string, publication: string, input: unknown, importId: string, sources: PublicationEvidence) {
  const findings = improveFindingSchema.array().parse(input);
  if (!findings.length) return;
  const terminal = z.object({
    kind: z.literal("live"), importId: z.literal(importId), frozenFiles: z.array(frozenFileSchema),
  }).parse(await readEvidence(root, sources.terminalRef));
  const originals = new Map<string, EvidenceRef>();
  for (const { path: original, archiveRef } of terminal.frozenFiles) {
    originals.set(original, archiveRef);
    originals.set(archiveRef.path, archiveRef);
  }
  for (const ref of [sources.runRef, sources.terminalRef]) originals.set(ref.path, ref);
  await updateChecklist(root, async issues => {
    for (const finding of findings) {
      const issue = issues.find(item => item.key === finding.key);
      const previous = issue?.occurrences.find(item => item.publication === publication);
      if (previous) {
        if (JSON.stringify(previous) !== JSON.stringify({ ...finding, publication })) throw new Error("IMPROVE_FINDING_CHANGED");
        continue;
      }
      let citedOriginal = false;
      for (const ref of finding.evidence) {
        if (path.posix.normalize(ref.path) !== ref.path || ref.path.includes("\\")) throw new Error("IMPROVE_EVIDENCE_PATH_INVALID");
        const original = originals.get(ref.path);
        if (original && original.sha256 !== ref.sha256) throw new Error("IMPROVE_SOURCE_HASH_CHANGED");
        const bytes = await readVerifiedEvidenceBytes(root, original ?? ref);
        if (original && bytes.includes(finding.excerpt)) citedOriginal = true;
      }
      if (!citedOriginal || finding.observed === finding.expected) throw new Error("IMPROVE_FINDING_UNSUPPORTED");
      const occurrence = { ...finding, publication };
      if (issue) {
        issue.occurrences.push(occurrence);
        if (issue.status === "resolved") issue.status = "reopened";
      } else {
        issues.push({ key: finding.key, status: "open", occurrences: [occurrence], resolutions: [] });
      }
    }
  });
}

const checkReceipt = z.object({
  key: issueKey, check: label, commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  outcome: z.enum(["fail", "pass"]), output: evidenceRefSchema,
});
// Only the measurement controller can write here. Worker handoffs use a separate evidence directory.
export async function retainImproveMeasurement(root: string, publication: string, value: z.infer<typeof checkReceipt>) {
  const receipt = checkReceipt.parse(value);
  const directory = path.join(root, ".automation/article-imports/improve", publication, "measurements");
  const target = path.join(directory, receipt.key + "-" + receipt.commitSha + "-" + receipt.output.sha256 + ".json");
  await writeJsonAtomically(target, receipt);
  return evidenceReference(root, target);
}
async function readCheck(root: string, ref: EvidenceRef, key: string, outcome: "fail" | "pass", head: string, publication: string) {
  const check = checkReceipt.parse(await readEvidence(root, ref));
  const trusted = `.automation/article-imports/improve/${publication}/measurements/${key}-${head}-${check.output.sha256}.json`;
  if (ref.path !== trusted || check.key !== key || check.outcome !== outcome || head !== check.commitSha) throw new Error("IMPROVE_CHECK_MISMATCH");
  await verifyEvidenceRef(root, check.output);
  return check.check;
}

export async function resolveImproveFindings(root: string, publication: string, input: unknown,
  reviewer: Pick<ReleaseOperations, "inspectPullRequest" | "verifyCodeReview">, baseCommit: string) {
  const resolutions = improveResolutionSchema.array().parse(input);
  if (!resolutions.length) return;
  await updateChecklist(root, async issues => {
    for (const resolution of resolutions) {
      const issue = issues.find(item => item.key === resolution.key);
      if (!issue) throw new Error("IMPROVE_UNKNOWN_ISSUE");
      if (issue.resolutions.some(item => item.publication === publication && item.commitSha === resolution.commitSha)) continue;
      const occurrence = issue.occurrences.at(-1)!;
      if (occurrence.publication !== publication) throw new Error("IMPROVE_OCCURRENCE_CHANGED");
      if (resolution.review.path !== `.automation/article-imports/improve/${publication}/reviews/${resolution.commitSha}.json`) throw new Error("IMPROVE_REVIEW_BINDING");
      const review = importCodeReviewSchema.parse(await readEvidence(root, resolution.review));
      if (review.reviewedCommitSha !== resolution.commitSha) throw new Error("IMPROVE_REVIEW_HEAD_MISMATCH");
      const pr = await reviewer.inspectPullRequest(review.pullRequestUrl);
      if (pr.headRefOid !== resolution.commitSha) throw new Error("IMPROVE_PR_HEAD_CHANGED");
      if (!pr.merged || !pr.mergeCommitSha) throw new Error("IMPROVE_REPAIR_NOT_MERGED");
      await reviewer.verifyCodeReview(review.pullRequestUrl, review.evidenceUrl, resolution.commitSha);
      const before = await readCheck(root, resolution.before, issue.key, "fail", baseCommit, publication);
      const after = await readCheck(root, resolution.after, issue.key, "pass", resolution.commitSha, publication);
      if (before !== after) throw new Error("IMPROVE_CHECK_CHANGED");
      const checked = new Set(resolution.regressionChecks.map(item => item.key));
      for (const key of checked) {
        if (!issues.some(item => item.key === key && item.resolutions.length)) throw new Error("IMPROVE_UNKNOWN_PRIOR_CHECK");
      }
      for (const prior of issues.filter(item => item.resolutions.length && (checked.has(item.key) || item.occurrences.some(event => event.step === occurrence.step)))) {
        const previous = prior.resolutions.at(-1)!;
        const check = prior.key === issue.key ? resolution.after : resolution.regressionChecks.find(item => item.key === prior.key)?.evidence;
        if (!check || await readCheck(root, check, prior.key, "pass", resolution.commitSha, publication) !==
          await readCheck(root, previous.after, prior.key, "pass", previous.commitSha, previous.publication)) throw new Error("IMPROVE_PRIOR_CHECK_REQUIRED");
      }
      issue.resolutions.push({ ...resolution, publication });
      issue.status = "resolved";
    }
  });
}
