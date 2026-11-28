import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function sequence(rows, expected, label) {
  const ids = rows.map((row) => row.id);
  assert.equal(ids.length, expected.length, `${label} count`);
  assert.equal(new Set(ids).size, ids.length, `${label} uniqueness`);
  assert.deepEqual(ids.map(String).sort(), expected.map(String).sort(), label);
}

function verifyRows(rows) {
  for (const row of rows) {
    assert.match(String(row.source?.document ?? ""), /\S/);
    assert.match(String(row.source?.heading ?? ""), /\S/);
    assert.match(String(row.source?.stableId ?? ""), /\S/);
    assert.ok(typeof row.purpose === "string" || typeof row.purpose === "object");
    assert.match(String(row.applicableFormat ?? ""), /\S/);
    assert.match(String(row.owningActivity ?? ""), /\S/);
    assert.ok(typeof row.observation === "string" || typeof row.observation === "object");
    assert.match(row.fingerprint?.historicalRevision ?? "", /^[0-9a-f]{40}$/);
    assert.match(row.fingerprint?.historicalTraceabilityBlob ?? "", /^[0-9a-f]{40}$/);
    assert.match(String(row.reviewer?.historical ?? ""), /\S/);
    assert.match(String(row.reviewer?.current ?? ""), /\S/);
    assert.match(String(row.disposition ?? ""), /\S/);
    assert.match(String(row.currentIssue123Evidence?.status ?? ""), /\S/);
    assert.match(String(row.currentIssue123Evidence?.observation ?? ""), /\S/);
    assert.ok(Array.isArray(row.currentIssue123Evidence?.refs));
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha(bytes) {
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

async function verifyPriorBlindEvidence(root) {
  const priorRoot = path.join(root, "docs/designs/recovery-evidence/122");
  const readJson = async (...parts) => JSON.parse(await readFile(path.join(priorRoot, ...parts), "utf8"));
  const manifest = await readJson("reviewer-manifest.json");
  const config = await readJson("reviewer-config.json");
  const bindings = await readJson("evaluation", "evidence-bindings.json");
  const key = await readJson("evaluation", "answer-key.json");
  const comparison = await readJson("evaluation", "comparison.json");
  assert.equal(manifest.examinedRevision, "cf0012f0b8d0795e9717ca427bc8bad4ce41ed2e");
  assert.equal(config.examinedRevision, manifest.examinedRevision);
  assert.equal(config.route.provider, "native-codex-subagent");
  assert.equal(config.route.paidExternalService, false);
  assert.equal(bindings.sourceEvidenceRevision, "bebb4fe644b3d97e9a21f46a6e06938ed35684cb");
  assert.equal(manifest.cases.length, 6);
  const results = [];
  for (const entry of manifest.cases) {
    const packet = await readFile(path.join(priorRoot, entry.packet), "utf8");
    assert.doesNotMatch(packet, /defective|adequate|answer key|expected verdict|pair mapping/i);
    const binding = bindings.cases.find((candidate) => candidate.caseId === entry.id);
    assert.ok(binding, entry.id);
    const frozenRoot = path.join(root, "docs/designs/recovery-evidence/123/historical/blind-source", entry.id);
    assert.equal(gitBlobSha(await readFile(path.join(frozenRoot, "packet.md"))), binding.sourcePacketBlob, `${entry.id} source packet`);
    for (const artifact of Object.values(binding.interaction ?? {})) {
      const bytes = await readFile(path.join(frozenRoot, path.basename(artifact.path)));
      assert.equal(gitBlobSha(bytes), artifact.blob, `${entry.id} ${path.basename(artifact.path)}`);
    }
    const result = await readJson("results", `${entry.id}.json`);
    assert.equal(result.reviewedRevision, manifest.examinedRevision);
    assert.equal(result.route, "native-codex-subagent");
    assert.equal(result.genuineIndependentJudgment, true);
    results.push(result);
  }
  assert.equal(new Set(results.map((result) => result.reviewerId)).size, 6);
  let accurate = 0;
  let misses = 0;
  let falseAlarms = 0;
  for (const result of results) {
    const expected = key.cases.find((entry) => entry.caseId === result.caseId);
    const retained = comparison.results.find((entry) => entry.caseId === result.caseId);
    assert.ok(expected && retained, result.caseId);
    assert.equal(retained.expectedVerdict, expected.expectedVerdict);
    assert.equal(retained.observedVerdict, result.verdict);
    if (retained.verdictAccurate && retained.explanationAccurate) accurate += 1;
    if (expected.expectedVerdict === "does_not_meet" && result.verdict === "meets") misses += 1;
    if (expected.expectedVerdict === "meets" && result.verdict === "does_not_meet") falseAlarms += 1;
  }
  assert.deepEqual(comparison.summary, { accurate, misses, falseAlarms, passed: true, threshold: "6/6 accurate verdicts with evidence-matching explanations" });
}

export async function verifyReadinessLedger({ root = process.cwd(), ledgerPath = path.join(root, "docs/designs/recovery-evidence/123/readiness-ledger.json") } = {}) {
  const historicalInputs = [
    ["docs/designs/recovery-evidence/123/historical/traceability-109.json", "692fd90f2273291b35b20e7ba0f5ff63187f764adf6e37bfebb3b95eb879fb4d"],
    ["docs/designs/recovery-evidence/123/historical/webcatalog-finding-traceability-108.md", "e08c72b0cc3189ebeed40900c93920650a11451f96113c4df8d8c6b616b8397a"],
  ];
  for (const [repositoryPath, expected] of historicalInputs) assert.equal(sha256(await readFile(path.join(root, repositoryPath))), expected, repositoryPath);
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  assert.equal(ledger.readiness, "NOT_READY");
  sequence(ledger.stories, Array.from({ length: 28 }, (_, index) => index + 1), "stories");
  sequence(ledger.testingDecisions, Array.from({ length: 11 }, (_, index) => index + 1), "testing decisions");
  const questions = [...Array.from({ length: 48 }, (_, index) => `Q${index + 1}`), "Original Q41", "Q41a", "Q41b", "Q41c"];
  sequence(ledger.interviewQuestions, questions, "interview questions");
  sequence(ledger.findings, Array.from({ length: 38 }, (_, index) => index + 1), "findings");
  verifyRows([...ledger.stories, ...ledger.testingDecisions, ...ledger.interviewQuestions, ...ledger.findings]);
  for (const row of [...ledger.stories, ...ledger.testingDecisions, ...ledger.interviewQuestions, ...ledger.findings]) {
    for (const ref of row.currentIssue123Evidence.refs) {
      assert.match(ref.sha256, /^[0-9a-f]{64}$/);
      assert.equal(sha256(await readFile(path.join(root, ref.path))), ref.sha256, `${row.kind} ${row.id} current evidence ${ref.path}`);
    }
  }
  assert.equal(ledger.interviewQuestions.find((row) => row.id === "Q40")?.disposition, "open-owner-decision");
  const q41Rows = ledger.interviewQuestions.filter((row) => ["Original Q41", "Q41", "Q41a", "Q41b", "Q41c"].includes(row.id));
  assert.equal(new Set(q41Rows.map((row) => row.purpose)).size, 5, "Q41 purposes must remain distinct");
  assert.equal(new Set(ledger.testingDecisions.map((row) => row.purpose)).size, 11, "testing-decision purposes must remain specific");
  assert.deepEqual(
    ledger.findings.filter((row) => row.disposition === "later-directive-current-proof-required").map((row) => row.id),
    [36, 38],
    "only findings 36 and 38 are later owner directives",
  );
  assert.equal(ledger.findings.find((row) => row.id === 37)?.disposition, "historical-unknown-fresh-proof-required");
  for (const id of [36, 38]) {
    const source = ledger.findings.find((row) => row.id === id)?.source;
    assert.equal(source?.heading, "Owner-added P1 criteria");
    assert.equal(source?.stableId, `OWNER-P1-F${id}`);
  }
  assert.equal(ledger.blindedJudgments.total, 6);
  assert.equal(ledger.blindedJudgments.accurate, 6);
  assert.equal(ledger.blindedJudgments.misses, 0);
  assert.equal(ledger.blindedJudgments.falseAlarms, 0);
  await verifyPriorBlindEvidence(root);
  const independentRoot = path.join(root, "build-pack/repairs/article-recovery-123/browser/independent");
  const summaryBytes = await readFile(path.join(independentRoot, "independent-summary.json"));
  const summary = JSON.parse(summaryBytes);
  const observerProvenance = JSON.parse(await readFile(path.join(root, "build-pack/repairs/article-recovery-123/browser/observer-provenance.json"), "utf8"));
  assert.equal(observerProvenance.summarySha256, sha256(summaryBytes));
  assert.equal(observerProvenance.observedRevision, summary.revision);
  assert.equal(observerProvenance.capturedAt, summary.date);
  assert.equal(observerProvenance.browser, summary.browser);
  const controllerInput = JSON.parse(await readFile(path.join(root, "build-pack/repairs/article-recovery-123/browser/controller-review-input.json"), "utf8"));
  assert.equal(sha256(summaryBytes), controllerInput.target.browserEvidenceSha256);
  assert.equal(controllerInput.target.browserEvidenceSha256, controllerInput.control.browserEvidenceSha256);
  const observationsBytes = await readFile(path.join(independentRoot, "observations.json"));
  assert.equal(sha256(observationsBytes), summary.rawSha256);
  assert.equal(summary.target, ledger.browserEvidence.sourceBindings.target);
  assert.equal(summary.control, ledger.browserEvidence.sourceBindings.control);
  const retainedScreens = new Map();
  for (const observation of summary.runs) for (const screen of observation.screenshots) retainedScreens.set(screen.filename, screen.sha256);
  for (const [name, expected] of retainedScreens) {
    const bytes = await readFile(path.join(independentRoot, name));
    assert.equal(sha256(bytes), expected, `screenshot ${name}`);
  }
  const faqBytes = await readFile(path.join(independentRoot, "faq-indicator.json"));
  const faq = JSON.parse(faqBytes);
  for (const observation of faq) for (const screen of observation.screenshots) {
    const bytes = await readFile(path.join(independentRoot, screen.filename));
    assert.equal(sha256(bytes), screen.sha256, `FAQ screenshot ${screen.filename}`);
  }
  const viewports = [...new Set(summary.runs.map((entry) => `${entry.width}x${entry.height}`))].sort();
  const browser = { viewports, status: ledger.browserEvidence.status, reviewer: observerProvenance.observerTask };
  assert.equal(summary.revision, ledger.browserEvidence.observedRevision);
  assert.equal(ledger.browserEvidence.promotedToRevision, ledger.authority.testedBaseRevision);
  const promotion = JSON.parse(await readFile(path.join(root, "build-pack/repairs/article-recovery-123/browser/browser-promotion.json"), "utf8"));
  assert.equal(promotion.observationRevision, summary.revision);
  assert.equal(promotion.promotedRevision, ledger.authority.testedBaseRevision);
  assert.deepEqual(promotion.servedPathChanges, []);
  const commands = JSON.parse(await readFile(path.join(root, "build-pack/repairs/article-recovery-123/verification-commands.json"), "utf8"));
  assert.equal(commands.productRevision, ledger.authority.testedBaseRevision);
  assert.deepEqual(commands.checks.filter((check) => !check.status.startsWith("pass")).map((check) => ({ command: check.command, status: check.status })), [], "all retained final-head commands must pass");
  assert.equal(commands.finalDelta.fromRevision, "62e7aac4f8f80b19f946083c8358883107c12415");
  assert.deepEqual(commands.finalDelta.changedProductFiles, ["src/lib/article-import/worker-runner.ts"]);
  assert.equal(commands.finalDelta.affectedChecksRerun.length, 3);
  assert.match(commands.finalDelta.result, /^3\/3 affected final-delta checks passed/);
  const finalCorrection = JSON.parse(await readFile(path.join(root, "build-pack/repairs/article-recovery-123/final-correction-probes.json"), "utf8"));
  const expectedFinalCorrectionProbes = [
    ["activity-output-and-repair-escalation", 2],
    ["cleanup-path-containment", 4],
    ["provider-and-release-verification", 8],
    ["rendering-input-scope", 1],
    ["worker-packet-scope", 1],
  ];
  assert.equal(finalCorrection.testedRevision, ledger.authority.testedBaseRevision);
  assert.equal(finalCorrection.testedTree, ledger.authority.testedBaseTree);
  assert.equal(finalCorrection.provisional, false, "final-correction probes must be rebound and rerun at the supplied final product revision");
  assert.equal(finalCorrection.finalDelta.fromRevision, commands.finalDelta.fromRevision);
  assert.deepEqual(finalCorrection.finalDelta.changedProductFiles, commands.finalDelta.changedProductFiles);
  assert.deepEqual(finalCorrection.finalDelta.directlyRerunObservationIds, ["worker-packet-scope"]);
  assert.deepEqual(finalCorrection.finalDelta.promotedObservationIds.sort(), expectedFinalCorrectionProbes.map(([id]) => id).filter((id) => id !== "worker-packet-scope").sort());
  assert.match(finalCorrection.boundary, /No real article, provider, deployment or production operation ran\./);
  assert.deepEqual(finalCorrection.observations.map((entry) => [entry.id, entry.tests]), expectedFinalCorrectionProbes);
  for (const observation of finalCorrection.observations) {
    assert.equal(observation.status, "pass");
    assert.match(observation.command, /^node --import tsx --test /);
    assert.match(observation.establishes, /\S/);
    assert.match(observation.limitations, /\S/);
  }
  const controller = JSON.parse(await readFile(path.join(root, "build-pack/repairs/article-recovery-123/controller-verdicts.json"), "utf8"));
  assert.equal(controller.testedRevision, ledger.authority.testedBaseRevision);
  assert.equal(controller.controllerEntryPoint, "executePendingImport");
  assert.equal(controller.target.artifactSha256, summary.target);
  assert.equal(controller.control.artifactSha256, summary.control);
  assert.equal(controller.target.suppliedOutcome, "rejected");
  assert.equal(controller.control.suppliedOutcome, "unverified");
  assert.equal(controller.target.resultingStage, "REFINING");
  assert.equal(controller.control.resultingStage, "REFINING");
  const targetArtifact = await readFile(path.join(root, "build-pack/repairs/article-recovery-123/browser/artifacts/target.json"));
  const controlArtifact = await readFile(path.join(root, "build-pack/repairs/article-recovery-123/browser/artifacts/control.json"));
  assert.equal(sha256(targetArtifact), summary.target);
  assert.equal(sha256(controlArtifact), summary.control);
  const heroBytes = await readFile(path.join(root, "build-pack/repairs/article-recovery-123/browser/artifacts/control-hero.webp"));
  const heroSidecar = JSON.parse(await readFile(path.join(root, "build-pack/repairs/article-recovery-123/browser/artifacts/control-hero-sidecar.json"), "utf8"));
  assert.equal(sha256(heroBytes), heroSidecar.asset.sha256);
  for (const finding of ledger.findings) {
    assert.match(String(finding.controllerAssessment?.applicableCriterion ?? ""), /\S/);
    assert.match(String(finding.controllerAssessment?.observedDefect ?? ""), /\S/);
    assert.match(String(finding.controllerAssessment?.gateStatus ?? ""), /^(caught|missed|unverified)$/);
    assert.match(String(finding.controllerAssessment?.actualVerdict ?? ""), /\S/);
    assert.match(String(finding.controllerAssessment?.nextAction ?? ""), /\S/);
  }
  assert.deepEqual(ledger.findings.filter((finding) => finding.controllerAssessment.gateStatus === "caught").map((finding) => finding.id), [36]);
  assert.deepEqual(ledger.findings.filter((finding) => finding.controllerAssessment.gateStatus === "missed").map((finding) => finding.id), []);
  const withoutDigest = structuredClone(ledger);
  delete withoutDigest.digest;
  assert.equal(ledger.digest, sha256(JSON.stringify(withoutDigest)), "ledger digest");
  return {
    counts: { findings: ledger.findings.length, stories: ledger.stories.length, testingDecisions: ledger.testingDecisions.length, interviewQuestions: ledger.interviewQuestions.length },
    q40Disposition: ledger.interviewQuestions.find((row) => row.id === "Q40").disposition,
    blindedJudgments: ledger.blindedJudgments,
    browser,
    finalCorrectionProbes: {
      observationIds: finalCorrection.observations.map((entry) => entry.id),
      provisional: finalCorrection.provisional,
      noRealOperations: true,
    },
    mutationScopes: [...ledger.controllerEvidence.mutationScopes].sort(),
    missingProof: ledger.missingProof,
    digest: ledger.digest,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ledgerFlag = process.argv.indexOf("--ledger");
  const ledgerPath = ledgerFlag >= 0 ? path.resolve(process.argv[ledgerFlag + 1] ?? "") : undefined;
  process.stdout.write(`${JSON.stringify(await verifyReadinessLedger(ledgerPath ? { ledgerPath } : undefined), null, 2)}\n`);
}
