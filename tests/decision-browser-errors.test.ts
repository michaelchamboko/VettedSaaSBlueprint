import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { captureRoute } from "../scripts/verify-decision-set-deployment";
import { decisionJourneyCatalog } from "../src/lib/decision-journey/catalogue";
import { assertVerifierResult } from "../src/lib/article-import/verification-evidence";

test("decision verifier detects uncaught exceptions without console errors", async () => {
  const route = "/decision-hub";
  const record = decisionJourneyCatalog[route];
  let throws = true;
  const server = createServer((_request, response) => {
    response.setHeader("Content-Type", "text/html");
    response.end(`<html><body><h1>${record.headline}</h1>${record.blocks.map(() => '<section class="decision-journey__block">Content</section>').join("")}${throws ? '<script>throw new Error("uncaught-verifier-fixture")</script>' : ""}</body></html>`);
  });
  const output = await mkdtemp(path.join(os.tmpdir(), "decision-errors-"));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const input = { origin: `http://127.0.0.1:${address.port}`, route, output };
    const failed = await captureRoute(input);
    const consoleChecks = failed.checks.filter((check) => check.name.endsWith(" console errors"));
    const pageChecks = failed.checks.filter((check) => check.name.endsWith(" uncaught page errors"));
    assert.equal(consoleChecks.length, 3);
    assert.equal(pageChecks.length, 3);
    // The uncaught exception must fail the dedicated page-error evidence on every JS-enabled profile.
    assert.equal(pageChecks.filter((check) => !check.passed).length, 2);
    assert.equal(pageChecks.find((check) => check.name.includes("mobile-no-javascript"))?.passed, true);
    assert.ok(pageChecks.filter((check) => !check.passed).every((check) => check.detail.includes("uncaught-verifier-fixture")));
    // Console evidence stays separate; whatever failed carries the fixture message.
    assert.equal(consoleChecks.find((check) => check.name.includes("mobile-no-javascript"))?.passed, true);
    assert.ok(failed.checks.filter((check) => !check.passed).every((check) => check.detail.includes("uncaught-verifier-fixture")));
    throws = false;
    const clean = await captureRoute(input);
    assert.ok(clean.checks.every((check) => check.passed));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(output, { recursive: true, force: true });
  }
});

test("decision receipts reject absent or failed browser-error evidence", () => {
  const target = { format: "decision-set" as const, slug: "fixture", artifactFingerprint: "a".repeat(64), renderedRoutes: ["/decision-hub/fixture"] };
  const result = { passed: true, robots_ok: true, sitemap_ok: true, checks: [{ passed: true }], screenshots: [{ route: target.renderedRoutes[0], mode: "desktop" }, { route: target.renderedRoutes[0], mode: "mobile" }] };
  assert.throws(() => assertVerifierResult(target, result));
  assert.throws(() => assertVerifierResult(target, { ...result, browser_errors_ok: false }));
  assert.doesNotThrow(() => assertVerifierResult(target, { ...result, browser_errors_ok: true }));
});
