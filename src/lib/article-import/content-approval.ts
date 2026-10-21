import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { EDITORIAL_REVISION, canReuseEditorialEvidence, fingerprintEditorialArtifact, type createEditorialEvidence } from "../editorial/refinement";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const contentApprovalSchema = z.object({
  schemaVersion: z.literal("ImportContentApprovalV1"),
  artifactPath: z.string().min(1),
  format: z.enum(["direct-review", "blog", "visibility", "decision-set"]),
  schemaRevision: z.string().min(1),
  artifactFingerprint: hash,
  sourceFingerprint: hash,
  editorialRevision: z.literal(EDITORIAL_REVISION),
  editorialEvidencePath: z.string().min(1),
  editorialEvidenceFingerprint: hash,
  formatQualityPath: z.string().min(1),
  formatQualityFingerprint: hash,
  approvedAt: z.string().datetime({ offset: true }),
}).strict();
export type ContentApproval = z.infer<typeof contentApprovalSchema>;
export type ApprovalFiles = { artifactPath: string; editorialEvidencePath: string; formatQualityPath: string };

const formats = { "direct-review": "landing", blog: "blog", visibility: "visibility", "decision-set": "decision" } as const;
const revisions = { "direct-review": "PageBlueprintV1", blog: "BlogPostV1", visibility: "VisibilityPageV1", "decision-set": "DecisionSetV2" } as const;
const qualityGates = { "direct-review": "landing:quality:candidate", blog: "validate:public-site", visibility: "validate:public-site", "decision-set": "validate:public-site" } as const;

async function readCanonicalJson(root: string, file: string) {
  const canonicalRoot = await realpath(root);
  const absolute = await realpath(path.resolve(root, file));
  const relative = path.relative(canonicalRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Approval files must be inside the repository.");
  return { path: relative.replaceAll("\\", "/"), value: JSON.parse(await readFile(absolute, "utf8")) };
}

export async function createContentApproval(root: string, input: ApprovalFiles & { format: string; sourceFingerprint: string }): Promise<ContentApproval> {
  if (!Object.hasOwn(formats, input.format)) throw new Error("A supported content format is required.");
  const format = input.format as ContentApproval["format"];
  const [artifact, editorial, quality] = await Promise.all([
    readCanonicalJson(root, input.artifactPath), readCanonicalJson(root, input.editorialEvidencePath), readCanonicalJson(root, input.formatQualityPath),
  ]);
  const evidence = editorial.value as ReturnType<typeof createEditorialEvidence>;
  if (evidence.schemaVersion !== "EditorialEvidenceV1" || evidence.meaningPreserved !== true || evidence.arrayOrderPreserved !== true ||
    !evidence.semanticNotes?.trim() || !evidence.checker?.before?.trim() || !evidence.checker?.after?.trim() ||
    !canReuseEditorialEvidence(evidence, formats[format], artifact.value)) throw new Error("Editorial evidence does not approve the current artifact.");
  const artifactFingerprint = fingerprintEditorialArtifact(artifact.value);
  z.object({ format: z.literal(format), artifactFingerprint: z.literal(artifactFingerprint), passed: z.literal(true), gate: z.literal(qualityGates[format]) }).passthrough().parse(quality.value);
  return contentApprovalSchema.parse({
    schemaVersion: "ImportContentApprovalV1", artifactPath: artifact.path, format, schemaRevision: revisions[format],
    artifactFingerprint, sourceFingerprint: input.sourceFingerprint, editorialRevision: EDITORIAL_REVISION,
    editorialEvidencePath: editorial.path, editorialEvidenceFingerprint: fingerprintEditorialArtifact(editorial.value),
    formatQualityPath: quality.path, formatQualityFingerprint: fingerprintEditorialArtifact(quality.value), approvedAt: new Date().toISOString(),
  });
}

export async function contentApprovalMatches(root: string, approval: unknown, format: string, sourceFingerprint: string, artifactPath?: string): Promise<boolean> {
  const parsed = contentApprovalSchema.safeParse(approval);
  if (!parsed.success || parsed.data.format !== format || parsed.data.sourceFingerprint !== sourceFingerprint) return false;
  try {
    const expected = parsed.data;
    const current = await createContentApproval(root, { ...expected, artifactPath: artifactPath ?? expected.artifactPath });
    return Object.entries(expected).every(([key, value]) => key === "approvedAt" || current[key as keyof ContentApproval] === value);
  } catch { return false; }
}
