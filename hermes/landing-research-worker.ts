import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import { assertSafePublicHttpsUrl } from "../src/lib/landing-research/network-safety";
import {
  hermesExecutorCapabilitiesSchema,
  hermesExecutorRequestSchema,
  hermesExecutorResponseSchema,
  canonicalJsonDigest,
  type HermesExecutorRequestV1,
} from "../src/lib/landing-research/contracts";
import { ExecutorError, resolveApprovedExecutorInvocation, runApprovedExecutor } from "../src/lib/landing-research/executor";
import { createNeonPool, NeonResearchWorker, type ClaimedResearchStage } from "../src/lib/landing-research/neon";

const IDENTITY_TIMEOUT_MS = 120_000;
const RESEARCH_TIMEOUT_MS = 900_000;
const execFileAsync = promisify(execFile);

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function safeExecutorEnvironment(): Record<string, string | undefined> {
  return { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HERMES_CLI_PATH: process.env.HERMES_CLI_PATH };
}

function workerId(): string {
  return requiredMatch("HERMES_LANDING_WORKER_ID", /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/);
}

function requiredMatch(name: string, expression: RegExp): string {
  const value = requiredEnvironment(name);
  if (!expression.test(value)) throw new Error(`${name} is invalid.`);
  return value;
}

async function probeExecutor(commandPath: string, capability: "hermes_product_identity" | "hermes_research"): Promise<void> {
  const invocation = resolveApprovedExecutorInvocation(commandPath);
  const result = await execFileAsync(invocation.command, [...invocation.args, "--probe"], {
    shell: false,
    timeout: 5_000,
    maxBuffer: 64 * 1024,
    windowsHide: true,
    env: { NODE_ENV: process.env.NODE_ENV ?? "production", ...safeExecutorEnvironment() },
  });
  const output = result.stdout.trim();
  if (!output || output.includes("\n")) throw new Error(`${capability} probe returned invalid output.`);
  const parsed = hermesExecutorCapabilitiesSchema.safeParse(JSON.parse(output));
  if (!parsed.success || parsed.data.capability !== capability) throw new Error(`${capability} probe did not satisfy the approved contract.`);
}

async function processClaim(db: NeonResearchWorker, claim: ClaimedResearchStage, idCommand: string, researchCommand: string): Promise<void> {
  await assertSafePublicHttpsUrl(claim.exact_url);
  const request: HermesExecutorRequestV1 = hermesExecutorRequestSchema.parse({
    schema_version: "HermesResearchContractV1",
    capability: claim.stage_id === "product_identity" ? "hermes_product_identity" : "hermes_research",
    job_id: claim.job_id,
    stage_attempt_id: claim.stage_attempt_id,
    exact_url: claim.exact_url,
    url_fingerprint: claim.url_fingerprint,
    input_digest: claim.input_digest,
  });
  const heartbeat = setInterval(() => {
    void db.heartbeat(claim).catch(() => undefined);
  }, 30_000);
  try {
    const response = await runApprovedExecutor(
      claim.stage_id === "product_identity" ? idCommand : researchCommand,
      request,
      {
        timeoutMs: claim.stage_id === "product_identity" ? IDENTITY_TIMEOUT_MS : RESEARCH_TIMEOUT_MS,
        stdoutLimitBytes: claim.stage_id === "product_identity" ? 1024 * 1024 : 8 * 1024 * 1024,
        environment: safeExecutorEnvironment(),
      },
      (value) => hermesExecutorResponseSchema.parse(value),
    );
    if (response.job_id !== claim.job_id || response.stage_attempt_id !== claim.stage_attempt_id || response.exact_url !== claim.exact_url || response.url_fingerprint !== claim.url_fingerprint || response.input_digest !== claim.input_digest) {
      throw new ExecutorError("Executor response did not match the leased job.", { exitCode: 65 });
    }
    if (claim.stage_id === "product_identity" && response.product_identity) {
      await db.persistArtifact(claim, "HermesProductIdentityV1", response.product_identity, canonicalJsonDigest(response.product_identity));
    } else if (response.research_evidence && response.snapshots) {
      await db.persistArtifact(claim, "HermesResearchEvidenceV1", response.research_evidence, canonicalJsonDigest(response.research_evidence));
      await db.persistArtifact(claim, "ResearchSourceSnapshotBundleV1", response.snapshots, canonicalJsonDigest(response.snapshots));
    } else {
      throw new ExecutorError("Executor response omitted the required research artifacts.", { exitCode: 65 });
    }
    const completed = await db.complete(claim);
    if (!completed) throw new ExecutorError("Neon rejected the fenced completion.", { exitCode: 75, retryable: true });
  } catch (error) {
    const retryable = error instanceof ExecutorError ? error.retryable : true;
    await db.fail(claim, retryable).catch(() => undefined);
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}

async function main(): Promise<void> {
  const credentialFile = process.env.LANDING_ORACLE_WORKER_DATABASE_URL_FILE?.trim();
  const databaseUrl = process.env.LANDING_ORACLE_WORKER_DATABASE_URL?.trim() || (credentialFile ? (await readFile(credentialFile, "utf8")).trim() : undefined);
  const db = new NeonResearchWorker(createNeonPool(databaseUrl, "LANDING_ORACLE_WORKER_DATABASE_URL"));
  const idCommand = requiredEnvironment("HERMES_PRODUCT_IDENTITY_COMMAND");
  const researchCommand = requiredEnvironment("HERMES_LANDING_RESEARCH_COMMAND");
  const id = workerId();
  try {
    if (process.argv.includes("--probe")) {
      await db.probe();
      await probeExecutor(idCommand, "hermes_product_identity");
      await probeExecutor(researchCommand, "hermes_research");
      process.stdout.write(`${JSON.stringify(hermesExecutorCapabilitiesSchema.parse({ schema_version: "HermesExecutorCapabilitiesV1", capability: "hermes_research", contract_version: "HermesResearchContractV1", supports: ["--probe", "stdin-json"] }))}\n`);
      return;
    }
    const sourceCommitSha = requiredMatch("HERMES_WORKER_SOURCE_COMMIT_SHA", /^[a-f0-9]{40}$/);
    const bundleSha256 = requiredMatch("HERMES_WORKER_BUNDLE_SHA256", /^[a-f0-9]{64}$/);
    const fenceGeneration = BigInt(requiredMatch("HERMES_WORKER_FENCE_GENERATION", /^[1-9][0-9]*$/));
    do {
      const registered = await db.registerCapability({
        workerId: id,
        fenceGeneration,
        sourceCommitSha,
        bundleSha256,
        identityContractVersion: "HermesResearchContractV1",
        researchContractVersion: "HermesResearchContractV1",
      });
      if (!registered) throw new Error("Neon rejected the worker capability fence generation.");
      const claim = await db.claim(id);
      if (!claim) {
        if (process.argv.includes("--once")) return;
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        continue;
      }
      await processClaim(db, claim, idCommand, researchCommand);
      if (process.argv.includes("--once")) return;
    } while (true);
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Hermes worker failure.";
  process.stderr.write(`Hermes landing worker stopped: ${message}\n`);
  process.exitCode = 1;
});
