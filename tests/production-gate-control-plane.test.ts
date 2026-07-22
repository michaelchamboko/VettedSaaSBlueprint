import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("production gate control-plane routes exist and require audited owner actions", () => {
  const expectedRoutes = [
    "src/app/api/admin/program-rules/route.ts",
    "src/app/api/admin/compliance-profiles/route.ts",
    "src/app/api/admin/affiliate-links/[id]/route.ts",
    "src/app/api/admin/manual-review-tasks/[id]/resolve/route.ts",
  ];

  for (const route of expectedRoutes) {
    assert.equal(existsSync(path.join(root, route)), true, route);
    const source = read(route);
    assert.match(source, /requireOwnerSession/);
    assert.match(source, /auditAdminAction/);
    assert.match(source, /sql/);
  }
});

test("gate record schemas are present outside generated page JSON", () => {
  const source = read("src/lib/schemas/contracts.ts");
  assert.match(source, /export const partnerstackProgramRuleSchema/);
  assert.match(source, /export const complianceProfileSchema/);
});

test("owner actions expose the states the publication gate consumes", () => {
  const linkRoute = read("src/app/api/admin/affiliate-links/[id]/route.ts");
  const taskRoute = read("src/app/api/admin/manual-review-tasks/[id]/resolve/route.ts");
  assert.match(linkRoute, /active/);
  assert.match(linkRoute, /manual_review/);
  assert.match(taskRoute, /resolved/);
});
