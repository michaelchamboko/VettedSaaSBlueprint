import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ExternalArticleImportV1 } from "./contracts";
import { evidenceReference, type EvidenceRef } from "./execution-evidence";
import { importArtifactTarget } from "./format-validation";
import {
  browserReviewRevision,
  editorialReviewRevision,
  evaluateRegisteredReviewEvidence,
  reviewEvidenceRegistrationSchema,
  reviewRegistrationId,
  uniqueEvidenceRefs,
  type ArticleReviewEvidenceRegistry,
  type ReviewEvidenceClass,
  type ReviewEvidenceRegistration,
} from "./review-evidence-registry";
import { readProductionVerifierEvidence } from "./verification-evidence";

export type PublicationPath = "catalogue" | "import";

export type PublicationApprovalStatus = {
  registrationId: string;
  examinedRevision: string;
  approvalIdentity: string;
  evidenceRef: EvidenceRef;
};

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function acceptedRegistration(
  root: string,
  registry: ArticleReviewEvidenceRegistry,
  record: ExternalArticleImportV1,
  evidenceClass: Extract<ReviewEvidenceClass, "editorial-judgment" | "browser-observation">,
  examinedRevision: string,
  now: string,
): Promise<ReviewEvidenceRegistration> {
  const registrations = await registry.list({ importId: record.importId, evidenceClass });
  for (const registration of registrations) {
    if (registration.examinedRevision !== examinedRevision) continue;
    const dimensions = await evaluateRegisteredReviewEvidence(registration, {
      root,
      importId: record.importId,
      sourceFingerprint: record.sourceFingerprint,
      examinedRevision,
      now,
    });
    if (dimensions.reusable) return registration;
  }
  throw new Error(`PUBLICATION_${evidenceClass === "editorial-judgment" ? "CONTENT" : "PRESENTATION"}_APPROVAL_MISSING_OR_STALE`);
}

export async function registerPublicationApproval(
  root: string,
  registry: ArticleReviewEvidenceRegistry,
  record: ExternalArticleImportV1,
  publicationPath: PublicationPath,
  now = new Date().toISOString(),
): Promise<PublicationApprovalStatus> {
  if (!record.contentApproval || !record.release || !record.evidenceRefs?.production) throw new Error("PUBLICATION_PRODUCTION_OBSERVATION_REQUIRED");
  const editorialRevision = await editorialReviewRevision(root, record);
  const browserRevision = browserReviewRevision(record);
  const editorial = await acceptedRegistration(root, registry, record, "editorial-judgment", editorialRevision, now);
  const browser = await acceptedRegistration(root, registry, record, "browser-observation", browserRevision, now);
  const artifact = JSON.parse(await readFile(path.resolve(root, record.contentApproval.artifactPath), "utf8"));
  const target = importArtifactTarget(record.format, artifact);
  if (target.artifactFingerprint !== record.contentApproval.artifactFingerprint) throw new Error("PUBLICATION_APPROVED_ARTIFACT_MISMATCH");
  const production = await readProductionVerifierEvidence(root, record.evidenceRefs.production, {
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    target,
    deployment: record.release,
  });
  const merge = record.pendingRelease?.operations?.merge;
  const deployment = record.pendingRelease?.operations?.deployment;
  if (!merge || merge.mergeCommitSha !== record.release.commitSha ||
      (deployment && (deployment.commitSha !== record.release.commitSha || deployment.deploymentId !== record.release.deploymentId || deployment.url !== record.release.canonicalUrl))) {
    throw new Error("PUBLICATION_INTENDED_COMMIT_MISMATCH");
  }
  let authorityDependencies: EvidenceRef[] = [];
  if (publicationPath === "catalogue") {
    const { assertPublicationAuthorityBinding } = await import("./release");
    const authority = await assertPublicationAuthorityBinding(root, record.format, record.contentApproval.artifactPath, {
      reviewedCommitSha: record.pendingRelease?.reviewedCommitSha,
    });
    authorityDependencies = authority?.retentionDependencies ?? [];
  }
  const artifactRef = await evidenceReference(root, record.contentApproval.artifactPath);
  const approvalIdentity = sha256({
    publicationPath,
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    artifactFingerprint: target.artifactFingerprint,
    editorialRegistrationId: editorial.registrationId,
    browserRegistrationId: browser.registrationId,
    intendedCommitSha: merge.mergeCommitSha,
    deployment: production.deployment,
    productionRef: record.evidenceRefs.production,
    authorityDependencies,
  });
  const registration = reviewEvidenceRegistrationSchema.parse({
    schemaVersion: "ArticleReviewEvidenceRegistrationV1",
    registrationId: reviewRegistrationId({ publicationPath, approvalIdentity, evidenceRef: record.evidenceRefs.production }),
    evidenceClass: "production-proof",
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    examinedRevision: sha256({ publicationPath, editorialRevision, browserRevision, approvalIdentity }),
    reviewer: { id: `production:${record.evidenceRefs.production.sha256}`, independent: true },
    criteria: [
      { id: `publication:${publicationPath}:served-approved-revision`, revision: record.requirementRevision ?? "unknown" },
      { id: `publication:${publicationPath}:deployment-terminal-agreement`, revision: record.requirementRevision ?? "unknown" },
    ],
    evidenceRef: record.evidenceRefs.production,
    retentionDependencies: uniqueEvidenceRefs([
      record.evidenceRefs.production,
      artifactRef,
      editorial.evidenceRef,
      browser.evidenceRef,
      ...authorityDependencies,
      ...editorial.retentionDependencies,
      ...browser.retentionDependencies,
    ]),
    support: "accepted",
    registeredAt: now,
    payload: {
      kind: "production-proof",
      publicationPath,
      artifactFingerprint: target.artifactFingerprint,
      intendedCommitSha: merge.mergeCommitSha,
      deployment: production.deployment,
      editorialRegistrationId: editorial.registrationId,
      browserRegistrationId: browser.registrationId,
      approvalIdentity,
    },
  });
  const committed = await registry.commit(registration);
  return {
    registrationId: committed.registrationId,
    examinedRevision: registration.examinedRevision,
    approvalIdentity,
    evidenceRef: registration.evidenceRef,
  };
}
