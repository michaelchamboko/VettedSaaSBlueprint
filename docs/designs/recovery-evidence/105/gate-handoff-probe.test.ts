// Synthetic investigation only. This file does not implement product cleanup.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  advanceImport,
  createArticleImport,
  executePendingImport,
} from "../../../../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../../../../src/lib/article-import/supervised-executor";
import { fixtureResearchRegistry } from "../../../../tests/fixtures/article-command";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureParent = path.resolve(".scratch/recovery-105");
const controlledNow = Date.parse("2026-11-27T12:00:00.000Z");
const day = 24 * 60 * 60 * 1_000;
const observations: Record<string, unknown>[] = [];

type Artifact = {
  id: string;
  kind: string;
  bytes: Buffer;
  verifiedTemporaryCopy?: boolean;
  superseded?: boolean;
  archivedAt?: number;
  dependencies: string[];
};

type Disposition = {
  artifactId: string;
  disposition: "retain" | "archive" | "dispose" | "unclassified";
  reason: string;
};

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

function classify(
  artifact: Artifact,
  now: number,
  newlyClaimed: ReadonlySet<string>,
): Disposition {
  const activeDependencies = [...artifact.dependencies, ...(newlyClaimed.has(artifact.id) ? ["newly-claimed"] : [])];
  if (activeDependencies.length > 0) {
    return {
      artifactId: artifact.id,
      disposition: "retain",
      reason: `protected dependency: ${activeDependencies.join(", ")}`,
    };
  }
  if (artifact.verifiedTemporaryCopy) {
    return { artifactId: artifact.id, disposition: "dispose", reason: "verified disposable temporary copy" };
  }
  if (artifact.superseded && ["draft", "capture"].includes(artifact.kind)) {
    if (artifact.archivedAt === undefined) {
      return { artifactId: artifact.id, disposition: "archive", reason: "dependency-free superseded material begins recoverable 30-day retention" };
    }
    if (now - artifact.archivedAt < 30 * day) {
      return { artifactId: artifact.id, disposition: "retain", reason: "recoverable archive has not reached 30 days" };
    }
    return { artifactId: artifact.id, disposition: "dispose", reason: "30-day archive expired and eligibility was rechecked" };
  }
  return { artifactId: artifact.id, disposition: "unclassified", reason: "no declared disposal rule" };
}

async function syntheticBoundary() {
  await mkdir(fixtureParent, { recursive: true });
  const root = await mkdtemp(path.join(fixtureParent, "case-"));
  const source = "# Synthetic handoff\n\nNo real article, worker, database, or release operation is used.\n";
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), source);
  const created = await createArticleImport(root, "article.md");
  const marker = path.join(root, "synthetic-cleanup.pending.json");
  const temporary = path.join(root, "synthetic-verified-copy.tmp");
  await writeFile(marker, JSON.stringify({ gate: "INGESTING", status: "interrupted", nextGate: "RESEARCHING" }));
  await writeFile(temporary, "verified temporary fixture bytes");
  const researching = await advanceImport(root, created, "Synthetic INGESTING gate passed.");
  const dispatched = await executePendingImport(
    root,
    created.importId,
    createSupervisedImportExecutor(root, undefined, { researchRegistry: fixtureResearchRegistry(root) }),
  );
  assert.equal(dispatched.continuation?.kind, "work");
  if (dispatched.continuation?.kind !== "work") throw new Error("Normal controller did not create the RESEARCHING packet.");
  const packet = JSON.parse(await readFile(path.join(root, dispatched.continuation.workPath), "utf8"));
  return { root, source, marker, temporary, researching, dispatched, packet };
}

test("normal controller dispatch exposes the current full-record handoff and ignores an incomplete cleanup marker", async () => {
  const boundary = await syntheticBoundary();
  try {
    assert.equal(boundary.dispatched.stage, "RESEARCHING");
    assert.equal(boundary.packet.stage, "RESEARCHING");
    assert.equal(boundary.packet.record.importId, boundary.dispatched.importId);
    assert.equal(boundary.packet.record.stage, "RESEARCHING");
    assert.equal(boundary.packet.acceptedOutputs, undefined);
    assert.equal(boundary.packet.requiredNextInputs, undefined);
    assert.equal(boundary.packet.retentionDependencies, undefined);
    assert.equal(boundary.packet.disposalCandidates, undefined);
    assert.equal(boundary.packet.unclassifiedMaterial, undefined);
    assert.equal((await readFile(boundary.marker, "utf8")).includes("interrupted"), true);
    assert.equal(await readFile(boundary.temporary, "utf8"), "verified temporary fixture bytes");
    const retainedSource = await readFile(path.join(boundary.root, boundary.packet.sourcePath), "utf8");
    assert.equal(retainedSource, boundary.source.trimEnd());
    observations.push({
      case: "normal-dispatch-boundary",
      stage: boundary.dispatched.stage,
      fullRecordEmbedded: true,
      sourceBytesReadable: true,
      explicitHandoffClassification: false,
      cleanupMarkerBlocksDispatch: false,
      temporaryCopyRemoved: false,
    });
    if (process.env.RECOVERY_105_ASSERT_REQUIRED === "1") {
      assert.equal(boundary.dispatched.continuation, undefined, "a passed gate must not dispatch next work while cleanup is incomplete");
    }
  } finally {
    await rm(boundary.root, { recursive: true, force: true });
  }
});

test("test-only classifier exercises controlled-time archive and re-claim rules", () => {
  const protectedKinds = [
    "active-work", "rejected-evidence", "resolution", "diagnosis", "registered-evidence",
    "publication-proof", "rollback", "improve",
  ];
  const protectedArtifacts = protectedKinds.map((kind) => ({
    id: kind,
    kind,
    bytes: Buffer.from(`readable ${kind} bytes`),
    dependencies: [kind],
  } satisfies Artifact));
  const temporary: Artifact = {
    id: "temporary-copy", kind: "temporary", bytes: Buffer.from("verified temporary bytes"),
    verifiedTemporaryCopy: true, dependencies: [],
  };
  const draftAt29Days: Artifact = {
    id: "superseded-draft", kind: "draft", bytes: Buffer.from("recoverable superseded draft"),
    superseded: true, archivedAt: controlledNow - (29 * day), dependencies: [],
  };
  const captureAtExpiry: Artifact = {
    id: "superseded-capture", kind: "capture", bytes: Buffer.from("recoverable superseded capture"),
    superseded: true, archivedAt: controlledNow - (30 * day), dependencies: [],
  };
  const unknown: Artifact = {
    id: "unknown-sidecar", kind: "unknown", bytes: Buffer.from("unclassified bytes remain readable"), dependencies: [],
  };
  const baseline = [
    ...protectedArtifacts.map((artifact) => classify(artifact, controlledNow, new Set())),
    classify(temporary, controlledNow, new Set()),
    classify(draftAt29Days, controlledNow, new Set()),
    classify(captureAtExpiry, controlledNow, new Set()),
    classify(unknown, controlledNow, new Set()),
  ];
  assert.equal(baseline.find((item) => item.artifactId === temporary.id)?.disposition, "dispose");
  assert.equal(baseline.find((item) => item.artifactId === draftAt29Days.id)?.disposition, "retain");
  assert.equal(baseline.find((item) => item.artifactId === captureAtExpiry.id)?.disposition, "dispose");
  assert.equal(baseline.find((item) => item.artifactId === unknown.id)?.disposition, "unclassified");
  assert.ok(protectedArtifacts.every((artifact) => baseline.find((item) => item.artifactId === artifact.id)?.disposition === "retain"));
  const reclaimed = classify(captureAtExpiry, controlledNow, new Set([captureAtExpiry.id]));
  assert.equal(reclaimed.disposition, "retain");
  assert.match(reclaimed.reason, /newly-claimed/);
  for (const artifact of [...protectedArtifacts, draftAt29Days, captureAtExpiry, unknown]) {
    assert.equal(sha256(artifact.bytes).length, 64);
    assert.ok(artifact.bytes.length > 0);
  }
  observations.push({
    case: "retention-classifier",
    controlledNow: new Date(controlledNow).toISOString(),
    immediateTemporaryDisposal: true,
    archiveRecoverableAt29Days: true,
    expiredCaptureEligibleAt30Days: true,
    newlyClaimedDependencyRetained: true,
    unclassifiedPreserved: true,
    protectedKinds,
    dispositions: baseline,
  });
});

test.skip("future acceptance: later-gate cleanup rechecks persisted references, mutates bytes, and resumes after interruption", () => {});
test.skip("future acceptance: explicit manual cleanup uses the same durable operation and retry identity", () => {});
test.skip("future acceptance: archived evidence remains resolvable after reference registration and original removal", () => {});

test.after(async () => {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(path.join(evidenceDirectory, "observations.json"), JSON.stringify({
    schemaVersion: "GateHandoffRecoveryEvidence105V1",
    investigatedRevision: "f026bca8b53aecca829262e9a27820ac6d078892",
    branchBaseline: "d3d49f4c132d5d6b2c597df10d189d1564d89a4d",
    syntheticOnly: true,
    normalEntryPoint: "executePendingImport(createSupervisedImportExecutor(root))",
    observations,
  }, null, 2) + "\n");
});
