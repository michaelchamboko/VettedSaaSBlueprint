import { spawn } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { executeFixtureCommand as executeImportCommand } from "./fixtures/article-command";
import { createArticleImport, recoverWorkflowLease } from "../src/lib/article-import/engine";
import { claimNextIntakeEntry, createIntakeRun } from "../src/lib/article-import/intake";
import { defaultWorkerRunner, extractJsonObject, type WorkerRunner } from "../src/lib/article-import/worker-runner";
import { type ExternalArticleImportV1 } from "../src/lib/article-import/contracts";
import { type IntakeRun } from "../src/lib/article-import/intake";
import { type DispatchOptions } from "../src/lib/article-import/dispatch";
import { loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { storeEvidence } from "../src/lib/article-import/workflow-evidence";

function dispatchArticleImport(root: string, importId: string, options: DispatchOptions) {
  return executeImportCommand(root, { kind: "dispatch", importId }, undefined, options) as Promise<ExternalArticleImportV1>;
}
function dispatchIntakeRun(root: string, runId: string, options: DispatchOptions) {
  return executeImportCommand(root, { kind: "dispatch-intake", runId }, undefined, options) as Promise<IntakeRun>;
}
async function rootWithArticle() {
  await mkdir(path.join(process.cwd(), ".scratch"), { recursive: true });
  const root = await mkdtemp(path.join(process.cwd(), ".scratch", "dispatch-tracked-"));
  await mkdir(path.join(root, "Article Intake"), { recursive: true });
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "Article Intake/a.md"), "# A\n\nSynthetic article.");
  return root;
}

async function makeResearchEvidence(root: string, importId: string) {
  const evidencePath = "build-pack/article-import/research.json";
  const snapshotRef = await storeEvidence(root, importId, { source: "A mocked supported claim." });
  await mkdir(path.dirname(path.join(root, evidencePath)), { recursive: true });
  await writeJsonAtomically(path.join(root, evidencePath), {
    schemaVersion: "ResearchEvidenceV2", id: "research-fixture", createdAt: "2026-11-03T00:00:00.000Z", importId,
    sourceFingerprint: (await loadImport(root, importId)).sourceFingerprint, requirementRevision: WORKFLOW_REVISION,
    sources: [{ id: "source", url: "https://example.com/manual", retrievedAt: "2026-11-03T00:00:00.000Z", snapshotRef }],
    claims: [{ id: "claim", text: "A mocked supported claim.", sourceIds: ["source"], excerptLocations: [{ sourceId: "source", quote: "A mocked supported claim." }], limitations: [] }],
    freshness: "Synthetic fixture.",
  });
  return evidencePath;
}

function jsonlResult(packet: { idempotencyKey: string; sourceFingerprint: string; stage: string }, evidencePath: string) {
  return [
    JSON.stringify({ type: "step_start", timestamp: 1, sessionID: "s", part: { id: "p", sessionID: "s", messageID: "m", type: "step-start" } }),
    JSON.stringify({ type: "text", timestamp: 2, sessionID: "s", part: { id: "t", sessionID: "s", messageID: "m", type: "text", text: JSON.stringify({ idempotencyKey: packet.idempotencyKey, sourceFingerprint: packet.sourceFingerprint, summary: "worker", work: { stage: packet.stage, evidencePath } }), time: { start: 1, end: 2 } } }),
    JSON.stringify({ type: "step_finish", timestamp: 3, sessionID: "s", part: { id: "f", sessionID: "s", messageID: "m", type: "step-finish", reason: "stop", cost: 0, tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } } } }),
  ].join("\n");
}

test("tracked: missing worker result reports blocked", async () => {
  const root = await rootWithArticle();
  try {
    await writeFile(path.join(root, "Article Intake/b.md"), "# B");
    const run = await createIntakeRun(root);
    const claim = await claimNextIntakeEntry(root, run.runId);
    assert.equal(claim.entries[0].importId, undefined);
    await writeFile(path.join(root, "Article Intake/a.md"), "changed after capture");
    await writeFile(path.join(root, "Article Intake/0.md"), "late arrival");
    const dispatched = await dispatchIntakeRun(root, run.runId, { workerModel: "test/model-a", workerExecutable: path.join(root, "absent-worker") });
    assert.match(dispatched.blocker!.message, /CAPABILITY_UNAVAILABLE: worker exited/);
    assert.deepEqual(dispatched.entries.map(entry => entry.status), ["PROCESSING", "PENDING"]);
    const record = await loadImport(root, dispatched.entries[0].importId!);
    assert.equal(record.sourceFingerprint, run.entries[0].sourceFingerprint);
    assert.equal(record.continuation?.kind, "blocked");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("tracked: consume saved result with zero worker invocations", async () => {
  const root = await rootWithArticle();
  try {
    const record = await createArticleImport(root, "Article Intake/a.md");
    const importId = record.importId;
    await executeImportCommand(root, { kind: "resume", importId });
    await executeImportCommand(root, { kind: "resume", importId });
    const current = await loadImport(root, importId);
    const workPath = current.nextAction.match(/(\S+\.work\.json)/)![1];
    const packet = JSON.parse(await readFile(path.join(root, workPath), "utf8"));
    const evidencePath = await makeResearchEvidence(root, importId);
    await writeJsonAtomically(path.join(root, packet.resultPath), {
      idempotencyKey: packet.idempotencyKey, sourceFingerprint: packet.sourceFingerprint, summary: "saved", work: { stage: "RESEARCHING", evidencePath },
    });
    let calls = 0;
    const result = await dispatchArticleImport(root, importId, { workerModel: "test/model-a", workerRunner: async () => { calls += 1; return { stdout: "", stderr: "", exitCode: 0, timedOut: false }; }, maxSteps: 1 });
    assert.equal(calls, 0);
    assert.equal(result.stage, "TRANSFORMING", result.stageReceipts.at(-1)?.message);
  } finally { await rm(root, { recursive: true, force: true }); }
});

for (const fault of ["malformed", "wrong-stage", "stale"]) test("saved result rejects " + fault, async () => {
  const root = await rootWithArticle();
  try {
    const record = await createArticleImport(root, "Article Intake/a.md");
    const importId = record.importId;
    await executeImportCommand(root, { kind: "resume", importId });
    await executeImportCommand(root, { kind: "resume", importId });
    const current = await loadImport(root, importId);
    const workPath = current.nextAction.match(/(\S+\.work\.json)/)![1];
    const packet = JSON.parse(await readFile(path.join(root, workPath), "utf8"));
    if (fault === "malformed") await writeFile(path.join(root, packet.resultPath), "{");
    else await writeJsonAtomically(path.join(root, packet.resultPath), { idempotencyKey: packet.idempotencyKey,
      sourceFingerprint: fault === "stale" ? "0".repeat(64) : packet.sourceFingerprint, summary: "bad",
      work: { stage: fault === "wrong-stage" ? "TRANSFORMING" : "RESEARCHING", evidencePath: "absent" } });
    const before = current.stage;
    await dispatchArticleImport(root, importId, { workerModel: "test/model-a", maxSteps: 1 });
    const after = await loadImport(root, importId);
    assert.equal(after.stage, before);
    assert.equal(after.continuation?.kind, "repair");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("tracked: two configured models produce same control flow", async () => {
  for (const model of ["test/model-a", "test/model-b"]) {
    const root = await rootWithArticle();
    try {
      const run = await createIntakeRun(root);
      const intake = await dispatchIntakeRun(root, run.runId, { maxSteps: 1 });
      const importId = intake.entries[0].importId!;
      await executeImportCommand(root, { kind: "resume", importId });
      await executeImportCommand(root, { kind: "resume", importId });
      const current = await loadImport(root, importId);
      const workPath = current.nextAction.match(/(\S+\.work\.json)/)![1];
      const packet = JSON.parse(await readFile(path.join(root, workPath), "utf8"));
      const evidencePath = await makeResearchEvidence(root, importId);
      let seenModel = "";
      const workerRunner: WorkerRunner = async (input) => {
        seenModel = input.args[input.args.indexOf("--model") + 1];
        const fixture = path.resolve("tests/fixtures/opencode-jsonl-fixture.jsonl");
        const policy = JSON.parse(await readFile(path.join(input.cwd, "opencode.json"), "utf8")).agents["article-worker"].permissions;
        assert.deepEqual(policy[0], { action: "*", resource: "*", effect: "deny" });
        const writable = policy.filter((rule: { action: string }) => rule.action === "edit").map((rule: { resource: string }) => rule.resource);
        assert.equal(writable.length, 2);
        assert.ok(writable.every((dir: string) => dir.endsWith(importId + "/" + packet.idempotencyKey + "/*")));
        const destination = path.join(writable[0].slice(0, -1), "research.json");
        const source = path.join(root, evidencePath);
        await rename(source, source + ".input");
        const script = `
          const fs = require("node:fs");
          const path = require("node:path");
          const [fixture, source, destination, result] = process.argv.slice(1);
          fs.mkdirSync(path.dirname(destination), { recursive: true });
          fs.copyFileSync(source, destination);
          for (const line of fs.readFileSync(fixture, "utf8").trim().split(/\\r?\\n/)) {
            const event = JSON.parse(line);
            if (event.type === "text") event.part.text = result;
            console.log(JSON.stringify(event));
          }`;
        const work = { stage: packet.stage, evidencePath: path.relative(root, destination) };
        const result = { idempotencyKey: packet.idempotencyKey, sourceFingerprint: packet.sourceFingerprint, summary: "tested", work };
        return defaultWorkerRunner({ ...input, executable: process.execPath,
          args: ["-e", script, fixture, source + ".input", destination, JSON.stringify(result)] });

      };
      const result = await dispatchArticleImport(root, importId, { workerModel: model, workerRunner, maxSteps: 1 });
      assert.equal(seenModel, model);
      assert.equal(result.stage, "TRANSFORMING", result.stageReceipts.at(-1)?.message);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test("tracked: future and due waits", async () => {
  const root = await rootWithArticle();
  try {
    const record = await createArticleImport(root, "Article Intake/a.md");
    const importId = record.importId;
    const future = new Date(Date.now() + 60000).toISOString();
    await writeJsonAtomically(path.join(root, `.automation/article-imports/${importId}.json`), {
      ...(await loadImport(root, importId)),
      stage: "WAITING_EXTERNAL", resumeStage: "RESEARCHING",
      continuation: { kind: "wait", resumeStage: "RESEARCHING", dependency: "capability", waitStartedAt: new Date().toISOString(), lastProgressAt: new Date().toISOString(), nextCheckAt: future, timeoutAt: new Date(Date.now() + 120000).toISOString() },
    });
    let slept = 0;
    const result = await dispatchArticleImport(root, importId, { workerModel: "test/model-a", now: () => Date.now(), sleep: async (ms) => { slept += ms; }, maxSteps: 1 });
    assert.equal(result.continuation?.kind, "wait");
    assert.ok(slept > 0);
    const wait = result.continuation;
    assert.ok(wait?.kind === "wait");
    const due = new Date(Date.now() - 1).toISOString();
    await writeJsonAtomically(path.join(root, `.automation/article-imports/${importId}.json`), {
      ...result, continuation: { ...wait, nextCheckAt: due },
    });
    const checked = await dispatchArticleImport(root, importId, { workerModel: "", maxSteps: 1, sleep: async () => assert.fail("due wait slept") });
    assert.equal(checked.continuation?.kind, "blocked");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("tracked: parallel dispatch invokes one worker", async () => {
  const root = await rootWithArticle();
  try {
    const record = await createArticleImport(root, "Article Intake/a.md");
    const importId = record.importId;
    await executeImportCommand(root, { kind: "resume", importId });
    await executeImportCommand(root, { kind: "resume", importId });
    const current = await loadImport(root, importId);
    const workPath = current.nextAction.match(/(\S+\.work\.json)/)![1];
    const packet = JSON.parse(await readFile(path.join(root, workPath), "utf8"));
    const evidencePath = await makeResearchEvidence(root, importId);
    let calls = 0;
    const workerRunner: WorkerRunner = async (input) => {
      const fileArg = input.args.indexOf("--file");
      const p = fileArg >= 0 ? JSON.parse(await readFile(input.args[fileArg + 1], "utf8")) : null;
      if (p?.stage !== "RESEARCHING") return { stdout: "", stderr: "not research", exitCode: 1, timedOut: false };
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { stdout: jsonlResult(packet, evidencePath), stderr: "", exitCode: 0, timedOut: false };
    };
    const competing = await Promise.allSettled([
      dispatchArticleImport(root, importId, { workerModel: "test/model-a", workerRunner, maxSteps: 1 }),
      dispatchArticleImport(root, importId, { workerModel: "test/model-a", workerRunner, maxSteps: 1 }),
    ]);
    assert.equal(competing.filter(result => result.status === "fulfilled").length, 1);
    assert.match(competing.find(result => result.status === "rejected")!.reason.message, /IMPORT_LEASE_BUSY/);
    assert.equal(calls, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("recorded OpenCode output needs a successful final step", async () => {
  const stream = (await readFile("tests/fixtures/opencode-jsonl-fixture.jsonl", "utf8")).trim();
  assert.equal((extractJsonObject(stream) as unknown[]).length, 8);
  assert.throws(() => extractJsonObject(stream.split("\n").slice(0, -1).join("\n")));
  assert.throws(() => extractJsonObject(stream + "\n{"));
});

test("recovering a killed dispatcher waits for its worker and reuses its exit receipt", async () => {
  const root = await rootWithArticle();
  const ready = path.join(root, "worker-started");
  const finish = path.join(root, "worker-finish");
  async function until(check: () => Promise<void>) {
    // Windows may cold-start Node, tsx and PowerShell under a loaded suite.
    const until = Date.now() + 90000;
    while (true) {
      try { await check(); return; } catch (error) { if (Date.now() >= until) throw error; }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  try {
    const { importId } = await createArticleImport(root, "Article Intake/a.md");
    await executeImportCommand(root, { kind: "resume", importId });
    await executeImportCommand(root, { kind: "resume", importId });
    const evidencePath = await makeResearchEvidence(root, importId);
    const record = await loadImport(root, importId);
    assert.ok(record.continuation?.kind === "work");
    const packet = JSON.parse(await readFile(path.join(root, record.continuation.workPath), "utf8"));
    const worker = path.join(root, "worker.cjs");
    await writeFile(worker, `
      const fs = require("node:fs");
      fs.writeFileSync(process.argv[2], "started", { flag: "wx" });
      const timer = setInterval(() => {
        if (fs.existsSync(process.argv[3])) { clearInterval(timer); console.log(process.argv[4]); }
      }, 50);`);
    const args = [worker, ready, finish, jsonlResult(packet, evidencePath)];
    const controller = spawn(process.execPath, ["--import", "tsx", "-e", `
      const { defaultWorkerRunner } = require("./src/lib/article-import/worker-runner.ts");
      const { executeFixtureCommand: executeImportCommand } = require("./tests/fixtures/article-command.ts");
      const [root, importId, args] = process.argv.slice(1);
      executeImportCommand(root, { kind: "dispatch", importId }, undefined, { maxSteps: 1, workerModel: "mock/model",
        workerTimeoutMs: 30000, workerRunner: input => defaultWorkerRunner({ ...input, executable: process.execPath, args: JSON.parse(args) }) })
        .catch(error => { console.error(error); process.exitCode = 1; });`, root, importId, JSON.stringify(args)], { windowsHide: true, stdio: "ignore" });
    const closed = once(controller, "close");
    try {
      await until(() => access(ready));
      const leaseDir = path.join(root, ".automation/article-imports/leases/import", importId);
      const { readdir } = await import("node:fs/promises");
      const marker = (await readdir(leaseDir)).find(file => file.endsWith(".worker.pid"))!;
      const workerPid = Number(await readFile(path.join(leaseDir, marker), "utf8"));
      process.kill(workerPid, 0);
      assert.ok(controller.kill());
      await closed;
      process.kill(workerPid, 0);
      await assert.rejects(recoverWorkflowLease(root, "import", importId), /LEASE_RECOVERY_UNVERIFIED/);
      await assert.rejects(dispatchArticleImport(root, importId, { maxSteps: 1 }), /IMPORT_LEASE_BUSY/);
      await writeFile(finish, "finish");
      await until(() => recoverWorkflowLease(root, "import", importId));
      const resumed = await dispatchArticleImport(root, importId, { maxSteps: 1, workerModel: "",
        workerExecutable: path.join(root, "must-not-run") });
      assert.equal(resumed.stage, "TRANSFORMING", resumed.stageReceipts.at(-1)?.message);
    } finally {
      await writeFile(finish, "finish");
      if (controller.exitCode === null && controller.signalCode === null) controller.kill();
      await closed;
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});


test("worker deadline terminates its descendant before releasing ownership", async () => {
  const root = await rootWithArticle();
  try {
    const { importId } = await createArticleImport(root, "Article Intake/a.md");
    const pidFile = path.join(root, "descendant.pid");
    const script = `
      const fs = require("node:fs");
      const child = require("node:child_process").spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
      fs.writeFileSync(process.argv[1], String(child.pid));`;
    const result = await dispatchArticleImport(root, importId, { workerModel: "fixture/model", workerTimeoutMs: 12000,
      workerRunner: input => defaultWorkerRunner({ ...input, executable: process.execPath, args: ["-e", script, pidFile] }) });
    assert.ok(result.continuation?.kind === "blocked");
    assert.match(result.continuation.cause, /timed out/);
    const pid = Number(await readFile(pidFile, "utf8"));
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("a bounded intake reports its unfinished entry and rejects changed capture bytes", async () => {
  const root = await rootWithArticle();
  try {
    const run = await createIntakeRun(root);
    const entry = run.entries[0];
    await writeFile(path.resolve(root, entry.capturedPath!), "modified capture");
    await assert.rejects(dispatchIntakeRun(root, run.runId, { maxSteps: 1 }), /INTAKE_SOURCE_MISMATCH/);
    await assert.rejects(executeImportCommand(root, { kind: "intake-resume", runId: run.runId }), /INTAKE_SOURCE_MISMATCH/);
    const state = await readdir(path.join(root, ".automation/article-imports"), { recursive: true });
    assert.deepEqual(state.filter(file => /(^|[/\\])article-[a-f0-9-]+\.json$|source-index/.test(file)), []);
    const next = await createIntakeRun(root);
    const dispatched = await executeImportCommand(root, { kind: "dispatch-intake", runId: next.runId }, undefined, { maxSteps: 1 }) as IntakeRun & { dispatchOutcome: string };
    assert.equal(dispatched.dispatchOutcome, "STEP_LIMIT");
    assert.equal(dispatched.entries[0].status, "PROCESSING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

for (const fault of ["malformed", "wrong-stage", "stale-key", "stale-source"]) {
  test("dispatcher rejects " + fault + " worker output before saving a result", async () => {
    const root = await rootWithArticle();
    try {
      const { importId } = await createArticleImport(root, "Article Intake/a.md");
      let resultPath = "";
      let calls = 0;
      const workerRunner: WorkerRunner = async ({ args }) => {
        calls++;
        const packet = JSON.parse(await readFile(args[args.indexOf("--file") + 1], "utf8"));
        resultPath = path.join(root, packet.resultPath);
        if (fault === "wrong-stage") packet.stage = "TRANSFORMING";
        if (fault === "stale-key") packet.idempotencyKey = "0".repeat(64);
        if (fault === "stale-source") packet.sourceFingerprint = "0".repeat(64);
        return { stdout: fault === "malformed" ? "{" : jsonlResult(packet, "unused"), stderr: "", exitCode: 0, timedOut: false };
      };
      const result = await dispatchArticleImport(root, importId, { workerModel: "fixture/model", workerRunner });
      assert.equal(calls, 1);
      assert.equal(result.stage, "RESEARCHING");
      assert.equal(result.continuation?.kind, "repair");
      assert.match(result.stageReceipts.at(-1)!.message, /INVALID_STAGE_RESULT/);
      await assert.rejects(access(resultPath), { code: "ENOENT" });
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}


test("controller death before blocker persistence replays the failed exit once", async () => {
  const root = await rootWithArticle();
  try {
    const { importId } = await createArticleImport(root, "Article Intake/a.md");
    const controllerScript = `
      const fs = require("node:fs/promises");
      const path = require("node:path");
      const [root, importId] = process.argv.slice(1);
      const rename = fs.rename;
      fs.rename = async (from, to) => {
        if (path.basename(to) === importId + ".json") {
          const record = JSON.parse(await fs.readFile(from));
          if (record.continuation?.kind === "blocked") process.exit(42);
        }
        return rename(from, to);
      };
      const { defaultWorkerRunner } = require("./src/lib/article-import/worker-runner");
      const { executeFixtureCommand: executeImportCommand } = require("./tests/fixtures/article-command.ts");
      executeImportCommand(root, {kind:"dispatch", importId}, undefined, {
        workerModel: "fixture/model", workerRunner: input => defaultWorkerRunner({...input,
          executable: process.execPath, args:["-e", "process.exit(17)"] }) }).catch(() => process.exit(1));`;
    const controller = spawn(process.execPath, ["--import", "tsx", "-e", controllerScript, root, importId], { windowsHide: true, stdio: "ignore" });
    assert.equal((await once(controller, "close"))[0], 42);
    await recoverWorkflowLease(root, "import", importId);
    const resumed = await dispatchArticleImport(root, importId, { workerModel: "fixture/model", workerExecutable: path.join(root, "must-not-run") });
    assert.ok(resumed.continuation?.kind === "blocked");
    assert.match(resumed.continuation.cause, /worker exited with code 17.*\[worker /);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("dispatch stops after one unchanged executor result", async () => {
  const root = await rootWithArticle();
  try {
    const initial = await createArticleImport(root, "Article Intake/a.md");
    for (const revision of [initial.stateRevision, undefined]) {
      const existing = { ...initial, stateRevision: revision };
      await writeJsonAtomically(path.join(root, ".automation/article-imports", initial.importId + ".json"), existing);
      let calls = 0;
      const result = await executeImportCommand(root, { kind: "dispatch", importId: initial.importId }, async ({ record }) => {
        calls++;
        return record;
      }, { maxSteps: 3 }) as ExternalArticleImportV1;
      assert.equal(calls, 1);
      assert.equal(result.stateRevision, revision);
      assert.ok(!("dispatchOutcome" in result));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
