import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { createArticleImport, executePendingImport, loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { prepareApprovalFixture } from "../tests/fixtures/article-content-approval";
import { persistFixture } from "../tests/fixtures/article-command";

type ReviewInput = {
  artifactSha256: string;
  browserEvidenceSha256: string;
  outcome: "accepted" | "rejected" | "unverified";
  observation: string;
  reviewer: string;
};

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function copyRuntime(repositoryRoot: string, root: string) {
  for (const directory of ["src", "public", ".agents", "config"]) {
    await cp(path.join(repositoryRoot, directory), path.join(root, directory), { recursive: true });
  }
  for (const file of ["approved-urls.md", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"]) {
    await cp(path.join(repositoryRoot, file), path.join(root, file)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function exercise(root: string, label: "target" | "control", artifactBytes: Buffer, review: ReviewInput) {
  if (sha256(artifactBytes) !== review.artifactSha256) throw new Error(`${label.toUpperCase()}_ARTIFACT_BINDING_MISMATCH`);
  const sourcePath = `${label}-synthetic-readiness.md`;
  await writeFile(path.join(root, sourcePath), `# ${label} synthetic readiness\n\nIsolated controller verification only.\n`);
  const created = await createArticleImport(root, sourcePath);
  const prepared = await prepareApprovalFixture(root, { ...created, stage: "REFINING", format: "direct-review" }, { currentPolicy: true, structuredEditorial: true });
  await writeFile(path.join(root, prepared.artifactPath), artifactBytes);
  await persistFixture(root, { ...created, stage: "REFINING", format: "direct-review", artifactPath: prepared.artifactPath, evidenceRefs: prepared.evidenceRefs });
  const issued = await executePendingImport(root, created.importId, createSupervisedImportExecutor(root));
  if (issued.continuation?.kind !== "work" || issued.continuation.activityId !== "purpose-and-structure") throw new Error(`${label.toUpperCase()}_ACTIVITY_NOT_ISSUED`);
  const packet = JSON.parse(await readFile(path.join(root, issued.continuation.workPath), "utf8"));
  await writeJsonAtomically(path.join(root, issued.continuation.resultPath), {
    idempotencyKey: issued.continuation.idempotencyKey,
    sourceFingerprint: issued.sourceFingerprint,
    summary: `${label} browser observation ${review.outcome}; evidence ${review.browserEvidenceSha256}`,
    activity: {
      ...packet.activity,
      reviewer: review.reviewer,
      executionId: `issue-123-${label}-${review.browserEvidenceSha256.slice(0, 16)}`,
      outcome: review.outcome,
      observation: `${review.observation} Browser evidence sha256: ${review.browserEvidenceSha256}.`,
    },
  });
  const decided = await executePendingImport(root, created.importId, createSupervisedImportExecutor(root));
  const persisted = await loadImport(root, created.importId);
  return {
    label,
    importId: created.importId,
    artifactSha256: review.artifactSha256,
    browserEvidenceSha256: review.browserEvidenceSha256,
    activity: packet.activity,
    suppliedOutcome: review.outcome,
    resultingStage: decided.stage,
    continuation: decided.continuation,
    nextAction: decided.nextAction,
    activityHistory: persisted.activityHistory,
    activityAttempts: persisted.activityAttempts,
  };
}

async function main() {
  const repositoryRoot = process.cwd();
  const evidenceRoot = path.join(repositoryRoot, "build-pack/repairs/article-recovery-123");
  const reviews = JSON.parse(await readFile(path.join(evidenceRoot, "browser/controller-review-input.json"), "utf8")) as { target: ReviewInput; control: ReviewInput };
  const root = path.join(repositoryRoot, ".scratch/article-recovery-123-controller");
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  await copyRuntime(repositoryRoot, root);
  const targetBytes = await readFile(path.join(evidenceRoot, "browser/artifacts/target.json"));
  const controlBytes = await readFile(path.join(evidenceRoot, "browser/artifacts/control.json"));
  const target = await exercise(root, "target", targetBytes, reviews.target);
  const control = await exercise(root, "control", controlBytes, reviews.control);
  const receipt = {
    schemaVersion: 1,
    boundary: "isolated synthetic controller exercise; no real article or release operation",
    testedRevision: process.env.ARTICLE_RECOVERY_TESTED_REVISION ?? "uncommitted",
    controllerEntryPoint: "executePendingImport",
    target,
    control,
  };
  await writeJsonAtomically(path.join(evidenceRoot, "controller-verdicts.json"), receipt);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
