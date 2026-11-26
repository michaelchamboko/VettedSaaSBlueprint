import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ExternalArticleImportV1 } from "../../src/lib/article-import/contracts";
import { writeJsonAtomically } from "../../src/lib/article-import/engine";

type WorkContinuation = Extract<NonNullable<ExternalArticleImportV1["continuation"]>, { kind: "work" }>;

export async function writeGapPlanResult(
  root: string,
  continuation: WorkContinuation,
  input: { claimId?: string; claimText: string; sourceFingerprint?: string; researchAction?: "reuse" | "acquire" } = { claimText: "A mocked supported claim." },
) {
  const packet = JSON.parse(await readFile(path.join(root, continuation.workPath), "utf8"));
  const decisionPath = path.posix.join(path.posix.dirname(continuation.resultPath), `${continuation.idempotencyKey}.registry-decision.json`);
  const decision = {
    schemaVersion: "ResearchRegistryDecisionV1",
    importId: packet.importId,
    sourceFingerprint: packet.sourceFingerprint,
    planFingerprint: packet.researchRegistry.planFingerprint,
    createdAt: packet.researchRegistry.generatedAt,
    claims: [{
      claimId: input.claimId ?? "claim",
      claimText: input.claimText,
      material: true,
      productContext: "general",
      action: "researched_gap",
      gapReason: "missing",
      registryMatches: [],
      rationale: "No current registry evidence covers this synthetic claim.",
    }],
  };
  await writeJsonAtomically(path.join(root, decisionPath), decision);
  await writeJsonAtomically(path.join(root, continuation.resultPath), {
    idempotencyKey: continuation.idempotencyKey,
    sourceFingerprint: input.sourceFingerprint ?? continuation.sourceFingerprint,
    summary: "Recorded the synthetic registry decision.",
    work: { stage: "RESEARCHING", researchAction: input.researchAction ?? "acquire", registryDecisionPath: decisionPath },
  });
  return { packet, decision, decisionPath };
}

export async function writeAcquisitionResult(
  root: string,
  continuation: WorkContinuation,
  evidencePath: string,
  input: { sourceFingerprint?: string; stage?: string; registryDecisionPath?: string; omitWriteback?: boolean } = {},
) {
  const packet = JSON.parse(await readFile(path.join(root, continuation.workPath), "utf8"));
  const evidence = JSON.parse(await readFile(path.join(root, evidencePath), "utf8"));
  const evidenceSources = Array.isArray(evidence.sources) ? evidence.sources : [];
  const evidenceClaims = Array.isArray(evidence.claims) ? evidence.claims : [];
  const decision = packet.registryDecision;
  const writebackPath = path.posix.join(path.posix.dirname(continuation.resultPath), `${continuation.idempotencyKey}.registry-writeback.json`);
  if (!input.omitWriteback) {
    await writeJsonAtomically(path.join(root, writebackPath), {
      schemaVersion: "ResearchRegistryWritebackV1",
      importId: packet.importId,
      sourceFingerprint: packet.sourceFingerprint,
      decisionSha256: packet.registryDecisionSha256,
      createdAt: decision.createdAt,
      sources: evidenceSources.map((source: { id: string }) => ({ sourceId: source.id, sourceType: "synthetic", accessOutcome: "success", locator: null })),
      claims: decision.claims.map((claim: { claimId: string }, index: number) => ({
        plannedClaimId: claim.claimId,
        evidenceClaimId: evidenceClaims[index]?.id ?? claim.claimId,
        disposition: "confirmed",
        claimKind: "factual",
        verdict: "SUPPORTED",
        confidence: 1,
        reasoning: "Synthetic evidence supports the planned claim.",
        expiresAt: "2099-01-01T00:00:00.000Z",
      })),
    });
  }
  await writeJsonAtomically(path.join(root, continuation.resultPath), {
    idempotencyKey: continuation.idempotencyKey,
    sourceFingerprint: input.sourceFingerprint ?? continuation.sourceFingerprint,
    summary: "Completed synthetic gap research.",
    work: {
      stage: input.stage ?? "RESEARCHING",
      evidencePath,
      registryDecisionPath: input.registryDecisionPath ?? packet.registryDecisionPath,
      ...(!input.omitWriteback && { registryWritebackPath: writebackPath }),
    },
  });
  return { packet, writebackPath };
}
