import assert from "node:assert/strict";
import test from "node:test";

import {
  type LandingWorkflowStageId,
  landingWorkflowRegistry,
} from "@/lib/landing-workflow/registry";
import { landingWorkflowResultSchema } from "@/lib/landing-workflow/contracts";

test("workflow registry defines the four supervised stages", () => {
  const ids: LandingWorkflowStageId[] = ["decide", "evidence", "quality", "release"];

  assert.deepEqual(landingWorkflowRegistry.map((stage) => stage.id), ids);
  assert.ok(landingWorkflowRegistry.every((stage) => stage.owner === "Supervised agent"));

  const retiredIds = [
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
    "t12_release",
    "t13_postmortem",
  ];
  for (const retiredId of retiredIds) {
    assert.ok(!landingWorkflowRegistry.some((stage) => stage.id === retiredId));
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
