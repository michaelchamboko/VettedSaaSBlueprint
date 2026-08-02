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

test("all landing-production skills permit original 2027 artistic implementation", () => {
  const sharedRequirements: Array<[string, RegExp]> = [
    ["a design read", /design read/i],
    ["original page-specific implementation", /(?:original|page-specific)[\s\S]{0,180}(?:JSX|CSS|imagery|typography)/i],
    ["purposeful motion", /(?:GSAP|motion)/i],
    ["anti-template direction", /(?:generic AI|template)/i],
  ];

  for (const [skill, relativePath] of Object.entries(skillPaths)) {
    requireAll(readSkill(relativePath), skill, sharedRequirements);
  }
});

test("artistic design guidance retains conversion and accessibility boundaries", () => {
  const uniqueness = readSkill(skillPaths.uniqueness);
  requireAll(uniqueness, "uniqueness", [
    ["CTA usability", /CTA[\s\S]{0,120}(?:usable|access)/i],
    ["reduced-motion support", /reduced-motion/i],
    ["no generic template repetition", /generic template/i],
  ]);

  const retro = readSkill(skillPaths.retro);
  requireAll(retro, "retro", [
    ["original visual systems", /original visual system/i],
    ["responsive hierarchy", /responsive hierarchy/i],
    ["conversion action", /conversion action/i],
  ]);
});
