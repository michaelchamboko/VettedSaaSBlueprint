import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { activeDecisionGuideIndex } from "../src/components/public/decision-guide-progress";

test("decision guide scroll progresses from decision to solution to scenario in both directions", () => {
  for (const [progress, expected] of [
    [0, 0], [1 / 3 - 0.001, 0], [1 / 3, 1], [0.5, 1],
    [2 / 3 - 0.001, 1], [2 / 3, 2], [1, 2],
    [0.5, 1], [0, 0], [-0.1, 0], [1.1, 2],
  ]) {
    assert.equal(activeDecisionGuideIndex(progress, 3), expected);
  }
  assert.equal(activeDecisionGuideIndex(1, 1), 0);
});

test("guide pin enhancement respects motion, tablet width, native control, and lifecycle cleanup", () => {
  const motion = readFileSync("src/components/public/HomepageMotion.tsx", "utf8");
  assert.match(motion, /motion: "\(prefers-reduced-motion: no-preference\)"/);
  assert.match(motion, /guideDesktop: "\(min-width: 801px\)"/);
  assert.ok(motion.indexOf("if (!conditions?.motion)") < motion.indexOf("if (conditions.guideDesktop)"));
  assert.match(motion, /if \(conditions.guideDesktop\)[\s\S]*ScrollTrigger\.create/);
  assert.match(motion, /pin: true/);
  assert.match(motion, /onUpdate:[\s\S]*activeDecisionGuideIndex/);
  assert.match(motion, /card\.open = index === activeIndex/);
  assert.match(motion, /media\.revert\(\)/);
  assert.match(motion, /context\.revert\(\)/);
  assert.doesNotMatch(motion, /addEventListener\(["']scroll["']/);
  assert.doesNotMatch(motion, /preventDefault\(/);
});
