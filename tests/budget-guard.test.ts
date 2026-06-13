import assert from "node:assert/strict";
import test from "node:test";
import { shouldPauseResearchLoop, withinBudget } from "../src/lib/research/budget";

test("budget helper allows work within budget", () => {
  assert.equal(withinBudget(10, 5, 20), true);
});

test("budget helper pauses when budget is exhausted", () => {
  assert.equal(shouldPauseResearchLoop(20, 20), true);
});
