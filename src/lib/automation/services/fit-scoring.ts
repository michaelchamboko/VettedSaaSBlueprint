import { FitScoringService } from "../module-contract";

export function createFitScoringService(): FitScoringService {
  return {
    calculate(context: {
      audience: string;
      constraints: string[];
      product: { capabilities: string[] };
    }): number {
      const { audience, constraints, product } = context;

      let score = 50;

      const capabilityMatch = product.capabilities.filter(c =>
        constraints.some(constraint =>
          constraint.toLowerCase().includes(c.toLowerCase()) ||
          c.toLowerCase().includes(constraint.toLowerCase()),
        ),
      ).length;

      if (product.capabilities.length > 0) {
        score += (capabilityMatch / product.capabilities.length) * 30;
      }

      const audienceKeywords = audience.toLowerCase().split(/\s+/);
      const capabilityKeywords = product.capabilities.join(" ").toLowerCase().split(/\s+/);
      const audienceMatch = audienceKeywords.filter(k =>
        capabilityKeywords.some(ck => ck.includes(k) || k.includes(ck)),
      ).length;

      if (audienceKeywords.length > 0) {
        score += (audienceMatch / audienceKeywords.length) * 20;
      }

      return Math.max(0, Math.min(100, score));
    },
  };
}

export function calculateConstraintFit(
  constraints: string[],
  productCapabilities: string[],
): { satisfied: string[]; partiallySatisfied: string[]; unsatisfied: string[] } {
  const satisfied: string[] = [];
  const partiallySatisfied: string[] = [];
  const unsatisfied: string[] = [];

  for (const constraint of constraints) {
    const fullMatch = productCapabilities.some(c =>
      constraint.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(constraint.toLowerCase()),
    );

    if (fullMatch) {
      satisfied.push(constraint);
    } else {
      const partialMatch = productCapabilities.some(c =>
        constraint.toLowerCase().split(/\s+/).some(word =>
          c.toLowerCase().includes(word) || word.length > 3 && c.toLowerCase().includes(word),
        ),
      );
      if (partialMatch) {
        partiallySatisfied.push(constraint);
      } else {
        unsatisfied.push(constraint);
      }
    }
  }

  return { satisfied, partiallySatisfied, unsatisfied };
}