import { z } from "zod";

import { pageBlueprintSchema } from "@/lib/schemas/contracts";
import { DesignDirectionV1 } from "@/lib/design-references/contracts";
import { presentationAxes, sha256 as designReferenceSha256 } from "@/lib/design-references/fingerprint";

export const codexUuidSchema = z.string().uuid().refine((value) => value === value.toLowerCase(), {
  message: "UUIDs must use lowercase canonical form.",
});

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, "Expected a lowercase SHA-256 digest.");
export const gitCommitShaSchema = z.string().regex(/^[a-f0-9]{40}$/, "Expected a full lowercase Git commit SHA.");
export const landingSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a lowercase landing-page slug.");
export const robotsPolicySchema = z.enum(["index,follow", "noindex,nofollow"]);
export const codexGateStatusSchema = z.enum(["pass", "fail", "pending", "blocked", "not_run"]);

export const codexQualityScannerNames = [
  "route",
  "structure",
  "hero",
  "cta",
  "seo",
  "a11y",
  "links",
  "forms",
  "conversion",
  "responsive",
  "assets",
  "publish-readiness",
  "editorial-v2",
  "compliance",
  "uniqueness",
  "conversion-copy",
] as const;

export const safeBatchRelativePathSchema = z.string().superRefine((value, context) => {
  if (value.includes("\0")) {
    context.addIssue({ code: "custom", message: "Artifact paths cannot contain NUL bytes." });
    return;
  }
  if (value.includes("\\")) {
    context.addIssue({ code: "custom", message: "Artifact paths must use forward slashes, never backslashes." });
  }
  if (/^(?:[A-Za-z]:|\/|\\|\/\/)/.test(value)) {
    context.addIssue({ code: "custom", message: "Artifact paths must be relative to the batch directory." });
  }
  if (!/^[a-z0-9][a-z0-9._/-]*$/.test(value)) {
    context.addIssue({ code: "custom", message: "Artifact path contains unsupported characters." });
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    context.addIssue({ code: "custom", message: "Artifact path traversal and empty segments are forbidden." });
  }
});

export const artifactReferenceSchema = z.object({
  path: safeBatchRelativePathSchema,
  byte_sha256: sha256Schema,
  canonical_json_sha256: sha256Schema,
}).strict();

const productEvidenceSourceSchema = z.object({
  id: codexUuidSchema,
  source_type: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1).nullable(),
  retrieved_at: z.string().datetime({ offset: true }),
  source_sha256: sha256Schema,
  usage_notes: z.string().min(1),
}).strict();

const productEvidenceClaimSchema = z.object({
  id: codexUuidSchema,
  source_id: codexUuidSchema,
  claim: z.string().min(1),
  claim_type: z.string().min(1),
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  confidence_score: z.number().min(0).max(1),
  allowed_wording: z.string().min(1),
  usage_notes: z.string().min(1),
}).strict();

const destinationReviewSchema = z.object({
  id: codexUuidSchema,
  state: z.enum(["reviewed", "unknown", "unreachable"]),
  checked_at: z.string().datetime({ offset: true }).nullable(),
  final_visible_url: z.string().url().nullable(),
  redirect_chain: z.array(z.string().url()),
  usage_notes: z.string().min(1),
}).strict();

const programRulesSchema = z.object({
  id: codexUuidSchema,
  program_name: z.string().min(1),
  state: z.enum(["documented", "unknown"]),
  required_disclosure: z.string().min(1).nullable(),
  rules: z.array(z.object({
    name: z.string().min(1),
    value: z.enum(["allowed", "disallowed", "unknown"]),
    usage_notes: z.string().min(1),
  }).strict()),
  unknown_reason: z.string().min(1).nullable(),
}).strict().superRefine((value, context) => {
  if (value.state === "unknown" && !value.unknown_reason) {
    context.addIssue({ code: "custom", path: ["unknown_reason"], message: "Unknown program rules require an explicit reason." });
  }
});

export const productEvidencePackV1Schema = z.object({
  schema_version: z.literal("ProductEvidencePackV1"),
  product: z.object({
    id: codexUuidSchema,
    name: z.string().min(1),
    slug: landingSlugSchema,
    category: z.string().min(1),
    website_url: z.string().url().nullable().optional(),
    description: z.string().min(1).nullable().optional(),
    primary_audience: z.string().min(1).nullable().optional(),
  }).strict(),
  references: z.object({
    product_id: codexUuidSchema,
    affiliate_link_id: codexUuidSchema,
    offer_folder_id: codexUuidSchema,
    destination_review_id: codexUuidSchema,
    program_rule_id: codexUuidSchema,
    compliance_profile_id: codexUuidSchema,
    source_ids: z.array(codexUuidSchema).min(1),
    evidence_claim_ids: z.array(codexUuidSchema).min(1),
    page_blueprint_ids: z.array(codexUuidSchema).min(1).max(10),
  }).strict(),
  affiliate: z.object({
    original_url: z.string().url().refine((value) => new URL(value).protocol === "https:", "Affiliate URL must use HTTPS."),
    link_type: z.string().min(1),
    destination_review: destinationReviewSchema,
  }).strict(),
  offer_folder: z.object({
    id: codexUuidSchema,
    name: z.string().min(1),
  }).strict(),
  program_rules: programRulesSchema,
  compliance_profile: z.object({
    id: codexUuidSchema,
    required_disclosure: z.string().min(1),
    import_notes: z.string().min(1),
  }).strict(),
  disclosures: z.object({
    short: z.string().min(1),
    full: z.string().min(1),
    placement_notes: z.string().min(1),
  }).strict(),
  review_basis: z.object({
    basis: z.enum(["hands_on", "owner_review", "vendor_docs", "public_research", "third_party_synthesis", "unknown"]),
    summary: z.string().min(1),
    first_hand_boundary: z.string().min(1),
  }).strict(),
  sources: z.array(productEvidenceSourceSchema).min(1),
  evidence_claims: z.array(productEvidenceClaimSchema).min(1),
  claim_to_evidence: z.array(z.object({
    claim_key: z.string().min(1),
    evidence_claim_ids: z.array(codexUuidSchema).min(1),
    usage_notes: z.string().min(1),
  }).strict()).min(1),
  prohibited_claims: z.array(z.string().min(1)).min(1),
  sibling_context: z.array(z.object({
    slug: landingSlugSchema,
    buyer_decision: z.string().min(1),
  }).strict()).max(50),
  proposed_buyer_decisions: z.array(z.object({
    page_blueprint_id: codexUuidSchema,
    slug: landingSlugSchema,
    buyer_decision: z.string().min(1),
  }).strict()).min(1).max(10),
}).strict().superRefine((pack, context) => {
  const requireUnique = (values: string[], path: (string | number)[], label: string) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", path, message: `${label} must be unique.` });
    }
  };

  if (pack.product.id !== pack.references.product_id) {
    context.addIssue({ code: "custom", path: ["references", "product_id"], message: "Product reference must match product.id." });
  }
  if (pack.affiliate.destination_review.id !== pack.references.destination_review_id) {
    context.addIssue({ code: "custom", path: ["references", "destination_review_id"], message: "Destination-review reference does not match the embedded review." });
  }
  if (pack.program_rules.id !== pack.references.program_rule_id) {
    context.addIssue({ code: "custom", path: ["references", "program_rule_id"], message: "Program-rule reference does not match the embedded rules." });
  }
  if (pack.offer_folder.id !== pack.references.offer_folder_id) {
    context.addIssue({ code: "custom", path: ["references", "offer_folder_id"], message: "Offer-folder reference does not match the embedded folder." });
  }
  if (pack.compliance_profile.id !== pack.references.compliance_profile_id) {
    context.addIssue({ code: "custom", path: ["references", "compliance_profile_id"], message: "Compliance-profile reference does not match the embedded profile." });
  }

  requireUnique(pack.references.source_ids, ["references", "source_ids"], "Source IDs");
  requireUnique(pack.references.evidence_claim_ids, ["references", "evidence_claim_ids"], "Evidence-claim IDs");
  requireUnique(pack.references.page_blueprint_ids, ["references", "page_blueprint_ids"], "Page-blueprint IDs");
  requireUnique(pack.sources.map((source) => source.id), ["sources"], "Source records");
  requireUnique(pack.evidence_claims.map((claim) => claim.id), ["evidence_claims"], "Evidence-claim records");
  requireUnique(pack.proposed_buyer_decisions.map((item) => item.slug), ["proposed_buyer_decisions"], "Proposed slugs");
  requireUnique(pack.proposed_buyer_decisions.map((item) => item.page_blueprint_id), ["proposed_buyer_decisions"], "Proposed page-blueprint IDs");

  const sourceRecordIds = new Set(pack.sources.map((source) => source.id));
  const evidenceRecordIds = new Set(pack.evidence_claims.map((claim) => claim.id));
  for (const sourceId of pack.references.source_ids) {
    if (!sourceRecordIds.has(sourceId)) context.addIssue({ code: "custom", path: ["references", "source_ids"], message: `Missing source record ${sourceId}.` });
  }
  for (const evidenceId of pack.references.evidence_claim_ids) {
    if (!evidenceRecordIds.has(evidenceId)) context.addIssue({ code: "custom", path: ["references", "evidence_claim_ids"], message: `Missing evidence-claim record ${evidenceId}.` });
  }
  for (const claim of pack.evidence_claims) {
    if (!sourceRecordIds.has(claim.source_id)) context.addIssue({ code: "custom", path: ["evidence_claims"], message: `Evidence claim ${claim.id} references an unknown source.` });
  }
  for (const mapping of pack.claim_to_evidence) {
    for (const evidenceId of mapping.evidence_claim_ids) {
      if (!evidenceRecordIds.has(evidenceId)) context.addIssue({ code: "custom", path: ["claim_to_evidence"], message: `Claim map references unknown evidence ${evidenceId}.` });
    }
  }
  for (const candidate of pack.proposed_buyer_decisions) {
    if (!pack.references.page_blueprint_ids.includes(candidate.page_blueprint_id)) {
      context.addIssue({ code: "custom", path: ["proposed_buyer_decisions"], message: `Candidate ${candidate.slug} lacks a page-blueprint reference.` });
    }
  }

  const destination = pack.affiliate.destination_review;
  if (destination.state === "reviewed") {
    if (!destination.checked_at || !destination.final_visible_url || destination.redirect_chain.length === 0) {
      context.addIssue({ code: "custom", path: ["affiliate", "destination_review"], message: "A reviewed destination requires a timestamp, final URL, and redirect chain." });
    } else {
      if (destination.redirect_chain[0] !== pack.affiliate.original_url) {
        context.addIssue({ code: "custom", path: ["affiliate", "destination_review", "redirect_chain"], message: "Redirect chain must begin with the exact original affiliate URL." });
      }
      if (destination.redirect_chain.at(-1) !== destination.final_visible_url) {
        context.addIssue({ code: "custom", path: ["affiliate", "destination_review", "redirect_chain"], message: "Redirect chain must end at the reviewed final visible URL." });
      }
    }
  }
});

export const codexIntentBriefSchema = z.object({
  schema_version: z.union([z.literal(1), z.string().min(1)]),
  status: z.enum(["pass", "fail"]),
  recommended_action: z.enum(["new_page", "rewrite_existing", "merge_into_existing", "hold_for_evidence", "hold_for_design_direction", "noindex_draft", "reject"]),
  reason_codes: z.array(z.string()),
  target_keyword: z.string().min(1),
  search_intent: z.string().min(1),
  audience_segment: z.string().min(1),
  buyer_decision: z.string().min(1),
  design_direction: DesignDirectionV1.optional(),
  hard_fail_flags: z.array(z.string()),
  downstream_blocks: z.array(z.string()),
}).passthrough().superRefine((report, context) => {
  if (report.status !== "pass") return;
  if (!["new_page", "rewrite_existing", "noindex_draft"].includes(report.recommended_action)) {
    context.addIssue({ code: "custom", path: ["recommended_action"], message: "A passing intent brief must advance a page draft rather than reject, merge, or hold it." });
  }
  if (report.hard_fail_flags.length > 0) {
    context.addIssue({ code: "custom", path: ["hard_fail_flags"], message: "A passing intent brief cannot retain hard-fail flags." });
  }
  if (report.downstream_blocks.length > 0) {
    context.addIssue({ code: "custom", path: ["downstream_blocks"], message: "A passing intent brief cannot retain downstream blockers." });
  }
});

function isAllowedUniquenessPassAction(action: string): boolean {
  return action === "pass" || action === "noindex_draft";
}

function isAllowedConversionPassAction(action: string): boolean {
  return action === "pass";
}

export const codexUniquenessReviewSchema = z.object({
  schema_version: z.union([z.literal(1), z.string().min(1)]),
  status: z.enum(["pass", "fail"]),
  publish_readiness: z.enum(["blocked", "eligible_for_next_gate"]),
  reason_codes: z.array(z.string()),
  hard_gate_failures: z.array(z.unknown()),
  required_changes: z.array(z.unknown()),
  recommended_action: z.enum(["pass", "rewrite_visible_fields", "return_to_intent_brief", "merge_into_existing", "noindex_draft", "reject"]),
}).passthrough().superRefine((report, context) => {
  if (report.status === "pass") {
    if (report.publish_readiness !== "eligible_for_next_gate") {
      context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A passing uniqueness review must be eligible for the next gate." });
    }
    if (report.hard_gate_failures.length > 0) {
      context.addIssue({ code: "custom", path: ["hard_gate_failures"], message: "A passing uniqueness review cannot retain hard-gate failures." });
    }
    if (report.required_changes.length > 0) {
      context.addIssue({ code: "custom", path: ["required_changes"], message: "A passing uniqueness review cannot retain required changes." });
    }
    if (!isAllowedUniquenessPassAction(report.recommended_action)) {
      context.addIssue({ code: "custom", path: ["recommended_action"], message: "A passing uniqueness review must recommend pass or a noindex draft." });
    }
  } else if (report.publish_readiness !== "blocked") {
    context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A failing uniqueness review must remain blocked." });
  }
});

export const codexComplianceReviewSchema = z.object({
  schema_version: z.union([z.literal(1), z.string().min(1)]),
  status: z.enum(["pass", "fail"]),
  publish_readiness: z.enum(["blocked", "eligible_for_conversion_review"]),
  reason_codes: z.array(z.string()),
  hard_gate_failures: z.array(z.unknown()),
  required_changes: z.array(z.unknown()),
  recommended_action: z.enum(["pass", "revise_copy", "resolve_external_records", "return_to_drafter", "reject", "static_renderer_fix_required"]),
}).passthrough().superRefine((report, context) => {
  if (report.status === "pass") {
    if (report.publish_readiness !== "eligible_for_conversion_review") {
      context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A passing compliance review must be eligible for conversion review." });
    }
    if (report.hard_gate_failures.length > 0) {
      context.addIssue({ code: "custom", path: ["hard_gate_failures"], message: "A passing compliance review cannot retain hard-gate failures." });
    }
    if (report.required_changes.length > 0) {
      context.addIssue({ code: "custom", path: ["required_changes"], message: "A passing compliance review cannot retain required changes." });
    }
    if (report.recommended_action !== "pass") {
      context.addIssue({ code: "custom", path: ["recommended_action"], message: "A passing compliance review must recommend pass." });
    }
  } else if (report.publish_readiness !== "blocked") {
    context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A failing compliance review must remain blocked." });
  }
});

export const codexConversionReviewSchema = z.object({
  schema_version: z.union([z.literal(1), z.string().min(1)]),
  status: z.enum(["pass", "fail", "blocked"]),
  publish_readiness: z.enum(["blocked", "eligible_for_release"]),
  reason_codes: z.array(z.string()),
  hard_gate_failures: z.array(z.unknown()),
  required_rewrites: z.array(z.unknown()),
  recommended_action: z.enum(["pass", "rewrite_visible_fields", "return_to_drafter", "return_to_intent_brief", "return_to_uniqueness_review", "return_to_compliance_review", "resolve_destination_review"]),
}).passthrough().superRefine((report, context) => {
  if (report.status === "pass") {
    if (report.publish_readiness !== "eligible_for_release") {
      context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A passing conversion review must be eligible for release." });
    }
    if (report.hard_gate_failures.length > 0) {
      context.addIssue({ code: "custom", path: ["hard_gate_failures"], message: "A passing conversion review cannot retain hard-gate failures." });
    }
    if (report.required_rewrites.length > 0) {
      context.addIssue({ code: "custom", path: ["required_rewrites"], message: "A passing conversion review cannot retain required rewrites." });
    }
    if (!isAllowedConversionPassAction(report.recommended_action)) {
      context.addIssue({ code: "custom", path: ["recommended_action"], message: "A passing conversion review must recommend pass." });
    }
  } else if (report.publish_readiness !== "blocked") {
    context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A non-passing conversion review must remain blocked." });
  }
});

const selectedReferenceTraceSchema = z.object({
  reference_id: z.string().regex(/^lp-ref-\d{4}$/),
  entry_digest: sha256Schema,
  role: z.enum(["hero_typography", "sections_cta", "motion_mobile"]),
  adopted_principles: z.array(z.string().min(1)).min(1),
  influenced_axes: z.array(z.enum(presentationAxes)).min(1).max(2),
  desktop_capture_sha256: sha256Schema,
  mobile_capture_sha256: sha256Schema,
}).strict();

export const codexDesignTraceV2Schema = z.object({
  page_blueprint_id: codexUuidSchema,
  slug: landingSlugSchema,
  draft_canonical_sha256: sha256Schema,
  recipe_id: z.string().regex(/^recipe-[a-f0-9]{16}$/),
  recipe_fingerprint: sha256Schema,
  catalogue_sha256: sha256Schema,
  selected_references: z.array(selectedReferenceTraceSchema).min(2).max(3),
}).strict().superRefine((trace, context) => {
  if (new Set(trace.selected_references.map((reference) => reference.reference_id)).size !== trace.selected_references.length) {
    context.addIssue({ code: "custom", path: ["selected_references"], message: "Design-trace selected references must be unique and ordered." });
  }
});

export const codexUniquenessReviewV2Schema = z.object({
  schema_version: z.literal("codexUniquenessReviewV2"),
  status: z.enum(["pass", "fail"]),
  publish_readiness: z.enum(["blocked", "eligible_for_next_gate"]),
  reason_codes: z.array(z.string()),
  hard_gate_failures: z.array(z.unknown()),
  required_changes: z.array(z.unknown()),
  recommended_action: z.enum(["pass", "rewrite_visible_fields", "return_to_intent_brief", "merge_into_existing", "noindex_draft", "reject"]),
  design_trace: codexDesignTraceV2Schema,
}).strict().superRefine((report, context) => {
  if (report.status === "pass") {
    if (report.publish_readiness !== "eligible_for_next_gate") context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A passing uniqueness review must be eligible for the next gate." });
    if (report.hard_gate_failures.length > 0) context.addIssue({ code: "custom", path: ["hard_gate_failures"], message: "A passing uniqueness review cannot retain hard-gate failures." });
    if (report.required_changes.length > 0) context.addIssue({ code: "custom", path: ["required_changes"], message: "A passing uniqueness review cannot retain required changes." });
    if (!isAllowedUniquenessPassAction(report.recommended_action)) context.addIssue({ code: "custom", path: ["recommended_action"], message: "A passing uniqueness review must recommend pass or a noindex draft." });
  } else if (report.publish_readiness !== "blocked") context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A failing uniqueness review must remain blocked." });
});

export const codexComplianceReviewV2Schema = z.object({
  schema_version: z.literal("codexComplianceReviewV2"),
  status: z.enum(["pass", "fail"]),
  publish_readiness: z.enum(["blocked", "eligible_for_conversion_review"]),
  reason_codes: z.array(z.string()),
  hard_gate_failures: z.array(z.unknown()),
  required_changes: z.array(z.unknown()),
  recommended_action: z.enum(["pass", "revise_copy", "resolve_external_records", "return_to_drafter", "reject", "static_renderer_fix_required"]),
  design_trace: codexDesignTraceV2Schema,
}).strict().superRefine((report, context) => {
  if (report.status === "pass") {
    if (report.publish_readiness !== "eligible_for_conversion_review") context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A passing compliance review must be eligible for conversion review." });
    if (report.hard_gate_failures.length > 0) context.addIssue({ code: "custom", path: ["hard_gate_failures"], message: "A passing compliance review cannot retain hard-gate failures." });
    if (report.required_changes.length > 0) context.addIssue({ code: "custom", path: ["required_changes"], message: "A passing compliance review cannot retain required changes." });
    if (report.recommended_action !== "pass") context.addIssue({ code: "custom", path: ["recommended_action"], message: "A passing compliance review must recommend pass." });
  } else if (report.publish_readiness !== "blocked") context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A failing compliance review must remain blocked." });
});

export const codexConversionReviewV2Schema = z.object({
  schema_version: z.literal("codexConversionReviewV2"),
  status: z.enum(["pass", "fail", "blocked"]),
  publish_readiness: z.enum(["blocked", "eligible_for_release"]),
  reason_codes: z.array(z.string()),
  hard_gate_failures: z.array(z.unknown()),
  required_rewrites: z.array(z.unknown()),
  recommended_action: z.enum(["pass", "rewrite_visible_fields", "return_to_drafter", "return_to_intent_brief", "return_to_uniqueness_review", "return_to_compliance_review", "resolve_destination_review"]),
  design_trace: codexDesignTraceV2Schema,
}).strict().superRefine((report, context) => {
  if (report.status === "pass") {
    if (report.publish_readiness !== "eligible_for_release") context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A passing conversion review must be eligible for release." });
    if (report.hard_gate_failures.length > 0) context.addIssue({ code: "custom", path: ["hard_gate_failures"], message: "A passing conversion review cannot retain hard-gate failures." });
    if (report.required_rewrites.length > 0) context.addIssue({ code: "custom", path: ["required_rewrites"], message: "A passing conversion review cannot retain required rewrites." });
    if (!isAllowedConversionPassAction(report.recommended_action)) context.addIssue({ code: "custom", path: ["recommended_action"], message: "A passing conversion review must recommend pass." });
  } else if (report.publish_readiness !== "blocked") context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A non-passing conversion review must remain blocked." });
});

export const codexBatchRetroSchema = z.object({
  schema_version: z.union([z.literal(1), z.string().min(1)]),
  status: z.enum(["pass", "fail", "blocked"]),
  reason_codes: z.array(z.string()),
  recurring_failures: z.array(z.unknown()),
  skill_updates: z.array(z.unknown()),
  deferred_items: z.array(z.unknown()),
  next_batch_decision: z.string().min(1),
}).passthrough();

export const codexBatchTimingSchema = z.object({
  schema_version: z.literal("CodexLandingTimingV1"),
  batch_id: codexUuidSchema,
  stages: z.array(z.object({
    name: z.string().min(1),
    started_at: z.string().datetime({ offset: true }),
    completed_at: z.string().datetime({ offset: true }),
    duration_ms: z.number().int().nonnegative(),
  }).strict()).min(1),
  total_duration_ms: z.number().int().nonnegative(),
}).strict();

const qualityOutcomeSchema = z.enum(["pass", "fail", "blocked"]);

export const codexBatchQualityReceiptSchema = z.object({
  schema_version: z.literal("CodexLandingBatchQualityReceiptV1"),
  batch_id: codexUuidSchema,
  mode: z.literal("draft"),
  status: qualityOutcomeSchema,
  gate_status: qualityOutcomeSchema,
  scanners: z.array(z.object({
    name: z.enum(codexQualityScannerNames),
    status: qualityOutcomeSchema,
  }).strict()).length(codexQualityScannerNames.length),
  input_artifact_digest: sha256Schema,
}).strict().superRefine((receipt, context) => {
  const expectedNames = new Set(codexQualityScannerNames);
  const actualNames = receipt.scanners.map((scanner) => scanner.name);
  if (new Set(actualNames).size !== codexQualityScannerNames.length
    || actualNames.some((name) => !expectedNames.has(name))
    || codexQualityScannerNames.some((name) => !actualNames.includes(name))) {
    context.addIssue({ code: "custom", path: ["scanners"], message: "Quality receipt must contain each of the exact 16 registered scanner names once." });
  }
  const scannerStatuses = receipt.scanners.map((scanner) => scanner.status);
  const expectedOutcome = scannerStatuses.includes("blocked")
    ? "blocked"
    : scannerStatuses.includes("fail")
      ? "fail"
      : "pass";
  if (receipt.status !== expectedOutcome) {
    context.addIssue({ code: "custom", path: ["status"], message: "Quality receipt status must match its aggregated scanner outcomes." });
  }
  if (receipt.gate_status !== expectedOutcome) {
    context.addIssue({ code: "custom", path: ["gate_status"], message: "Quality receipt gate status must match its aggregated scanner outcomes." });
  }
});

const exemplarProgressionSchema = z.object({
  stage: z.literal("exemplar"),
}).strict();

const calibrationProgressionSchema = z.object({
  stage: z.literal("calibration"),
  exemplar_batch_id: codexUuidSchema,
  exemplar_manifest_sha256: sha256Schema,
  exemplar_gate_status: z.literal("pass"),
  exemplar_retro_sha256: sha256Schema,
  exemplar_retro_status: z.literal("pass"),
}).strict();

const productionProgressionSchema = z.object({
  stage: z.literal("production_candidate"),
  calibration_batch_id: codexUuidSchema,
  calibration_manifest_sha256: sha256Schema,
  calibration_gate_status: z.literal("pass"),
  calibration_retro_sha256: sha256Schema,
  calibration_retro_status: z.literal("pass"),
}).strict();

export const codexBatchPageSchema = z.object({
  page_blueprint_id: codexUuidSchema,
  slug: landingSlugSchema,
  robots: robotsPolicySchema,
  motion_profile: z.literal("gsap_editorial"),
  artifact: artifactReferenceSchema,
  intent: artifactReferenceSchema,
  reviews: z.object({
    uniqueness: artifactReferenceSchema,
    compliance: artifactReferenceSchema,
    conversion: artifactReferenceSchema,
  }).strict(),
  gate_statuses: z.object({
    intent: codexGateStatusSchema,
    draft: codexGateStatusSchema,
    uniqueness: codexGateStatusSchema,
    compliance: codexGateStatusSchema,
    conversion: codexGateStatusSchema,
  }).strict(),
}).strict();

const visualArtifactSchema = z.object({
  name: z.enum(["desktop-first-viewport", "desktop-full-page", "mobile-first-viewport", "mobile-full-page", "cta-320", "cta-360", "motion-initial", "motion-hero-complete", "motion-mid-page", "reduced-motion", "javascript-disabled", "desktop-contact-sheet", "mobile-contact-sheet"]),
  kind: z.enum(["first-viewport", "full-page", "cta-check", "motion-frame", "reduced-motion", "javascript-disabled", "contact-sheet"]),
  viewport_width: z.number().int().positive(),
  viewport_height: z.number().int().positive(),
  full_page: z.boolean(),
  motion_state: z.enum(["settled", "initial", "hero-complete", "mid-page", "reduced-motion", "javascript-disabled"]).nullable(),
  reduced_motion: z.boolean(),
  javascript_enabled: z.boolean(),
  path: safeBatchRelativePathSchema,
  sha256: sha256Schema,
  byte_size: z.number().int().positive(),
}).strict();

type VisualScreenshotArtifactIdentity = {
  name: string;
  path: string;
  sha256: string;
  byte_size: number;
  kind: string;
  viewport_width: number;
  viewport_height: number;
  full_page: boolean;
  motion_state: string | null;
  reduced_motion: boolean;
  javascript_enabled: boolean;
};

export function visualScreenshotSetSha256(artifacts: ReadonlyArray<VisualScreenshotArtifactIdentity>): string {
  const identityProjection = artifacts
    .map(({ name, path, sha256, byte_size, kind, viewport_width, viewport_height, full_page, motion_state, reduced_motion, javascript_enabled }) => ({
      name,
      path,
      sha256,
      byte_size,
      kind,
      viewport_width,
      viewport_height,
      full_page,
      motion_state,
      reduced_motion,
      javascript_enabled,
    }))
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  return designReferenceSha256(identityProjection);
}

const visualCheckSchema = z.object({
  status: z.enum(["pass", "revise", "fail"]),
  notes: z.array(z.string().min(1)),
}).strict();

const visualReferenceSchema = selectedReferenceTraceSchema;

const requiredVisualArtifacts = [
  ["desktop-first-viewport", "first-viewport", 1440, 900, false, "settled", false, true],
  ["desktop-full-page", "full-page", 1440, 900, true, "settled", false, true],
  ["mobile-first-viewport", "first-viewport", 390, 844, false, "settled", false, true],
  ["mobile-full-page", "full-page", 390, 844, true, "settled", false, true],
  ["cta-320", "cta-check", 320, 844, false, "settled", false, true],
  ["cta-360", "cta-check", 360, 844, false, "settled", false, true],
  ["motion-initial", "motion-frame", 1440, 900, false, "initial", false, true],
  ["motion-hero-complete", "motion-frame", 1440, 900, false, "hero-complete", false, true],
  ["motion-mid-page", "motion-frame", 1440, 900, false, "mid-page", false, true],
  ["reduced-motion", "reduced-motion", 1440, 900, false, "reduced-motion", true, true],
  ["javascript-disabled", "javascript-disabled", 390, 844, false, "javascript-disabled", false, false],
  ["desktop-contact-sheet", "contact-sheet", 1440, 900, true, null, false, true],
  ["mobile-contact-sheet", "contact-sheet", 390, 844, true, null, false, true],
] as const;

/** Immutable local visual-review record. Raw images remain CI/local artifacts. */
export const visualDesignReviewV1Schema = z.object({
  schema_version: z.literal("VisualDesignReviewV1"),
  batch_id: codexUuidSchema,
  product_id: codexUuidSchema,
  page_blueprint_id: codexUuidSchema,
  slug: landingSlugSchema,
  intent_keyword: z.string().min(1),
  buyer_decision: z.string().min(1),
  draft_sha256: sha256Schema,
  screenshot_set_sha256: sha256Schema,
  catalogue_sha256: sha256Schema,
  recipe_id: z.string().regex(/^recipe-[a-f0-9]{16}$/),
  recipe_fingerprint: sha256Schema,
  selected_references: z.array(visualReferenceSchema).min(2).max(3),
  brand_content_assets_not_copied: z.object({
    status: z.enum(["pass", "revise", "fail"]),
    notes: z.array(z.string().min(1)).min(1),
  }).strict(),
  checks: z.object({
    desktop: visualCheckSchema,
    mobile: visualCheckSchema,
    cta: visualCheckSchema,
    overflow: visualCheckSchema,
    motion: visualCheckSchema,
    reduced_motion: visualCheckSchema,
    contact_sheet: visualCheckSchema,
    presentation_diversity: visualCheckSchema,
  }).strict(),
  artifacts: z.array(visualArtifactSchema).length(requiredVisualArtifacts.length),
  status: z.enum(["pass", "revise", "fail"]),
  publish_readiness: z.enum(["blocked", "eligible_for_next_gate"]),
  reason_codes: z.array(z.string().min(1)),
  required_changes: z.array(z.string().min(1)),
}).strict().superRefine((review, context) => {
  if (new Set(review.selected_references.map((reference) => reference.reference_id)).size !== review.selected_references.length) {
    context.addIssue({ code: "custom", path: ["selected_references"], message: "Visual review references must be unique." });
  }
  if (review.selected_references.some((reference) => new Set(reference.influenced_axes).size !== reference.influenced_axes.length)) {
    context.addIssue({ code: "custom", path: ["selected_references"], message: "Visual review references cannot repeat influenced axes." });
  }
  const artifactsByName = new Map(review.artifacts.map((artifact) => [artifact.name, artifact]));
  if (artifactsByName.size !== requiredVisualArtifacts.length) {
    context.addIssue({ code: "custom", path: ["artifacts"], message: "Visual review must include each required artifact exactly once." });
  }
  for (const [name, kind, width, height, fullPage, motionState, reducedMotion, javascriptEnabled] of requiredVisualArtifacts) {
    const artifact = artifactsByName.get(name);
    if (!artifact || artifact.kind !== kind || artifact.viewport_width !== width || artifact.viewport_height !== height
      || artifact.full_page !== fullPage || artifact.motion_state !== motionState || artifact.reduced_motion !== reducedMotion
      || artifact.javascript_enabled !== javascriptEnabled || artifact.path !== `${review.slug}/${name}.webp`) {
      context.addIssue({ code: "custom", path: ["artifacts"], message: `Visual review artifact ${name} must match the fixed capture plan.` });
    }
  }
  if (review.screenshot_set_sha256 !== visualScreenshotSetSha256(review.artifacts)) {
    context.addIssue({ code: "custom", path: ["screenshot_set_sha256"], message: "Screenshot-set digest must match the canonical identity projection of all required visual artifacts." });
  }
  if (review.status === "pass") {
    if (review.publish_readiness !== "eligible_for_next_gate") context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A passing visual review must be eligible for the next gate." });
    if (review.required_changes.length > 0) context.addIssue({ code: "custom", path: ["required_changes"], message: "A passing visual review cannot retain required changes." });
    if (review.brand_content_assets_not_copied.status !== "pass" || Object.values(review.checks).some((check) => check.status !== "pass")) {
      context.addIssue({ code: "custom", path: ["checks"], message: "A passing visual review requires every structural and copying check to pass." });
    }
  } else if (review.publish_readiness !== "blocked") {
    context.addIssue({ code: "custom", path: ["publish_readiness"], message: "A non-passing visual review must remain blocked." });
  }
});

export const codexBatchPageV2Schema = codexBatchPageSchema.extend({
  reviews: codexBatchPageSchema.shape.reviews.extend({ visual: artifactReferenceSchema }).strict(),
  gate_statuses: codexBatchPageSchema.shape.gate_statuses.extend({ visual: codexGateStatusSchema }).strict(),
}).strict();

export const codexLandingBatchV1Schema = z.object({
  schema_version: z.literal("CodexLandingBatchV1"),
  batch_id: codexUuidSchema,
  product_id: codexUuidSchema,
  batch_type: z.enum(["exemplar", "calibration", "production_candidate"]),
  git_commit_sha: gitCommitShaSchema,
  created_at: z.string().datetime({ offset: true }),
  product_pack: artifactReferenceSchema,
  progression: z.discriminatedUnion("stage", [exemplarProgressionSchema, calibrationProgressionSchema, productionProgressionSchema]),
  pages: z.array(codexBatchPageSchema).min(1).max(10),
  quality: artifactReferenceSchema,
  retro: artifactReferenceSchema.extend({ gate_status: codexGateStatusSchema }).strict(),
  timing: artifactReferenceSchema,
}).strict().superRefine((manifest, context) => {
  if (manifest.progression.stage !== manifest.batch_type) {
    context.addIssue({ code: "custom", path: ["progression"], message: "Batch type and progression stage must match." });
  }
  if (manifest.batch_type === "exemplar" && manifest.pages.length !== 1) {
    context.addIssue({ code: "custom", path: ["pages"], message: "An exemplar batch must contain exactly one candidate." });
  }
  if (manifest.batch_type === "calibration" && manifest.pages.length !== 3) {
    context.addIssue({ code: "custom", path: ["pages"], message: "A calibration batch must contain exactly three candidates." });
  }
  if (manifest.batch_type === "production_candidate" && manifest.pages.length > 10) {
    context.addIssue({ code: "custom", path: ["pages"], message: "A production-candidate batch may contain at most ten candidates." });
  }
  if (new Set(manifest.pages.map((page) => page.slug)).size !== manifest.pages.length) {
    context.addIssue({ code: "custom", path: ["pages"], message: "Page slugs must be unique within a batch." });
  }
  if (new Set(manifest.pages.map((page) => page.page_blueprint_id)).size !== manifest.pages.length) {
    context.addIssue({ code: "custom", path: ["pages"], message: "Page-blueprint IDs must be unique within a batch." });
  }
});

export const codexLandingBatchV2Schema = z.object({
  schema_version: z.literal("CodexLandingBatchV2"),
  batch_id: codexUuidSchema,
  product_id: codexUuidSchema,
  batch_type: z.enum(["exemplar", "calibration", "production_candidate"]),
  git_commit_sha: gitCommitShaSchema,
  created_at: z.string().datetime({ offset: true }),
  product_pack: artifactReferenceSchema,
  progression: z.discriminatedUnion("stage", [exemplarProgressionSchema, calibrationProgressionSchema, productionProgressionSchema]),
  pages: z.array(codexBatchPageV2Schema).min(1).max(10),
  quality: artifactReferenceSchema,
  retro: artifactReferenceSchema.extend({ gate_status: codexGateStatusSchema }).strict(),
  timing: artifactReferenceSchema,
}).strict().superRefine((manifest, context) => {
  if (manifest.progression.stage !== manifest.batch_type) context.addIssue({ code: "custom", path: ["progression"], message: "Batch type and progression stage must match." });
  if (manifest.batch_type === "exemplar" && manifest.pages.length !== 1) context.addIssue({ code: "custom", path: ["pages"], message: "An exemplar batch must contain exactly one candidate." });
  if (manifest.batch_type === "calibration" && manifest.pages.length !== 3) context.addIssue({ code: "custom", path: ["pages"], message: "A calibration batch must contain exactly three candidates." });
  if (new Set(manifest.pages.map((page) => page.slug)).size !== manifest.pages.length) context.addIssue({ code: "custom", path: ["pages"], message: "Page slugs must be unique within a batch." });
  if (new Set(manifest.pages.map((page) => page.page_blueprint_id)).size !== manifest.pages.length) context.addIssue({ code: "custom", path: ["pages"], message: "Page-blueprint IDs must be unique within a batch." });
});

export const codexLandingBatchManifestSchema = z.union([codexLandingBatchV1Schema, codexLandingBatchV2Schema]);

export const codexEditorialDraftSchema = pageBlueprintSchema.superRefine((blueprint, context) => {
  if (!["editorial_v2", "reference_composed_v1"].includes(blueprint.metadata.design_profile)) {
    context.addIssue({ code: "custom", path: ["metadata", "design_profile"], message: "Codex batches require editorial_v2 or reference_composed_v1." });
  }
  if (blueprint.metadata.motion_profile !== "gsap_editorial") {
    context.addIssue({ code: "custom", path: ["metadata", "motion_profile"], message: "Codex batches require the fixed gsap_editorial motion profile." });
  }
  if (!robotsPolicySchema.safeParse(blueprint.metadata.robots).success) {
    context.addIssue({ code: "custom", path: ["metadata", "robots"], message: "Unsupported robots policy." });
  }
  const answerWords = blueprint.hero.answer_snippet?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  if (answerWords < 40 || answerWords > 60) {
    context.addIssue({ code: "custom", path: ["hero", "answer_snippet"], message: "Editorial v2 answer snippet must contain 40–60 words." });
  }
  if (blueprint.hero.primary_cta_label.length > 32 || /(?:->|[→↗➜])/u.test(blueprint.hero.primary_cta_label)) {
    context.addIssue({ code: "custom", path: ["hero", "primary_cta_label"], message: "CTA label must be 32 characters or fewer and cannot contain an arrow glyph." });
  }
});

export type ProductEvidencePackV1 = z.infer<typeof productEvidencePackV1Schema>;
export type CodexLandingBatchV1 = z.infer<typeof codexLandingBatchV1Schema>;
export type CodexLandingBatchV2 = z.infer<typeof codexLandingBatchV2Schema>;
export type CodexLandingBatchManifest = z.infer<typeof codexLandingBatchManifestSchema>;
export type CodexBatchPage = z.infer<typeof codexBatchPageSchema>;
export type CodexBatchPageV2 = z.infer<typeof codexBatchPageV2Schema>;
export type CodexBatchQualityReceiptV1 = z.infer<typeof codexBatchQualityReceiptSchema>;
export type VisualDesignReviewV1 = z.infer<typeof visualDesignReviewV1Schema>;
