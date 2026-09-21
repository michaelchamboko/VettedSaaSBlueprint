import { EvidenceConfidenceService, RecencyClass } from "../module-contract";

const RECENCY_WEIGHTS: Record<RecencyClass, number> = {
  current: 1.0,
  recent: 0.85,
  aging: 0.65,
  stale: 0.4,
  unknown: 0.2,
};

const SOURCE_TYPE_WEIGHTS: Record<string, number> = {
  official: 1.0,
  verified_third_party: 0.9,
  vendor_docs: 0.75,
  community: 0.6,
};

export function createEvidenceConfidenceService(): EvidenceConfidenceService {
  return {
    calculate(evidence: {
      source: string;
      quote: string;
      recency: RecencyClass;
      corroboration: number;
    }): number {
      let confidence = 0.5;

      const sourceType = evidence.source.toLowerCase();
      const sourceWeight = SOURCE_TYPE_WEIGHTS[sourceType] ?? 0.5;
      confidence *= sourceWeight;

      confidence *= RECENCY_WEIGHTS[evidence.recency] ?? 0.5;

      const corroborationBoost = Math.min(evidence.corroboration * 0.15, 0.3);
      confidence += corroborationBoost;

      const quoteLength = evidence.quote.length;
      if (quoteLength > 200) confidence += 0.05;
      else if (quoteLength > 100) confidence += 0.02;

      return Math.max(0, Math.min(1, confidence));
    },
  };
}

export function calculateCompositeConfidence(
  evidences: Array<{ confidence: number; weight?: number }>,
): number {
  if (evidences.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const e of evidences) {
    const weight = e.weight ?? 1;
    totalWeight += weight;
    weightedSum += e.confidence * weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}