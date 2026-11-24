import { z } from "zod";
import { approvedJourneyCatalogueReferences, journeyCompositionFamilies } from "./presentation-options";

export const evidenceStateSchema = z.enum(["validated", "partial", "insufficient", "conflicting"]);

export const sourceReferenceSchema = z.object({
  documentId: z.string().min(1),
  heading: z.string().min(1),
  sectionUid: z.string().min(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedAt: z.string().date(),
}).strict();

export const journeyPresentationSchema = z.object({
  compositionFamily: z.enum(journeyCompositionFamilies),
  catalogueReferences: z.array(z.enum(approvedJourneyCatalogueReferences)).min(2).max(3),
  artDirection: z.string().min(1),
}).strict();

export const journeyPageIdentityFields = {
  headline: z.string().min(1),
  decisionContext: z.string().min(1),
  evidenceState: evidenceStateSchema,
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  reviewDate: z.string().date(),
};
