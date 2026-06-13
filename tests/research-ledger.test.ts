import assert from "node:assert/strict";
import test from "node:test";
import { evidenceClaimSchema, researchSourceSchema } from "../src/lib/schemas/contracts";
import { hasBudgetRemaining } from "../src/lib/research/budget";

test("research source and evidence claim schemas require traceability", () => {
  const source = researchSourceSchema.parse({ source_type: "manual_note", source_url: "https://example.com/source" });
  const claim = evidenceClaimSchema.parse({ claim_text: "Claim", claim_type: "pricing", risk_level: "medium", confidence_score: 0.5 });
  assert.equal(source.usage_allowed, false);
  assert.equal(claim.usage_allowed, false);
});

test("budget helper keeps work inside allowance", () => {
  assert.equal(hasBudgetRemaining(5, 10), true);
});
