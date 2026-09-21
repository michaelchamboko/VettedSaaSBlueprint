import { AffiliateSeparationService, SeparationResult } from "../module-contract";

export function createAffiliateSeparationService(): AffiliateSeparationService {
  return {
    check(params: { productScore: number; affiliateAvailable: boolean; commissionRate?: number }): SeparationResult {
      const { productScore, affiliateAvailable, commissionRate } = params;

      if (!affiliateAvailable) {
        return {
          independent: true,
          scoreAdjusted: productScore,
          reason: "No affiliate relationship exists",
        };
      }

      let reason = "Affiliate relationship exists but does not influence editorial score";
      const scoreAdjusted = productScore;

      if (commissionRate && commissionRate > 50) {
        reason += `; high commission rate (${commissionRate}%) noted but not factored into score`;
      }

      return {
        independent: true,
        scoreAdjusted,
        reason,
      };
    },
  };
}

export function auditAffiliateInfluence(
  products: Array<{ name: string; score: number; affiliateAvailable: boolean; commissionRate?: number }>,
): Array<{ product: string; flagged: boolean; reason: string }> {
  return products.map(p => {
    if (p.affiliateAvailable && p.commissionRate && p.commissionRate > 50 && p.score > 80) {
      return {
        product: p.name,
        flagged: true,
        reason: `High score (${p.score}) with high commission rate (${p.commissionRate}%) - review for potential bias`,
      };
    }
    if (p.affiliateAvailable && p.score > 90) {
      return {
        product: p.name,
        flagged: true,
        reason: `Near-perfect score (${p.score}) with affiliate - verify evidence independence`,
      };
    }
    return {
      product: p.name,
      flagged: false,
      reason: "No affiliate influence detected",
    };
  });
}