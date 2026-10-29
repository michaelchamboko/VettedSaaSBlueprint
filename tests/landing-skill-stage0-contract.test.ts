import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const skillPaths = {
  orchestrator: ".agents/skills/landing-page-production-orchestrator/SKILL.md",
  intent: ".agents/skills/affiliate-page-intent-brief/SKILL.md",
  drafter: ".agents/skills/direct-review-page-drafter/SKILL.md",
  uniqueness: ".agents/skills/landing-page-uniqueness-review/SKILL.md",
  retro: ".agents/skills/landing-page-batch-retro/SKILL.md",
} as const;

function readSkill(relativePath: string) {
  const filePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(filePath), `expected ${relativePath} to exist`);
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source: string, skill: string, requirements: Array<[string, RegExp]>) {
  for (const [behavior, pattern] of requirements) {
    assert.match(source, pattern, `${skill} must require ${behavior}`);
  }
}

test("landing-production skills keep design advisory and preserve implementation boundaries", () => {
  const policy = readSkill(skillPaths.orchestrator);
  requireAll(policy, "orchestrator", [
    ["four supervised stages", /decide[\s\S]*evidence[\s\S]*quality[\s\S]*release/i],
    ["Vercel release verification", /Vercel deployment/i],
    ["specialist reviews are repair inputs", /repair inputs/i],
    ["design-taste-frontend", /design-taste-frontend/i],
    ["Impeccable before implementation", /design-taste-frontend[\s\S]*Impeccable[\s\S]*before qualifying UI implementation/i],
  ]);
});

test("design guidance remains a repair lens with conversion and accessibility boundaries", () => {
  const uniqueness = readSkill(skillPaths.uniqueness);
  requireAll(uniqueness, "uniqueness", [
    ["distinct buyer question", /distinct buyer question/i],
    ["evidence-backed verdict", /verdict[\s\S]{0,80}evidence/i],
    ["no independent publication authority", /Do not control publication independently/i],
  ]);

  const retro = readSkill(skillPaths.retro);
  requireAll(retro, "retro", [
    ["conditional recurrence", /same stable failure repeats/i],
    ["smallest workflow improvement", /smallest workflow improvement/i],
    ["not a routine blocker", /Do not block ordinary content publication/i],
  ]);
});
