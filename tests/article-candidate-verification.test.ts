import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { verifyLandingDeployment } from "../scripts/verify-landing-deployment";
import { readImportArtifactTarget } from "../src/lib/article-import/format-validation";
import { readImportVerifierEvidence, requireVerificationMode, verificationContext, writeImportVerifierEvidence } from "../src/lib/article-import/verification-evidence";

test("candidate owner verification generates real local receipt before any deployment", async () => {
  const slug = "elevenlabs-ai-voice-generator";
  const { target } = await readImportArtifactTarget(process.cwd(), "direct-review", `src/generated/landing-pages/${slug}.json`);
  const release = JSON.parse(await readFile(`src/generated/landing-pages/releases/${slug}/release-receipt.json`, "utf8"));
  const canonicalOrigin = "https://vettedsaasblueprint.online";
  let deploymentRequests = 0;
  const server = createServer((request, response) => {
    if (request.url === "/api/deployment") { deploymentRequests += 1; response.writeHead(503); response.end(); return; }
    response.setHeader("Content-Type", request.url === "/sitemap.xml" ? "application/xml" : request.url === "/robots.txt" ? "text/plain" : "text/html");
    response.end(request.url === "/robots.txt" ? "User-agent: *\nAllow: /" : request.url === "/sitemap.xml" ? `<urlset><url><loc>${canonicalOrigin}${target.renderedRoutes[0]}</loc></url></urlset>` : `<html><head><meta name="robots" content="noindex,nofollow"><meta name="artifact-fingerprint" content="${target.artifactFingerprint}"></head><body><p>Affiliate disclosure: We may earn a commission.</p><a data-link-id="fixture" href="${release.exact_affiliate_url}">Check the product</a></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await mkdir(".automation", { recursive: true });
  const directory = await mkdtemp(path.join(process.cwd(), ".automation", "candidate-test-"));
  try {
    const result = await verifyLandingDeployment({ mode: "candidate", origin: `http://127.0.0.1:${address.port}`, canonicalOrigin, slug });
    assert.equal(deploymentRequests, 0);
    assert.equal(result.verificationMode, "candidate");
    assert.equal("deployment" in result, false);
    assert.equal("expected_commit" in result, false);
    const file = path.join(directory, "verifier.json");
    await writeImportVerifierEvidence(file, target, result);
    assert.match((await readImportVerifierEvidence(process.cwd(), file, target)).sha256, /^[a-f0-9]{64}$/);
    assert.throws(() => requireVerificationMode(result, "production"));
    await assert.rejects(() => writeImportVerifierEvidence(file, target, { ...result, deployment: { commitSha: "a".repeat(40) } }), /CANDIDATE_CANNOT_CLAIM_DEPLOYMENT/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test("candidate and production origins and commit claims cannot be interchanged", () => {
  assert.throws(() => verificationContext({ mode: "candidate", origin: "https://example.com", canonicalOrigin: "https://example.com" }), /LOOPBACK/);
  assert.throws(() => verificationContext({ mode: "candidate", origin: "http://localhost:3000", canonicalOrigin: "https://example.com", expectedCommit: "a".repeat(40) }), /CANNOT_CLAIM/);
  assert.throws(() => verificationContext({ mode: "production", origin: "http://localhost:3000", canonicalOrigin: "https://example.com" }), /PRODUCTION_REQUIRES_HTTPS/);
});
