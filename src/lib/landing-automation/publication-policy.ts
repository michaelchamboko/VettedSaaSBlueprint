export type GateStatus = "pass" | "fail" | "unknown";

export type UnattendedPublicationInput = {
  allowlisted: boolean;
  artifact: {
    hasPlaceholderIds: boolean;
    hasResolvedEvidence: boolean;
    hasReviewedCtaMapping: boolean;
  };
  compliance: { status: GateStatus };
  evidence: { status: GateStatus };
  limits: {
    dailyPublicationCount: number;
    dailyPublicationLimit: number;
  };
  runtime: { killSwitchEnabled: boolean };
};

export type UnattendedPublicationDecision = {
  publishable: boolean;
  reasons: string[];
};

/**
 * This is intentionally pure: callers must supply audited state rather than
 * trusting fields inside generated page JSON.
 */
export function evaluateUnattendedPublication(
  input: UnattendedPublicationInput,
): UnattendedPublicationDecision {
  const reasons: string[] = [];

  if (input.runtime.killSwitchEnabled) reasons.push("AUTOMATION_KILL_SWITCH_ENABLED");
  if (!input.allowlisted) reasons.push("URL_NOT_ALLOWLISTED");
  if (input.compliance.status !== "pass") reasons.push("COMPLIANCE_NOT_PASS");
  if (input.evidence.status !== "pass") reasons.push("EVIDENCE_NOT_PASS");
  if (input.artifact.hasPlaceholderIds) reasons.push("ARTIFACT_PLACEHOLDER_IDS");
  if (!input.artifact.hasResolvedEvidence) reasons.push("ARTIFACT_EVIDENCE_UNRESOLVED");
  if (!input.artifact.hasReviewedCtaMapping) reasons.push("ARTIFACT_CTA_MAPPING_UNREVIEWED");
  if (input.limits.dailyPublicationCount >= input.limits.dailyPublicationLimit) {
    reasons.push("DAILY_PUBLICATION_CAP_REACHED");
  }

  return { publishable: reasons.length === 0, reasons };
}
