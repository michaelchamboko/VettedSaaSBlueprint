import type { ExternalArticleImportV1 } from "./contracts";
import { researchRecoveryGeneration } from "./packet-binding";

function recordProjection(record: ExternalArticleImportV1): Record<string, unknown> {
  const fields: Array<keyof ExternalArticleImportV1> = [
    "schemaVersion", "workflowVersion", "requirementRevision", "importId", "sourceFingerprint", "sourceRef",
    "sourceFile", "title", "primaryQuestion", "promptInjectionDetected", "unusableReason", "transformation",
    "format", "artifactPath", "evidenceRefs", "contentApproval", "heroImage", "presentation", "reviewEvidence",
    "stage", "resumeStage", "nextAction",
  ];
  return Object.fromEntries(fields.flatMap((field) => record[field] === undefined ? [] : [[field, record[field]]]));
}

export function projectWorkerPacket(packet: Record<string, unknown>, record: ExternalArticleImportV1): Record<string, unknown> {
  const activity = packet.activity && typeof packet.activity === "object" && !Array.isArray(packet.activity)
    ? packet.activity as Record<string, unknown> : undefined;
  const activeFindings = Array.isArray(activity?.openFindings) ? activity.openFindings : (record.activityFindings ?? [])
    .filter((finding) => finding.stage === packet.stage && finding.status !== "resolved");
  const handoff = packet.gateHandoff && typeof packet.gateHandoff === "object" && !Array.isArray(packet.gateHandoff)
    ? packet.gateHandoff as Record<string, unknown> : undefined;
  return {
    ...packet,
    record: recordProjection(record),
    ...(handoff && { gateHandoff: {
      schemaVersion: handoff.schemaVersion,
      passedGate: handoff.passedGate,
      nextStage: handoff.nextStage,
      requiredNextInputs: handoff.requiredNextInputs,
      constraints: handoff.constraints,
    } }),
    activeFindings,
    researchGeneration: researchRecoveryGeneration(record),
    acceptedActivityOutputs: Array.isArray(packet.acceptedActivityOutputs) ? packet.acceptedActivityOutputs : [],
  };
}
