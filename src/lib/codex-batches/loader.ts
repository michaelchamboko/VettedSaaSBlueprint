import { createHash } from "node:crypto";
import type { Dirent, Stats } from "node:fs";
import {
  lstat as nodeLstat,
  readFile as nodeReadFile,
  readdir as nodeReaddir,
  realpath as nodeRealpath,
} from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";

import {
  codexBatchRetroSchema,
  codexBatchTimingSchema,
  codexBatchQualityReceiptSchema,
  codexComplianceReviewSchema,
  codexComplianceReviewV2Schema,
  codexConversionReviewSchema,
  codexConversionReviewV2Schema,
  codexEditorialDraftSchema,
  codexIntentBriefSchema,
  codexLandingBatchV1Schema,
  codexLandingBatchV2Schema,
  codexUniquenessReviewSchema,
  codexUniquenessReviewV2Schema,
  codexUuidSchema,
  productEvidencePackV1Schema,
  safeBatchRelativePathSchema,
  visualDesignReviewV1Schema,
  type CodexLandingBatchManifest,
  type CodexLandingBatchV1,
  type CodexLandingBatchV2,
  type CodexBatchPage,
  type CodexBatchPageV2,
  type CodexBatchQualityReceiptV1,
  type ProductEvidencePackV1,
} from "./contracts";
import type { PageBlueprint } from "@/lib/schemas/contracts";
import { DesignReferenceCatalogueV1 } from "@/lib/design-references/contracts";
import { validateDesignReferenceCatalogueDirectory } from "@/lib/design-references/catalogue-directory";
import { collectPageBlueprintReferences } from "./page-blueprint-references";

export type CodexBatchFileSystem = {
  readFile(filePath: string): Promise<Buffer>;
  realpath(filePath: string): Promise<string>;
  readdir(directory: string): Promise<Dirent[]>;
  lstat(filePath: string): Promise<Stats>;
};

export type LoadedCodexBatchArtifact = {
  path: string;
  byte_length: number;
  byte_sha256: string;
  canonical_json_sha256: string;
  json: unknown;
};

export type LoadedCodexBatchPage = {
  manifestPage: CodexLandingBatchManifest["pages"][number];
  intent: z.infer<typeof codexIntentBriefSchema>;
  blueprint: PageBlueprint;
  draftJson: unknown;
  uniqueness: z.infer<typeof codexUniquenessReviewSchema> | z.infer<typeof codexUniquenessReviewV2Schema>;
  compliance: z.infer<typeof codexComplianceReviewSchema> | z.infer<typeof codexComplianceReviewV2Schema>;
  conversion: z.infer<typeof codexConversionReviewSchema> | z.infer<typeof codexConversionReviewV2Schema>;
  visual?: z.infer<typeof visualDesignReviewV1Schema>;
};

export type LoadedCodexLandingBatch = {
  batchDirectory: string;
  manifest: CodexLandingBatchManifest;
  productPack: ProductEvidencePackV1;
  pages: LoadedCodexBatchPage[];
  quality: CodexBatchQualityReceiptV1;
  retro: z.infer<typeof codexBatchRetroSchema>;
  timing: z.infer<typeof codexBatchTimingSchema>;
  artifacts: LoadedCodexBatchArtifact[];
};

export type LoadCodexLandingBatchOptions = {
  batchId: string;
  batchRoot?: string;
  expectedGitCommitSha?: string;
  environment?: Readonly<Record<string, string | undefined>>;
  fileSystem?: CodexBatchFileSystem;
  catalogueDirectory?: string;
};

const defaultFileSystem: CodexBatchFileSystem = {
  // Root injection and realpath containment make runtime paths intentionally opaque.
  // next.config's narrow outputFileTracingIncludes is the deployment trace source.
  readFile: (filePath) => nodeReadFile(/*turbopackIgnore: true*/ filePath),
  realpath: (filePath) => nodeRealpath(/*turbopackIgnore: true*/ filePath),
  readdir: (directory) => nodeReaddir(/*turbopackIgnore: true*/ directory, { withFileTypes: true }),
  lstat: (filePath) => nodeLstat(/*turbopackIgnore: true*/ filePath),
};

const defaultGeneratedBatchRoot = path.join(process.cwd(), "src", "generated", "landing-page-batches");

const forbiddenGeneratedStateKeys = new Set([
  "owner_approved",
  "owner_approval",
  "owner_approval_status",
  "owner_reviewed",
  "owner_review_status",
  "approved_by_owner",
  "published",
  "is_published",
  "publication_status",
  "publish_status",
  "active_link",
  "active_link_state",
  "affiliate_link_active",
  "compliance_approved",
  "compliance_passed",
  "asset_approved",
  "asset_approval",
]);

function normalizeStateKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

export function assertNoGeneratedCanonicalState(value: unknown, artifactPath = "artifact", jsonPath = "$" ): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoGeneratedCanonicalState(item, artifactPath, `${jsonPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = normalizeStateKey(key);
    if (forbiddenGeneratedStateKeys.has(normalizedKey)) {
      throw new Error(`${artifactPath} contains forbidden generated state '${key}' at ${jsonPath}; generated artifacts cannot self-attest owner approval, publication, active-link, compliance, or asset approval state.`);
    }
    if (normalizedKey === "approval_status" && typeof child === "string" && child.toLowerCase() === "approved") {
      throw new Error(`${artifactPath} self-attests approval at ${jsonPath}.${key}; approval must come from audited records.`);
    }
    assertNoGeneratedCanonicalState(child, artifactPath, `${jsonPath}.${key}`);
  }
}

export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("Canonical JSON cannot encode undefined or non-JSON values.");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJsonStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJsonStringify(child)}`);
  return `{${entries.join(",")}}`;
}

export function sha256Hex(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseJsonBytes(bytes: Buffer, artifactPath: string): unknown {
  const withoutBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
    ? bytes.subarray(3)
    : bytes;
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(withoutBom);
  } catch (error) {
    throw new Error(`${artifactPath} is not valid UTF-8 JSON.`, { cause: error });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${artifactPath} contains malformed JSON.`, { cause: error });
  }
}

function formatSchemaError(error: unknown) {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: Array<{ path?: PropertyKey[]; message?: string }> }).issues ?? [];
    return issues.map((issue) => `${issue.path?.join(".") || "$"}: ${issue.message ?? "invalid value"}`).join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}

function parseWithSchema<T>(schema: { parse(input: unknown): T }, value: unknown, artifactPath: string): T {
  try {
    return schema.parse(value);
  } catch (error) {
    throw new Error(`${artifactPath} failed contract validation: ${formatSchemaError(error)}`, { cause: error });
  }
}

function assertInsideDirectory(parentDirectory: string, targetPath: string, label: string) {
  const relative = path.relative(parentDirectory, targetPath);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) return;
  throw new Error(`${label} resolves outside the batch root and may be an escaping symlink.`);
}

function assertExpectedGitSha(manifestSha: string, options: LoadCodexLandingBatchOptions) {
  const expectedSourceCommit = options.expectedGitCommitSha?.trim();
  if (expectedSourceCommit && expectedSourceCommit !== manifestSha) {
    throw new Error(`Manifest source Git commit SHA does not agree with the explicitly configured source commit (${expectedSourceCommit}).`);
  }
}

function isV2Manifest(manifest: CodexLandingBatchManifest): manifest is CodexLandingBatchV2 {
  return manifest.schema_version === "CodexLandingBatchV2";
}

function isV2ManifestPage(page: CodexBatchPage | CodexBatchPageV2): page is CodexBatchPageV2 {
  return "visual" in page.reviews && "visual" in page.gate_statuses;
}

type LoadedDesignReferenceCatalogue = z.infer<typeof DesignReferenceCatalogueV1>;

async function loadValidatedV2Catalogue(options: LoadCodexLandingBatchOptions): Promise<{ catalogue: LoadedDesignReferenceCatalogue; sha256: string }> {
  if (!options.catalogueDirectory) throw new Error("Batch V2 requires a supplied local catalogueDirectory.");
  const catalogueDirectory = path.resolve(/*turbopackIgnore: true*/ options.catalogueDirectory);
  const validationErrors = await validateDesignReferenceCatalogueDirectory(catalogueDirectory);
  if (validationErrors.length > 0) {
    throw new Error(`Batch V2 local catalogue validation failed: ${validationErrors.join("; ")}`);
  }
  let catalogue: LoadedDesignReferenceCatalogue;
  try {
    catalogue = DesignReferenceCatalogueV1.parse(JSON.parse((await nodeReadFile(path.join(/*turbopackIgnore: true*/ catalogueDirectory, "catalogue.json"))).toString("utf8")));
  } catch (error) {
    throw new Error("Batch V2 local catalogue is missing or invalid.", { cause: error });
  }
  return { catalogue, sha256: sha256Hex(canonicalJsonStringify(catalogue)) };
}

function expectedArtifactPaths(manifest: CodexLandingBatchManifest) {
  const paths = [manifest.product_pack.path, manifest.quality.path, manifest.retro.path, manifest.timing.path];
  for (const page of manifest.pages) {
    paths.push(page.intent.path, page.artifact.path, page.reviews.uniqueness.path, page.reviews.compliance.path, page.reviews.conversion.path);
    if (isV2Manifest(manifest)) {
      if (!isV2ManifestPage(page)) throw new Error(`${page.slug} Batch V2 manifest page is missing its visual review reference.`);
      paths.push(page.reviews.visual.path);
    }
  }
  return paths;
}

export function codexBatchInputArtifactDigest(artifacts: Iterable<Pick<LoadedCodexBatchArtifact, "path" | "canonical_json_sha256">>) {
  const inputs = [...artifacts]
    .filter((artifact) => artifact.path !== "manifest.json" && artifact.path !== "quality.json")
    .map((artifact) => ({ path: artifact.path, canonical_json_sha256: artifact.canonical_json_sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return sha256Hex(canonicalJsonStringify(inputs));
}

async function assertExactBatchWorkspace(
  batchDirectory: string,
  manifest: CodexLandingBatchManifest,
  fileSystem: CodexBatchFileSystem,
): Promise<void> {
  const expectedFiles = new Set(["manifest.json", ...expectedArtifactPaths(manifest)].map((item) => item.replaceAll("\\", "/")));
  const actualFiles: string[] = [];

  const visit = async (directory: string, relativeDirectory = "") => {
    const entries = await fileSystem.readdir(directory);
    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(/*turbopackIgnore: true*/ directory, entry.name);
      const metadata = await fileSystem.lstat(absolutePath);
      if (metadata.isSymbolicLink()) {
        throw new Error(`Batch workspace contains a symlink at ${relativePath}; exact workspaces may contain regular directories and files only.`);
      }
      if (metadata.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (metadata.isFile()) {
        actualFiles.push(relativePath);
      } else {
        throw new Error(`Batch workspace contains an unsupported entry at ${relativePath}.`);
      }
    }
  };

  await visit(batchDirectory);
  const unexpected = actualFiles.filter((item) => !expectedFiles.has(item));
  const missing = [...expectedFiles].filter((item) => !actualFiles.includes(item));
  if (unexpected.length > 0) {
    throw new Error(`Batch workspace contains unexpected or unreferenced files: ${unexpected.sort().join(", ")}.`);
  }
  if (missing.length > 0) {
    throw new Error(`Batch workspace is missing manifest-referenced files: ${missing.sort().join(", ")}.`);
  }
}

function allPageGatesPassed(batch: LoadedCodexLandingBatch) {
  return batch.manifest.pages.every((page) => Object.values(page.gate_statuses).every((status) => status === "pass"));
}

async function assertProgression(
  loaded: LoadedCodexLandingBatch,
  options: LoadCodexLandingBatchOptions,
  ancestry: ReadonlySet<string>,
) {
  if (loaded.manifest.progression.stage === "exemplar") return;
  const progression = loaded.manifest.progression;
  const predecessorBatchId = progression.stage === "calibration"
    ? progression.exemplar_batch_id
    : progression.calibration_batch_id;
  if (ancestry.has(predecessorBatchId)) throw new Error("Batch progression contains a cycle.");

  const predecessor = await loadCodexLandingBatchInternal({
    ...options,
    batchId: predecessorBatchId,
    expectedGitCommitSha: undefined,
  }, new Set([...ancestry, loaded.manifest.batch_id]));
  if (predecessor.manifest.product_id !== loaded.manifest.product_id) {
    throw new Error("Batch progression predecessor belongs to a different product.");
  }
  const predecessorManifest = predecessor.artifacts.find((artifact) => artifact.path === "manifest.json");
  if (!predecessorManifest) throw new Error("Batch progression predecessor manifest is unavailable.");
  const expectedManifestHash = progression.stage === "calibration"
    ? progression.exemplar_manifest_sha256
    : progression.calibration_manifest_sha256;
  if (predecessorManifest.canonical_json_sha256 !== expectedManifestHash) {
    throw new Error("Batch progression predecessor manifest hash does not match the referenced immutable predecessor.");
  }
  if (!allPageGatesPassed(predecessor)) {
    throw new Error("Batch progression requires a predecessor whose actual page gates all pass.");
  }

  if (progression.stage === "calibration") {
    if (predecessor.manifest.batch_type !== "exemplar" || predecessor.pages.length !== 1) {
      throw new Error("Calibration progression requires a passing one-page exemplar predecessor.");
    }
    const predecessorRetro = predecessor.artifacts.find((artifact) => artifact.path === predecessor.manifest.retro.path);
    if (!predecessorRetro || predecessorRetro.canonical_json_sha256 !== progression.exemplar_retro_sha256) {
      throw new Error("Calibration progression exemplar retro hash does not match the referenced immutable retro.");
    }
    if (predecessor.retro.status !== "pass" || predecessor.manifest.retro.gate_status !== "pass") {
      throw new Error("Calibration progression requires the exemplar retro to pass.");
    }
    return;
  }

  if (predecessor.manifest.batch_type !== "calibration" || predecessor.pages.length !== 3) {
    throw new Error("Production progression requires a passing three-page calibration predecessor.");
  }
  const predecessorRetro = predecessor.artifacts.find((artifact) => artifact.path === predecessor.manifest.retro.path);
  if (!predecessorRetro || predecessorRetro.canonical_json_sha256 !== progression.calibration_retro_sha256) {
    throw new Error("Production progression calibration retro hash does not match the referenced immutable retro.");
  }
  if (predecessor.retro.status !== "pass" || predecessor.manifest.retro.gate_status !== "pass") {
    throw new Error("Production progression requires the calibration retro to pass.");
  }
}

function assertPathContract(manifest: CodexLandingBatchManifest) {
  const references = expectedArtifactPaths(manifest);
  const folded = references.map((item) => item.toLowerCase());
  if (new Set(folded).size !== folded.length) {
    throw new Error("Batch manifest contains a duplicate artifact path reference.");
  }
  if (manifest.product_pack.path !== "product-pack.json") throw new Error("Product-pack path must be product-pack.json.");
  if (manifest.quality.path !== "quality.json") throw new Error("Quality-receipt path must be quality.json.");
  if (manifest.retro.path !== "retro.json") throw new Error("Retro path must be retro.json.");
  if (manifest.timing.path !== "timing.json") throw new Error("Timing path must be timing.json.");
  for (const page of manifest.pages) {
    const expected = {
      intent: `intents/${page.slug}.json`,
      artifact: `drafts/${page.slug}.json`,
      uniqueness: `reviews/${page.slug}/uniqueness.json`,
      compliance: `reviews/${page.slug}/compliance.json`,
      conversion: `reviews/${page.slug}/conversion.json`,
    };
    if (page.intent.path !== expected.intent) throw new Error(`Intent path for ${page.slug} must be ${expected.intent}.`);
    if (page.artifact.path !== expected.artifact) throw new Error(`Draft artifact path for ${page.slug} must be ${expected.artifact}.`);
    if (page.reviews.uniqueness.path !== expected.uniqueness) throw new Error(`Uniqueness-review path for ${page.slug} must be ${expected.uniqueness}.`);
    if (page.reviews.compliance.path !== expected.compliance) throw new Error(`Compliance-review path for ${page.slug} must be ${expected.compliance}.`);
    if (page.reviews.conversion.path !== expected.conversion) throw new Error(`Conversion-review path for ${page.slug} must be ${expected.conversion}.`);
    if (isV2Manifest(manifest)) {
      if (!isV2ManifestPage(page)) throw new Error(`${page.slug} Batch V2 manifest page is missing its visual review reference.`);
      if (page.reviews.visual.path !== `reviews/${page.slug}/visual.json`) throw new Error(`Visual-review path for ${page.slug} must be reviews/${page.slug}/visual.json.`);
    }
  }
}

function assertReferenceHashes(reference: { byte_sha256: string; canonical_json_sha256: string }, artifact: LoadedCodexBatchArtifact) {
  if (reference.byte_sha256 !== artifact.byte_sha256) {
    throw new Error(`${artifact.path} byte hash mismatch: manifest and exact file bytes differ.`);
  }
  if (reference.canonical_json_sha256 !== artifact.canonical_json_sha256) {
    throw new Error(`${artifact.path} canonical JSON hash mismatch: manifest and parsed JSON differ.`);
  }
}

function reportGateStatus(status: string): CodexLandingBatchV1["pages"][number]["gate_statuses"]["intent"] {
  if (status === "pass") return "pass";
  if (status === "blocked") return "blocked";
  return "fail";
}

function assertPageCrossReferences(
  manifest: CodexLandingBatchManifest,
  productPack: ProductEvidencePackV1,
  page: LoadedCodexBatchPage,
  catalogue?: { catalogue: LoadedDesignReferenceCatalogue; sha256: string },
) {
  const manifestPage = page.manifestPage;
  const blueprint = page.blueprint;
  if (blueprint.metadata.product_id !== manifest.product_id) throw new Error(`${manifestPage.slug} draft product_id does not match the manifest.`);
  if (blueprint.metadata.url_slug !== manifestPage.slug) throw new Error(`${manifestPage.slug} draft slug does not match its manifest path.`);
  if (blueprint.metadata.robots !== manifestPage.robots) throw new Error(`${manifestPage.slug} robots policy does not match the manifest.`);
  if (blueprint.metadata.motion_profile !== manifestPage.motion_profile) throw new Error(`${manifestPage.slug} motion profile does not match the manifest.`);
  if (!productPack.references.page_blueprint_ids.includes(manifestPage.page_blueprint_id)) {
    throw new Error(`${manifestPage.slug} page-blueprint ID is not present in the product pack.`);
  }
  const decision = productPack.proposed_buyer_decisions.find((item) => item.page_blueprint_id === manifestPage.page_blueprint_id);
  if (!decision || decision.slug !== manifestPage.slug) throw new Error(`${manifestPage.slug} lacks a matching proposed buyer decision in the product pack.`);
  if (blueprint.hero.primary_cta_link_id !== productPack.references.affiliate_link_id) {
    throw new Error(`${manifestPage.slug} hero CTA does not reference the product pack affiliate-link ID.`);
  }
  for (const block of blueprint.cta_blocks) {
    if (block.affiliate_link_id !== productPack.references.affiliate_link_id) throw new Error(`${manifestPage.slug} contains a CTA-link ID mismatch.`);
  }
  const { sourceIds, evidenceIds } = collectPageBlueprintReferences(blueprint);
  for (const sourceId of sourceIds) {
    if (!productPack.references.source_ids.includes(sourceId)) throw new Error(`${manifestPage.slug} references source ${sourceId} outside the product pack.`);
  }
  for (const evidenceId of evidenceIds) {
    if (!productPack.references.evidence_claim_ids.includes(evidenceId)) throw new Error(`${manifestPage.slug} references evidence ${evidenceId} outside the product pack.`);
  }
  const expectedGates = manifestPage.gate_statuses;
  if (expectedGates.intent !== reportGateStatus(page.intent.status)) throw new Error(`${manifestPage.slug} intent gate status does not match its report.`);
  if (expectedGates.uniqueness !== reportGateStatus(page.uniqueness.status)) throw new Error(`${manifestPage.slug} uniqueness gate status does not match its report.`);
  if (expectedGates.compliance !== reportGateStatus(page.compliance.status)) throw new Error(`${manifestPage.slug} compliance gate status does not match its report.`);
  if (expectedGates.conversion !== reportGateStatus(page.conversion.status)) throw new Error(`${manifestPage.slug} conversion gate status does not match its report.`);
  if (!isV2Manifest(manifest)) return;
  if (!isV2ManifestPage(manifestPage)) throw new Error(`${manifestPage.slug} Batch V2 manifest page is missing its visual review and gate status.`);
  const expectedV2Gates = manifestPage.gate_statuses;

  const visual = page.visual;
  if (!visual) throw new Error(`${manifestPage.slug} Batch V2 page is missing its visual review.`);
  if (expectedV2Gates.visual !== reportGateStatus(visual.status)) throw new Error(`${manifestPage.slug} visual gate status does not match its report.`);
  if (visual.status !== "pass") throw new Error(`${manifestPage.slug} visual review must pass before uniqueness, compliance, or conversion.`);
  if (!catalogue) throw new Error(`${manifestPage.slug} Batch V2 requires a validated local catalogue.`);
  if (blueprint.metadata.design_profile !== "reference_composed_v1" || !blueprint.presentation || !page.intent.design_direction) {
    throw new Error(`${manifestPage.slug} Batch V2 requires reference_composed_v1 with matching design direction and presentation.`);
  }
  const tracedDecision = productPack.proposed_buyer_decisions.find((item) => item.page_blueprint_id === manifestPage.page_blueprint_id);
  if (!tracedDecision || page.intent.target_keyword !== blueprint.metadata.target_keyword || page.intent.buyer_decision !== tracedDecision.buyer_decision) {
    throw new Error(`${manifestPage.slug} intent keyword or buyer decision does not match the immutable draft trace.`);
  }
  if (visual.batch_id !== manifest.batch_id || visual.product_id !== manifest.product_id || visual.page_blueprint_id !== manifestPage.page_blueprint_id || visual.slug !== manifestPage.slug) {
    throw new Error(`${manifestPage.slug} visual review identity does not match the manifest.`);
  }
  if (visual.intent_keyword !== page.intent.target_keyword || visual.buyer_decision !== page.intent.buyer_decision || visual.draft_sha256 !== manifestPage.artifact.canonical_json_sha256) {
    throw new Error(`${manifestPage.slug} visual review intent or draft hash does not match the immutable trace.`);
  }
  const direction = page.intent.design_direction;
  if (direction.recipe_id !== blueprint.presentation.recipe_id || direction.fingerprint !== blueprint.presentation.fingerprint
    || visual.recipe_id !== blueprint.presentation.recipe_id || visual.recipe_fingerprint !== blueprint.presentation.fingerprint) {
    throw new Error(`${manifestPage.slug} design direction, presentation recipe, and visual review do not share one recipe trace.`);
  }
  if (visual.catalogue_sha256 !== catalogue.sha256) throw new Error(`${manifestPage.slug} visual review catalogue digest is stale or does not match the supplied local catalogue.`);
  const selectedReferences = direction.references.map(({ reference_id, entry_digest, role, adopted_principles, influenced_axes }) => {
    const localReference = catalogue.catalogue.references.find((reference) => reference.id === reference_id);
    if (!localReference || !localReference.captures.desktop || !localReference.captures.mobile || localReference.entry_digest !== entry_digest) {
      throw new Error(`${manifestPage.slug} design-direction reference is stale against the supplied local catalogue.`);
    }
    return {
      reference_id,
      entry_digest,
      role,
      adopted_principles,
      influenced_axes,
      desktop_capture_sha256: localReference.captures.desktop.sha256,
      mobile_capture_sha256: localReference.captures.mobile.sha256,
    };
  });
  if (blueprint.presentation.reference_ids.join("\n") !== selectedReferences.map((reference) => reference.reference_id).join("\n")
    || canonicalJsonStringify(visual.selected_references) !== canonicalJsonStringify(selectedReferences)) {
    throw new Error(`${manifestPage.slug} validated catalogue, design direction, presentation, and visual selected-reference traces must match exactly.`);
  }
  const expectedTrace = {
    page_blueprint_id: manifestPage.page_blueprint_id,
    slug: manifestPage.slug,
    draft_canonical_sha256: manifestPage.artifact.canonical_json_sha256,
    recipe_id: blueprint.presentation.recipe_id,
    recipe_fingerprint: blueprint.presentation.fingerprint,
    catalogue_sha256: catalogue.sha256,
    selected_references: selectedReferences,
  };
  const visualTrace = {
    page_blueprint_id: visual.page_blueprint_id,
    slug: visual.slug,
    draft_canonical_sha256: visual.draft_sha256,
    recipe_id: visual.recipe_id,
    recipe_fingerprint: visual.recipe_fingerprint,
    catalogue_sha256: visual.catalogue_sha256,
    selected_references: visual.selected_references,
  };
  if (canonicalJsonStringify(expectedTrace) !== canonicalJsonStringify(visualTrace)) {
    throw new Error(`${manifestPage.slug} visual review trace does not match the manifest, draft, presentation, and selected references.`);
  }
  for (const [label, report] of [["uniqueness", page.uniqueness], ["compliance", page.compliance], ["conversion", page.conversion]] as const) {
    if (!("design_trace" in report) || canonicalJsonStringify(report.design_trace) !== canonicalJsonStringify(expectedTrace)) {
      throw new Error(`${manifestPage.slug} ${label} V2 report design trace does not match the manifest, intent, draft, presentation, and visual review.`);
    }
  }
  if (page.intent.recommended_action === "hold_for_design_direction" && [expectedV2Gates.draft, expectedV2Gates.visual, expectedV2Gates.uniqueness, expectedV2Gates.compliance, expectedV2Gates.conversion].some((status) => status === "pass")) {
    throw new Error(`${manifestPage.slug} hold_for_design_direction is non-advancing and cannot have later passing gates.`);
  }
}

async function loadCodexLandingBatchInternal(
  options: LoadCodexLandingBatchOptions,
  ancestry: ReadonlySet<string>,
): Promise<LoadedCodexLandingBatch> {
  const batchId = parseWithSchema(codexUuidSchema, options.batchId, "batch ID");
  const batchRoot = options.batchRoot
    ? path.resolve(/*turbopackIgnore: true*/ options.batchRoot)
    : defaultGeneratedBatchRoot;
  const requestedBatchDirectory = path.join(/*turbopackIgnore: true*/ batchRoot, batchId);
  const fileSystem = options.fileSystem ?? defaultFileSystem;

  const [realBatchRoot, batchDirectory] = await Promise.all([
    fileSystem.realpath(batchRoot),
    fileSystem.realpath(requestedBatchDirectory),
  ]);
  assertInsideDirectory(realBatchRoot, batchDirectory, "Batch directory");

  const artifactCache = new Map<string, Promise<LoadedCodexBatchArtifact>>();
  const readJsonArtifact = (relativePath: string) => {
    const safePath = parseWithSchema(safeBatchRelativePathSchema, relativePath, "artifact path");
    const cacheKey = safePath.toLowerCase();
    const existing = artifactCache.get(cacheKey);
    if (existing) return existing;
    const pending = (async () => {
      const requestedPath = path.join(/*turbopackIgnore: true*/ batchDirectory, ...safePath.split("/"));
      assertInsideDirectory(batchDirectory, requestedPath, `Artifact ${safePath}`);
      const realArtifactPath = await fileSystem.realpath(requestedPath);
      assertInsideDirectory(batchDirectory, realArtifactPath, `Artifact ${safePath}`);
      const bytes = await fileSystem.readFile(realArtifactPath);
      const json = parseJsonBytes(bytes, safePath);
      assertNoGeneratedCanonicalState(json, safePath);
      return {
        path: safePath,
        byte_length: bytes.byteLength,
        byte_sha256: sha256Hex(bytes),
        canonical_json_sha256: sha256Hex(canonicalJsonStringify(json)),
        json,
      } satisfies LoadedCodexBatchArtifact;
    })();
    artifactCache.set(cacheKey, pending);
    return pending;
  };

  const manifestArtifact = await readJsonArtifact("manifest.json");
  const manifest: CodexLandingBatchManifest = manifestArtifact.json && typeof manifestArtifact.json === "object"
    && (manifestArtifact.json as { schema_version?: unknown }).schema_version === "CodexLandingBatchV2"
    ? parseWithSchema(codexLandingBatchV2Schema, manifestArtifact.json, "manifest.json")
    : parseWithSchema(codexLandingBatchV1Schema, manifestArtifact.json, "manifest.json");
  if (manifest.batch_id !== batchId) throw new Error("Manifest batch ID does not match its directory name.");
  assertExpectedGitSha(manifest.git_commit_sha, options);
  assertPathContract(manifest);
  await assertExactBatchWorkspace(batchDirectory, manifest, fileSystem);
  const catalogue = isV2Manifest(manifest) ? await loadValidatedV2Catalogue(options) : undefined;

  const productPackArtifact = await readJsonArtifact(manifest.product_pack.path);
  assertReferenceHashes(manifest.product_pack, productPackArtifact);
  const productPack = parseWithSchema(productEvidencePackV1Schema, productPackArtifact.json, manifest.product_pack.path);
  if (productPack.product.id !== manifest.product_id || productPack.references.product_id !== manifest.product_id) {
    throw new Error("Product pack product ID does not match the manifest.");
  }

  const pages = await Promise.all(manifest.pages.map(async (manifestPage): Promise<LoadedCodexBatchPage> => {
    const manifestIsV2 = isV2Manifest(manifest);
    const pageIsV2 = isV2ManifestPage(manifestPage);
    if (manifestIsV2 !== pageIsV2) throw new Error(`${manifestPage.slug} manifest and page versions do not agree about the visual review contract.`);
    const [intentArtifact, blueprintArtifact, uniquenessArtifact, complianceArtifact, conversionArtifact, visualArtifact] = await Promise.all([
      readJsonArtifact(manifestPage.intent.path),
      readJsonArtifact(manifestPage.artifact.path),
      readJsonArtifact(manifestPage.reviews.uniqueness.path),
      readJsonArtifact(manifestPage.reviews.compliance.path),
      readJsonArtifact(manifestPage.reviews.conversion.path),
      pageIsV2 ? readJsonArtifact(manifestPage.reviews.visual.path) : Promise.resolve(undefined),
    ]);
    assertReferenceHashes(manifestPage.intent, intentArtifact);
    assertReferenceHashes(manifestPage.artifact, blueprintArtifact);
    assertReferenceHashes(manifestPage.reviews.uniqueness, uniquenessArtifact);
    assertReferenceHashes(manifestPage.reviews.compliance, complianceArtifact);
    assertReferenceHashes(manifestPage.reviews.conversion, conversionArtifact);
    const common = {
      manifestPage,
      intent: parseWithSchema(codexIntentBriefSchema, intentArtifact.json, manifestPage.intent.path),
      blueprint: parseWithSchema(codexEditorialDraftSchema, blueprintArtifact.json, manifestPage.artifact.path),
      draftJson: blueprintArtifact.json,
    };
    if (pageIsV2) {
      if (!visualArtifact) throw new Error(`${manifestPage.slug} Batch V2 page is missing its visual review artifact.`);
      assertReferenceHashes(manifestPage.reviews.visual, visualArtifact);
      return {
        ...common,
        uniqueness: parseWithSchema(codexUniquenessReviewV2Schema, uniquenessArtifact.json, manifestPage.reviews.uniqueness.path),
        compliance: parseWithSchema(codexComplianceReviewV2Schema, complianceArtifact.json, manifestPage.reviews.compliance.path),
        conversion: parseWithSchema(codexConversionReviewV2Schema, conversionArtifact.json, manifestPage.reviews.conversion.path),
        visual: parseWithSchema(visualDesignReviewV1Schema, visualArtifact.json, manifestPage.reviews.visual.path),
      };
    }
    return {
      ...common,
      uniqueness: parseWithSchema(codexUniquenessReviewSchema, uniquenessArtifact.json, manifestPage.reviews.uniqueness.path),
      compliance: parseWithSchema(codexComplianceReviewSchema, complianceArtifact.json, manifestPage.reviews.compliance.path),
      conversion: parseWithSchema(codexConversionReviewSchema, conversionArtifact.json, manifestPage.reviews.conversion.path),
    };
  }));

  for (const page of pages) assertPageCrossReferences(manifest, productPack, page, catalogue);

  const [qualityArtifact, retroArtifact, timingArtifact] = await Promise.all([
    readJsonArtifact(manifest.quality.path),
    readJsonArtifact(manifest.retro.path),
    readJsonArtifact(manifest.timing.path),
  ]);
  assertReferenceHashes(manifest.quality, qualityArtifact);
  assertReferenceHashes(manifest.retro, retroArtifact);
  assertReferenceHashes(manifest.timing, timingArtifact);
  const quality = parseWithSchema(codexBatchQualityReceiptSchema, qualityArtifact.json, manifest.quality.path);
  const retro = parseWithSchema(codexBatchRetroSchema, retroArtifact.json, manifest.retro.path);
  const timing = parseWithSchema(codexBatchTimingSchema, timingArtifact.json, manifest.timing.path);
  if (quality.batch_id !== batchId) throw new Error("Quality receipt batch ID does not match the manifest.");
  const inputArtifactDigest = codexBatchInputArtifactDigest(await Promise.all([...artifactCache.values()]));
  if (quality.input_artifact_digest !== inputArtifactDigest) {
    throw new Error("Quality receipt input artifact digest does not match the current immutable batch inputs.");
  }
  if (timing.batch_id !== batchId) throw new Error("Timing artifact batch ID does not match the manifest.");
  if (manifest.retro.gate_status !== reportGateStatus(retro.status)) throw new Error("Retro gate status does not match retro.json.");

  const artifacts = await Promise.all([...artifactCache.values()]);
  artifacts.sort((left, right) => left.path.localeCompare(right.path));
  const loaded = { batchDirectory, manifest, productPack, pages, quality, retro, timing, artifacts };
  await assertProgression(loaded, options, ancestry);
  return loaded;
}

export async function loadCodexLandingBatch(options: LoadCodexLandingBatchOptions): Promise<LoadedCodexLandingBatch> {
  return loadCodexLandingBatchInternal(options, new Set([options.batchId]));
}
