import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { assertSafePublicHttpsUrl } from "../src/lib/landing-research/network-safety";
import {
  hermesExecutorCapabilitiesSchema,
  hermesExecutorRequestSchema,
  hermesExecutorResponseSchema,
  canonicalJsonDigest,
  type HermesExecutorRequestV1,
} from "../src/lib/landing-research/contracts";
import { ExecutorError, runApprovedExecutor } from "../src/lib/landing-research/executor";
import { createNeonPool, NeonResearchWorker, type ClaimedResearchStage } from "../src/lib/landing-research/neon";

const IDENTITY_TIMEOUT_MS = 120_000;
const RESEARCH_TIMEOUT_MS = 900_000;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function safeExecutorEnvironment(): Record<string, string | undefined> {
  return { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HERMES_CLI_PATH: process.env.HERMES_CLI_PATH };
}

function workerId(): string {
  return process.env.HERMES_LANDING_WORKER_ID?.trim() || `oracle-hermes-research-${randomUUID()}`;
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
      process.stdout.write(`${JSON.stringify(hermesExecutorCapabilitiesSchema.parse({ schema_version: "HermesExecutorCapabilitiesV1", capability: "hermes_research", contract_version: "HermesResearchContractV1", supports: ["--probe", "stdin-json"] }))}\n`);
      return;
    }
    do {
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
