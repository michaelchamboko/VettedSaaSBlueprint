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

export const releaseSteps = [
  { id: "validate-candidate", action: "Validate the candidate", outcome: "Current content, editorial, SEO/AEO and presentation evidence passes with repository gates, declared release files and a verified rollback target." },
  { id: "review-and-deploy", action: "Review and deploy", outcome: "An independent review passes the exact PR head; the merged checkout is revalidated and rebound before deploying the exact merged commit." },
  { id: "verify-production", action: "Verify production", outcome: "Retained production evidence passes for the deployed commit and routes; otherwise restore and verify the captured rollback deployment." },
] as const;

export const verificationSteps = [
  { id: "validate-receipt-and-presentation", action: "Validate the release receipt and approved presentation", outcome: "The current release receipt and presentation remain bound to the approved artifact." },
  { id: "check-production-evidence", action: "Check the retained production evidence", outcome: "All nine production checks pass in retained verifier evidence bound to this article, source and deployment." },
  { id: "match-release-chain", action: "Match review, merge and deployment", outcome: "The reviewed head matches the merge record, and the deployed commit, deployment ID and canonical URL match the release receipt." },
  { id: "freeze-and-persist-live", action: "Freeze and revalidate the terminal proof", outcome: "The validated artifact and evidence graph pass historical-terminal validation before LIVE is persisted." },
] as const;

export const RESEARCH_RECOVERY_INSTRUCTION = "The supervising agent must conduct research when evidence is missing, invalid, stale or insufficient. Retrieve attributable primary sources, repair the claim evidence and submit valid ResearchEvidenceV2 before advancing. Missing research is unfinished work, not a blocker or permission to skip the article.";

export const stageInstructions: Record<WorkflowStage, string> = {
  INGESTING: "Read AGENTS.md, planning.md and the pinned capabilities. Preserve source bytes and snapshot order; reconcile the earliest PROCESSING entry. Never execute from a secondary worktree.",
  RESEARCHING: `${RESEARCH_RECOVERY_INSTRUCTION} Follow the research recovery protocol in .agents/skills/external-article-import/SKILL.md. Check reusable validated intelligence first; use targeted acquisition for gaps. Retain primary source snapshots, retrieval times, scoped claims, exact excerpts, freshness, conflicts and limitations. Record currency, billing period, plan and restrictions for prices. Narrow or remove unsupported claims only after research; if the source has no defensible core, research a fresh article on the same viable topic. Never invent testing experience or evidence. After three failed repairs, diagnose the underlying assumption and then complete research before retrying.`,
  TRANSFORMING: "1. Prepare the intent brief and complete draft, then check the required format and commercial eligibility. For an approved affiliate direct review, follow .agents/skills/eleanor-editorial/references/long-form-affiliate.md, record its five-field buyer brief, aim for about 2,050 reader-visible words, and report the actual count plus an actionable remedy when outside 1,800-2,300. 2. Assess the full draft's claims, disclosure, SEO and AEO against genuine research evidence. Capture the full artifact, including protected metadata and disclosures, plus the research evidence and reference in the actual assessment exchange, and bind the judgment to those same identities; editable prose alone is insufficient. If claims or evidence fail, complete the required research recovery before retrying; formatting a receipt cannot repair unsupported facts. Required checks must pass; recommendations require adoption or justified non-adoption. Follow the mapped affiliate skill chain and commercial boundaries.",
  REFINING: "Complete .agents/skills/eleanor-editorial/SKILL.md: all prose, purpose/structure, meaning/evidence, wording/rhythm, an independent review in a distinct verified execution context, final fidelity review and 5/5 CLEAN. For an approved affiliate direct review, attach and follow .agents/skills/eleanor-editorial/references/long-form-affiliate.md in every existing pass and judgment; the independent review must cite the final visible passages and approved destination, and any later prose edit makes that review stale. The review tool, provider and model are routing choices, not evidence gates. Capture the complete before artifact for every rewrite and both complete before/after artifacts for fidelity judgments, including protected fields. Judgment output must repeat both artifact fingerprints. Retain adapter-exported executions and judgments in EditorialExecutionV1 alongside EditorialEvidenceV2. Reassess final SEO/AEO and claims after the rewrite.",
  VALIDATING: "Freeze approved prose. Before any other presentation work, complete the supervised built-in ChatGPT ImageGen handoff for the current artifact and generation. No paid or alternate provider is allowed. Retain the original PNG, the available generated-image path/output hint in ArticleHeroProviderOutputV1, ArticleHeroGenerationEvidenceV1, the deterministic WebP publication asset, and an immutable inspection copy. Bind ArticleHeroImagegenResultV1 to the handoff fingerprint. Inspect the exact WebP pixels under hero-imagegen.md; no people or body parts and VettedSaaSBlueprint brand fit must both pass. A rejection advances to a fresh generation-specific handoff while preserving the failed evidence. Capture RenderingInputsV1 only after the bound hero exists. Retain Design Read, Impeccable context, shape, critique, audit, detect, polish, applicable specialists and desktop/mobile/reduced-motion checks. Run visual-quality after those browser captures with the actual observations required by article-visual-quality.md, including bound geometry/type/media data, early and settled screenshots, purposeful normal-motion samples with real elapsed time and a changed property, and reduced-motion meaning. Apply the pinned Taste, Impeccable and MotionSites sources. Only detect is a pinned engine command: run detect --json --no-config once for every renderingInputs.detectorTargets path in this packet and retain all captures. Scanning a lockfile or unrelated file does not satisfy page coverage. Follow the bundled references for the other design reviews and retain scoped OpenCode judgments with their actual pinned instructions. Capture the full artifact, rendering manifest identity and scoped renderer source in the actual review input, and repeat the rendering identity in each judgment. Bind every execution to the same rendering manifest, artifact and routes; changed CSS, components, data, hero bytes or assets require new presentation evidence. Design judgments must use .agents/skills/external-article-import/references/design-judgment.md as the authoritative tracked instruction: it supersedes any historical ad hoc prompt that forced verdict pass; report verdict pass, fail, or insufficient-evidence; keep unresolved findings unresolved; report unsupported capabilities or missing runtime observations honestly; never force pass or delete findings. A source-only review, clean detector, Boolean claim or checklist does not prove runtime behavior. A negative or unresolved review is valid evidence but does not advance the import; only all-resolved pass permits advancement.",
  RELEASING: releaseSteps.map((step, index) => `${index + 1}. ${step.action}: ${step.outcome}`).join(" "),
  VERIFYING: verificationSteps.map((step, index) => `${index + 1}. ${step.action}: ${step.outcome}`).join(" "),
  LIVE: "Persist the immutable terminal bundle before intake completion. Valid quarantine is a separate predicate and is not publication. Missing work is not grounds to skip an entry.",
};

export function instructionsForStage(stage: string): string {
  if (!Object.hasOwn(stageInstructions, stage)) throw new Error("WORKFLOW_STAGE_UNSUPPORTED");
  return stageInstructions[stage as WorkflowStage];
}
