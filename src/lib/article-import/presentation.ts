import { readFile } from "node:fs/promises";
import path from "node:path";
import { importPresentationReceiptSchema, importPresentationValidationSchema, pageDesignValidationSchema, type ExternalArticleImportV1 } from "./contracts";
import { contentApprovalMatches } from "./content-approval";
import { validateImportArtifact } from "./format-validation";
import { fingerprintEditorialArtifact } from "../editorial/refinement";
import { readImportVerifierEvidence } from "./verification-evidence";

export async function createImportPresentation(root: string, record: ExternalArticleImportV1, input: { validationGate: string; validationReceipt: unknown }) {
  if (record.stage !== "VALIDATING") throw new Error("PRESENTATION_REQUIRES_VALIDATING_STAGE");
  const approval = record.contentApproval;
  if (!approval || !await contentApprovalMatches(root, approval, record.format, record.sourceFingerprint)) throw new Error("CONTENT_APPROVAL_INVALID");
  const artifact = JSON.parse(await readFile(path.resolve(root, approval.artifactPath), "utf8"));
  const renderedRoutes = validateImportArtifact(record.format, artifact);
  const validation = importPresentationValidationSchema.parse(input.validationReceipt);
  if (validation.format !== record.format || validation.artifactFingerprint !== approval.artifactFingerprint || JSON.stringify(validation.renderedRoutes) !== JSON.stringify(renderedRoutes)) throw new Error("PRESENTATION_VALIDATION_MISMATCH");
  const evidenceFiles = await Promise.all(validation.evidencePaths.map((file) => readImportVerifierEvidence(root, file, validation)));
  return importPresentationReceiptSchema.parse({
    schemaVersion: "ImportPresentationReceiptV1", format: record.format, artifactFingerprint: approval.artifactFingerprint,
    artifactPath: approval.artifactPath, validationGate: input.validationGate,
    validationReceiptFingerprint: fingerprintEditorialArtifact(validation), validation, evidenceFiles,
    renderedRoutes, presentedAt: new Date().toISOString(),
  });
}

export async function verifyImportPresentationEvidence(root: string, record: ExternalArticleImportV1): Promise<void> {
  requireImportPresentationBinding(record);
  const presentation = record.presentation!;
  const current = await Promise.all(presentation.validation.evidencePaths.map((file) => readImportVerifierEvidence(root, file, presentation)));
  if (JSON.stringify(current) !== JSON.stringify(presentation.evidenceFiles)) throw new Error("PRESENTATION_EVIDENCE_CHANGED");
}

export async function presentationInputFromVerifier(root: string, record: ExternalArticleImportV1, evidencePath: string, pageDesignReceipt: unknown) {
  const approval = record.contentApproval;
  if (!approval) throw new Error("CONTENT_APPROVAL_INVALID");
  const artifact = JSON.parse(await readFile(path.resolve(root, approval.artifactPath), "utf8"));
  const renderedRoutes = validateImportArtifact(record.format, artifact);
  await readImportVerifierEvidence(root, evidencePath, { format: record.format, artifactFingerprint: approval.artifactFingerprint, renderedRoutes });
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
