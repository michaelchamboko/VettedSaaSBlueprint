import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { recordArticlePresentation } from "../scripts/record-article-presentation";
import { executeImportCommand, type ImportCommand } from "../scripts/import-article";
import { fork } from "node:child_process";
import { once } from "node:events";
import { advanceImport, createArticleImport, loadImport, saveImport, withImportLease } from "../src/lib/article-import/engine";
import { createIntakeRun } from "../src/lib/article-import/intake";
import { claimWorkflowLease } from "../src/lib/article-import/workflow-lease";
import { importPacketId } from "../src/lib/article-import/packet-binding";
import { approveFixture, presentFixture, validPageDesignReceipt } from "./fixtures/article-content-approval";
import { fixtureProbe, prepareCommandCheckout } from "./fixtures/article-command";

test("a callable recovery command rejects a secondary checkout before accessing leases", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "orch02-preflight-"));
  try {
    await assert.rejects(executeImportCommand(root, { kind: "recover-lease", leaseKind: "import", key: "example" }), /PRIMARY_CHECKOUT_REQUIRED/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function candidate(root: string) {
  await prepareCommandCheckout(root);
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), "---\ntitle: Example\naffiliate_name: Example\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\nAn article with enough text to qualify as useful source content for the import pipeline and its approval tests.");
  const source = await createArticleImport(root, "article.md");
  const approved = await approveFixture(root, { ...source, stage: "REFINING" });
  const validating = await advanceImport(root, approved, "fixture approved");
  const rendered = await presentFixture(root, validating);
  assert.ok(rendered.presentation);
  const prepared = { ...rendered, presentation: undefined };
  await withImportLease(root, prepared.importId, () => saveImport(root, prepared));
  const key = importPacketId(prepared, "VALIDATING", "targeted-repair");
  const work = path.join(root, ".automation/article-imports/work", prepared.importId);
  await mkdir(work, { recursive: true });
  await writeFile(path.join(root, "page-design.json"), JSON.stringify(validPageDesignReceipt));
  await writeFile(path.join(root, "validation-receipt.json"), JSON.stringify(rendered.presentation.validation));
  await writeFile(path.join(work, key + ".result.json"), JSON.stringify({
    idempotencyKey: key, sourceFingerprint: source.sourceFingerprint, summary: "resume accepted",
    work: { stage: "VALIDATING", validationGate: "fixture:resume", validationReceiptPath: "validation-receipt.json", presentationEvidencePath: prepared.evidenceRefs!.presentation!.path },
  }));
  return prepared;
}

function runChild(root: string, id: string, command: string, hold = false) {
  const child = fork(path.resolve("tests/fixtures/ownership-child.ts"), [root, id, command, hold ? "hold" : "run"], {
    execArgv: ["--import", "tsx"], silent: true, timeout: 120_000,
  });
  let stdout = "", stderr = "";
  child.stdout!.on("data", chunk => { stdout += chunk; });
  child.stderr!.on("data", chunk => { stderr += chunk; });
  const done = once(child, "close").then(([code]) => ({ code, stdout, stderr }));
  return { child, done };
}

for (const first of ["resume", "presentation"]) {
  test(`one presentation transition when ${first} owns the import first`, async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "orch02-race-"));
    try {
      const before = await candidate(root);
      if (first === "presentation") {
        const receipt = JSON.parse(await readFile(path.join(root, "build-pack/article-import/verifier.json"), "utf8"));
        receipt.target.artifactFingerprint = "0".repeat(64);
        await writeFile(path.join(root, "wrong.json"), JSON.stringify(receipt));
        const state = path.join(root, ".automation/article-imports", before.importId + ".json");
        const bytes = await readFile(state);
        await assert.rejects(recordArticlePresentation(root, before.importId, "wrong.json", path.join(root, "page-design.json"), fixtureProbe(root)), /VERIFIER_TARGET_MISMATCH/);
        assert.deepEqual(await readFile(state), bytes);
      }
      const winner = runChild(root, before.importId, first, true);
      try {
        await Promise.race([once(winner.child, "message"), winner.done.then(result => { throw Error("holder exited early: " + result.stderr); })]);
        const second = first === "resume" ? "presentation" : "resume";
        const loser = await runChild(root, before.importId, second).done;
        assert.equal(loser.code, 1, loser.stdout);
        assert.match(loser.stderr, /IMPORT_LEASE_BUSY/);
        winner.child.send("continue");
        const accepted = await winner.done;
        assert.equal(accepted.code, 0, accepted.stderr);
        const after = await loadImport(root, before.importId);
        assert.equal(after.stage, "RELEASING", JSON.stringify(after.continuation));
        assert.deepEqual(after.contentApproval, before.contentApproval);
        assert.equal(after.stageReceipts.filter(e => e.stage === "RELEASING" && e.status === "passed").length, 1);
        assert.equal(after.presentation?.validationGate, first === "resume" ? "fixture:resume" : "direct-review:candidate-owner-verifier");
        const stateFile = path.join(root, ".automation/article-imports", before.importId + ".json");
        const bytes = await readFile(stateFile);
        const retry = await runChild(root, before.importId, "presentation").done;
        assert.match(retry.stderr, /only be recorded during VALIDATING/);
        assert.deepEqual(await readFile(stateFile), bytes);
      } finally {
        if (winner.child.exitCode === null) winner.child.kill();
        await winner.done;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test("all callable mutations require a primary checkout before touching state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "orch02-mutators-"));
  try {
    const id = "absent";
    const commands: ImportCommand[] = [
      { kind: "source", source: id }, { kind: "resume", importId: id }, { kind: "intake" },
      { kind: "intake-resume", runId: id }, { kind: "dispatch", importId: id }, { kind: "dispatch-intake", runId: id },
      { kind: "intake-retry", runId: id },
      { kind: "upgrade-evidence", importId: id }, { kind: "upgrade-intake", runId: id },
      { kind: "reconcile-intake-entry", runId: id, entry: id }, { kind: "submit-diagnosis", importId: id, file: id },
      ...(["source", "intake", "import", "publication"] as const).map(leaseKind => ({ kind: "recover-lease" as const, leaseKind, key: id })),
    ];
    for (const command of commands) await assert.rejects(executeImportCommand(root, command), /PRIMARY_CHECKOUT_REQUIRED/, command.kind);
    assert.deepEqual(await readdir(root), []);
    await prepareCommandCheckout(root);
    const unavailable = async () => { throw Error("synthetic unavailable tool"); };
    for (const command of commands.slice(0, 6)) {
      await assert.rejects(executeImportCommand(root, command, undefined, undefined, unavailable), /CAPABILITY_UNAVAILABLE/, command.kind);
    }
    await assert.rejects(recordArticlePresentation(root, id, "unused", "unused", unavailable), /CAPABILITY_UNAVAILABLE/);
    assert.ok(!(await readdir(root)).includes(".automation"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("nested writers reject stale revisions and a lease for the wrong import or checkout", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "orch02-fence-"));
  const other = await mkdtemp(path.join(os.tmpdir(), "orch02-other-"));
  try {
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "one.md"), "First synthetic source with sufficient content for this test.");
    await writeFile(path.join(root, "two.md"), "Second synthetic source with different bytes for this test.");
    const one = await createArticleImport(root, "one.md");
    const two = await createArticleImport(root, "two.md");
    const old = structuredClone(one);
    await assert.rejects(saveImport(root, one), /IMPORT_LEASE_REQUIRED/);
    await withImportLease(root, one.importId, async () => {
      await assert.rejects(saveImport(root, two), /IMPORT_LEASE_MISMATCH/);
      await assert.rejects(saveImport(other, one), /IMPORT_LEASE_ROOT_MISMATCH/);
      await withImportLease(root, one.importId, current => saveImport(root, { ...current, nextAction: "New accepted work." }));
      await assert.rejects(saveImport(root, old), /STALE_IMPORT_RECORD/);
    });
    await assert.rejects(advanceImport(root, old, "delayed caller"), /STALE_IMPORT_RECORD/);
    const current = await loadImport(root, one.importId);
    assert.equal(current.nextAction, "New accepted work.");
    assert.equal(current.updatedAt, old.updatedAt);
    assert.notEqual(current.stateRevision, old.stateRevision);
    await withImportLease(root, one.importId, async owned => {
      const proposals = ["first sibling", "second sibling"].map(nextAction => ({ ...owned, nextAction }));
      const writes = await Promise.allSettled(proposals.map(proposal => saveImport(root, proposal)));
      assert.equal(writes.filter(result => result.status === "fulfilled").length, 1);
      const rejected = writes.find(result => result.status === "rejected");
      assert.match(String(rejected?.reason), /IMPORT_WRITE_BUSY|STALE_IMPORT_RECORD/);
      const winner = writes.findIndex(result => result.status === "fulfilled");
      assert.equal((await loadImport(root, owned.importId)).nextAction, proposals[winner].nextAction);
    });
  } finally { await Promise.all([root, other].map(dir => rm(dir, { recursive: true, force: true }))); }
});

test("inspection can read a busy import and intake without changing their records or lease history", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "orch02-inspect-"));
  try {
    await prepareCommandCheckout(root);
    await mkdir(path.join(root, "Article Intake"));
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "empty.md"), "");
    const quarantined = await createArticleImport(root, "empty.md");
    const run = await createIntakeRun(root);
    const intakeLease = await claimWorkflowLease(root, "intake", run.runId);
    assert.ok(intakeLease);
    try {
      await withImportLease(root, quarantined.importId, async () => {
        async function snapshot() {
          const files = await readdir(path.join(root, ".automation"), { recursive: true, withFileTypes: true });
          return Promise.all(files.filter(e => e.isFile()).map(e => path.join(e.parentPath, e.name)).sort().map(async file => [file, await readFile(file)]));
        }
        const before = await snapshot();
        const commands: ImportCommand[] = [{ kind: "describe-workflow" }, { kind: "preflight" }, { kind: "check-intake", runId: run.runId }, { kind: "intake-status", runId: run.runId }, { kind: "check-completion", importId: quarantined.importId }];
        for (const command of commands) {
          const result = await executeImportCommand(root, command, undefined, undefined, async tool => tool === "opencode" ? "2.2.6" : "Python 3.13.0");
          assert.ok(result, command.kind);
        }
        assert.deepEqual(await snapshot(), before);
      });
    } finally { await intakeLease.release(); }
  } finally { await rm(root, { recursive: true, force: true }); }
});
