import { z } from "zod";
import { LONG_FORM_AFFILIATE_MAX_WORDS, LONG_FORM_AFFILIATE_MIN_WORDS } from "../editorial/article-visible-word-count";

export const LONG_FORM_AFFILIATE_INSTRUCTION = ".agents/skills/eleanor-editorial/references/long-form-affiliate.md";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const nonempty = z.string().trim().min(1);
const passageSchema = z.object({ artifactPath: nonempty, quote: nonempty, explanation: nonempty }).strict();

export const longFormAffiliateAssessmentSchema = z.object({
  artifactFingerprint: hash,
  wordCount: z.number().int().nonnegative(),
  approvedAffiliateUrl: z.string().url(),
  brief: z.object({
    reader: nonempty,
    purchaseDecision: nonempty,
    strongestEvidencedAdvantage: nonempty,
    disqualifyingCondition: nonempty,
    affiliateNextStep: nonempty,
  }).strict(),
  lengthStatus: z.enum(["pass", "needs-expansion", "needs-reduction"]),
  draftingFeedback: nonempty,
}).strict();

export const longFormAffiliateReviewSchema = z.object({
  artifactFingerprint: hash,
  wordCount: z.number().int().min(LONG_FORM_AFFILIATE_MIN_WORDS).max(LONG_FORM_AFFILIATE_MAX_WORDS),
  approvedAffiliateUrl: z.string().url(),
  passages: z.object({ fit: passageSchema, rationale: passageSchema, alternative: passageSchema, nextStep: passageSchema }).strict(),
  checks: z.object({
    padding: z.enum(["pass", "fail", "insufficient-evidence"]),
    unsupportedClaims: z.enum(["pass", "fail", "insufficient-evidence"]),
    misleadingCta: z.enum(["pass", "fail", "insufficient-evidence"]),
    unresolvedObjections: z.enum(["pass", "fail", "insufficient-evidence"]),
  }).strict(),
  findings: z.array(z.object({
    category: z.enum(["duplicated-argument", "padding", "unsupported-claim", "misleading-cta", "unresolved-objection"]),
    description: nonempty,
    artifactPath: nonempty,
    quote: nonempty,
    disposition: z.enum(["resolved", "unresolved"]),
  }).strict()),
}).strict();

export type LongFormAffiliateAssessment = z.infer<typeof longFormAffiliateAssessmentSchema>;
export type LongFormAffiliateReview = z.infer<typeof longFormAffiliateReviewSchema>;
type ExpectedBinding = { artifactFingerprint: string; wordCount: number; approvedAffiliateUrl: string };

export function approvedAffiliateUrl(binding: { format?: string; transformation?: { commercialMode?: string; resolvedAffiliateUrl?: string }; affiliateUrl?: string | null }): string | undefined {
  if (binding.format !== "direct-review") return undefined;
  if (binding.transformation && binding.transformation.commercialMode !== "approved") return undefined;
  return binding.transformation?.resolvedAffiliateUrl ?? binding.affiliateUrl ?? undefined;
}

export function isLongFormAffiliateBinding(binding: Parameters<typeof approvedAffiliateUrl>[0]): boolean {
  return approvedAffiliateUrl(binding) !== undefined;
}

function atPath(value: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((current, key) => current !== null && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

function assertPassage(passage: { artifactPath: string; quote: string }, artifact: unknown, visiblePaths: string[]): void {
  if (!visiblePaths.includes(passage.artifactPath)) throw new Error("LONG_FORM_AFFILIATE_PASSAGE_NOT_VISIBLE");
  const value = atPath(artifact, passage.artifactPath);
  if (typeof value !== "string" || !value.includes(passage.quote)) throw new Error("LONG_FORM_AFFILIATE_PASSAGE_MISMATCH");
}

function assertBinding(value: ExpectedBinding, expected: ExpectedBinding): void {
  if (value.artifactFingerprint !== expected.artifactFingerprint) throw new Error("LONG_FORM_AFFILIATE_ARTIFACT_MISMATCH");
  if (value.wordCount !== expected.wordCount) throw new Error("LONG_FORM_AFFILIATE_COUNT_MISMATCH");
  if (value.approvedAffiliateUrl !== expected.approvedAffiliateUrl) throw new Error("LONG_FORM_AFFILIATE_DESTINATION_MISMATCH");
}

export function assertLongFormAffiliateAssessment(value: LongFormAffiliateAssessment, expected: ExpectedBinding): void {
  assertBinding(value, expected);
  const expectedStatus = value.wordCount < LONG_FORM_AFFILIATE_MIN_WORDS ? "needs-expansion" : value.wordCount > LONG_FORM_AFFILIATE_MAX_WORDS ? "needs-reduction" : "pass";
  if (value.lengthStatus !== expectedStatus) throw new Error("LONG_FORM_AFFILIATE_LENGTH_STATUS_MISMATCH");
}

export function assertLongFormAffiliateReview(value: LongFormAffiliateReview, artifact: unknown, visiblePaths: string[], expected: ExpectedBinding): void {
  assertBinding(value, expected);
  if (Object.values(value.checks).some((status) => status !== "pass")) throw new Error("LONG_FORM_AFFILIATE_REVIEW_FAILED");
  for (const passage of Object.values(value.passages)) assertPassage(passage, artifact, visiblePaths);
  for (const finding of value.findings) {
    assertPassage(finding, artifact, visiblePaths);
    if (finding.disposition === "unresolved") throw new Error("LONG_FORM_AFFILIATE_UNRESOLVED_FINDING");
  }
}
