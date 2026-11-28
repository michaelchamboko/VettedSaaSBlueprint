import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultWorkerRunner, invokeWorker, prepareWorkerInvocation } from "../src/lib/article-import/worker-runner";
import { openCodeExecutable } from "../src/lib/article-import/opencode-runtime";
import { nodeExecutable } from "../src/lib/article-import/node-runtime";

const importId = "article-11223344-abcd-abcd-abcd-0123456789ab";
const key = "a".repeat(64);

function packet(stage = "REFINING") {
  return {
    importId,
    idempotencyKey: key,
    sourceFingerprint: "b".repeat(64),
    sourcePath: `.automation/article-imports/${importId}.source.md`,
    requirementRevision: "fixture",
    stage,
    record: { importId, format: "agent_review_required", stageReceipts: [] },
  };
}

test("trusted REFINING command receives the exact packet and returns the bound controller result", async t => {
  const root = await mkdtemp(path.join(process.cwd(), ".tmp-article-worker-command-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workPath = `build-pack/article-import/${importId}/${key}.work.json`;
  const resultPath = `build-pack/article-import/${importId}/${key}.result.json`;
  await mkdir(path.join(root, path.dirname(workPath)), { recursive: true });
  await mkdir(path.join(root, ".automation/article-imports/leases/import", importId), { recursive: true });
  const scopedPacket = packet();
  await writeFile(path.join(root, workPath), JSON.stringify(scopedPacket));
  const worker = path.join(root, "worker.cjs");
  await writeFile(worker, `
    const fs = require("node:fs");
    if (Object.keys(process.env).some(key => key.toUpperCase() === "ARTICLE_OWNER_DECISION_SECRET")) throw new Error("owner credential reached worker");
    const packetPath = process.argv[2];
    const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
    process.stdout.write(JSON.stringify({
      idempotencyKey: packet.idempotencyKey,
      sourceFingerprint: packet.sourceFingerprint,
      summary: "alternate worker completed the scoped packet",
      work: { stage: packet.stage }
    }));
  `);
  const previousOwnerSecrets = Object.entries(process.env).filter(([key]) => key.toUpperCase() === "ARTICLE_OWNER_DECISION_SECRET");
  for (const [key] of previousOwnerSecrets) delete process.env[key];
  process.env.Article_Owner_Decision_Secret = "synthetic-owner-only-secret-never-forwarded";
  t.after(() => {
    for (const key of Object.keys(process.env).filter(key => key.toUpperCase() === "ARTICLE_OWNER_DECISION_SECRET")) delete process.env[key];
    for (const [key, value] of previousOwnerSecrets) process.env[key] = value;
  });

  await invokeWorker(root, workPath, resultPath, scopedPacket, "11111111-1111-1111-1111-111111111111", async () => {}, {
    worker: { kind: "command", executable: process.execPath, args: [worker, "{packetPath}"], timeoutMs: 30_000 },
  });

  assert.deepEqual(JSON.parse(await readFile(path.join(root, resultPath), "utf8")), {
    idempotencyKey: key,
    sourceFingerprint: scopedPacket.sourceFingerprint,
    summary: "alternate worker completed the scoped packet",
    work: { stage: "REFINING" },
  });
});

test("alternate command protocol is stage-limited and requires an exact packet placeholder", async t => {
  const root = await mkdtemp(path.join(process.cwd(), ".tmp-article-worker-command-policy-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = { kind: "command" as const, executable: process.execPath, args: ["worker.cjs", "{packetPath}"] };
  await assert.rejects(prepareWorkerInvocation(root, "packet.json", packet("RESEARCHING"), config, "11111111-1111-1111-1111-111111111111"), /restricted to REFINING/);
  await assert.rejects(prepareWorkerInvocation(root, "packet.json", packet(), { ...config, args: ["worker.cjs"] }, "11111111-1111-1111-1111-111111111111"), /must include \{packetPath\}/);
});

test("RELEASING prompt requires every controller-bound hero and publication path", async t => {
  const root = await mkdtemp(path.join(process.cwd(), ".tmp-article-worker-release-paths-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const requiredReleaseFiles = [
    "public/images/direct-review-acme-review-hero.webp",
    "src/generated/article-heroes/direct-review/acme-review.json",
    "src/generated/landing-pages/acme-review.json",
    "src/generated/landing-pages/index.json",
  ];
  const invocation = await prepareWorkerInvocation(root, "packet.json", {
    ...packet("RELEASING"),
    requiredReleaseFiles,
    record: { importId, format: "direct-review", stageReceipts: [] },
  }, { kind: "opencode", executable: "opencode", model: "fixture/model" }, "11111111-1111-1111-1111-111111111111");
  const prompt = invocation.args.at(-1)!;
  for (const file of requiredReleaseFiles) assert.match(prompt, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt, /work\.changedFiles.*every actual scoped release change/);
});

test("IMPROVE may read only its import's immutable work history", async t => {
  const root = await mkdtemp(path.join(process.cwd(), ".tmp-article-worker-improve-history-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const invocation = await prepareWorkerInvocation(root, "packet.json", {
    ...packet("IMPROVE"),
    improvePhase: "ASSESSING",
    record: { importId, format: "agent_review_required", stage: "LIVE", stageReceipts: [] },
  }, { kind: "opencode", executable: "opencode", model: "fixture/model" }, "11111111-1111-1111-1111-111111111111");
  const config = JSON.parse(await readFile(path.join(invocation.cwd, "opencode.json"), "utf8"));
  assert.equal(config.mcp.servers.improve.command[0], nodeExecutable());
  const permissions = config.agents["article-worker"].permissions as Array<{ action: string; resource: string; effect: string }>;
  const canonical = (await realpath(root)).replaceAll("\\", "/");
  const workRoot = `${canonical}/.automation/article-imports/work`;
  assert.ok(permissions.some(rule => rule.effect === "allow" && rule.action === "read" && rule.resource === `${workRoot}/${importId}/*`));
  assert.equal(permissions.some(rule => rule.effect === "allow" && rule.action === "read" && rule.resource === `${workRoot}/article-ffffffff-ffff-4fff-8fff-ffffffffffff/*`), false);
  assert.equal(permissions.some(rule => rule.effect === "allow" && rule.action === "read" && rule.resource === `${workRoot}/*`), false);
  assert.equal(permissions.some(rule => rule.effect === "allow" && rule.action === "edit" && rule.resource.startsWith(workRoot + "/")), false);
});

test("native OpenCode resolves Node and its detached IPC host returns a harmless synthetic receipt", async t => {
  const nodeDirectory = path.dirname(process.execPath);
  const delimiter = process.platform === "win32" ? ";" : ":";
  const nativeName = process.platform === "win32" ? "C:\\tools\\opencode.exe" : "/tools/opencode";
  assert.equal(nodeExecutable({
    env: { [process.platform === "win32" ? "Path" : "PATH"]: [nodeDirectory, "unused"].join(delimiter) },
    execPath: nativeName,
    platform: process.platform,
    access: (candidate: string) => { if (path.resolve(candidate) !== path.resolve(process.execPath)) throw new Error("missing"); },
  }), process.execPath);

  const root = await mkdtemp(path.join(process.cwd(), ".tmp-native-node-host-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await defaultWorkerRunner({
    executable: process.execPath,
    args: ["-e", "process.stdout.write(JSON.stringify({ok:true,source:'synthetic-node-worker'}))"],
    cwd: root,
    resultFormat: "json",
    timeoutMs: 30_000,
    checkpoint: path.join(root, "launch.marker"),
    ownershipFile: path.join(root, "11111111-1111-1111-1111-111111111111.worker"),
  });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(JSON.parse(result.stdout), { ok: true, source: "synthetic-node-worker" });
});

test("worker host still accepts the legacy object IPC payload", async t => {
  const root = await mkdtemp(path.join(process.cwd(), ".tmp-legacy-node-host-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const ownershipFile = path.join(root, "22222222-2222-2222-2222-222222222222.worker");
  const host = spawn(nodeExecutable(), [path.resolve("src/lib/article-import/worker-host.mjs")], {
    windowsHide: true,
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  await new Promise<void>((resolve, reject) => {
    host.once("error", reject);
    host.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`worker host exited ${code}`)));
    host.once("spawn", () => host.send({
      executable: nodeExecutable(),
      args: ["-e", "process.stdout.write('legacy-object-ok')"],
      cwd: root,
      timeoutMs: 30_000,
      ownershipFile,
    }));
  });
  const receipt = JSON.parse(await readFile(ownershipFile + ".out", "utf8"));
  assert.equal(receipt.exitCode, 0);
  assert.equal(receipt.stdout, "legacy-object-ok");
});

test("REFINING environment adapter never overrides another stage", async t => {
  const root = await mkdtemp(path.join(process.cwd(), ".tmp-article-worker-env-scope-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workPath = `build-pack/article-import/${importId}/${key}.work.json`;
  const resultPath = `build-pack/article-import/${importId}/${key}.result.json`;
  await mkdir(path.join(root, path.dirname(workPath)), { recursive: true });
  const scopedPacket = packet("RESEARCHING");
  await writeFile(path.join(root, workPath), JSON.stringify(scopedPacket));
  const previousExecutable = process.env.ARTICLE_REFINING_WORKER_EXECUTABLE;
  const previousArgv = process.env.ARTICLE_REFINING_WORKER_ARGV;
  process.env.ARTICLE_REFINING_WORKER_EXECUTABLE = path.join(root, "must-not-run");
  process.env.ARTICLE_REFINING_WORKER_ARGV = "not-json";
  t.after(() => {
    if (previousExecutable === undefined) delete process.env.ARTICLE_REFINING_WORKER_EXECUTABLE;
    else process.env.ARTICLE_REFINING_WORKER_EXECUTABLE = previousExecutable;
    if (previousArgv === undefined) delete process.env.ARTICLE_REFINING_WORKER_ARGV;
    else process.env.ARTICLE_REFINING_WORKER_ARGV = previousArgv;
  });
  let executable = "";
  await invokeWorker(root, workPath, resultPath, scopedPacket, "11111111-1111-1111-1111-111111111111", async () => {}, {
    workerModel: "fixture/model",
    workerRunner: async input => {
      executable = input.executable;
      const result = { idempotencyKey: key, sourceFingerprint: scopedPacket.sourceFingerprint, work: { stage: "RESEARCHING" } };
      return { stdout: [
        JSON.stringify({ sessionID: "fixture", type: "step_start", part: {} }),
        JSON.stringify({ sessionID: "fixture", type: "text", part: { text: JSON.stringify(result) } }),
        JSON.stringify({ sessionID: "fixture", type: "step_finish", part: { reason: "stop" } }),
      ].join("\n"), stderr: "", exitCode: 0, timedOut: false };
    },
  });
  assert.equal(executable, openCodeExecutable());
});

test("explicit OpenCode selection remains available for REFINING", async t => {
  const root = await mkdtemp(path.join(process.cwd(), ".tmp-article-worker-opencode-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workPath = `build-pack/article-import/${importId}/${key}.work.json`;
  const resultPath = `build-pack/article-import/${importId}/${key}.result.json`;
  await mkdir(path.join(root, path.dirname(workPath)), { recursive: true });
  const scopedPacket = packet();
  await writeFile(path.join(root, workPath), JSON.stringify(scopedPacket));
  const previousExecutable = process.env.ARTICLE_REFINING_WORKER_EXECUTABLE;
  const previousArgv = process.env.ARTICLE_REFINING_WORKER_ARGV;
  process.env.ARTICLE_REFINING_WORKER_EXECUTABLE = path.join(root, "alternate-must-not-run");
  process.env.ARTICLE_REFINING_WORKER_ARGV = "not-json";
  t.after(() => {
    if (previousExecutable === undefined) delete process.env.ARTICLE_REFINING_WORKER_EXECUTABLE;
    else process.env.ARTICLE_REFINING_WORKER_EXECUTABLE = previousExecutable;
    if (previousArgv === undefined) delete process.env.ARTICLE_REFINING_WORKER_ARGV;
    else process.env.ARTICLE_REFINING_WORKER_ARGV = previousArgv;
  });
  let invocation: { executable: string; args: string[] } | undefined;
  await invokeWorker(root, workPath, resultPath, scopedPacket, "11111111-1111-1111-1111-111111111111", async () => {}, {
    worker: { kind: "opencode", model: "fixture/chosen-model" },
    workerRunner: async input => {
      invocation = input;
      const result = { idempotencyKey: key, sourceFingerprint: scopedPacket.sourceFingerprint, work: { stage: "REFINING" } };
      return { stdout: [
        JSON.stringify({ sessionID: "fixture", type: "step_start", part: {} }),
        JSON.stringify({ sessionID: "fixture", type: "text", part: { text: JSON.stringify(result) } }),
        JSON.stringify({ sessionID: "fixture", type: "step_finish", part: { reason: "stop" } }),
      ].join("\n"), stderr: "", exitCode: 0, timedOut: false };
    },
  });
  assert.equal(invocation?.executable, openCodeExecutable());
  assert.equal(invocation?.args[invocation.args.indexOf("--model") + 1], "fixture/chosen-model");
});

test("activity workers receive one current activity and only accepted current-stage handoffs", async t => {
  const root = await mkdtemp(path.join(process.cwd(), ".tmp-article-worker-activity-projection-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const desktopRef = { path: `build-pack/article-import/${importId}/desktop.json`, sha256: "d".repeat(64) };
  const staleRef = { path: `build-pack/article-import/${importId}/stale.json`, sha256: "e".repeat(64) };
  const activeFinding = { findingId: `finding-${"f".repeat(24)}`, stage: "VALIDATING", activityId: "mobile", status: "open", observation: "Mobile spacing is clipped." };
  const invocation = await prepareWorkerInvocation(root, "packet.json", {
    ...packet("VALIDATING"),
    acceptedActivityOutputs: [{ activityId: "desktop", outcome: "accepted", observation: "Desktop passed.", resultRef: desktopRef }],
    gateHandoff: {
      schemaVersion: "ImportGateHandoffV1", passedGate: "REFINING", nextStage: "VALIDATING",
      requiredNextInputs: [{ name: "candidate-artifact", reference: desktopRef }], constraints: { artifact: "current" },
      acceptedOutputs: [{ name: "old-output", reference: staleRef }], retainedEvidence: [{ name: "old-evidence", reference: staleRef }],
      disposalCandidates: [{ reference: staleRef, reason: "superseded" }], unclassifiedMaterial: [{ reference: staleRef, reason: "historical" }],
      cleanup: { status: "verified", operations: [{ operationId: "cleanup-secret-history" }] }, declaredAt: "2026-01-01T00:00:00.000Z",
    },
    activity: { stage: "VALIDATING", id: "mobile", attemptId: `activity-attempt-${"a".repeat(24)}`, inputFingerprint: "1".repeat(64), criteria: [{ id: "validating.mobile", revision: "fixture" }], dependencyRefs: [], openFindings: [activeFinding] },
    record: {
      importId, format: "agent_review_required", stage: "VALIDATING", stageReceipts: [{ stage: "REFINING", status: "passed", at: "2026-01-01T00:00:00.000Z", message: "historical" }],
      activityAttempts: [{ attemptId: `activity-attempt-${"b".repeat(24)}`, resultPath: "old.result.json", status: "superseded" }],
      activityFindings: [activeFinding, { ...activeFinding, findingId: `finding-${"c".repeat(24)}`, activityId: "desktop", status: "resolved" }],
      activityReceipts: [
        { stage: "VALIDATING", activityId: "desktop", outcome: "accepted", resultRef: desktopRef, observation: "Desktop passed." },
        { stage: "REFINING", activityId: "wording-and-rhythm", outcome: "accepted", resultRef: staleRef, observation: "Old stage output." },
      ],
    },
  }, { kind: "opencode", executable: "opencode", model: "fixture/model" }, "11111111-1111-1111-1111-111111111111");

  const packetPath = invocation.args[invocation.args.indexOf("--file") + 1];
  const projected = JSON.parse(await readFile(packetPath, "utf8"));
  assert.equal(projected.record.stageReceipts, undefined);
  assert.equal(projected.record.activityAttempts, undefined);
  assert.deepEqual(projected.activeFindings, [activeFinding]);
  assert.deepEqual(projected.acceptedActivityOutputs, [{ activityId: "desktop", outcome: "accepted", observation: "Desktop passed.", resultRef: desktopRef }]);
  assert.deepEqual(projected.gateHandoff, { schemaVersion: "ImportGateHandoffV1", passedGate: "REFINING", nextStage: "VALIDATING", requiredNextInputs: [{ name: "candidate-artifact", reference: desktopRef }], constraints: { artifact: "current" } });
  assert.doesNotMatch(JSON.stringify(projected), /old\.result\.json|stale\.json/);
  assert.doesNotMatch(JSON.stringify(projected), /cleanup-secret-history|disposalCandidates|retainedEvidence|unclassifiedMaterial/);
  const config = JSON.parse(await readFile(path.join(invocation.cwd, "opencode.json"), "utf8"));
  const canonical = (await realpath(root)).replaceAll("\\", "/");
  assert.ok(config.agents["article-worker"].permissions.some((rule: { action: string; resource: string; effect: string }) =>
    rule.effect === "allow" && rule.action === "read" && rule.resource === `${canonical}/${desktopRef.path}`));
  const prompt = invocation.args.at(-1)!;
  assert.match(prompt, /current activity only: mobile/i);
  assert.doesNotMatch(prompt, /then every required design/);
});
