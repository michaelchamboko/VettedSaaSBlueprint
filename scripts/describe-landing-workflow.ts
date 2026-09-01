import { landingWorkflowRegistry } from "../src/lib/landing-workflow/registry";

const workflow = {
  contract_version: "supervised_content_workflow_v1",
  entrypoint: "ContentAssignmentV1",
  release_path: ["Git merge", "Vercel deploy", "live verification"],
  stages: landingWorkflowRegistry.map((stage) => ({
    id: stage.id,
    command: stage.command,
    owner: stage.owner,
  })),
  stage_ids: landingWorkflowRegistry.map((stage) => stage.id),
  command_names: landingWorkflowRegistry.map((stage) => stage.command),
};

process.stdout.write(`${JSON.stringify(workflow, null, 2)}\n`);
