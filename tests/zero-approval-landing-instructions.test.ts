import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repositoryRoot = process.cwd();

const activeInstructionPaths = [
  "AGENTS.md",
  "project_rules.md",
  "planning.md",
  "docs/deployment/architecture.md",
  "docs/deployment/public-site-release.md",
  "docs/landing-workflow/README.md",
  ".agents/skills/landing-page-production-orchestrator/SKILL.md",
  ".agents/skills/conversion-copy-review/SKILL.md",
  ".agents/skills/affiliate-compliance-review/SKILL.md",
  ".agents/skills/landing-page-batch-retro/SKILL.md",
  ".agents/skills/direct-review-page-drafter/SKILL.md",
  ".agents/skills/direct-review-page-drafter/references/output-contract.md",
  ".agents/skills/conversion-copy-review/references/review-contract.md",
  "scripts/stage2-pre-review-gate.mjs",
  "src/lib/article-import/release.ts",
  "src/lib/article-import/local-release-adapter.ts",
  "src/lib/article-import/supervised-executor.ts",
  "src/app/page.tsx",
  "src/app/editorial-policy/page.tsx",
] as const;

const forbiddenNormalPathLanguage = [
  "eligible_for_owner_review",
  "READY_FOR_OWNER_REVIEW",
  "execution agents must not approve or publish",
  "execution agent must stop before approval or publication",
  "no execution-agent command exists for publication",
  "owner-controlled publication decision",
  "the owner approves and publishes",
  "no production implementation starts until",
  "pending_owner_approval",
  "proceed to human review",
  "stop before human review",
  "reason manual review is required",
  "completed evidence, compliance, and owner approval appear",
  "owner approval of the rendered",
  "until owner approval",
  "repeat preview approval before",
  "the workstation does not grant publication authority",
  "no merge without owner approval",
  "wait for owner-approved merge",
  "owner must approve its merge",
] as const;

test("active landing instructions do not stop a normal URL run for human approval", () => {
  const failures: string[] = [];

  for (const relativePath of activeInstructionPaths) {
    const source = readFileSync(path.resolve(repositoryRoot, relativePath), "utf8").toLowerCase();
    for (const forbidden of forbiddenNormalPathLanguage) {
      if (source.includes(forbidden.toLowerCase())) {
        failures.push(`${relativePath}: ${forbidden}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("active landing instructions define the database-free supervised release path", () => {
  const authority = readFileSync(path.resolve(repositoryRoot, "docs/landing-workflow/README.md"), "utf8");

  assert.match(authority, /decide/i);
  assert.match(authority, /evidence/i);
  assert.match(authority, /quality/i);
  assert.match(authority, /release/i);
  assert.match(authority, /Vercel/i);
  assert.doesNotMatch(authority, /Neon|Postgres/i);
});
