import assert from "node:assert/strict";
import test from "node:test";

import {
  type LandingWorkflowStageId,
  landingWorkflowRegistry,
} from "@/lib/landing-workflow/registry";
import { landingWorkflowResultSchema } from "@/lib/landing-workflow/contracts";

test("workflow registry defines fourteen exact stage definitions", () => {
  assert.equal(landingWorkflowRegistry.length, 14);
});

test("registry contains the required unattended stages", () => {
  type UnattendedLandingWorkflowStageId = Exclude<LandingWorkflowStageId, "t12_release">;

  const expected: UnattendedLandingWorkflowStageId[] = [
    "t0_design_direction",
    "t1_affiliate_intent",
    "t2_direct_review",
    "t3_preview_generation",
    "t4_visual_review",
    "t5_uniqueness",
    "t6_compliance",
    "t7_conversion",
    "t8_batch_retro",
    "t9_publish_gates",
    "t10_pr_prepare",
    "t11_ci_preview",
    "t13_postmortem",
  ];
  const ids = landingWorkflowRegistry.filter((stage) => stage.unattended).map((stage) => stage.id);
  for (const value of expected) {
    assert.ok(ids.includes(value));
  }
});

test("result schema expects landing_workflow_v4 contract", () => {
  const sample = landingWorkflowResultSchema.parse({
    contract_version: "landing_workflow_v4",
    batch_id: null,
    status: "PASS",
    stage: "describe",
    reason_codes: ["PASS"],
    artifacts: [],
  });
  assert.equal(sample.contract_version, "landing_workflow_v4");
});
