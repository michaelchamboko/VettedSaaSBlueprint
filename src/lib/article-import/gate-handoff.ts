import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  importGateHandoffSchema,
  type ExternalArticleImportV1,
  type ImportGateHandoff,
  type ImportStage,
} from "./contracts";
import {
  evidenceReference,
  verifyEvidenceRef,
  type EvidenceRef,
} from "./execution-evidence";

type NamedReference = { name: string; reference: EvidenceRef; reason: string };

function unique(items: NamedReference[]): NamedReference[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}:${item.reference.path}:${item.reference.sha256}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function optionalPath(root: string, name: string, file: string | undefined, reason: string): Promise<NamedReference | undefined> {
  return file ? { name, reference: await evidenceReference(root, file), reason } : undefined;
}

function optionalRef(name: string, reference: EvidenceRef | undefined, reason: string): NamedReference | undefined {
  return reference ? { name, reference, reason } : undefined;
}

async function availableReferences(root: string, record: ExternalArticleImportV1): Promise<Record<string, NamedReference | undefined>> {
  return {
    source: optionalRef("captured-source", record.sourceRef, "Immutable captured source and intake identity."),
    research: optionalRef("accepted-research", record.evidenceRefs?.research, "Validated research and registered provenance."),
    artifact: await optionalPath(root, "candidate-artifact", record.artifactPath, "Current candidate artifact bytes."),
    approvedArtifact: await optionalPath(root, "approved-artifact", record.contentApproval?.artifactPath, "Exact content-approved artifact bytes."),
    transformAssessment: optionalRef("transform-assessment", record.evidenceRefs?.transformAssessment, "Accepted transform assessment and buyer brief."),
    assessment: optionalRef("content-assessment", record.evidenceRefs?.assessment, "Accepted content assessment."),
    editorial: optionalRef("editorial-execution", record.evidenceRefs?.editorial, "Retained editorial execution and independent judgment."),
    hero: optionalRef("hero-evidence", record.evidenceRefs?.hero, "Bound image generation and inspection evidence."),
    presentation: optionalRef("presentation-evidence", record.evidenceRefs?.presentation, "Accepted browser and presentation observations."),
    production: optionalRef("production-evidence", record.evidenceRefs?.production, "Retained production verifier evidence."),
    terminal: optionalRef("terminal-evidence", record.terminalRef, "Immutable publication terminal proof."),
    improveRun: optionalRef("improve-run", record.improve?.runRef, "Immutable post-publication improvement input."),
  };
}

function present(values: Array<NamedReference | undefined>): NamedReference[] {
  return unique(values.filter((value): value is NamedReference => Boolean(value)));
}

function acceptedFor(gate: ImportStage, refs: Record<string, NamedReference | undefined>): NamedReference[] {
  const byGate: Partial<Record<ImportStage, Array<NamedReference | undefined>>> = {
    INGESTING: [refs.source],
    RESEARCHING: [refs.research],
    TRANSFORMING: [refs.artifact, refs.transformAssessment, refs.assessment],
    REFINING: [refs.approvedArtifact, refs.assessment, refs.editorial],
    VALIDATING: [refs.approvedArtifact, refs.hero, refs.presentation],
    RELEASING: [refs.production],
    VERIFYING: [refs.terminal, refs.improveRun],
  };
  return present(byGate[gate] ?? []);
}

function requiredFor(nextStage: ImportStage, refs: Record<string, NamedReference | undefined>): NamedReference[] {
  const byStage: Partial<Record<ImportStage, Array<NamedReference | undefined>>> = {
    RESEARCHING: [refs.source],
    TRANSFORMING: [refs.source, refs.research],
    REFINING: [refs.source, refs.research, refs.artifact, refs.transformAssessment ?? refs.assessment],
    VALIDATING: [refs.source, refs.research, refs.approvedArtifact, refs.assessment, refs.editorial],
    RELEASING: [refs.source, refs.approvedArtifact, refs.assessment, refs.editorial, refs.hero, refs.presentation],
    VERIFYING: [refs.source, refs.approvedArtifact, refs.presentation, refs.production],
    LIVE: [refs.terminal, refs.improveRun],
  };
  return present(byStage[nextStage] ?? []);
}

async function unclassifiedMaterial(root: string, record: ExternalArticleImportV1, declared: NamedReference[]) {
  const directory = path.join(root, ".automation/article-imports/work", record.importId);
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const known = new Set(declared.map((item) => item.reference.path.replaceAll("\\", "/")));
  const material = [];
  for (const entry of entries.filter((item) => item.isFile()).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = entry.name;
    const relative = path.join(".automation/article-imports/work", record.importId, name).replaceAll("\\", "/");
    if (known.has(relative)) continue;
    material.push({ reference: await evidenceReference(root, relative), reason: "No accepted-output, required-input, retention, or disposal rule classifies this material." });
  }
  return material;
}

export async function declareGateHandoff(
  root: string,
  record: ExternalArticleImportV1,
  passedGate: ImportStage,
  nextStage: ImportStage,
): Promise<ImportGateHandoff> {
  const refs = await availableReferences(root, record);
  const acceptedOutputs = acceptedFor(passedGate, refs);
  const requiredNextInputs = requiredFor(nextStage, refs);
  if (!requiredNextInputs.length) throw new Error(`GATE_HANDOFF_INPUTS_MISSING:${passedGate}:${nextStage}`);
  for (const input of requiredNextInputs) await verifyEvidenceRef(root, input.reference);
  const retainedEvidence = present([
    refs.source, refs.research, refs.transformAssessment, refs.assessment, refs.editorial,
    refs.hero, refs.presentation, refs.production, refs.terminal, refs.improveRun,
    ...(record.activityReceipts ?? []).map((receipt) => ({ name: `activity:${receipt.stage}:${receipt.activityId}:${receipt.executionId}`, reference: receipt.resultRef, reason: "Attributable activity outcome remains inspectable." })),
  ]);
  const declared = unique([...acceptedOutputs, ...requiredNextInputs, ...retainedEvidence]);
  return importGateHandoffSchema.parse({
    schemaVersion: "ImportGateHandoffV1",
    passedGate,
    nextStage,
    acceptedOutputs,
    requiredNextInputs,
    retainedEvidence,
    disposalCandidates: [],
    unclassifiedMaterial: await unclassifiedMaterial(root, record, declared),
    constraints: {
      sourceFingerprint: record.sourceFingerprint,
      requirementRevision: record.requirementRevision ?? "historical",
      format: record.format,
      commercialMode: record.transformation?.commercialMode ?? "none",
      ...(record.transformation?.resolvedAffiliateUrl ? { approvedAffiliateUrl: record.transformation.resolvedAffiliateUrl } : {}),
    },
    cleanup: { status: "not-required" },
    declaredAt: new Date().toISOString(),
  });
}

export async function verifyGateHandoffForDispatch(root: string, record: ExternalArticleImportV1) {
  if (!record.gateHandoffs?.length) return undefined;
  const handoff = [...record.gateHandoffs].reverse().find((item) => item.nextStage === record.stage);
  if (!handoff) return { status: "held" as const, reason: `No gate handoff targets ${record.stage}.` };
  if (handoff.cleanup.status === "pending") return { status: "held" as const, reason: `Cleanup ${handoff.cleanup.operationId ?? "operation"} is pending.` };
  const verifiedInputs: NamedReference[] = [];
  for (const input of handoff.requiredNextInputs) {
    try { await verifyEvidenceRef(root, input.reference); verifiedInputs.push(input); }
    catch { return { status: "held" as const, reason: `Required handoff input ${input.name} is unreadable.`, handoff }; }
  }
  return { status: "verified" as const, handoff, verifiedInputs };
}
