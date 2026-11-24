import { importPresentationReceiptSchema, importPresentationValidationSchema, pageDesignValidationSchema, type ExternalArticleImportV1 } from "./contracts";
import { resolveContentApproval } from "./content-approval";
import { validateImportArtifact } from "./format-validation";
import { fingerprintEditorialArtifact } from "../editorial/refinement";
import { readImportVerifierEvidence } from "./verification-evidence";
import { evaluateWorkflowEvidence, validatePresentationEvidence } from "./workflow-evidence";

export async function createImportPresentation(root: string, record: ExternalArticleImportV1, input: { validationGate: string; validationReceipt: unknown }) {
  if (record.stage !== "VALIDATING") throw new Error("PRESENTATION_REQUIRES_VALIDATING_STAGE");
  const workflow = await evaluateWorkflowEvidence(record, { root, throughStage: "RELEASING" });
  if (!workflow.ok) throw new Error(workflow.diagnostics.join("; "));
  const approval = record.contentApproval;
  if (!approval) throw new Error("CONTENT_APPROVAL_INVALID");
  const resolved = await resolveContentApproval(root, approval, record.format, record.sourceFingerprint);
  if (!resolved.ok) throw new Error("CONTENT_APPROVAL_INVALID");
  const artifact = resolved.artifact;
  const renderedRoutes = validateImportArtifact(record.format, artifact);
  const validation = importPresentationValidationSchema.parse(input.validationReceipt);
  if (validation.format !== record.format || validation.artifactFingerprint !== approval.artifactFingerprint || JSON.stringify(validation.renderedRoutes) !== JSON.stringify(renderedRoutes)) throw new Error("PRESENTATION_VALIDATION_MISMATCH");
  const evidenceFiles = await Promise.all(validation.evidencePaths.map((file) => readImportVerifierEvidence(root, file, { ...validation, importId: record.importId, sourceFingerprint: record.sourceFingerprint })));
  return importPresentationReceiptSchema.parse({
    schemaVersion: "ImportPresentationReceiptV1", format: record.format, artifactFingerprint: approval.artifactFingerprint,
    artifactPath: approval.artifactPath, validationGate: input.validationGate,
    validationReceiptFingerprint: fingerprintEditorialArtifact(validation), validation, evidenceFiles,
    renderedRoutes, presentedAt: new Date().toISOString(),
  });
}

export async function verifyImportPresentationEvidence(root: string, record: ExternalArticleImportV1): Promise<void> {
  const workflow = await evaluateWorkflowEvidence(record, { root, throughStage: "RELEASING" });
  if (!workflow.ok) throw new Error(workflow.diagnostics.join("; "));
  requireImportPresentationBinding(record);
  const presentation = record.presentation!;
  const current = await Promise.all(presentation.validation.evidencePaths.map((file) => readImportVerifierEvidence(root, file, { ...presentation.validation, importId: record.importId, sourceFingerprint: record.sourceFingerprint })));
  if (JSON.stringify(current) !== JSON.stringify(presentation.evidenceFiles)) throw new Error("PRESENTATION_EVIDENCE_CHANGED");
}

export async function presentationInputFromVerifier(root: string, record: ExternalArticleImportV1, evidencePath: string, pageDesignReceipt: unknown) {
  const approval = record.contentApproval;
  if (!approval) throw new Error("CONTENT_APPROVAL_INVALID");
  if (!record.evidenceRefs?.presentation) throw new Error("WORKFLOW_EVIDENCE_REQUIRED:presentation");
  await validatePresentationEvidence(root, record.evidenceRefs.presentation, { ...record, artifactPath: approval.artifactPath });
  const resolved = await resolveContentApproval(root, approval, record.format, record.sourceFingerprint);
  if (!resolved.ok) throw new Error("CONTENT_APPROVAL_INVALID");
  const artifact = resolved.artifact;
  const renderedRoutes = validateImportArtifact(record.format, artifact);
  await readImportVerifierEvidence(root, evidencePath, { format: record.format, artifactFingerprint: approval.artifactFingerprint, renderedRoutes, importId: record.importId, sourceFingerprint: record.sourceFingerprint });
  return { validationGate: `${record.format}:candidate-owner-verifier`, validationReceipt: {
    schemaVersion: "ImportPresentationValidationV1", format: record.format, artifactFingerprint: approval.artifactFingerprint, renderedRoutes,
    checks: { desktop: true, mobile: true, accessibility: true, technicalSeo: true, overflow: true, runtimeErrors: true },
    pageDesign: pageDesignValidationSchema.parse(pageDesignReceipt),
    evidencePaths: [evidencePath], notes: "The format owner verifier passed against the local rendered candidate; this is not production verification.",
  } };
}

export function requireImportPresentationBinding(record: ExternalArticleImportV1): void {
  const presentation = importPresentationReceiptSchema.parse(record.presentation);
  const approval = record.contentApproval;
  if (!approval || presentation.format !== record.format || presentation.format !== approval.format || presentation.artifactPath !== approval.artifactPath || presentation.artifactFingerprint !== approval.artifactFingerprint) throw new Error("PRESENTATION_CONTENT_MISMATCH");
  if (presentation.validationReceiptFingerprint !== fingerprintEditorialArtifact(presentation.validation) || presentation.validation.format !== presentation.format || presentation.validation.artifactFingerprint !== presentation.artifactFingerprint || JSON.stringify(presentation.validation.renderedRoutes) !== JSON.stringify(presentation.renderedRoutes)) throw new Error("PRESENTATION_VALIDATION_MISMATCH");
  if (record.release) {
    const route = new URL(record.release.canonicalUrl).pathname;
    if (record.release.presentationFingerprint !== fingerprintEditorialArtifact(presentation) || !presentation.renderedRoutes.includes(route)) throw new Error("PRESENTATION_RELEASE_MISMATCH");
  }
}
