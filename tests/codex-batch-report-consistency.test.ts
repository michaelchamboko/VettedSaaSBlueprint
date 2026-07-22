import assert from "node:assert/strict";
import test from "node:test";

import {
  codexComplianceReviewSchema,
  codexComplianceReviewV2Schema,
  codexConversionReviewSchema,
  codexConversionReviewV2Schema,
  codexIntentBriefSchema,
  codexUniquenessReviewSchema,
  codexUniquenessReviewV2Schema,
} from "../src/lib/codex-batches/contracts";

test("intent reports cannot pass while rejecting or retaining hard blockers", () => {
  const base = {
    schema_version: 1,
    status: "pass" as const,
    recommended_action: "new_page" as const,
    reason_codes: [],
    target_keyword: "workflow review",
    search_intent: "commercial investigation",
    audience_segment: "small teams",
    buyer_decision: "whether the product fits the workflow",
    hard_fail_flags: [],
    downstream_blocks: [],
  };

  assert.equal(codexIntentBriefSchema.safeParse(base).success, true);
  assert.equal(codexIntentBriefSchema.safeParse({ ...base, recommended_action: "reject" }).success, false);
  assert.equal(codexIntentBriefSchema.safeParse({ ...base, hard_fail_flags: ["duplicate_intent"] }).success, false);
  assert.equal(codexIntentBriefSchema.safeParse({ ...base, downstream_blocks: ["missing_evidence"] }).success, false);
});

test("specialist reviews cannot pass with blocked readiness, failures, rewrites, or rejection", () => {
  const uniqueness = {
    schema_version: 1,
    status: "pass" as const,
    publish_readiness: "eligible_for_next_gate" as const,
    reason_codes: [],
    hard_gate_failures: [],
    required_changes: [],
    recommended_action: "pass" as const,
  };
  assert.equal(codexUniquenessReviewSchema.safeParse(uniqueness).success, true);
  assert.equal(codexUniquenessReviewSchema.safeParse({ ...uniqueness, recommended_action: "noindex_draft" }).success, true);
  assert.equal(codexUniquenessReviewSchema.safeParse({ ...uniqueness, publish_readiness: "blocked" }).success, false);
  assert.equal(codexUniquenessReviewSchema.safeParse({ ...uniqueness, hard_gate_failures: ["duplicate"] }).success, false);
  assert.equal(codexUniquenessReviewSchema.safeParse({ ...uniqueness, recommended_action: "reject" }).success, false);

  const compliance = {
    schema_version: 1,
    status: "pass" as const,
    publish_readiness: "eligible_for_conversion_review" as const,
    reason_codes: [],
    hard_gate_failures: [],
    required_changes: [],
    recommended_action: "pass" as const,
  };
  assert.equal(codexComplianceReviewSchema.safeParse(compliance).success, true);
  assert.equal(codexComplianceReviewSchema.safeParse({ ...compliance, publish_readiness: "blocked" }).success, false);
  assert.equal(codexComplianceReviewSchema.safeParse({ ...compliance, required_changes: ["rewrite"] }).success, false);
  assert.equal(codexComplianceReviewSchema.safeParse({ ...compliance, recommended_action: "reject" }).success, false);

  const conversion = {
    schema_version: 1,
    status: "pass" as const,
    publish_readiness: "eligible_for_owner_review" as const,
    reason_codes: [],
    hard_gate_failures: [],
    required_rewrites: [],
    recommended_action: "pass",
  };
  assert.equal(codexConversionReviewSchema.safeParse(conversion).success, true);
  assert.equal(codexConversionReviewSchema.safeParse({ ...conversion, recommended_action: "owner_review" }).success, true);
  assert.equal(codexConversionReviewSchema.safeParse({ ...conversion, publish_readiness: "blocked" }).success, false);
  assert.equal(codexConversionReviewSchema.safeParse({ ...conversion, required_rewrites: ["cta"] }).success, false);
  assert.equal(codexConversionReviewSchema.safeParse({ ...conversion, recommended_action: "reject" }).success, false);
});

test("non-passing specialist reviews cannot claim eligibility for the next gate", () => {
  const uniqueness = {
    schema_version: 1,
    status: "fail" as const,
    publish_readiness: "eligible_for_next_gate" as const,
    reason_codes: ["duplicate"],
    hard_gate_failures: ["duplicate"],
    required_changes: ["rewrite"],
    recommended_action: "rewrite_visible_fields" as const,
  };
  assert.equal(codexUniquenessReviewSchema.safeParse(uniqueness).success, false);

  const compliance = {
    schema_version: 1,
    status: "fail" as const,
    publish_readiness: "eligible_for_conversion_review" as const,
    reason_codes: ["missing_evidence"],
    hard_gate_failures: ["missing_evidence"],
    required_changes: ["resolve evidence"],
    recommended_action: "resolve_external_records" as const,
  };
  assert.equal(codexComplianceReviewSchema.safeParse(compliance).success, false);

  const conversion = {
    schema_version: 1,
    status: "blocked" as const,
    publish_readiness: "eligible_for_owner_review" as const,
    reason_codes: ["compliance_blocked"],
    hard_gate_failures: ["compliance_blocked"],
    required_rewrites: [],
    recommended_action: "hold",
  };
  assert.equal(codexConversionReviewSchema.safeParse(conversion).success, false);
});

test("V2 specialist reports require one immutable design trace while V1 forms remain unchanged", () => {
  const trace = {
    page_blueprint_id: "99999999-9999-4999-8999-999999999999",
    slug: "workflow-fit-review",
    draft_canonical_sha256: "a".repeat(64),
    recipe_id: "recipe-aaaaaaaaaaaaaaaa",
    recipe_fingerprint: "a".repeat(64),
    catalogue_sha256: "b".repeat(64),
    selected_references: [
      { reference_id: "lp-ref-0001", entry_digest: "c".repeat(64), role: "hero_typography", adopted_principles: ["Use typographic hierarchy."], influenced_axes: ["hero", "typography"], desktop_capture_sha256: "d".repeat(64), mobile_capture_sha256: "e".repeat(64) },
      { reference_id: "lp-ref-0002", entry_digest: "f".repeat(64), role: "sections_cta", adopted_principles: ["Use evidence-led sections."], influenced_axes: ["section_variants", "cta"], desktop_capture_sha256: "1".repeat(64), mobile_capture_sha256: "2".repeat(64) },
      { reference_id: "lp-ref-0003", entry_digest: "3".repeat(64), role: "motion_mobile", adopted_principles: ["Use restrained motion."], influenced_axes: ["motion", "mobile"], desktop_capture_sha256: "4".repeat(64), mobile_capture_sha256: "5".repeat(64) },
    ],
  };
  const reviews = [
    [codexUniquenessReviewV2Schema, "codexUniquenessReviewV2", { status: "pass", publish_readiness: "eligible_for_next_gate", reason_codes: [], hard_gate_failures: [], required_changes: [], recommended_action: "pass" }],
    [codexComplianceReviewV2Schema, "codexComplianceReviewV2", { status: "pass", publish_readiness: "eligible_for_conversion_review", reason_codes: [], hard_gate_failures: [], required_changes: [], recommended_action: "pass" }],
    [codexConversionReviewV2Schema, "codexConversionReviewV2", { status: "pass", publish_readiness: "eligible_for_owner_review", reason_codes: [], hard_gate_failures: [], required_rewrites: [], recommended_action: "pass" }],
  ] as const;

  for (const [schema, schemaVersion, review] of reviews) {
    assert.equal(schema.safeParse({ schema_version: schemaVersion, ...review, design_trace: trace }).success, true);
    assert.equal(schema.safeParse({ schema_version: schemaVersion, ...review }).success, false);
    assert.equal(schema.safeParse({ schema_version: schemaVersion, ...review, design_trace: { ...trace, selected_references: [trace.selected_references[0], trace.selected_references[0]] } }).success, false);
  }
});
