import { createSourceEligibilityService } from "./source-eligibility";
import { createEvidenceConfidenceService } from "./evidence-confidence";
import { createEvidenceConflictService } from "./evidence-conflict";
import { createProductScoringService } from "./product-scoring";
import { createFitScoringService } from "./fit-scoring";
import { createRecommendationEvalService } from "./recommendation-eval";
import { createAffiliateSeparationService } from "./affiliate-separation";
import { createPageCompletenessService } from "./page-completeness";
import { createPublicationEligibilityService } from "./publication-eligibility";

export * from "./source-eligibility";
export * from "./evidence-confidence";
export * from "./evidence-conflict";
export * from "./product-scoring";
export * from "./fit-scoring";
export * from "./recommendation-eval";
export * from "./affiliate-separation";
export * from "./page-completeness";
export * from "./publication-eligibility";

export function createAllServices() {
  return {
    sourceEligibility: createSourceEligibilityService(),
    evidenceConfidence: createEvidenceConfidenceService(),
    evidenceConflict: createEvidenceConflictService(),
    productScoring: createProductScoringService(),
    fitScoring: createFitScoringService(),
    recommendationEval: createRecommendationEvalService(),
    affiliateSeparation: createAffiliateSeparationService(),
    pageCompleteness: createPageCompletenessService(),
    publicationEligibility: createPublicationEligibilityService(),
  };
}