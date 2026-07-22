import { z } from "zod";

export const referenceAuditFailureReasons = [
  "network_timeout",
  "http_error",
  "bot_challenge",
  "login_required",
  "paywall",
  "cross_domain_redirect",
  "capture_invalid",
  "insufficient_design_evidence",
  "classification_low_confidence",
] as const;

const categorySchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const DesignReferenceSourceV1 = z.object({
  id: z.string().regex(/^lp-ref-\d{4}$/),
  ordinal: z.number().int().min(1).max(100),
  name: z.string().min(1),
  source_url: z.string().url().refine((value) => new URL(value).protocol === "https:"),
  primary_product_category: categorySchema.default("unclassified"),
  category_tags: z.array(categorySchema).min(1).default(["unclassified"]),
  audit: z.object({
    status: z.enum(["pending", "active", "unavailable"]),
    audited_at: z.string().datetime({ offset: true }).nullable(),
    attempts: z.number().int().min(0).max(2),
    resolved_url: z.string().url().nullable(),
    response_status: z.number().int().min(100).max(599).nullable(),
    failure_reason: z.enum(referenceAuditFailureReasons).nullable(),
  }).strict(),
}).strict().superRefine((source, context) => {
  const unavailable = source.audit.status === "unavailable";
  if (unavailable !== Boolean(source.audit.failure_reason)) {
    context.addIssue({ code: "custom", path: ["audit", "failure_reason"], message: "Only unavailable sources require a failure reason." });
  }
  if (source.audit.status === "pending" && (source.audit.audited_at || source.audit.attempts || source.audit.resolved_url || source.audit.response_status)) {
    context.addIssue({ code: "custom", path: ["audit"], message: "Pending sources cannot claim an audit result." });
  }
});

export const DesignReferenceSourceRegistryV1 = z.object({
  schema_version: z.literal("DesignReferenceSourceRegistryV1"),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  sources: z.array(DesignReferenceSourceV1).length(100),
}).strict().superRefine((registry, context) => {
  const ids = registry.sources.map((source) => source.id);
  const urls = registry.sources.map((source) => source.source_url);
  const ordinals = registry.sources.map((source) => source.ordinal);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: ["sources"], message: "Source IDs must be unique." });
  if (new Set(urls).size !== urls.length) context.addIssue({ code: "custom", path: ["sources"], message: "Source URLs must be unique." });
  if (new Set(ordinals).size !== ordinals.length || !ordinals.every((ordinal, index) => ordinal === index + 1)) {
    context.addIssue({ code: "custom", path: ["sources"], message: "Source ordinals must be the ordered range 1 through 100." });
  }
  registry.sources.forEach((source, index) => {
    if (source.id !== `lp-ref-${String(index + 1).padStart(4, "0")}`) {
      context.addIssue({ code: "custom", path: ["sources", index, "id"], message: "Source ID must match its stable ordinal." });
    }
  });
});

export type DesignReferenceSourceV1 = z.infer<typeof DesignReferenceSourceV1>;
export type DesignReferenceSourceRegistryV1 = z.infer<typeof DesignReferenceSourceRegistryV1>;
export type ReferenceAuditFailureReason = typeof referenceAuditFailureReasons[number];

export function resetUnavailableSources(registry: DesignReferenceSourceRegistryV1, reasons: ReferenceAuditFailureReason[]) {
  const selected = new Set(reasons);
  return DesignReferenceSourceRegistryV1.parse({
    ...registry,
    sources: registry.sources.map((source) => source.audit.status === "unavailable" && source.audit.failure_reason && selected.has(source.audit.failure_reason)
      ? { ...source, audit: { status: "pending", audited_at: null, attempts: 0, resolved_url: null, response_status: null, failure_reason: null } }
      : source),
  });
}
