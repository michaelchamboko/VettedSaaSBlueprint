import catalogue from "@/content/decision-journeys/catalogue.json";
import { z } from "zod";
import { evidenceStateSchema, journeyPageIdentityFields, journeyPresentationSchema, sourceReferenceSchema } from "./shared-schemas";

export type EvidenceState = "validated" | "partial" | "insufficient" | "conflicting";

const decisionJourneyRecordSchema = z.object({
  version: z.literal(1),
  pageType: z.enum(["decision-hub", "solution-hub", "scenario"]),
  canonicalPath: z.enum(["/decision-hub", "/solution-hub", "/scenarios"]),
  ...journeyPageIdentityFields,
  blocks: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    claims: z.array(z.object({
      statement: z.string().min(1),
      evidenceState: evidenceStateSchema,
      sources: z.array(sourceReferenceSchema).min(1),
    }).strict()).min(1),
  }).strict()).min(1),
  motionBrief: z.object({
    majorPatterns: z.array(z.string().min(1)).max(3),
    reducedMotion: z.string().min(1),
  }).strict(),
  presentation: journeyPresentationSchema.optional(),
  connectedRoutes: z.array(z.enum(["/decision-hub", "/solution-hub", "/scenarios"])).min(1),
}).strict();

export type SourceReferenceV1 = z.infer<typeof sourceReferenceSchema>;
export type DecisionJourneyClaimV1 = z.infer<typeof decisionJourneyRecordSchema>["blocks"][number]["claims"][number];
export type DecisionJourneyBlockV1 = z.infer<typeof decisionJourneyRecordSchema>["blocks"][number];
export type MotionBriefV1 = z.infer<typeof decisionJourneyRecordSchema>["motionBrief"];
export type DecisionJourneyRecordV1 = z.infer<typeof decisionJourneyRecordSchema>;

export const decisionJourneyCatalog = z.record(z.string(), decisionJourneyRecordSchema).parse(catalogue);
