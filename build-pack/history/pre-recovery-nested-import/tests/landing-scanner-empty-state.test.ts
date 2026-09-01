import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specialistScanners = [
  ".agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs",
  ".agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs",
  ".agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs",
];

test("specialist scanners pass a missing or zero-artifact publication catalogue", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "empty-landing-scanners-"));
  const missingDirectory = path.join(parent, "not-created");
  try {
    for (const script of specialistScanners) {
      const result = spawnSync(process.execPath, [script, missingDirectory, "--json"], { cwd: repoRoot, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const report = JSON.parse(result.stdout);
      assert.equal(report.status, "pass");
      assert.equal(report.scanned_count, 0);
    }
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
