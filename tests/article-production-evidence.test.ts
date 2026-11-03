import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertProductionVerifierEvidence, readProductionVerifierEvidence, storeProductionVerifierEvidence, type VerificationTarget } from "../src/lib/article-import/verification-evidence";

const origin = "https://vettedsaasblueprint.online";
const deployment = { deploymentId: "dpl_fixture", canonicalUrl: `${origin}/fixture`, commitSha: "a".repeat(40) };
const importId = "article-00000000-0000-0000-0000-000000000001";
function fixture(format: VerificationTarget["format"]) {
  const target = { format, slug: "fixture", artifactFingerprint: "b".repeat(64), renderedRoutes: ["/fixture"] };
  const browser = { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [] };
  const common = { verificationMode: "production", origin, canonicalOrigin: origin, expected_commit: deployment.commitSha, target };
  const result = format === "direct-review"
    ? { ...common, status: "pass", robots_ok: true, sitemap_ok: true, pages: [{ path: "/fixture", desktop: browser, mobile: browser }] }
    : format === "decision-set"
      ? { ...common, passed: true, browser_errors_ok: true, robots_ok: true, sitemap_ok: true, checks: [{ passed: true }], screenshots: [{ route: "/fixture", mode: "desktop" }, { route: "/fixture", mode: "mobile" }] }
      : { ...common, ok: true, verifiedRoutes: ["/fixture"], viewportChecks: 2 };
  const identity = { id: deployment.deploymentId, target: "production" as const, readyState: "READY" as const, commitSha: deployment.commitSha };
  return { schemaVersion: "ImportProductionVerifierEvidenceV1" as const, importId, sourceFingerprint: "d".repeat(64), target, deployment, deploymentBefore: identity, deploymentAfter: identity, result, command: { command: "fixture-owner-verifier", args: ["--expected-sha", deployment.commitSha], stdout: JSON.stringify(result), stderr: "", exitCode: 0 as const } };
}

for (const format of ["direct-review", "blog", "visibility", "decision-set"] as const) {
  test(`${format}: retains owner output and rejects substituted production bindings`, async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "production-evidence-"));
    try {
      const value = fixture(format);
      const ref = await storeProductionVerifierEvidence(root, importId, value);
      const retained = await readProductionVerifierEvidence(root, ref, value);
      assert.equal(retained.command.stdout, value.command.stdout);
      assert.deepEqual(await storeProductionVerifierEvidence(root, importId, value), ref);
      assert.throws(() => assertProductionVerifierEvidence(value, { ...value, importId: "article-00000000-0000-0000-0000-000000000002" }), /PRODUCTION_IMPORT_MISMATCH/);
      assert.throws(() => assertProductionVerifierEvidence(value, { ...value, sourceFingerprint: "e".repeat(64) }), /PRODUCTION_IMPORT_MISMATCH/);
      assert.throws(() => assertProductionVerifierEvidence(value, { ...value, deployment: { ...deployment, commitSha: "c".repeat(40) } }), /PRODUCTION_DEPLOYMENT_MISMATCH/);
      assert.throws(() => assertProductionVerifierEvidence(value, { ...value, target: { ...value.target, renderedRoutes: ["/other"] } }), /VERIFIER_TARGET_MISMATCH/);
      assert.throws(() => assertProductionVerifierEvidence({ ...value, deploymentAfter: { ...value.deploymentAfter, id: "another" } }, value), /PRODUCTION_DEPLOYMENT_CHANGED/);
      assert.throws(() => assertProductionVerifierEvidence({ ...value, command: { ...value.command, stdout: "{}" } }, value), /PRODUCTION_OUTPUT_MISMATCH/);
      const candidate = { ...value.result, verificationMode: "candidate", origin: "http://localhost:3000" };
      assert.throws(() => assertProductionVerifierEvidence({ ...value, result: candidate, command: { ...value.command, stdout: JSON.stringify(candidate) } }, value));
      const wrongCommit = { ...value.result, expected_commit: "c".repeat(40) };
      assert.throws(() => assertProductionVerifierEvidence({ ...value, result: wrongCommit, command: { ...value.command, stdout: JSON.stringify(wrongCommit) } }, value), /PRODUCTION_COMMIT_MISMATCH/);
      const bytes = await readFile(path.join(root, ref.path));
      await writeFile(path.join(root, ref.path), Buffer.concat([bytes, Buffer.from(" ")]));
      await assert.rejects(() => readProductionVerifierEvidence(root, ref, value), /PRODUCTION_EVIDENCE_CHANGED/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test("a bare successful checks object is not production execution evidence", () => {
  assert.throws(() => assertProductionVerifierEvidence({ routeOk: true, contentOk: true }, fixture("blog")));
});
