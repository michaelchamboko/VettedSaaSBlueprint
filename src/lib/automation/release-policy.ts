import type { EvidenceUpdateV1, PageSetChangeV1 } from "@/lib/automation/contracts";

const AUTOMATIC_CONTENT_PREFIX = "src/content/decision-journeys/";
const PUBLISHABLE_EVIDENCE_OUTCOMES = new Set(["changed", "partial", "conflicting"]);

export function assessAutomaticRelease(input: {
  changedFiles: readonly string[];
  evidence: EvidenceUpdateV1;
  change: PageSetChangeV1;
  killSwitchEnabled: boolean;
}): { eligible: boolean; reasons: readonly string[] } {
  const reasons: string[] = [];
  if (input.killSwitchEnabled) reasons.push("AUTOMATION_KILL_SWITCH_ENABLED");
  if (!PUBLISHABLE_EVIDENCE_OUTCOMES.has(input.evidence.outcome)) {
    reasons.push(`EVIDENCE_${input.evidence.outcome.toUpperCase()}`);
  }
  if (!input.change.contentOnly || input.change.requiresReview) reasons.push("CHANGE_REQUIRES_REVIEW");
  if (input.changedFiles.length === 0 || input.changedFiles.some((file) => !file.startsWith(AUTOMATIC_CONTENT_PREFIX) || !file.endsWith(".json"))) {
    reasons.push("OUTSIDE_STRUCTURED_CONTENT_ALLOWLIST");
  }
  return { eligible: reasons.length === 0, reasons };
}
