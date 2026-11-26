import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evidenceReference, storeEvidence } from "../src/lib/article-import/execution-evidence";
import { writeJsonAtomically } from "../src/lib/article-import/engine";
import { improveChecklistPath, recordImproveFindings, resolveImproveFindings, retainImproveMeasurement } from "../src/lib/article-import/improve-checklist";

test("an unsupported observation cannot open an issue; replay preserves a resolution and a new occurrence reopens it", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "improve-checklist-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const id = "article-" + randomUUID();
  const raw = await storeEvidence(root, id, { event: "same submissions", actual: 2, expected: 1 });
  const sources = { runRef: raw, terminalRef: await storeEvidence(root, id, { kind: "live", importId: id, frozenFiles: [] }) };
  const finding = {
    key: "duplicate-submit", step: "submit", expected: "one submission", observed: "two identical submissions",
    consequence: "one redundant submission", evidence: [raw], excerpt: "invented observation",
  };
  const checklist = async () => JSON.parse(await readFile(path.join(root, improveChecklistPath), "utf8"));
  await recordImproveFindings(root, "first", [], id, sources);
  await assert.rejects(recordImproveFindings(root, "first", [finding], id, sources), /UNSUPPORTED/);
  await assert.rejects(checklist(), { code: "ENOENT" });
  finding.excerpt = "same submissions";
  await recordImproveFindings(root, "first", [finding], id, sources);

  const commitSha = "a".repeat(40);
  const receipt = async (head: string, outcome: "fail" | "pass") => {
    const output = await storeEvidence(root, id, { submissions: outcome === "pass" ? 1 : 2 });
    return retainImproveMeasurement(root, "first", { key: finding.key, check: "submission count", commitSha: head, outcome, output });
  };
  const reviewFile = path.join(root, ".automation/article-imports/improve/first/reviews", commitSha + ".json");
  await writeJsonAtomically(reviewFile, { schemaVersion: "ImportCodeReviewV1", reviewer: "codex", independent: true,
    passed: true, reviewedCommitSha: commitSha, pullRequestUrl: "https://example.org/pr/1",
    evidenceUrl: "https://example.org/reviews/1", reviewedAt: new Date().toISOString() });
  const resolution = {
    key: finding.key, commitSha, before: await receipt("b".repeat(40), "fail"),
    after: await receipt(commitSha, "pass"), regressionChecks: [],
    review: await evidenceReference(root, reviewFile),
  };
  const reviewer = {
    inspectPullRequest: async () => ({ merged: true, headRefOid: commitSha, mergeCommitSha: "d".repeat(40) }),
    verifyCodeReview: async (_pr: string, _evidence: string, sha: string) => assert.equal(sha, commitSha),
  };
  await assert.rejects(resolveImproveFindings(root, "first", [resolution], {
    ...reviewer, inspectPullRequest: async () => ({ merged: false, headRefOid: "c".repeat(40) }),
  }, "b".repeat(40)), /PR_HEAD_CHANGED/);
  await assert.rejects(resolveImproveFindings(root, "first", [resolution], {
    ...reviewer, inspectPullRequest: async () => ({ merged: false, headRefOid: commitSha }),
  }, "b".repeat(40)), /NOT_MERGED/);
  const forged = await storeEvidence(root, id, JSON.parse(await readFile(path.join(root, resolution.after.path), "utf8")));
  await assert.rejects(resolveImproveFindings(root, "first", [{ ...resolution, after: forged }], reviewer, "b".repeat(40)), /CHECK_MISMATCH/);
  await resolveImproveFindings(root, "first", [resolution], reviewer, "b".repeat(40));
  await recordImproveFindings(root, "first", [finding], id, sources);
  assert.equal((await checklist())[0].status, "resolved");
  const secondId = "article-" + randomUUID();
  const secondRaw = await storeEvidence(root, secondId, { event: "same submissions" });
  const next = { runRef: secondRaw, terminalRef: await storeEvidence(root, secondId, { kind: "live", importId: secondId, frozenFiles: [] }) };
  await assert.rejects(recordImproveFindings(root, "next", [finding], secondId, next), /UNSUPPORTED/);
  await recordImproveFindings(root, "next", [{ ...finding, evidence: [secondRaw] }], secondId, next);
  const [issue] = await checklist();
  assert.equal(issue.status, "reopened");
  assert.equal(issue.occurrences.length, 2);
  assert.equal(issue.resolutions.length, 1);
});
