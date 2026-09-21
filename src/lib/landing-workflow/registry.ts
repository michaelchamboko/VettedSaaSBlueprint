export interface LandingWorkflowStageDefinition {
  id: string;
  command: string;
  owner: "Supervised agent";
}

export const landingWorkflowRegistry = [
  { id: "decide", command: "record-content-assignment", owner: "Supervised agent" },
  { id: "evidence", command: "gather-bounded-evidence", owner: "Supervised agent" },
  { id: "quality", command: "validate-content-quality", owner: "Supervised agent" },
  { id: "release", command: "git-vercel-release", owner: "Supervised agent" },
] as const satisfies LandingWorkflowStageDefinition[];

export type LandingWorkflowStageId = (typeof landingWorkflowRegistry)[number]["id"];
