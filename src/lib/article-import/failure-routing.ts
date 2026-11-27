import type { ImportFailureCategory } from "./contracts";

export class ImportFailure extends Error {
  constructor(readonly failureCategory: ImportFailureCategory, message: string) {
    super(message);
    this.name = "ImportFailure";
  }
}

export function classifyImportFailure(error: unknown): ImportFailureCategory | undefined {
  if (error instanceof ImportFailure) return error.failureCategory;
  const message = error instanceof Error ? error.message : String(error);
  const code = message.split(":", 1)[0].trim();
  if (["DEPLOYMENT_OUTCOME_UNCERTAIN", "UNCERTAIN_EXTERNAL_OUTCOME"].includes(code)) return "uncertain-external-outcome";
  if (["CAPABILITY_UNAVAILABLE", "MODEL_ACCESS", "EDITORIAL_TOOL", "SOURCE_IDENTITY_CONFLICT", "LEASE_OWNER_CHANGED", "STATE_INTEGRITY", "PRESENTATION_CANDIDATE_UNAVAILABLE"].includes(code)) return "unavailable-capability";
  if (["WORKFLOW_EVIDENCE_INVALID", "EVIDENCE_INVALID", "EVIDENCE_BINDING", "EVIDENCE_INTEGRITY", "PRESENTATION_RULE_FAILED"].includes(code)) return "invalid-evidence";
  if (["PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS", "ASSESSMENT_RULE_FAILED", "CONTENT_REJECTION"].includes(code)) return "content-rejection";
  return undefined;
}
