import catalogue from "@/content/decision-journeys/catalogue.json";
import { z } from "zod";
import { approvedJourneyCatalogueReferences, journeyCompositionFamilies } from "./presentation-options";

export type EvidenceState = "validated" | "partial" | "insufficient" | "conflicting";

const sourceReferenceSchema = z.object({
  documentId: z.string().min(1),
  heading: z.string().min(1),
  sectionUid: z.string().min(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedAt: z.string().date(),
}).strict();

const decisionJourneyRecordSchema = z.object({
  version: z.literal(1),
  pageType: z.enum(["decision-hub", "solution-hub", "scenario"]),
  canonicalPath: z.enum(["/decision-hub", "/solution-hub", "/scenarios"]),
  headline: z.string().min(1),
  decisionContext: z.string().min(1),
  evidenceState: z.enum(["validated", "partial", "insufficient", "conflicting"]),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  reviewDate: z.string().date(),
  blocks: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    claims: z.array(z.object({
      statement: z.string().min(1),
      evidenceState: z.enum(["validated", "partial", "insufficient", "conflicting"]),
      sources: z.array(sourceReferenceSchema).min(1),
    }).strict()).min(1),
  }).strict()).min(1),
  motionBrief: z.object({
    majorPatterns: z.array(z.string().min(1)).max(3),
    reducedMotion: z.string().min(1),
  }).strict(),
  presentation: z.object({
    compositionFamily: z.enum(journeyCompositionFamilies),
    catalogueReferences: z.array(z.enum(approvedJourneyCatalogueReferences)).min(2).max(3),
    artDirection: z.string().min(1),
  }).strict().optional(),
  connectedRoutes: z.array(z.enum(["/decision-hub", "/solution-hub", "/scenarios"])).min(1),
}).strict();

export type SourceReferenceV1 = z.infer<typeof sourceReferenceSchema>;
export type DecisionJourneyClaimV1 = z.infer<typeof decisionJourneyRecordSchema>["blocks"][number]["claims"][number];
export type DecisionJourneyBlockV1 = z.infer<typeof decisionJourneyRecordSchema>["blocks"][number];
export type MotionBriefV1 = z.infer<typeof decisionJourneyRecordSchema>["motionBrief"];
export type DecisionJourneyRecordV1 = z.infer<typeof decisionJourneyRecordSchema>;

export const decisionJourneyCatalog = z.record(z.string(), decisionJourneyRecordSchema).parse(catalogue);
