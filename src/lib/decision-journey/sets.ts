import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { z } from "zod";

import {
  approvedJourneyCatalogueReferences,
  journeyCompositionFamilies,
} from "./presentation-options";

const evidenceStateSchema = z.enum(["validated", "partial", "insufficient", "conflicting"]);
const safeSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const sourceReferenceSchema = z.object({
  documentId: z.string().min(1),
  heading: z.string().min(1),
  sectionUid: z.string().min(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedAt: z.string().date(),
}).strict();

export function fingerprintDecisionSetSources(sources: z.infer<typeof sourceReferenceSchema>[]): string {
  return createHash("sha256").update(JSON.stringify(sources), "utf8").digest("hex");
}

const claimSchema = z.object({
  statement: z.string().min(1),
  evidenceState: evidenceStateSchema,
  sources: z.array(sourceReferenceSchema).min(1),
}).strict();

const blockSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  claims: z.array(claimSchema).min(1),
}).strict();

const pageSchema = z.object({
  version: z.literal(2),
  pageType: z.enum(["decision-hub", "solution-hub", "scenario"]),
  canonicalPath: z.string().startsWith("/"),
  headline: z.string().min(1),
  decisionContext: z.string().min(1),
  evidenceState: evidenceStateSchema,
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  reviewDate: z.string().date(),
  blocks: z.array(blockSchema).min(1),
  motionBrief: z.object({
    majorPatterns: z.array(z.string().min(1)).min(1).max(3),
    reducedMotion: z.string().min(1),
  }).strict(),
  presentation: z.object({
    compositionFamily: z.enum(journeyCompositionFamilies),
    catalogueReferences: z.array(z.enum(approvedJourneyCatalogueReferences)).min(2).max(3),
    artDirection: z.string().min(1),
  }).strict(),
  connectedRoutes: z.array(z.string().startsWith("/")).length(2),
}).strict();

export const decisionSetV2Schema = z.object({
  version: z.literal(2),
  slug: safeSlugSchema,
  title: z.string().min(1),
  userProblem: z.string().min(1),
  publishedAt: z.string().date(),
  reviewDate: z.string().date(),
  evidenceState: evidenceStateSchema,
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
  pages: z.object({
    decisionHub: pageSchema.extend({ pageType: z.literal("decision-hub"), blocks: z.array(blockSchema).length(12) }),
    solutionHub: pageSchema.extend({ pageType: z.literal("solution-hub"), blocks: z.array(blockSchema).length(7) }),
    scenario: pageSchema.extend({ pageType: z.literal("scenario"), blocks: z.array(blockSchema).length(12) }),
  }).strict(),
  report: z.object({
    version: z.literal(1),
    context: z.string().min(1),
    evidenceState: evidenceStateSchema,
    conditions: z.array(z.string().min(1)).min(1),
    limitations: z.array(z.string().min(1)).min(1),
    fullReasoningPath: z.string().startsWith("/decision-hub/"),
  }).strict(),
}).strict().superRefine((set, context) => {
  const expected = {
    decisionHub: `/decision-hub/${set.slug}`,
    solutionHub: `/solution-hub/${set.slug}`,
    scenario: `/scenarios/${set.slug}`,
  } as const;
  const pages = set.pages;
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (pages[key].canonicalPath !== expected[key]) {
      context.addIssue({ code: "custom", path: ["pages", key, "canonicalPath"], message: "Canonical path must match the set slug." });
    }
    const connected = Object.values(expected).filter((route) => route !== expected[key]).sort();
    if (pages[key].connectedRoutes.slice().sort().join("\n") !== connected.join("\n")) {
      context.addIssue({ code: "custom", path: ["pages", key, "connectedRoutes"], message: "Connected routes must identify the other two pages in this set." });
    }
    if (pages[key].sourceFingerprint !== set.sourceFingerprint || pages[key].evidenceState !== set.evidenceState) {
      context.addIssue({ code: "custom", path: ["pages", key], message: "Page evidence identity must match its set." });
    }
  }
  if (set.report.fullReasoningPath !== expected.decisionHub || set.report.evidenceState !== set.evidenceState) {
    context.addIssue({ code: "custom", path: ["report"], message: "Decision report must link to the set reasoning and preserve its evidence state." });
  }
  if (set.sourceFingerprint !== fingerprintDecisionSetSources(set.sourceReferences)) {
    context.addIssue({ code: "custom", path: ["sourceFingerprint"], message: "Source fingerprint must be derived from the declared source references." });
  }
});

export type DecisionJourneyRecordV2 = z.infer<typeof pageSchema>;
export type DecisionSetV2 = z.infer<typeof decisionSetV2Schema>;

export function loadDecisionSetsFromDirectory(directory: string): DecisionSetV2[] {
  if (!existsSync(directory)) return [];
  const filenames = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();
  const slugs = new Set<string>();
  return filenames.map((filename) => {
    const record = decisionSetV2Schema.parse(JSON.parse(readFileSync(path.join(directory, filename), "utf8")));
    if (filename !== `${record.slug}.json`) throw new Error(`Decision set filename must match its slug: ${filename}`);
    if (slugs.has(record.slug)) throw new Error(`Duplicate decision set slug: ${record.slug}`);
    slugs.add(record.slug);
    return record;
  });
}

export function listDecisionSets(): DecisionSetV2[] {
  return loadDecisionSetsFromDirectory(path.join(process.cwd(), "src", "content", "decision-journeys", "sets"));
}

export function getDecisionSet(slug: string): DecisionSetV2 | null {
  return listDecisionSets().find((set) => set.slug === slug) ?? null;
}

export function getDecisionSetPage(slug: string, pageType: DecisionJourneyRecordV2["pageType"]): DecisionJourneyRecordV2 | null {
  const set = getDecisionSet(slug);
  if (!set) return null;
  if (pageType === "decision-hub") return set.pages.decisionHub;
  if (pageType === "solution-hub") return set.pages.solutionHub;
  return set.pages.scenario;
}
