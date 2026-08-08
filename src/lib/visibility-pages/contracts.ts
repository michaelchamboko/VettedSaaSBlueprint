import { createHash } from "node:crypto";

import { z } from "zod";

export const VISIBILITY_PAGE_PATHS = [
  "/ai-voice-generators",
  "/email-marketing-software",
  "/ai-voice-generators/elevenlabs-alternatives",
  "/email-marketing-software/moosend-alternatives",
  "/comparisons/elevenlabs-vs-murf",
  "/comparisons/moosend-vs-mailchimp",
  "/guides/how-to-evaluate-ai-voice-quality",
  "/guides/ai-voice-generators-for-youtube",
  "/tools/email-marketing-cost-calculator",
  "/guides/first-email-automation-workflow",
] as const;

export type VisibilityPath = (typeof VISIBILITY_PAGE_PATHS)[number];
export const visibilityPathSchema = z.enum(VISIBILITY_PAGE_PATHS);
export const visibilityPageKindSchema = z.enum([
  "category_hub",
  "alternatives",
  "comparison",
  "guide",
  "calculator",
]);

const isoDateSchema = z.string().datetime({ offset: true });
const claimIdSchema = z.string().min(1).regex(/^[a-z0-9][a-z0-9_-]*$/);
const sameOriginPathSchema = z
  .string()
  .regex(/^\/[a-z0-9][a-z0-9/-]*$/)
  .refine((value) => !value.includes("//") && !value.includes(".."), "Expected a safe same-origin path.");

const plainTextSchema = z
  .string()
  .min(1)
  .max(5000)
  .refine((value) => !/[<>]/.test(value), "Visibility content must be plain text.");

const internalLinkSchema = z
  .object({
    href: sameOriginPathSchema,
    label: plainTextSchema.max(120),
    description: plainTextSchema.max(320).optional(),
  })
  .strict();

const visibilityBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("prose"), heading: plainTextSchema.max(180).optional(), paragraphs: z.array(plainTextSchema).min(1) }).strict(),
  z.object({ type: z.literal("checklist"), heading: plainTextSchema.max(180), items: z.array(plainTextSchema.max(400)).min(1) }).strict(),
  z.object({ type: z.literal("steps"), heading: plainTextSchema.max(180), steps: z.array(z.object({ title: plainTextSchema.max(160), description: plainTextSchema.max(500) }).strict()).min(1) }).strict(),
  z.object({ type: z.literal("decision_table"), heading: plainTextSchema.max(180), columns: z.array(plainTextSchema.max(80)).min(2).max(5), rows: z.array(z.array(plainTextSchema.max(500)).min(2).max(5)).min(1) }).strict(),
  z.object({ type: z.literal("callout"), tone: z.enum(["neutral", "caution"]), title: plainTextSchema.max(160), body: plainTextSchema.max(800) }).strict(),
  z.object({ type: z.literal("faq"), items: z.array(z.object({ question: plainTextSchema.max(240), answer: plainTextSchema.max(800) }).strict()).min(1) }).strict(),
  z.object({ type: z.literal("internal_link_cards"), heading: plainTextSchema.max(180), links: z.array(internalLinkSchema).min(1) }).strict(),
  z.object({ type: z.literal("calculator"), heading: plainTextSchema.max(180), description: plainTextSchema.max(600) }).strict(),
]);

export const visibilityEvidencePackSchema = z
  .object({
    schema_version: z.literal("VisibilityEvidencePackV1"),
    page_id: claimIdSchema,
    sources: z.array(z.object({
      id: claimIdSchema,
      url: z.string().url().refine((value) => new URL(value).protocol === "https:"),
      source_hash: z.string().regex(/^[a-f0-9]{64}$/),
      retrieved_at: isoDateSchema,
      review_by: isoDateSchema,
      usage_allowed: z.literal(true),
    }).strict()).min(1),
    claims: z.array(z.object({
      id: claimIdSchema,
      source_id: claimIdSchema,
      allowed_wording: plainTextSchema.max(1000),
      risk_level: z.enum(["low", "high"]),
      expires_at: isoDateSchema,
    }).strict()).min(1),
  })
  .strict()
  .superRefine((pack, context) => {
    const sourceIds = new Set(pack.sources.map((source) => source.id));
    const now = Date.now();
    for (const [index, claim] of pack.claims.entries()) {
      if (!sourceIds.has(claim.source_id)) {
        context.addIssue({ code: "custom", path: ["claims", index, "source_id"], message: "Claim must resolve to a source." });
      }
      if (Date.parse(claim.expires_at) <= now) {
        context.addIssue({ code: "custom", path: ["claims", index, "expires_at"], message: "Claim evidence is expired." });
      }
    }
  });

export const visibilityPageSchema = z
  .object({
    schema_version: z.literal("VisibilityPageV1"),
    id: claimIdSchema,
    path: visibilityPathSchema,
    kind: visibilityPageKindSchema,
    cluster_id: z.enum(["ai_voice", "email_marketing"]),
    title: plainTextSchema.max(70),
    description: plainTextSchema.max(160),
    modified_at: isoDateSchema,
    hero: z.object({ eyebrow: plainTextSchema.max(80), headline: plainTextSchema.max(120), summary: plainTextSchema.max(500) }).strict(),
    claim_ids: z.array(claimIdSchema).default([]),
    relevant_review_path: sameOriginPathSchema,
    related_paths: z.array(visibilityPathSchema).min(1),
    blocks: z.array(visibilityBlockSchema).min(1),
  })
  .strict()
  .superRefine((page, context) => {
    if (!VISIBILITY_PAGE_PATHS.includes(page.path)) {
      context.addIssue({ code: "custom", path: ["path"], message: "Path is not in the frozen visibility catalogue." });
    }
    if (page.related_paths.includes(page.path)) {
      context.addIssue({ code: "custom", path: ["related_paths"], message: "Page may not link to itself." });
    }
  });

export type VisibilityPageV1 = z.infer<typeof visibilityPageSchema>;
export type VisibilityEvidencePackV1 = z.infer<typeof visibilityEvidencePackSchema>;

export type VisibilityPublicationSummary = {
  id: string;
  path: VisibilityPath;
  kind: z.infer<typeof visibilityPageKindSchema>;
  title: string;
  description: string;
  modifiedAt: string;
  earliestExpiresAt: string;
  relevantReviewPath: string;
  relatedPaths: VisibilityPath[];
};

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function assertNoAffiliateUrl(value: string): void {
  if (/partnerstack|\/r\/affiliate|affiliate/i.test(value)) {
    throw new Error("Visibility artifacts may not contain affiliate URLs.");
  }
}
