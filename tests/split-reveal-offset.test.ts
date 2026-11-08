import { test } from "node:test";
import assert from "node:assert/strict";
import { boundedSplitRevealOffset } from "../src/components/landing/split-reveal-offset";

test("bounds offset to available gutter", () => {
  assert.equal(boundedSplitRevealOffset(16), 12);
  assert.equal(boundedSplitRevealOffset(100), 36);
});

test("never exceeds requested offset", () => {
  assert.equal(boundedSplitRevealOffset(1000, 36), 36);
});

test("returns zero when no gutter", () => {
  assert.equal(boundedSplitRevealOffset(0), 0);
  assert.equal(boundedSplitRevealOffset(-5), 0);
});

test("handles non-finite", () => {
  assert.equal(boundedSplitRevealOffset(NaN), 0);
});
