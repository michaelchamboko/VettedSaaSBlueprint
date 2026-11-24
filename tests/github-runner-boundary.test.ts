import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const workflowDirectory = path.join(root, ".github", "workflows");
const activeInstructions = [
  "AGENTS.md",
  "project_rules.md",
  "docs/VetterSaaSBlueprint_PRD.md",
  "docs/deployment/public-site-release.md",
  "docs/deployment/runtime-compatibility.md",
  "docs/landing-workflow/README.md",
];

test("only the owner-authorized code graph workflow exists; release stays agent-owned", () => {
  const workflowFiles = existsSync(workflowDirectory)
    ? readdirSync(workflowDirectory).filter((entry) => /\.(?:ya?ml)$/i.test(entry))
    : [];

  assert.deepEqual(workflowFiles, ["code-graph.yml"]);
  const workflow = readFileSync(path.join(workflowDirectory, "code-graph.yml"), "utf8");
  assert.match(workflow, /scripts\/code-intelligence\/build\.ts/);
  assert.doesNotMatch(workflow, /import:article|import-article|vercel\s+(?:deploy|promote)|gh pr merge/);
});

test("active release instructions do not require runners, bot publication, or workflow artifacts", () => {
  const forbidden = [
    /GitHub Actions/i,
    /hosted[- ]runner/i,
    /GitHub checks?/i,
    /required (?:workflow|hosted|GitHub) checks?/i,
    /bot (?:PR|publish|publication)/i,
    /workflow artifacts?/i,
  ];

  for (const instruction of activeInstructions) {
    const content = readFileSync(path.join(root, instruction), "utf8");
    for (const pattern of forbidden) {
      assert.doesNotMatch(content, pattern, `${instruction} must not require ${pattern}`);
    }
  }
});
