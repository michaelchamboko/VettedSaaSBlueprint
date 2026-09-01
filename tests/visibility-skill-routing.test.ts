import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const visibilitySkills = [
  "visibility-page-production-orchestrator",
  "visibility-page-intent-brief",
  "visibility-page-drafter",
  "visibility-page-visual-review",
] as const;

test("visibility skills exist and prohibit direct affiliate ownership", () => {
  for (const skill of visibilitySkills) {
    const file = path.join(root, ".agents/skills", skill, "SKILL.md");
    assert.ok(existsSync(file), `expected ${skill} to exist`);
    const source = readFileSync(file, "utf8");
    assert.match(source, /VisibilityPageV1/);
    assert.match(source, /no direct affiliate URL/i);
    assert.doesNotMatch(source, /hosted database|remote worker/i);
  }
});

test("governance keeps visibility content separate from affiliate reviews", () => {
  const prd = readFileSync(path.join(root, "docs/VetterSaaSBlueprint_PRD.md"), "utf8");
  assert.match(prd, /category guides/i);
  assert.match(prd, /Exact approved affiliate URLs are rendered directly/i);
  assert.match(prd, /There is no public account, private admin surface, database, worker, queue, or analytics ingestion runtime/i);
});
