import { PublicationEligibilityService, EligibilityResult, EvidenceState } from "../module-contract";
import { ValidationCheck } from "../module-contract";

export function createPublicationEligibilityService(): PublicationEligibilityService {
  return {
    check(page: {
      disclosure: string;
      evidenceState: EvidenceState;
      validations: ValidationCheck[];
    }): EligibilityResult {
      const { disclosure, evidenceState, validations } = page;

      const criticalFailures = validations.filter(v => v.severity === "error" && !v.passed);
      const hasCriticalFailures = criticalFailures.length > 0;

      if (hasCriticalFailures) {
        return {
          eligible: false,
          reason: `Critical validation failures: ${criticalFailures.map(f => f.checkName).join(", ")}`,
          tier: "blocked",
        };
      }

      if (!disclosure || disclosure.trim().length < 20) {
        return {
          eligible: false,
          reason: "Missing or insufficient affiliate disclosure",
          tier: "blocked",
        };
      }

      if (evidenceState === "insufficient") {
        return {
          eligible: true,
          reason: "Published with explicit insufficient evidence disclosure",
          tier: "qualified",
        };
      }

      return {
        eligible: true,
        reason: "All publication requirements met",
        tier: "approved",
      };
    },
  };
}

export function checkProductionReadiness(
  pages: Array<{ pageType: string; disclosure: string; evidenceState: string; validations: ValidationCheck[] }>,
): { ready: boolean; blockingIssues: string[]; warnings: string[] } {
  const service = createPublicationEligibilityService();
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  for (const page of pages) {
    const result = service.check({
      disclosure: page.disclosure,
      evidenceState: page.evidenceState as EvidenceState,
      validations: page.validations,
    });

    if (!result.eligible) {
      blockingIssues.push(`${page.pageType}: ${result.reason}`);
    } else if (result.tier === "qualified") {
      warnings.push(`${page.pageType}: ${result.reason}`);
    }
  }

  return {
    ready: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  };
}