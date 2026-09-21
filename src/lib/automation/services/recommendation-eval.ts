import { RecommendationEvalService, RecommendationResult, EvidenceState } from "../module-contract";

export function createRecommendationEvalService(): RecommendationEvalService {
  return {
    evaluate(params: {
      conditions: string[];
      evidence: EvidenceState;
      scores: Record<string, number>;
    }): RecommendationResult {
      const { conditions, evidence, scores } = params;

      const avgScore = Object.values(scores).length > 0
        ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
        : 0;

      const evidencePenalty: Record<EvidenceState, number> = {
        validated: 0,
        partial: 0.15,
        insufficient: 0.35,
        conflicting: 0.25,
      };

      const adjustedScore = avgScore - (evidencePenalty[evidence] ?? 0) * 100;
      const recommended = adjustedScore >= 60 && evidence !== "insufficient";

      const notFor: string[] = [];
      if (evidence === "insufficient") {
        notFor.push("Users requiring fully verified evidence before decision");
      }
      if (evidence === "conflicting") {
        notFor.push("Users who cannot tolerate uncertainty in recommendations");
      }

      for (const [criterion, score] of Object.entries(scores)) {
        if (score < 40) {
          notFor.push(`Users prioritizing ${criterion} (score: ${score})`);
        }
      }

      return {
        recommended,
        conditions,
        confidence: Math.max(0, Math.min(1, adjustedScore / 100)),
        notFor,
      };
    },
  };
}

export function formatRecommendation(result: RecommendationResult): string {
  const parts: string[] = [];

  if (result.recommended) {
    parts.push("Recommended");
  } else {
    parts.push("Not recommended");
  }

  if (result.conditions.length > 0) {
    parts.push(`Conditions: ${result.conditions.join("; ")}`);
  }

  if (result.notFor.length > 0) {
    parts.push(`Not for: ${result.notFor.join("; ")}`);
  }

  parts.push(`Confidence: ${Math.round(result.confidence * 100)}%`);

  return parts.join(" | ");
}