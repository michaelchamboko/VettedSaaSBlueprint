import { EligibilityResult, RecencyClass, SourceEligibilityService } from "../module-contract";

const APPROVED_SOURCE_TIERS = ["official", "verified_third_party", "community", "vendor_docs"] as const;
const TIER_PRIORITY: Record<string, number> = {
  official: 1,
  verified_third_party: 2,
  community: 3,
  vendor_docs: 4,
};

export function createSourceEligibilityService(): SourceEligibilityService {
  return {
    check(source: { url: string; type: string; tier: string }): EligibilityResult {
      const tier = source.tier.toLowerCase();
      if (!APPROVED_SOURCE_TIERS.includes(tier as typeof APPROVED_SOURCE_TIERS[number])) {
        return {
          eligible: false,
          reason: `Source tier '${tier}' is not in approved tiers: ${APPROVED_SOURCE_TIERS.join(", ")}`,
          tier,
        };
      }

      try {
        new URL(source.url);
      } catch {
        return {
          eligible: false,
          reason: `Invalid URL: ${source.url}`,
          tier,
        };
      }

      return {
        eligible: true,
        reason: `Source approved at tier: ${tier}`,
        tier,
      };
    },

    classifyRecency(date: string): RecencyClass {
      const sourceDate = new Date(date);
      const now = new Date();
      const daysDiff = (now.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24);

      if (isNaN(sourceDate.getTime())) {
        return "unknown";
      }

      if (daysDiff <= 30) return "current";
      if (daysDiff <= 90) return "recent";
      if (daysDiff <= 180) return "aging";
      if (daysDiff <= 365) return "stale";
      return "stale";
    },
  };
}

export function getTierPriority(tier: string): number {
  return TIER_PRIORITY[tier.toLowerCase()] ?? 99;
}