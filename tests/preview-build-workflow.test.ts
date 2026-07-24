import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const workflowPath = path.join(process.cwd(), ".github", "workflows", "preview-build.yml");

test("preview CI keeps five parallel jobs and scans each committed UUID Codex batch in draft mode", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const jobs = [...workflow.matchAll(/^  ([a-z][a-z-]+):\r?\n(?=    name:)/gm)].map((match) => match[1]);
  assert.deepEqual(jobs, ["typecheck", "lint", "test", "build", "landing-workflow"]);

  const landingJob = workflow.slice(workflow.indexOf("  landing-workflow:"));
  const needsMatch = landingJob.match(/^    needs:\s*\[([^\]]+)\]/m);
  assert.ok(needsMatch, "landing-workflow must declare explicit needs for typecheck, lint, test, and build.");
  const needsList = needsMatch[1].split(",").map((value) => value.trim());
  for (const required of ["typecheck", "lint", "test", "build"]) {
    assert.ok(needsList.includes(required), `landing-workflow needs must include "${required}".`);
  }
  assert.match(landingJob, /landing:quality:production -- --ci-parallel-core --report-dir \.stage2\/landing-quality\/production/);
  assert.match(landingJob, /git ls-tree -r --name-only HEAD -- src\/generated\/landing-pages/);
  assert.match(landingJob, /npm run landing:quality:candidate -- --artifact "\$candidate_file"/);
  assert.match(landingJob, /git ls-tree -r --name-only HEAD -- src\/generated\/landing-page-batches/);
  assert.match(landingJob, /src\/generated\/landing-page-batches\/\(\[0-9A-Fa-f\]\{8\}/);
  assert.match(landingJob, /for batch_id in "\$\{batch_ids\[@\]\}"; do/);
  assert.match(landingJob, /npm run landing:quality:draft -- --ci-parallel-core --batch-id "\$batch_id"/);
  assert.match(landingJob, /--report-dir "\.stage2\/landing-quality\/batches\/\$batch_id"/);
});

test("visual CI preflights before installing the locked local Chromium binary", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const buildJob = workflow.slice(workflow.indexOf("  build:"), workflow.indexOf("  landing-workflow:"));
  assert.match(buildJob, /Count V2 visual-review pages/);
  assert.match(buildJob, /if: steps\.visual-pages\.outputs\.count != '0'/);
  assert.match(buildJob, /npx --no-install playwright install --with-deps chromium/);
  assert.match(buildJob, /npm run landing:visual/);
  assert.match(buildJob, /name: landing-visual-artifacts/);
});
