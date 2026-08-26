export const evidenceStatuses = [
  "independently_observed",
  "vendor_documented",
  "conflicting",
  "outdated",
  "not_found",
] as const;

export type EvidenceStatus = (typeof evidenceStatuses)[number];

export type EvidenceRecord = {
  claim: string;
  status: EvidenceStatus;
  source?: string;
  observedAt?: string;
};

export function supportsClaim(record: EvidenceRecord): boolean {
  return record.status === "independently_observed" || record.status === "vendor_documented";
}
