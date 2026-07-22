import assert from "node:assert/strict";
import test from "node:test";
import { evidenceClaimSchema, researchSourceSchema } from "../src/lib/schemas/contracts";
import { budgetExceeded, hasBudgetRemaining, nextBudgetSpend } from "../src/lib/research/budget";

test("research source stores minimal metadata", () => {
  const source = researchSourceSchema.parse({
    source_type: "manual_note",
    source_url: "https://example.com/source",
  });
  assert.equal(source.usage_allowed, false);
});

test("evidence claims require traceable source fields", () => {
  const claim = evidenceClaimSchema.parse({
    claim_text: "The vendor offers a free trial.",
    claim_type: "pricing",
    risk_level: "medium",
    confidence_score: 0.8,
  });
  assert.equal(claim.usage_allowed, false);
});

test("budget guard blocks overspend", () => {
  assert.equal(hasBudgetRemaining(10, 20), true);
  assert.equal(budgetExceeded(nextBudgetSpend(10, 15), 20), true);
});
