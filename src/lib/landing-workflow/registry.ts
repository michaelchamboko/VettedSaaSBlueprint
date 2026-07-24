export interface LandingWorkflowStageDefinition {
  id: string;
  command: string;
  owner: "Hermes" | "GitHub/Vercel";
  unattended: boolean;
}

export const landingWorkflowRegistry = [
  { id: "t0_design_direction", command: "landing-page-production-orchestrator:stage0", owner: "Hermes", unattended: true },
  { id: "t1_affiliate_intent", command: "affiliate-page-intent-brief", owner: "Hermes", unattended: true },
  { id: "t2_direct_review", command: "direct-review-page-drafter", owner: "Hermes", unattended: true },
  { id: "t3_preview_generation", command: "gsap-preview", owner: "Hermes", unattended: true },
  { id: "t4_visual_review", command: "visual-design-review", owner: "Hermes", unattended: true },
  { id: "t5_uniqueness", command: "landing-page-uniqueness-review", owner: "Hermes", unattended: true },
  { id: "t6_compliance", command: "affiliate-compliance-review", owner: "Hermes", unattended: true },
  { id: "t7_conversion", command: "conversion-copy-review", owner: "Hermes", unattended: true },
  { id: "t8_batch_retro", command: "landing-page-batch-retro", owner: "Hermes", unattended: true },
  { id: "t9_publish_gates", command: "unattended-gate-evaluation", owner: "Hermes", unattended: true },
  { id: "t10_pr_prepare", command: "bot-pr-creation", owner: "Hermes", unattended: true },
  { id: "t11_ci_preview", command: "required-ci-preview", owner: "Hermes", unattended: true },
  { id: "t12_release", command: "release-deploy", owner: "GitHub/Vercel", unattended: true },
  { id: "t13_postmortem", command: "post-deploy-observability", owner: "Hermes", unattended: true },
] as const satisfies LandingWorkflowStageDefinition[];

export type LandingWorkflowStageId = (typeof landingWorkflowRegistry)[number]["id"];
