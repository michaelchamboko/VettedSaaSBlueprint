import { supportsClaim, type EvidenceRecord } from "./evidence";

export type QualityStatus = "pass" | "repair" | "blocked";

export type QualityFinding = {
  code: "missing_disclosure" | "missing_limitation" | "unsupported_claim";
  message: string;
  field?: string;
};

export type SupervisedContentQualityInput = {
  disclosurePresent: boolean;
  limitationPresent: boolean;
  claims: Array<{ text: string; evidence?: EvidenceRecord; risk: "low" | "high" }>;
};

export function evaluateSupervisedContentQuality(
  input: SupervisedContentQualityInput,
): { status: QualityStatus; findings: QualityFinding[] } {
  const findings: QualityFinding[] = [];
  if (!input.disclosurePresent) findings.push({ code: "missing_disclosure", message: "Affiliate disclosure is required." });
  if (!input.limitationPresent) findings.push({ code: "missing_limitation", message: "A limitation is required." });
  for (const claim of input.claims) {
    if (!claim.evidence || !supportsClaim(claim.evidence)) {
      findings.push({ code: "unsupported_claim", message: "Claim needs evidence or removal.", field: claim.text });
    }
  }
  const hasHighRiskGap = input.claims.some((claim) => claim.risk === "high" && (!claim.evidence || !supportsClaim(claim.evidence)));
  return { status: hasHighRiskGap ? "blocked" : findings.length > 0 ? "repair" : "pass", findings };
}
