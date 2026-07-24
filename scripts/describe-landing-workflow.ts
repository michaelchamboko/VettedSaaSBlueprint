import { landingWorkflowRegistry } from "../src/lib/landing-workflow/registry";

const workflow = {
  contract_version: "landing_workflow_v4",
  entrypoint: "approved-urls.md",
  authorization: "exact_https_url_allowlist",
  publication: "unattended_after_independent_gates_pass",
  required_gates: [
    "allowlist",
    "research_evidence",
    "compliance",
    "artifact_integrity",
    "quality_reviews",
    "daily_caps",
    "kill_switch",
    "required_ci_and_preview",
  ],
  batch_limits: { exemplar: 1, calibration: 3, steady_state: 10 },
  removal_policy: { noindex: "immediate", archive_after_days: 7 },
  stages: landingWorkflowRegistry.map((stage) => ({
    id: stage.id,
    command: stage.command,
    owner: stage.owner,
    unattended: stage.unattended,
  })),
  stage_ids: landingWorkflowRegistry.map((stage) => stage.id),
  command_names: landingWorkflowRegistry.map((stage) => stage.command),
};

process.stdout.write(`${JSON.stringify(workflow, null, 2)}\n`);
