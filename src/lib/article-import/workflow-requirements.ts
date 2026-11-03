/** Metadata for the existing workflow, not a second state machine. */
export const WORKFLOW_REVISION = "article-workflow:2";
export const WORKFLOW_SEQUENCE = ["INGESTING", "RESEARCHING", "TRANSFORMING", "REFINING", "VALIDATING", "RELEASING", "VERIFYING", "LIVE"] as const;
export type WorkflowStage = typeof WORKFLOW_SEQUENCE[number];
export const CONTENT_FORMATS = ["direct-review", "blog", "visibility", "decision-set"] as const;

const sources = {
  seo: { document: "D05", heading: "26.2", uid: "D05-S-5151b43d272f" },
  aeo: { document: "D05", heading: "26.3", uid: "D05-S-746c045dba0a" },
  editorial: { document: "D07", heading: "32", uid: "D07-S-761a1d533ac1" },
} as const;

export const workflowRequirements = [
  { id: "intent", strength: "required", source: sources.seo },
  { id: "claims", strength: "required", source: sources.editorial },
  { id: "seo.metadata", strength: "recommended", source: sources.seo },
  { id: "seo.indexability", strength: "recommended", source: sources.seo },
  { id: "seo.internal-links", strength: "recommended", source: sources.seo },
  { id: "aeo.direct-answer", strength: "recommended", source: sources.aeo },
  { id: "aeo.questions", strength: "recommended", source: sources.aeo },
  { id: "aeo.entities", strength: "recommended", source: sources.aeo },
  { id: "aeo.extractability", strength: "recommended", source: sources.aeo },
  { id: "aeo.sources-freshness", strength: "recommended", source: sources.aeo },
  { id: "schema-visible-agreement", strength: "recommended", source: sources.seo },
  { id: "disclosure-independence", strength: "required", source: sources.editorial },
].map((rule) => ({ ...rule, revision: WORKFLOW_REVISION, formats: CONTENT_FORMATS, stage: "TRANSFORMING" as const,
  producer: "ContentAssessmentV1", validator: "validateContentAssessment", invalidatesOn: ["artifact", "source", "requirements"] as const }));

export const stageInstructions: Record<WorkflowStage, string> = {
  INGESTING: "Read AGENTS.md, planning.md and the pinned capabilities. Preserve source bytes and snapshot order; reconcile the earliest PROCESSING entry. Never execute from a secondary worktree.",
  RESEARCHING: "Retain primary source snapshots, retrieval times, scoped claims, excerpts and limitations in ResearchEvidenceV2. Record currency, billing period, plan and restrictions for prices. Do not invent missing claims.",
  TRANSFORMING: "Create a complete schema-valid artifact and intent brief. Assess every SEO/AEO rule against that artifact. Required checks must pass; recommendations require adoption or justified non-adoption. Follow the mapped affiliate skill chain and commercial boundaries.",
  REFINING: "Complete .agents/skills/eleanor-editorial/SKILL.md: all prose, purpose/structure, meaning/evidence, wording/rhythm, different-family cleanse, final fidelity review and 5/5 CLEAN. Retain actual executions and judgments in EditorialExecutionV1 alongside EditorialEvidenceV2. Reassess final SEO/AEO and claims after the rewrite.",
  VALIDATING: "Freeze approved prose. Retain Design Read, Impeccable context, shape, critique, audit, detect, polish, applicable specialists and desktop/mobile/reduced-motion checks. Retain genuine command/browser output and judgments bound to the artifact and routes.",
  RELEASING: "Require current content, editorial, SEO/AEO and presentation evidence before side effects. Run repository gates, independent exact-head Codex review and existing release checks; never fabricate review or deployment evidence.",
  VERIFYING: "Retain production owner-verifier output bound to reviewed commit, deployment, routes and artifact. Candidate receipts and HTTP 200 alone cannot pass.",
  LIVE: "Persist the immutable terminal bundle before intake completion. Valid quarantine is a separate predicate and is not publication. Missing work is not grounds to skip an entry.",
};

export function instructionsForStage(stage: string): string {
  if (!Object.hasOwn(stageInstructions, stage)) throw new Error("WORKFLOW_STAGE_UNSUPPORTED");
  return stageInstructions[stage as WorkflowStage];
}
