import { loadImport, resumeImport, withImportLease } from "../src/lib/article-import/engine";
import type { ExternalArticleImportV1 } from "../src/lib/article-import/contracts";
import { assessImportRelease, recordImportCodeReview, type ReleaseOperations } from "../src/lib/article-import/release";
import { readFile } from "node:fs/promises";
import { createLocalReleaseOperations } from "../src/lib/article-import/local-release-adapter";
import { assertPrimaryArticleCheckout, assertArticleCapabilities } from "../src/lib/article-import/preflight";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function unconfiguredOperations(): ReleaseOperations {
  const unavailable = async (): Promise<never> => { throw new Error("Release operations require the supervised agent's injected Git/Vercel adapter."); };
  return {
    preflight: async () => ({ ok: false, reasons: ["INJECTED_RELEASE_OPERATIONS_REQUIRED"] }),
    inspectGit: unavailable,
    refreshMain: unavailable,
    runValidation: unavailable,
    capturePreviousDeployment: unavailable,
    commit: unavailable,
    preparePullRequest: unavailable,
    inspectPullRequest: unavailable,
    verifyCodeReview: unavailable,
    checkoutMergedCommit: unavailable,
    deploy: unavailable,
    verifyProduction: unavailable,
    rollback: unavailable,
    verifyRollback: async () => false,
  };
}

async function main(): Promise<void> {
  if (process.argv.includes("--execute")) {
    await assertPrimaryArticleCheckout(process.cwd());
    await assertArticleCapabilities(process.cwd());
  }
  const importId = argument("--import-id");
  if (!importId) throw new Error("--import-id is required.");
  const assess = async (initial: ExternalArticleImportV1) => {
  let record = initial;
  const files = process.argv.flatMap((value, index) => value === "--file" && process.argv[index + 1] ? [process.argv[index + 1]] : []);
  const artifactPath = argument("--artifact");
  const slug = argument("--slug");
  const operations = process.argv.includes("--execute") ? createLocalReleaseOperations(process.cwd(), { format: record.format, slug, artifactPath, importId, sourceFingerprint: record.sourceFingerprint, origin: argument("--origin") }) : unconfiguredOperations();
  const codeReviewFile = argument("--code-review-receipt");
  if (codeReviewFile) {
    if (!process.argv.includes("--execute")) throw new Error("--code-review-receipt requires --execute to verify the current PR head.");
    record = await recordImportCodeReview(process.cwd(), record, JSON.parse(await readFile(codeReviewFile, "utf8")), operations);
    record = await resumeImport(process.cwd(), record);
  }
  return assessImportRelease({
    repositoryRoot: process.cwd(),
    record,
    changedFiles: files,
    ownerAuthorizedAffiliateUrl: process.argv.includes("--owner-authorized-affiliate-url"),
    execute: process.argv.includes("--execute"),
    artifactPath,
    slug,
    operations,
  });
  };
  const result = process.argv.includes("--execute")
    ? await withImportLease(process.cwd(), importId, assess)
    : await assess(await loadImport(process.cwd(), importId));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
