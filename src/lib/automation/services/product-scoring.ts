import { ProductScoringService } from "../module-contract";

export function createProductScoringService(): ProductScoringService {
  return {
    calculate(product: { criteria: Record<string, number>; weights: Record<string, number> }): number {
      const { criteria, weights } = product;

      let totalWeight = 0;
      let weightedSum = 0;

      for (const [criterion, score] of Object.entries(criteria)) {
        const weight = weights[criterion] ?? 1;
        totalWeight += weight;
        weightedSum += score * weight;
      }

      if (totalWeight === 0) return 0;

      return Math.max(0, Math.min(100, weightedSum / totalWeight));
    },
  };
}

export const DEFAULT_CRITERIA_WEIGHTS: Record<string, number> = {
  functionality: 0.25,
  usability: 0.20,
  reliability: 0.20,
  pricing: 0.15,
  support: 0.10,
  integration: 0.10,
};

export function normalizeCriteriaScores(
  rawScores: Record<string, number>,
  minMax: Record<string, { min: number; max: number }>,
): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [criterion, score] of Object.entries(rawScores)) {
    const range = minMax[criterion];
    if (range) {
      const { min, max } = range;
      normalized[criterion] = max > min ? (score - min) / (max - min) * 100 : 50;
    } else {
      normalized[criterion] = Math.max(0, Math.min(100, score));
    }
  }

  return normalized;
}