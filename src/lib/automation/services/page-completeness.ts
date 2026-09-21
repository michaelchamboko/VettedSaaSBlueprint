import { PageCompletenessService, CompletenessResult } from "../module-contract";

const REQUIRED_BLOCKS_BY_PAGE_TYPE: Record<string, string[]> = {
  "Decision Hub": ["Problem framing", "Desired outcome and constraints", "Evidence gate"],
  "Solution Hub": ["Seven-step structure", "Conditional optioning"],
  "Decision Scenario": ["Assumptions and boundaries", "Trade-off outcomes", "Next action"],
};

export function createPageCompletenessService(): PageCompletenessService {
  return {
    check(page: { pageType: string; blocks: Array<{ heading: string; evidence: string[] }> }): CompletenessResult {
      const requiredBlocks = REQUIRED_BLOCKS_BY_PAGE_TYPE[page.pageType] ?? [];
      const presentBlocks = page.blocks.map(b => b.heading);

      const missingBlocks = requiredBlocks.filter(rb => !presentBlocks.includes(rb));

      const evidenceGaps: string[] = [];
      for (const block of page.blocks) {
        const hasValidatedEvidence = block.evidence.some(e => e === "validated");
        if (!hasValidatedEvidence && block.evidence.length > 0) {
          evidenceGaps.push(`${block.heading}: no validated evidence`);
        } else if (block.evidence.length === 0) {
          evidenceGaps.push(`${block.heading}: no evidence`);
        }
      }

      return {
        complete: missingBlocks.length === 0 && evidenceGaps.length === 0,
        missingBlocks,
        evidenceGaps,
      };
    },
  };
}

export function getRequiredBlocks(pageType: string): string[] {
  return REQUIRED_BLOCKS_BY_PAGE_TYPE[pageType] ?? [];
}

export function validatePageStructure(
  page: { pageType: string; blocks: Array<{ heading: string; evidence: string[] }> },
): { valid: boolean; errors: string[] } {
  const required = getRequiredBlocks(page.pageType);
  const present = page.blocks.map(b => b.heading);

  const errors: string[] = [];
  for (const req of required) {
    if (!present.includes(req)) {
      errors.push(`Missing required block: ${req}`);
    }
  }

  for (const block of page.blocks) {
    if (!block.heading || block.heading.trim() === "") {
      errors.push("Block has empty heading");
    }
    if (block.evidence.length === 0) {
      errors.push(`Block "${block.heading}" has no evidence`);
    }
  }

  return { valid: errors.length === 0, errors };
}