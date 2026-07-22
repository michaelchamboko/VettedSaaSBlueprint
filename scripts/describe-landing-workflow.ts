const workflow = {
  contract_version: "landing_workflow_v3",
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
};

process.stdout.write(`${JSON.stringify(workflow, null, 2)}\n`);
